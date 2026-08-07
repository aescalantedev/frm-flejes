const fs = require('fs')

let app = fs.readFileSync('src/App.jsx', 'utf8')

// 1. Replace the `torres` query
app = app.replace(
  /queryFn: async \(\) => {\s*const { data, error } = await supabase\s*\.from\('torres'\)\s*\.select\('\*, inventario\(\*\)'\)\s*\.order\('orden', { ascending: true }\)\s*\.order\('secuencia', { referencedTable: 'inventario', ascending: true }\)/,
  `queryFn: async () => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select(\`
          id,
          codigo_posicion,
          capacidad_maxima,
          orden_visual,
          producto_sugerido_id,
          catalogo_productos!producto_sugerido_id(medida_corta),
          flejes (
            id,
            ubicacion_id,
            peso_kg,
            secuencia,
            recepcion_id,
            producto_id,
            catalogo_productos(codigo, glosa, medida_corta)
          )
        \`)
        .order('orden_visual', { ascending: true })
        // Nota: no podemos ordenar tablas anidadas fácilmente sin RPC o views en supabase-js V2 a menos que hagamos sorting en memoria.`
)

// The mapping of the new data structure
app = app.replace(
  /if \(error\) {\s*showToast\('Error al cargar torres', true\)\s*throw error\s*}\s*return data \|\| \[\]/,
  `if (error) {
        showToast('Error al cargar torres', true)
        throw error
      }
      
      const mapped = (data || []).map(u => ({
        id: u.id,
        posicion: u.codigo_posicion,
        nombre_medida: u.catalogo_productos?.medida_corta || 'No asignada',
        cantidad_maxima: u.capacidad_maxima,
        orden: u.orden_visual,
        producto_sugerido_id: u.producto_sugerido_id,
        inventario: (u.flejes || []).sort((a,b) => a.secuencia - b.secuencia).map(f => ({
          id: f.id,
          torre_id: f.ubicacion_id,
          peso: f.peso_kg,
          medida: f.catalogo_productos?.medida_corta || '',
          codigo: f.catalogo_productos?.codigo || '',
          glosa: f.catalogo_productos?.glosa || '',
          producto_id: f.producto_id,
          recepcion_id: f.recepcion_id,
          secuencia: f.secuencia
        }))
      }))
      return mapped`
)

// 1.5 Replace Catalogo Costos query
app = app.replace(
  /queryFn: async \(\) => {\s*try {\s*const { data, error } = await supabase\s*\.from\('catalogo_costos'\)\s*\.select\('\*'\)/,
  `queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('kardex_costos')
          .select(\`
            id,
            costo_kg,
            catalogo_productos(codigo, medida_corta, glosa)
          \`)`
)

app = app.replace(
  /if \(error\) throw error\s*return data \|\| \[\]/,
  `if (error) throw error
        return (data || []).map(k => ({
          id: k.id,
          costo_kg: k.costo_kg,
          medida: k.catalogo_productos?.medida_corta || '',
          codigo: k.catalogo_productos?.codigo || '',
          glosa: k.catalogo_productos?.glosa || ''
        }))`
)

// 2. Fetch Historial query
app = app.replace(
  /queryFn: async \(\) => {\s*const { data, error } = await supabase\s*\.from\('historial'\)\s*\.select\('\*, recepciones\(\*\), despachos\(\*\)'\)/,
  `queryFn: async () => {
      const { data, error } = await supabase
        .from('historial_movimientos')
        .select(\`
          id,
          ubicacion_id,
          ubicaciones(codigo_posicion),
          catalogo_productos(codigo, glosa, medida_corta),
          peso_kg,
          costo_kg_aplicado,
          motivo, usuario, recepcion_id, despacho_id, created_at,
          recepciones(*), despachos(*)
        \`)`
)
app = app.replace(
  /if \(error\) {\s*showToast\('Error al cargar historial', true\)\s*throw error\s*}\s*return data \|\| \[\]/,
  `if (error) {
        showToast('Error al cargar historial', true)
        throw error
      }
      return (data || []).map(h => ({
         id: h.id,
         torre_id: h.ubicacion_id,
         posicion: h.ubicaciones?.codigo_posicion || 'Sin Torre',
         medida: h.catalogo_productos?.medida_corta || 'Mixto',
         codigo: h.catalogo_productos?.codigo || '',
         peso_fleje: h.peso_kg,
         costo_kg_aplicado: h.costo_kg_aplicado,
         motivo: h.motivo,
         usuario: h.usuario,
         recepciones: h.recepciones,
         despachos: h.despachos,
         created_at: h.created_at
      }))`
)

fs.writeFileSync('src/App.jsx', app)
console.log('App.jsx queries actualizadas!')
