import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTorres() {
  console.log('Iniciando corrección de ubicaciones...')

  // 1. Leer el backup antiguo para sacar las capacidades correctas
  const backupData = JSON.parse(fs.readFileSync('backup_db_2026-08-06T02-51-25-755Z.json', 'utf8'))
  const capacidadesAntiguas = {}
  backupData.torres.forEach(t => {
    capacidadesAntiguas[t.posicion] = t.cantidad_maxima || 5
  })

  // 2. Traer todas las ubicaciones actuales
  const { data: ubicaciones, error: errUbi } = await supabase.from('ubicaciones').select('*')
  if (errUbi) throw errUbi

  // 3. Traer todos los productos para buscar sus IDs
  const { data: productos, error: errProd } = await supabase.from('catalogo_productos').select('*')
  if (errProd) throw errProd

  // Mapa codigo_posicion -> codigo_producto (obtenido desde los flejes actuales)
  const { data: flejes, error: errFlejes } = await supabase
    .from('flejes')
    .select('ubicacion_id, producto_id, catalogo_productos(codigo)')
  if (errFlejes) throw errFlejes

  // Agrupamos el producto predominante por ubicación
  const prodByUbi = {}
  for (const f of flejes) {
    if (!prodByUbi[f.ubicacion_id]) prodByUbi[f.ubicacion_id] = {}
    const pId = f.producto_id
    prodByUbi[f.ubicacion_id][pId] = (prodByUbi[f.ubicacion_id][pId] || 0) + 1
  }

  // 4. Actualizar
  for (const u of ubicaciones) {
    const pos = u.codigo_posicion
    const cap = capacidadesAntiguas[pos] || 5 // si no existe en backup, 5 por defecto

    // Buscar el producto_sugerido_id predominante
    let sugeridoId = null
    const conteos = prodByUbi[u.id]
    if (conteos) {
      let maxCount = 0
      for (const [pId, count] of Object.entries(conteos)) {
        if (count > maxCount) {
          maxCount = count
          sugeridoId = pId
        }
      }
    }

    const { error } = await supabase
      .from('ubicaciones')
      .update({
        capacidad_maxima: cap,
        producto_sugerido_id: sugeridoId
      })
      .eq('id', u.id)

    if (error) console.error(`Error actualizando ${pos}:`, error)
    else console.log(`Actualizada ${pos}: Capacidad=${cap}, Sugerido=${sugeridoId}`)
  }
  console.log('¡Corrección completada!')
}

fixTorres()
