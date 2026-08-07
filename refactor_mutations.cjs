const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. fetch producto_id in catalogo_costos
content = content.replace(
  /catalogo_productos\(codigo, medida_corta, glosa\)/,
  'producto_id,\n            catalogo_productos(codigo, medida_corta, glosa)'
);
content = content.replace(
  /costo_kg: k\.costo_kg,/,
  'costo_kg: k.costo_kg,\n          producto_id: k.producto_id,'
);

// 2. handleSaveTorre
content = content.replace(
  /\.from\('torres'\)\s*\.update\(\{\s*posicion: torreData\.posicion,\s*nombre_medida: torreData\.nombre_medida,\s*cantidad_maxima: torreData\.cantidad_maxima\s*\}\)/,
  `.from('ubicaciones')
          .update({
            codigo_posicion: torreData.posicion,
            capacidad_maxima: torreData.cantidad_maxima
          })`
);
content = content.replace(
  /\.from\('torres'\)\s*\.insert\(\[\{\s*posicion: torreData\.posicion,\s*nombre_medida: torreData\.nombre_medida,\s*cantidad_maxima: torreData\.cantidad_maxima\s*\}\]\)/,
  `.from('ubicaciones')
          .insert([{
            codigo_posicion: torreData.posicion,
            capacidad_maxima: torreData.cantidad_maxima
          }])`
);

// 3. handleEliminarTorre
content = content.replace(
  /\.from\('inventario'\)\s*\.delete\(\)\s*\.eq\('torre_id', torre\.id\)/g,
  `.from('flejes')
              .delete()
              .eq('ubicacion_id', torre.id)`
);
content = content.replace(
  /\.from\('torres'\)\s*\.delete\(\)\s*\.eq\('id', torre\.id\)/g,
  `.from('ubicaciones')
            .delete()
            .eq('id', torre.id)`
);

// 4. handleMoverTorre
content = content.replace(
  /\.from\('torres'\)\s*\.update\(\{ posicion: codPosicion \}\)\s*\.eq\('id', localTorres\[i\]\.id\)/g,
  `.from('ubicaciones')
          .update({ codigo_posicion: codPosicion, orden_visual: i + 1 })
          .eq('id', localTorres[i].id)`
);

// Helper for finding producto_id:
// const prodId = catalogoCostos.find(c => c.medida === item.medida)?.producto_id || null;

// 5. handleConfirmBatchIngreso
content = content.replace(
  /\.from\('inventario'\)\s*\.insert\(weightsList\.map\(item => \(\{\s*torre_id: torreId,\s*peso: item\.peso,\s*medida: item\.medida,\s*recepcion_id: recepcionId\s*\}\)\)\)/g,
  `.from('flejes')
          .insert(weightsList.map(item => ({
            ubicacion_id: torreId,
            peso_kg: item.peso,
            producto_id: (catalogoCostos.find(c => c.medida === item.medida) || {}).producto_id || null,
            recepcion_id: recepcionId
          })))`
);
content = content.replace(
  /\.from\('historial'\)\s*\.insert\(weightsList\.map\(item => \(\{\s*torre_id: torreId,\s*posicion: torreName,\s*medida: item\.medida \|\| torres\.find\(t => t\.id === torreId\)\?\.nombre_medida \|\| '',\s*peso_fleje: item\.peso,\s*motivo: 'Ajuste Ingreso',\s*despachador: userProfile\.name,\s*hora_inicio: new Date\(\)\.toISOString\(\),\s*recepcion_id: recepcionId\s*\}\)\)\)/g,
  `.from('historial_movimientos')
          .insert(weightsList.map(item => ({
            ubicacion_id: torreId,
            peso_kg: item.peso,
            producto_id: (catalogoCostos.find(c => c.medida === (item.medida || torres.find(t => t.id === torreId)?.nombre_medida)) || {}).producto_id || null,
            motivo: 'Ajuste Ingreso',
            usuario: userProfile.name,
            recepcion_id: recepcionId
          })))`
);

// 6. handleConfirmSaveSession (Recepción)
content = content.replace(
  /\.from\('inventario'\)\s*\.insert\(session\.items\.map\(item => \(\{\s*torre_id: item\.torre_id,\s*peso: item\.peso,\s*medida: item\.medida \|\| null,\s*recepcion_id: recepcionId\s*\}\)\)\)/g,
  `.from('flejes')
          .insert(session.items.map(item => ({
            ubicacion_id: item.torre_id,
            peso_kg: item.peso,
            producto_id: (catalogoCostos.find(c => c.medida === item.medida) || {}).producto_id || null,
            recepcion_id: recepcionId
          })))`
);
content = content.replace(
  /\.from\('historial'\)\s*\.insert\(session\.items\.map\(item => \{\s*const t = torres\.find\(x => x\.id === item\.torre_id\)\s*return \{\s*torre_id: item\.torre_id,\s*posicion: t \? t\.posicion : 'Al Piso',\s*medida: item\.medida \|\| \(t \? t\.nombre_medida : 'Mixto'\),\s*peso_fleje: item\.peso,\s*motivo: 'Ingreso',\s*despachador: userProfile\.name,\s*hora_inicio: session\.hora_inicio,\s*recepcion_id: recepcionId\s*\}\s*\}\)\)/g,
  `.from('historial_movimientos')
          .insert(session.items.map(item => {
            const t = torres.find(x => x.id === item.torre_id)
            const medidaFinal = item.medida || (t ? t.nombre_medida : 'Mixto')
            return {
              ubicacion_id: item.torre_id,
              peso_kg: item.peso,
              producto_id: (catalogoCostos.find(c => c.medida === medidaFinal) || {}).producto_id || null,
              motivo: 'Ingreso',
              usuario: userProfile.name,
              recepcion_id: recepcionId
            }
          }))`
);

// 7. handleConfirmSaveSession (Despacho)
content = content.replace(
  /const idsToDelete = session\.items\.map\(item => item\.id\)\s*const \{ error: eDel \} = await supabase\s*\.from\('inventario'\)\s*\.delete\(\)\s*\.in\('id', idsToDelete\)/g,
  `const idsToDelete = session.items.map(item => item.id)
        const { error: eDel } = await supabase
          .from('flejes')
          .delete()
          .in('id', idsToDelete)`
);
content = content.replace(
  /\.from\('historial'\)\s*\.insert\(session\.items\.map\(item => \{\s*const t = torres\.find\(x => x\.id === item\.torre_id\)\s*return \{\s*torre_id: item\.torre_id,\s*posicion: t \? t\.posicion : 'Sin Torre',\s*medida: t \? t\.nombre_medida : '',\s*peso_fleje: item\.peso,\s*motivo: session\.motivo \|\| 'Despacho',\s*despachador: userProfile\.name,\s*num_solicitud: session\.num_solicitud,\s*hora_inicio: session\.hora_inicio,\s*recepcion_id: item\.recepcion_id,\s*despacho_id: despachoId\s*\}\s*\}\)\)/g,
  `.from('historial_movimientos')
          .insert(session.items.map(item => {
            const t = torres.find(x => x.id === item.torre_id)
            const medidaFinal = item.medida || (t ? t.nombre_medida : '')
            return {
              ubicacion_id: item.torre_id,
              peso_kg: item.peso,
              producto_id: (catalogoCostos.find(c => c.medida === medidaFinal) || {}).producto_id || item.producto_id || null,
              motivo: session.motivo || 'Despacho',
              usuario: userProfile.name,
              recepcion_id: item.recepcion_id,
              despacho_id: despachoId
            }
          }))`
);

// 8. handleEliminarFleje
content = content.replace(
  /\.from\('inventario'\)\s*\.delete\(\)\s*\.eq\('id', id\)/g,
  `.from('flejes')
        .delete()
        .eq('id', id)`
);

// 9. handleEditarFleje
content = content.replace(
  /const updateData = \{ peso: nuevoPeso \}/g,
  `const updateData = { peso_kg: nuevoPeso }`
);
content = content.replace(
  /if \(nuevaMedida !== undefined\) \{\s*updateData\.medida = nuevaMedida \|\| null\s*\}/g,
  `if (nuevaMedida !== undefined) {
        const prod = catalogoCostos.find(c => c.medida === nuevaMedida)
        updateData.producto_id = prod ? prod.producto_id : null
      }`
);
content = content.replace(
  /\.from\('inventario'\)\s*\.update\(updateData\)\s*\.eq\('id', id\)/g,
  `.from('flejes')
        .update(updateData)
        .eq('id', id)`
);

// 10. handleEliminarVariosFlejes
content = content.replace(
  /\.from\('inventario'\)\s*\.delete\(\)\s*\.in\('id', ids\)/g,
  `.from('flejes')
        .delete()
        .in('id', ids)`
);

// 11. handleConfirmarTraslado
content = content.replace(
  /\.from\('inventario'\)\s*\.delete\(\)\s*\.eq\('id', trasladoData\.flejeId\)/g,
  `.from('flejes')
        .delete()
        .eq('id', trasladoData.flejeId)`
);
content = content.replace(
  /\.from\('historial'\)\s*\.insert\(\[\{\s*torre_id: torreActualId,\s*posicion: targetTorre\.posicion,\s*medida: targetTorre\.nombre_medida,\s*peso_fleje: targetFleje\.peso,\s*motivo: trasladoData\.motivo,\s*num_solicitud: trasladoData\.numSolicitud,\s*despachador: trasladoData\.despachador,\s*hora_inicio: trasladoData\.horaInicio,\s*despacho_id: despachoId\s*\}\]\)/g,
  `.from('historial_movimientos')
        .insert([{
          ubicacion_id: torreActualId,
          peso_kg: targetFleje.peso,
          producto_id: targetFleje.producto_id,
          motivo: trasladoData.motivo,
          usuario: trasladoData.despachador,
          despacho_id: despachoId
        }])`
);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx updated');
