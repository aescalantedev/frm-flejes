const fs = require('fs')

let app = fs.readFileSync('src/App.jsx', 'utf8')

// 1. Añadir costo_kg_ingreso al SELECT de flejes
app = app.replace(
  /recepcion_id,\s*producto_id,\s*catalogo_productos\(codigo, glosa, medida_corta\)/,
  `recepcion_id,
            producto_id,
            costo_kg_ingreso,
            catalogo_productos(codigo, glosa, medida_corta)`
)

// 2. Añadir costo_kg_ingreso al mapeo local de flejes
app = app.replace(
  /recepcion_id: f\.recepcion_id,\s*secuencia: f\.secuencia\s*\}\)\)/,
  `recepcion_id: f.recepcion_id,
          secuencia: f.secuencia,
          costo_kg_ingreso: f.costo_kg_ingreso
        }))`
)

// 3. Arreglar handleOpenBatchIngreso para incluir torreProductoId
app = app.replace(
  /torreMedida: t \? t\.nombre_medida : ''\s*\}\)/,
  `torreMedida: t ? t.nombre_medida : '',
        torreProductoId: t ? t.producto_sugerido_id : null
      })`
)

// 4. Arreglar <BatchIngresoModal> render
app = app.replace(
  /torreName=\{batchIngresoConfig\.torreName\}\s*capMax=\{batchIngresoConfig\.capMax\}/,
  `torreName={batchIngresoConfig.torreName}
            torreProductoId={batchIngresoConfig.torreProductoId}
            catalogoProductos={catalogoCostos}
            capMax={batchIngresoConfig.capMax}`
)

// 5. handleConfirmBatchIngreso local storage
app = app.replace(
  /torre_id: torreId,\s*peso: item\.peso,\s*medida: item\.medida\s*\}\)\)/,
  `torre_id: torreId,
          peso: item.peso,
          medida: item.medida,
          producto_id: item.producto_id,
          codigo: item.codigo,
          costo_kg_aplicado: item.costo_kg_aplicado
        }))`
)

// 6. handleConfirmBatchIngreso insert flejes
app = app.replace(
  /producto_id: \(catalogoCostos\.find\(c => c\.medida === item\.medida\) \|\| \{\}\)\.producto_id \|\| null,/,
  `producto_id: item.producto_id,
              costo_kg_ingreso: item.costo_kg_aplicado,`
)

// 7. handleConfirmBatchIngreso insert historial
app = app.replace(
  /producto_id: \(catalogoCostos\.find\(c => c\.medida === \(item\.medida \|\| torres\.find\(t => t\.id === torreId\)\?\.nombre_medida\)\) \|\| \{\}\)\.producto_id \|\| null,/,
  `producto_id: item.producto_id,
              costo_kg_aplicado: item.costo_kg_aplicado,`
)

// 8. handleConfirmSaveSession (Reception) insert flejes
app = app.replace(
  /producto_id: \(catalogoCostos\.find\(c => c\.medida === item\.medida\) \|\| \{\}\)\.producto_id \|\| null,/,
  `producto_id: item.producto_id,
            costo_kg_ingreso: item.costo_kg_aplicado,`
)

// 9. handleConfirmSaveSession (Reception) insert historial
// Note: original had a complex lookup: producto_id: (catalogoCostos.find(c => c.medida === medidaFinal) || {}).producto_id || null
app = app.replace(
  /const t = torres\.find\(x => x\.id === item\.torre_id\)\s*const medidaFinal = item\.medida \|\| \(t \? t\.nombre_medida : 'Mixto'\)\s*return \{\s*ubicacion_id: item\.torre_id,\s*peso_kg: item\.peso,\s*producto_id: \(catalogoCostos\.find\(c => c\.medida === medidaFinal\) \|\| \{\}\)\.producto_id \|\| null,\s*motivo: 'Ingreso',/,
  `return {
              ubicacion_id: item.torre_id,
              peso_kg: item.peso,
              producto_id: item.producto_id,
              costo_kg_aplicado: item.costo_kg_aplicado,
              motivo: 'Ingreso',`
)

fs.writeFileSync('src/App.jsx', app)
console.log('App.jsx modificado con éxito.')
