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
      operacionText = h.motivo ? h.motivo.toUpperCase() : 'DESPACHO'
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

/**
 * Exporta la vista de Análisis con gráficos NATIVOS de Excel.
 * Estructura:
 *   Hoja 1 "Dashboard"  → KPIs + 4 gráficos nativos en layout 2×2
 *   Hoja 2 "Inventario" → tabla completa fleje a fleje
 *   Hoja 3 "Datos"      → datos de referencia para los gráficos (oculta)
 */
export const exportarAnalisisExcel = async ({
  totalPeso,
  capacidadOcupada,
  capacidadTotal,
  valorizacionTotal,
  torres,
  inventario,
  catalogoCostos,
  historial = [],
  periodoMovimientos = 30,
  topNTorres = 10,
  isTN,
  userProfile,
}) => {
  // Importaciones dinámicas (evitan build circular)
  const JSZip = (await import('jszip')).default
  const {
    barChartXml,
    lineChartXml,
    doughnutChartXml,
    pieChartXml,
    drawingXml,
    drawingRelsXml,
    chartRelsXml,
  } = await import('./nativeCharts.js')

  const unit    = isTN ? 't' : 'kg'
  const isAdmin = userProfile?.rol === 'Administrador'
  const DATA_SHEET = 'Datos'   // nombre de la hoja de datos

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CALCULAR DATOS PARA CADA GRÁFICO
  // ─────────────────────────────────────────────────────────────────────────

  // ── Peso por Torre (bar chart) ────────────────────────────────────────────
  const pesoPorTorre = torres
    .map(t => {
      const peso = (inventario[t.id] || []).reduce((s, f) => s + f.peso, 0)
      return { name: t.posicion || 'N/A', peso }
    })
    .filter(t => t.peso > 0)
    .sort((a, b) => b.peso - a.peso)
    .slice(0, topNTorres)

  // ── Tendencia de Movimientos (line chart) ─────────────────────────────────
  const limitDate = new Date()
  limitDate.setDate(limitDate.getDate() - periodoMovimientos)
  const movMap = {}
  historial.forEach(h => {
    const d = new Date(h.created_at)
    if (d < limitDate) return
    const ds = d.toISOString().split('T')[0]
    if (!movMap[ds]) movMap[ds] = { ingresos: 0, salidas: 0 }
    const motivo = (h.motivo || '').toLowerCase()
    const peso = h.peso_fleje || 0
    if (h.despacho_id || motivo.includes('despacho') || motivo.includes('salida') || motivo.includes('consumo')) movMap[ds].salidas += peso
    else if (motivo.includes('ingreso') || h.recepcion_id) movMap[ds].ingresos += peso
  })
  const movDates   = Object.keys(movMap).sort()
  const movIngr    = movDates.map(d => parseFloat((movMap[d].ingresos / (isTN ? 1000 : 1)).toFixed(2)))
  const movSal     = movDates.map(d => parseFloat((movMap[d].salidas  / (isTN ? 1000 : 1)).toFixed(2)))

  // ── Capacidad (donut chart) ───────────────────────────────────────────────
  const capData = [
    { name: `Ocupado (${capacidadOcupada})`, val: capacidadOcupada },
    { name: `Libre (${capacidadTotal - capacidadOcupada})`, val: Math.max(0, capacidadTotal - capacidadOcupada) },
  ]

  // ── Valorización por Medida (pie chart — admin only) ───────────────────────
  // normalizeMedida ya está definida a nivel de módulo — la reutilizamos directamente
  const valMap = {}
  if (isAdmin) {
    torres.forEach(t => {
      (inventario[t.id] || []).forEach(f => {
        const m = normalizeMedida(f.medida || t.nombre_medida)
        if (!m) return
        const cat = catalogoCostos.find(c => c.medida === m)
        if (cat) valMap[m] = (valMap[m] || 0) + f.peso * parseFloat(cat.costo_kg)
      })
    })
  }
  let valData = Object.keys(valMap)
    .map(m => ({ name: m, val: parseFloat(valMap[m].toFixed(2)) }))
    .filter(d => d.val > 0)
    .sort((a, b) => b.val - a.val)
  if (valData.length > 8) valData = [
    ...valData.slice(0, 8),
    { name: 'Otros', val: parseFloat(valData.slice(8).reduce((s, d) => s + d.val, 0).toFixed(2)) },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CREAR EL LIBRO CON EXCELJS (sin gráficos todavía)
  // ─────────────────────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Flejes'
  workbook.created = new Date()

  // ── Hoja 1: Dashboard (KPIs) ──────────────────────────────────────────────
  const dash = workbook.addWorksheet('Dashboard')

  dash.mergeCells('A1:L1')
  Object.assign(dash.getCell('A1'), {
    value: 'ANÁLISIS Y ESTADÍSTICAS — SISTEMA DE FLEJES',
    font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  })
  dash.getRow(1).height = 34

  dash.mergeCells('A2:L2')
  Object.assign(dash.getCell('A2'), {
    value: `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}  ·  Unidad: ${isTN ? 'Toneladas (t)' : 'Kilogramos (kg)'}`,
    font: { name: 'Calibri', size: 10, color: { argb: 'FF94A3B8' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  })
  dash.getRow(2).height = 18

  // Fila separadora
  dash.getRow(3).height = 8

  // KPIs
  const kpiHeaders = [['KPI', 'Valor', 'Detalle']]
  kpiHeaders[0].forEach((h, i) => {
    const cell = dash.getCell(4, i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  dash.getRow(4).height = 20

  const kpiRows = [
    ['Peso Total Almacenado', `${isTN ? (totalPeso / 1000).toFixed(2) : totalPeso.toFixed(0)} ${unit}`, 'Suma de todos los flejes en inventario', 'FF10B981'],
    ['Ocupación General', `${capacidadTotal > 0 ? ((capacidadOcupada / capacidadTotal) * 100).toFixed(1) : '0.0'}%`, `${capacidadOcupada} de ${capacidadTotal} posiciones`, 'FFF59E0B'],
    ...(isAdmin && valorizacionTotal != null
      ? [['Valorización Total', `S/ ${valorizacionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Calculado con el catálogo de costos', 'FF6366F1']]
      : []),
  ]
  kpiRows.forEach((row, i) => {
    const r = dash.getRow(5 + i)
    r.height = 20
    ;[row[0], row[1], row[2]].forEach((val, j) => {
      const c = dash.getCell(5 + i, j + 1)
      c.value = val
      c.font = { size: 10, bold: j === 0, color: { argb: j === 1 ? row[3] : 'FFE2E8F0' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF1E293B' : 'FF253347' } }
      c.alignment = { vertical: 'middle', horizontal: j === 1 ? 'center' : 'left' }
      c.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
    })
  })

  // Ajustar anchos col A-C (KPIs) y D-L (espacio para charts)
  dash.getColumn(1).width = 26
  dash.getColumn(2).width = 20
  dash.getColumn(3).width = 46
  for (let c = 4; c <= 12; c++) dash.getColumn(c).width = 14

  // Filas para los gráficos: reservar espacio visual (rows 9–48)
  const CHART_TITLE_ROW_1 = 8   // fila título row 1 de charts
  const CHART_IMG_START_1 = 9   // primera fila imagen
  const CHART_IMG_END_1   = 28  // última fila imagen
  const CHART_TITLE_ROW_2 = 30
  const CHART_IMG_START_2 = 31
  const CHART_IMG_END_2   = 50

  // Labels de sección para los gráficos
  const makeChartLabel = (row, col, title) => {
    dash.getRow(row).height = 18
    const cell = dash.getCell(row, col)
    cell.value = title
    cell.font = { bold: true, size: 10, color: { argb: 'FFCBD5E1' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
  }
  makeChartLabel(CHART_TITLE_ROW_1, 1, `Peso por Torre (Top ${topNTorres}) — ${unit}`)
  makeChartLabel(CHART_TITLE_ROW_1, 7, `Tendencia de Movimientos — últimos ${periodoMovimientos} días`)
  makeChartLabel(CHART_TITLE_ROW_2, 1, 'Capacidad del Almacén')
  if (isAdmin) makeChartLabel(CHART_TITLE_ROW_2, 7, 'Valorización por Medida (S/)')

  for (let r = CHART_IMG_START_1; r <= CHART_IMG_END_2; r++) dash.getRow(r).height = 18

  // ── Hoja 2: Inventario ────────────────────────────────────────────────────
  const inv = workbook.addWorksheet('Inventario')
  const colsInv = [
    { header: 'Torre',  key: 'torre',  width: 14 },
    { header: 'Nivel',  key: 'nivel',  width: 10 },
    { header: 'Medida', key: 'medida', width: 22 },
    { header: `Peso (${unit})`, key: 'peso', width: 16 },
    ...(isAdmin ? [{ header: 'Valorización (S/)', key: 'valor', width: 22 }] : []),
  ]
  inv.columns = colsInv
  styleHeaderRow(inv, colsInv.length)
  torres.forEach(t => {
    (inventario[t.id] || []).forEach((f, idx) => {
      const medida = f.medida || t.nombre_medida || '-'
      const pesoVal = isTN ? f.peso / 1000 : f.peso
      let valorVal = null
      if (isAdmin) {
        const cat = catalogoCostos.find(c => c.medida === normalizeMedida(medida))
        if (cat) valorVal = f.peso * parseFloat(cat.costo_kg)
      }
      const rowData = { torre: t.posicion, nivel: `#${idx + 1}`, medida, peso: parseFloat(pesoVal.toFixed(2)) }
      if (isAdmin) rowData.valor = valorVal != null ? parseFloat(valorVal.toFixed(2)) : null
      const row = inv.addRow(rowData)
      row.getCell(4).numFmt = '#,##0.00'
      if (isAdmin) row.getCell(5).numFmt = '"S/" #,##0.00'
    })
  })
  inv.autoFilter = { from: 'A1', to: isAdmin ? 'E1' : 'D1' }

  // ── Hoja 3: Datos de gráficos (oculta) ───────────────────────────────────
  const datos = workbook.addWorksheet(DATA_SHEET, { state: 'hidden' })

  // Columnas: A-B → peso torre | D-F → movimientos | H-I → capacidad | K-L → valorización
  // ── Peso por Torre ──────
  datos.getCell('A1').value = 'Torre'
  datos.getCell('B1').value = `Peso (${unit})`
  pesoPorTorre.forEach((d, i) => {
    datos.getCell(i + 2, 1).value = d.name
    datos.getCell(i + 2, 2).value = parseFloat((isTN ? d.peso / 1000 : d.peso).toFixed(2))
  })
  const torresCount = pesoPorTorre.length

  // ── Movimientos ──────────
  datos.getCell('D1').value = 'Fecha'
  datos.getCell('E1').value = `Ingresos (${unit})`
  datos.getCell('F1').value = `Salidas (${unit})`
  movDates.forEach((d, i) => {
    datos.getCell(i + 2, 4).value = d
    datos.getCell(i + 2, 5).value = movIngr[i]
    datos.getCell(i + 2, 6).value = movSal[i]
  })
  const movCount = movDates.length

  // ── Capacidad ─────────────
  datos.getCell('H1').value = 'Estado'
  datos.getCell('I1').value = 'Flejes'
  capData.forEach((d, i) => {
    datos.getCell(i + 2, 8).value = d.name
    datos.getCell(i + 2, 9).value = d.val
  })

  // ── Valorización ─────────
  if (isAdmin && valData.length > 0) {
    datos.getCell('K1').value = 'Medida'
    datos.getCell('L1').value = 'Valor (S/)'
    valData.forEach((d, i) => {
      datos.getCell(i + 2, 11).value = d.name
      datos.getCell(i + 2, 12).value = d.val
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SERIALIZAR CON EXCELJS → BUFFER → ABRIR CON JSZIP
  // ─────────────────────────────────────────────────────────────────────────
  const xlsxBuffer = await workbook.xlsx.writeBuffer()
  const zip = await JSZip.loadAsync(xlsxBuffer)

  // ─────────────────────────────────────────────────────────────────────────
  // 4. GENERAR XML DE GRÁFICOS Y AÑADIRLOS AL ZIP
  // ─────────────────────────────────────────────────────────────────────────

  // Definición de los 4 charts
  const chartsToAdd = []

  // Chart 1: Barras — Peso por Torre
  if (torresCount > 0) {
    chartsToAdd.push({
      file: 'chart1.xml',
      xml: barChartXml({
        sheet: DATA_SHEET,
        catRange: `$A$2:$A$${torresCount + 1}`,
        valRange: `$B$2:$B$${torresCount + 1}`,
        count: torresCount,
        color: '10B981',
      }),
    })
  }

  // Chart 2: Líneas — Movimientos
  if (movCount > 0) {
    chartsToAdd.push({
      file: 'chart2.xml',
      xml: lineChartXml({
        sheet: DATA_SHEET,
        catRange: `$D$2:$D$${movCount + 1}`,
        count: movCount,
        series: [
          { name: `Ingresos (${unit})`, nameCell: `$E$1`, range: `$E$2:$E$${movCount + 1}` },
          { name: `Salidas (${unit})`,  nameCell: `$F$1`, range: `$F$2:$F$${movCount + 1}` },
        ],
      }),
    })
  }

  // Chart 3: Dona — Capacidad
  chartsToAdd.push({
    file: 'chart3.xml',
    xml: doughnutChartXml({
      sheet: DATA_SHEET,
      catRange: '$H$2:$H$3',
      valRange: '$I$2:$I$3',
      count: 2,
    }),
  })

  // Chart 4: Pie — Valorización (solo admin)
  if (isAdmin && valData.length > 0) {
    chartsToAdd.push({
      file: 'chart4.xml',
      xml: pieChartXml({
        sheet: DATA_SHEET,
        catRange: `$K$2:$K$${valData.length + 1}`,
        valRange: `$L$2:$L$${valData.length + 1}`,
        count: valData.length,
      }),
    })
  }

  // Añadir archivos de chart + sus rels al ZIP
  chartsToAdd.forEach(({ file, xml }) => {
    zip.file(`xl/charts/${file}`, xml)
    zip.file(`xl/charts/_rels/${file}.rels`, chartRelsXml())
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 5. DRAWING XML — posiciona los charts en la hoja Dashboard (sheet1)
  // ─────────────────────────────────────────────────────────────────────────
  // Layout 2×2:
  //   chart1 → cols 0-5, rows 8-28 (izquierda arriba)
  //   chart2 → cols 6-11, rows 8-28 (derecha arriba)
  //   chart3 → cols 0-5, rows 30-50 (izquierda abajo)
  //   chart4 → cols 6-11, rows 30-50 (derecha abajo)

  const drawingCharts = chartsToAdd.map((c, i) => {
    const col    = (i % 2) * 6           // 0 o 6
    const rowOff = Math.floor(i / 2)     // 0 o 1
    const rowStart = rowOff === 0 ? CHART_IMG_START_1 - 1 : CHART_IMG_START_2 - 1
    const rowEnd   = rowOff === 0 ? CHART_IMG_END_1       : CHART_IMG_END_2
    return {
      rId:     `rId${i + 1}`,
      fromCol: col, fromRow: rowStart,
      toCol:   col + 6, toRow: rowEnd,
      id:      i + 2,
      name:    `Gráfico ${i + 1}`,
    }
  })

  zip.file('xl/drawings/drawing1.xml', drawingXml(drawingCharts))
  zip.file('xl/drawings/_rels/drawing1.xml.rels', drawingRelsXml(
    chartsToAdd.map((c, i) => ({ rId: `rId${i + 1}`, chartFile: c.file }))
  ))

  // ─────────────────────────────────────────────────────────────────────────
  // 6. VINCULAR DRAWING A SHEET1 (Dashboard)
  //    ExcelJS numera sheets como sheet1.xml, sheet2.xml, ...
  // ─────────────────────────────────────────────────────────────────────────
  const sheet1Path = 'xl/worksheets/sheet1.xml'
  let sheet1Xml = await zip.file(sheet1Path)?.async('string') || ''
  if (!sheet1Xml.includes('<drawing')) {
    // Insertar <drawing r:id="rId_draw1"/> antes de </worksheet>
    sheet1Xml = sheet1Xml.replace(
      '</worksheet>',
      '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId_draw1"/></worksheet>'
    )
    zip.file(sheet1Path, sheet1Xml)
  }

  // Relationships de sheet1 → drawing
  const sheet1RelsPath = 'xl/worksheets/_rels/sheet1.xml.rels'
  let sheet1Rels = await zip.file(sheet1RelsPath)?.async('string') || ''
  const drawingRelEntry = `<Relationship Id="rId_draw1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`
  if (!sheet1Rels.includes('drawing1.xml')) {
    if (sheet1Rels.includes('</Relationships>')) {
      sheet1Rels = sheet1Rels.replace('</Relationships>', `${drawingRelEntry}</Relationships>`)
    } else {
      sheet1Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${drawingRelEntry}
</Relationships>`
    }
    zip.file(sheet1RelsPath, sheet1Rels)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. ACTUALIZAR [Content_Types].xml
  // ─────────────────────────────────────────────────────────────────────────
  let ct = await zip.file('[Content_Types].xml')?.async('string') || ''

  const ctChart   = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'
  const ctDrawing = 'application/vnd.openxmlformats-officedocument.drawing+xml'

  // Añadir tipo de dibujo si no existe
  if (!ct.includes(ctDrawing)) {
    ct = ct.replace('</Types>', `<Override PartName="/xl/drawings/drawing1.xml" ContentType="${ctDrawing}"/></Types>`)
  }
  // Añadir tipo de charts si no existen
  chartsToAdd.forEach(({ file }) => {
    const partName = `/xl/charts/${file}`
    if (!ct.includes(partName)) {
      ct = ct.replace('</Types>', `<Override PartName="${partName}" ContentType="${ctChart}"/></Types>`)
    }
  })
  zip.file('[Content_Types].xml', ct)

  // ─────────────────────────────────────────────────────────────────────────
  // 8. DESCARGAR
  // ─────────────────────────────────────────────────────────────────────────
  const finalBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
  const blob = new Blob([finalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm')
  saveAs(blob, `Analisis_Dashboard_${dateStr}.xlsx`)
}
