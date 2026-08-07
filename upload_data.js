import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Función auxiliar para formatear la medida corta (ej. '304X2' o '304X2.0')
function parseMedidaCorta(glosa) {
  // Glosa típica: "FLE LAC 0.304 X 2.00 MM A-50"
  // Extraemos el 304 y el 2.0
  const match = glosa.match(/0\.(\d+)\s*X\s*(\d+(?:\.\d+)?)\s*MM/i)
  if (match) {
    let espesor = parseInt(match[1], 10).toString()
    let ancho = parseFloat(match[2]).toString()
    return `${espesor}X${ancho}`
  }
  return glosa // fallback
}

async function uploadData() {
  console.log('Iniciando carga de datos CSV a la Base de Datos...')

  // 1. Leer y procesar inventario_nuevo.csv
  const invCsv = fs.readFileSync(process.argv[2], 'utf-8')
  const invLines = invCsv.split('\n').filter(l => l.trim() !== '')
  
  const productosMap = new Map() // codigo -> {codigo, glosa, medida_corta}
  const ubicacionesMap = new Map() // posicion -> {codigo_posicion}
  const flejesAInsertar = []

  // Saltamos cabecera
  for (let i = 1; i < invLines.length; i++) {
    const cols = invLines[i].split(';')
    if (cols.length < 5) continue
    
    const posicion = cols[0].trim()
    const nivel = parseInt(cols[1].replace('#', '').trim(), 10)
    const codigo = cols[2].trim()
    const glosa = cols[3].trim()
    const peso = parseFloat(cols[4].trim())
    
    // Almacenar ubicaciones únicas
    if (!ubicacionesMap.has(posicion)) {
      ubicacionesMap.set(posicion, {
        codigo_posicion: posicion,
        capacidad_maxima: 10,
        orden_visual: parseInt(posicion.replace('P', ''), 10) || 0
      })
    }

    // Almacenar productos únicos
    if (!productosMap.has(codigo)) {
      productosMap.set(codigo, {
        codigo,
        glosa,
        medida_corta: parseMedidaCorta(glosa)
      })
    }

    // Preparar fleje
    flejesAInsertar.push({
      posicion, // temporal, luego lo cambiaremos por el ID
      codigo_producto: codigo, // temporal
      peso_kg: peso,
      secuencia: nivel
    })
  }

  // 2. Leer y procesar costos.csv
  const costCsv = fs.readFileSync(process.argv[3], 'utf-8')
  const costLines = costCsv.split('\n').filter(l => l.trim() !== '')
  const costosMap = new Map() // medida_corta -> costo
  for (const line of costLines) {
    const parts = line.split(',')
    if (parts.length === 2) {
      costosMap.set(parts[0].trim().toUpperCase(), parseFloat(parts[1].trim()))
    }
  }

  // --- AHORA INSERTAMOS EN LA BASE DE DATOS ---

  // A. Insertar Productos
  console.log(`Insertando ${productosMap.size} productos en catalogo_productos...`)
  const productosArray = Array.from(productosMap.values())
  const { data: insertedProducts, error: errProd } = await supabase
    .from('catalogo_productos')
    .upsert(productosArray, { onConflict: 'codigo' })
    .select()
  
  if (errProd) {
    console.error('Error insertando productos:', errProd)
    return
  }

  // Mapa rápido de codigo -> id
  const prodIdMap = {}
  insertedProducts.forEach(p => prodIdMap[p.codigo] = p.id)

  // B. Insertar Kardex Costos
  console.log('Insertando precios en kardex_costos...')
  const costosAInsertar = []
  const hoy = new Date().toISOString().split('T')[0] // '2026-08-05'

  for (const prod of insertedProducts) {
    let costo = costosMap.get(prod.medida_corta.toUpperCase())
    if (!costo) {
      // Intento con variaciones (ej. 304X2 vs 304X2.0)
      for (const [key, val] of costosMap.entries()) {
        if (key.startsWith(prod.medida_corta) || prod.medida_corta.startsWith(key)) {
          costo = val
          break
        }
      }
    }
    if (costo) {
      costosAInsertar.push({
        producto_id: prod.id,
        fecha_vigencia: hoy,
        costo_kg: costo
      })
    } else {
      console.warn(`No se encontró costo para la medida ${prod.medida_corta} (código ${prod.codigo})`)
    }
  }

  if (costosAInsertar.length > 0) {
    const { error: errCost } = await supabase
      .from('kardex_costos')
      .upsert(costosAInsertar, { onConflict: 'producto_id, fecha_vigencia' })
    if (errCost) console.error('Error insertando costos:', errCost)
  }

  // C. Insertar Ubicaciones (Torres)
  console.log(`Insertando ${ubicacionesMap.size} ubicaciones...`)
  const { data: insertedUbicaciones, error: errUbi } = await supabase
    .from('ubicaciones')
    .upsert(Array.from(ubicacionesMap.values()), { onConflict: 'codigo_posicion' })
    .select()

  if (errUbi) {
    console.error('Error insertando ubicaciones:', errUbi)
    return
  }

  const ubiIdMap = {}
  insertedUbicaciones.forEach(u => ubiIdMap[u.codigo_posicion] = u.id)

  // D. Insertar Flejes (Borrando los antiguos primero es buena idea)
  console.log('Limpiando flejes antiguos (truncate)...')
  // No podemos truncar desde cliente sin RLS especial, así que borramos por ubi_id
  for (const u of insertedUbicaciones) {
    await supabase.from('flejes').delete().eq('ubicacion_id', u.id)
  }

  console.log(`Insertando ${flejesAInsertar.length} flejes...`)
  const flejesFinales = flejesAInsertar.map(f => ({
    ubicacion_id: ubiIdMap[f.posicion],
    producto_id: prodIdMap[f.codigo_producto],
    peso_kg: f.peso_kg,
    secuencia: f.secuencia
  }))

  const { error: errFlejes } = await supabase
    .from('flejes')
    .insert(flejesFinales)

  if (errFlejes) {
    console.error('Error insertando flejes:', errFlejes)
  } else {
    console.log('¡Carga de datos completada con éxito!')
  }
}

uploadData()
