import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'

/**
 * Normaliza las medidas para cruzar con el catálogo
 */
const normalizeMedida = (m) => {
  if (!m) return ''
  const s = m.replace(/\s+/g, '').toUpperCase()
  const parts = s.split('X')
  if (parts.length === 2) {
    const w = parseFloat(parts[0])
    const h = parseFloat(parts[1])
    if (!isNaN(w) && !isNaN(h)) {
      return `${w}X${h}`
    }
  }
  return s
}

/**
 * Aplica estilos globales a la cabecera de la hoja
 */
const styleHeaderRow = (sheet, columnsLength) => {
  const headerRow = sheet.getRow(1)
  headerRow.height = 25
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= columnsLength) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800 (similar al dark bg de la app)
      }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      }
    }
  })
}

/**
 * Exporta el inventario actual
 */
export const exportarInventarioExcel = async (torres, inventarioMap, catalogoCostos, isTN, userProfile) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Flejes'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Inventario Actual')
  const isAdmin = userProfile?.rol === 'Administrador'

  const columns = [
    { header: 'Torre', key: 'torre', width: 12 },
    { header: 'Nivel (Fleje)', key: 'nivel', width: 15 },
    { header: 'Medida', key: 'medida', width: 20 },
    { header: `Peso (${isTN ? 't' : 'kg'})`, key: 'peso', width: 15 },
  ]

  if (isAdmin) {
    columns.push({ header: 'Valorización (S/)', key: 'valor', width: 20 })
  }

  sheet.columns = columns
  styleHeaderRow(sheet, columns.length)

  let rowIndex = 2
  torres.forEach(t => {
    const flejes = inventarioMap[t.id] || []
    // Los flejes se muestran del nivel más alto al más bajo
    flejes.forEach((f, idx) => {
      const medidaToUse = f.medida || t.nombre_medida
      const pesoFormat = isTN ? (f.peso / 1000) : f.peso
      let rowData = {
        torre: t.posicion,
        nivel: `#${idx + 1}`,
        medida: medidaToUse,
        peso: pesoFormat
      }

      if (isAdmin) {
        let costo = 0
        if (medidaToUse) {
          const normalized = normalizeMedida(medidaToUse)
          const catItem = catalogoCostos.find(c => c.medida === normalized)
          if (catItem) {
            costo = f.peso * parseFloat(catItem.costo_kg)
          }
        }
        rowData.valor = costo
      }

      const row = sheet.addRow(rowData)
      
      // Estilos para la fila de datos
      row.eachCell((cell, colNumber) => {
        if (colNumber <= columns.length) {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'right' }
          if (colNumber === 3) cell.alignment.horizontal = 'center' // Medida
        }
      })
      
      // Formato numérico para peso y valor
      row.getCell(4).numFmt = '#,##0.00'
      if (isAdmin) {
        row.getCell(5).numFmt = '"S/" #,##0.00'
      }
      
      rowIndex++
    })
  })

  // Activar AutoFiltro
  sheet.autoFilter = {
    from: 'A1',
    to: isAdmin ? 'E1' : 'D1'
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm')
  saveAs(blob, `Inventario_${dateStr}.xlsx`)
}

/**
 * Exporta el historial de movimientos
 */
export const exportarHistorialExcel = async (historial, isTN) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Flejes'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Historial de Movimientos')

  const columns = [
    { header: 'Fecha y Hora', key: 'fecha', width: 22 },
    { header: 'Operación', key: 'operacion', width: 18 },
    { header: 'Torre / Origen', key: 'origen', width: 16 },
    { header: 'Destino / Destino', key: 'destino', width: 20 },
    { header: 'Nro. Guía / Solicitud', key: 'solicitud', width: 22 },
    { header: 'Medida', key: 'medida', width: 18 },
    { header: `Peso (${isTN ? 't' : 'kg'})`, key: 'peso', width: 15 },
    { header: 'Responsable', key: 'responsable', width: 25 },
    { header: 'Empresa / Transportista', key: 'empresa', width: 28 },
  ]

  sheet.columns = columns
  styleHeaderRow(sheet, columns.length)

  historial.forEach(h => {
    const fechaFormat = format(new Date(h.created_at), 'dd/MM/yyyy HH:mm:ss')

    // --- Detectar tipo de operación ---
    let operacionText = 'AJUSTE'
    let opColor = 'FF94A3B8' // gris por defecto
    const motivo = (h.motivo || '').toLowerCase()

    if (h.despacho_id) {
      operacionText = 'DESPACHO'
      opColor = 'FFF59E0B' // amber
    } else if (motivo.includes('traslado')) {
      operacionText = 'TRASLADO'
      opColor = 'FF3B82F6' // blue
    } else if (motivo.includes('ingreso') || h.recepcion_id) {
      operacionText = 'INGRESO'
      opColor = 'FF10B981' // green
    } else if (motivo.includes('elim') || motivo.includes('retir')) {
      operacionText = 'ELIMINACIÓN'
      opColor = 'FFEF4444' // red
    } else if (h.motivo) {
      operacionText = h.motivo.toUpperCase()
    }

    // --- Peso: el campo real es peso_fleje ---
    const pesoRaw = h.peso_fleje ?? h.peso ?? 0
    const pesoFormat = pesoRaw > 0 ? (isTN ? (pesoRaw / 1000) : pesoRaw) : null

    // --- Torre de origen / destino ---
    // En despachos: posicion es de donde se retiró (origen)
    // En ingresos:  posicion es donde se colocó (destino)
    const posicion = h.posicion || '-'
    const origenTorre = h.despacho_id ? posicion : '-'
    const destinoFinal = h.despacho_id
      ? (h.despachos?.destino || '-')
      : (h.recepcion_id ? posicion : posicion)

    // --- Número de solicitud / guía ---
    const numSolicitud = h.num_solicitud
      || h.recepciones?.num_solicitud
      || h.despachos?.num_solicitud
      || '-'

    // --- Responsable ---
    const responsable = h.despachador || h.usuario_nombre || 'Sistema'

    // --- Empresa de transporte (solo en recepciones) ---
    const empresa = h.recepciones?.empresa_transporte
      || h.recepciones?.entregado_por
      || h.despachos?.destino
      || '-'

    const row = sheet.addRow({
      fecha: fechaFormat,
      operacion: operacionText,
      origen: origenTorre,
      destino: destinoFinal,
      solicitud: numSolicitud,
      medida: h.medida || '-',
      peso: pesoFormat,
      responsable: responsable,
      empresa: empresa,
    })

    // Colores por tipo de operación
    const opCell = row.getCell(2)
    opCell.font = { bold: true, color: { argb: opColor } }

    // Alineación
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (colNumber === 1) cell.alignment.horizontal = 'left'  // Fecha
      if (colNumber === 7) cell.alignment.horizontal = 'right' // Peso
      if (colNumber === 8) cell.alignment.horizontal = 'left'  // Responsable
      if (colNumber === 9) cell.alignment.horizontal = 'left'  // Empresa
    })

    row.getCell(7).numFmt = '#,##0.00'
  })

  // Activar AutoFiltro
  sheet.autoFilter = {
    from: 'A1',
    to: 'I1'
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm')
  saveAs(blob, `Historial_Movimientos_${dateStr}.xlsx`)
}

/**
 * Exporta el listado de Torres con su inventario actual
 */
export const exportarTorresExcel = async (torres, inventarioMap, isTN) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Flejes'
  workbook.created = new Date()

  // ── Hoja 1: Resumen de Torres ──────────────────────────────────────────
  const sheetResumen = workbook.addWorksheet('Resumen Torres')

  const colsResumen = [
    { header: 'Posición',           key: 'posicion',   width: 14 },
    { header: 'Medida Asignada',    key: 'medida',     width: 22 },
    { header: 'Cap. Máxima',        key: 'capMax',     width: 14 },
    { header: 'Flejes Actuales',    key: 'cantidad',   width: 16 },
    { header: 'Disponibles',        key: 'disponible', width: 14 },
    { header: '% Ocupación',        key: 'pct',        width: 14 },
    { header: `Peso Total (${isTN ? 't' : 'kg'})`, key: 'peso', width: 18 },
    { header: 'Estado',             key: 'estado',     width: 12 },
  ]
  sheetResumen.columns = colsResumen
  styleHeaderRow(sheetResumen, colsResumen.length)

  torres.forEach(t => {
    const flejes = inventarioMap[t.id] || []
    const cantidad = flejes.length
    const disponible = Math.max(0, t.cantidad_maxima - cantidad)
    const pesoTotal = flejes.reduce((s, f) => s + f.peso, 0)
    const pesoFormat = isTN ? pesoTotal / 1000 : pesoTotal
    const pct = t.cantidad_maxima > 0 ? parseFloat(((cantidad / t.cantidad_maxima) * 100).toFixed(1)) : 0

    let estado = 'Vacía'
    if (cantidad >= t.cantidad_maxima) estado = 'Llena'
    else if (cantidad > 0) estado = 'Parcial'

    const row = sheetResumen.addRow({
      posicion: t.posicion,
      medida: t.nombre_medida || '-',
      capMax: t.cantidad_maxima,
      cantidad,
      disponible,
      pct,
      peso: parseFloat(pesoFormat.toFixed(2)),
      estado
    })

    // Color de fondo según estado
    const estadoCell = row.getCell(8)
    if (estado === 'Llena') {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '33EF4444' } }
      estadoCell.font = { bold: true, color: { argb: 'FFEF4444' } }
    } else if (estado === 'Parcial') {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '33F59E0B' } }
      estadoCell.font = { bold: true, color: { argb: 'FFF59E0B' } }
    } else {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A10B981' } }
      estadoCell.font = { bold: true, color: { argb: 'FF10B981' } }
    }

    // Formato de porcentaje
    row.getCell(6).numFmt = '0.0"%"'
    row.getCell(7).numFmt = '#,##0.00'

    // Barra de progreso visual (usando underline trick con caracteres)
    const bars = Math.round(pct / 10)
    row.getCell(6).value = pct // solo número, el formato lo muestra con %

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 2 ? 'left' : 'center' }
      if (colNumber === 7) cell.alignment.horizontal = 'right'
    })
  })

  // Fila de totales
  const totalFlejes = torres.reduce((s, t) => s + (inventarioMap[t.id] || []).length, 0)
  const totalPeso = torres.reduce((s, t) => s + (inventarioMap[t.id] || []).reduce((ps, f) => ps + f.peso, 0), 0)
  const totalCap = torres.reduce((s, t) => s + t.cantidad_maxima, 0)

  const totalRow = sheetResumen.addRow({
    posicion: 'TOTAL',
    medida: '',
    capMax: totalCap,
    cantidad: totalFlejes,
    disponible: Math.max(0, totalCap - totalFlejes),
    pct: totalCap > 0 ? parseFloat(((totalFlejes / totalCap) * 100).toFixed(1)) : 0,
    peso: parseFloat((isTN ? totalPeso / 1000 : totalPeso).toFixed(2)),
    estado: `${torres.length} torres`
  })

  totalRow.font = { bold: true }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  totalRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  totalRow.getCell(6).numFmt = '0.0"%"'
  totalRow.getCell(7).numFmt = '#,##0.00'
  totalRow.eachCell(cell => { cell.alignment = { vertical: 'middle', horizontal: 'center' } })

  sheetResumen.autoFilter = { from: 'A1', to: 'H1' }

  // ── Hoja 2: Detalle de Flejes por Torre ──────────────────────────────
  const sheetDetalle = workbook.addWorksheet('Detalle por Torre')

  const colsDetalle = [
    { header: 'Torre',         key: 'torre',    width: 14 },
    { header: 'Nivel (#)',     key: 'nivel',    width: 10 },
    { header: 'Medida',        key: 'medida',   width: 22 },
    { header: `Peso (${isTN ? 't' : 'kg'})`, key: 'peso', width: 15 },
  ]
  sheetDetalle.columns = colsDetalle
  styleHeaderRow(sheetDetalle, colsDetalle.length)

  torres.forEach(t => {
    const flejes = inventarioMap[t.id] || []
    if (flejes.length === 0) return
    flejes.forEach((f, idx) => {
      const medida = f.medida || t.nombre_medida || '-'
      const pesoFormat = isTN ? (f.peso / 1000) : f.peso
      const row = sheetDetalle.addRow({
        torre: t.posicion,
        nivel: `#${idx + 1}`,
        medida,
        peso: parseFloat(pesoFormat.toFixed(2))
      })
      row.getCell(4).numFmt = '#,##0.00'
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 4 ? 'right' : colNumber === 3 ? 'center' : 'left' }
      })
    })
  })

  sheetDetalle.autoFilter = { from: 'A1', to: 'D1' }

  // ── Descargar ──────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm')
  saveAs(blob, `Torres_Inventario_${dateStr}.xlsx`)
}
