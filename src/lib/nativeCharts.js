/**
 * nativeCharts.js
 * Genera XML de gráficos nativos Open XML (OOXML) para inyectar en archivos XLSX.
 * Compatible con Excel 2007+.
 */

// Namespaces OOXML
const C  = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const A  = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const R  = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'

// Paleta oscura del sistema
const BG     = '1E293B'
const TEXT   = 'E2E8F0'
const MUTED  = '94A3B8'
const BORDER = '334155'
const PLOT   = '253347'

// Colores de series
export const SERIES_COLORS = [
  '10B981', '3B82F6', 'F59E0B', 'F43F5E',
  '8B5CF6', '06B6D4', '84CC16', 'FB923C',
]

// ── Helpers XML ───────────────────────────────────────────────────────────────

const solidFill = (color) =>
  `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`

const axisText = (size = 900) =>
  `<c:txPr><a:bodyPr rot="-2700000"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="0">${solidFill(MUTED)}</a:defRPr></a:pPr></a:p></c:txPr>`

const chartBg = () =>
  `<c:spPr>${solidFill(BG)}<a:ln><a:solidFill><a:srgbClr val="${BORDER}"/></a:solidFill></a:ln></c:spPr>`

const plotAreaBg = () =>
  `<c:spPr>${solidFill(PLOT)}<a:ln><a:solidFill><a:srgbClr val="${BORDER}"/></a:solidFill></a:ln></c:spPr>`

const gridlines = () =>
  `<c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="${BORDER}"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>`

const chartHeader = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${C}" xmlns:a="${A}" xmlns:r="${R}">
  <c:date1904 val="0"/>
  <c:lang val="es-ES"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:layout/>
      ${plotAreaBg()}`

const chartFooter = (legendPos = null) =>
  `    </c:plotArea>
    ${legendPos ? `<c:legend><c:legendPos val="${legendPos}"/><c:overlay val="0"/><c:spPr>${solidFill(BG)}</c:spPr>${axisText(800)}</c:legend>` : '<c:plotVisOnly val="1"/>'}
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  ${chartBg()}
  <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr>${solidFill(TEXT)}</a:defRPr></a:pPr></a:p></c:txPr>
</c:chartSpace>`

function catAx(axId, crossAxId, pos = 'b', rotLabel = false) {
  return `<c:catAx>
    <c:axId val="${axId}"/>
    <c:scaling><c:orientation val="minMax"/></c:scaling>
    <c:delete val="0"/>
    <c:axPos val="${pos}"/>
    <c:tickLblPos val="nextTo"/>
    <c:spPr><a:ln><a:solidFill><a:srgbClr val="${BORDER}"/></a:solidFill></a:ln></c:spPr>
    ${axisText()}
    <c:crossAx val="${crossAxId}"/>
    <c:lblAlgn val="ctr"/>
    ${rotLabel ? '' : ''}
  </c:catAx>`
}

function valAx(axId, crossAxId, pos = 'l', unit = '') {
  return `<c:valAx>
    <c:axId val="${axId}"/>
    <c:scaling><c:orientation val="minMax"/></c:scaling>
    <c:delete val="0"/>
    <c:axPos val="${pos}"/>
    <c:numFmt formatCode="General" sourceLinked="0"/>
    ${gridlines()}
    <c:spPr><a:ln><a:solidFill><a:srgbClr val="${BORDER}"/></a:solidFill></a:ln></c:spPr>
    ${axisText()}
    <c:crossAx val="${crossAxId}"/>
    <c:crosses val="autoZero"/>
  </c:valAx>`
}

// ── Gráfico de Barras (bar vertical) ────────────────────────────────────────

export function barChartXml({ sheet, catRange, valRange, count, color = SERIES_COLORS[0] }) {
  return `${chartHeader()}
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:spPr>
            ${solidFill(color)}
            <a:ln><a:noFill/></a:ln>
          </c:spPr>
          <c:cat>
            <c:strRef>
              <c:f>'${sheet}'!${catRange}</c:f>
              <c:strCache><c:ptCount val="${count}"/></c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>'${sheet}'!${valRange}</c:f>
              <c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${count}"/></c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
        <c:axId val="1001"/>
        <c:axId val="1002"/>
      </c:barChart>
      ${catAx('1001', '1002', 'b', true)}
      ${valAx('1002', '1001')}
${chartFooter()}`
}

// ── Gráfico de Línea (multi-serie) ───────────────────────────────────────────

export function lineChartXml({ sheet, catRange, series, count }) {
  const seriesXml = series.map((s, i) => `
    <c:ser>
      <c:idx val="${i}"/>
      <c:order val="${i}"/>
      <c:tx>
        <c:strRef>
          <c:f>'${sheet}'!${s.nameCell}</c:f>
          <c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${s.name}</c:v></c:pt></c:strCache>
        </c:strRef>
      </c:tx>
      <c:spPr>
        <a:ln w="25400">${solidFill(SERIES_COLORS[i])}</a:ln>
      </c:spPr>
      <c:marker><c:symbol val="none"/></c:marker>
      <c:cat>
        <c:strRef>
          <c:f>'${sheet}'!${catRange}</c:f>
          <c:strCache><c:ptCount val="${count}"/></c:strCache>
        </c:strRef>
      </c:cat>
      <c:val>
        <c:numRef>
          <c:f>'${sheet}'!${s.range}</c:f>
          <c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${count}"/></c:numCache>
        </c:numRef>
      </c:val>
      <c:smooth val="1"/>
    </c:ser>`).join('')

  return `${chartHeader()}
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:axId val="2001"/>
        <c:axId val="2002"/>
      </c:lineChart>
      ${catAx('2001', '2002')}
      ${valAx('2002', '2001')}
${chartFooter('b')}`
}

// ── Gráfico de Dona (capacidad) ───────────────────────────────────────────────

export function doughnutChartXml({ sheet, catRange, valRange, count }) {
  const pts = Array.from({ length: count }, (_, i) =>
    `<c:dPt><c:idx val="${i}"/><c:spPr>${solidFill(SERIES_COLORS[i % SERIES_COLORS.length])}<a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${C}" xmlns:a="${A}" xmlns:r="${R}">
  <c:date1904 val="0"/>
  <c:lang val="es-ES"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:layout/>
      ${plotAreaBg()}
      <c:doughnutChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          ${pts}
          <c:cat>
            <c:strRef>
              <c:f>'${sheet}'!${catRange}</c:f>
              <c:strCache><c:ptCount val="${count}"/></c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>'${sheet}'!${valRange}</c:f>
              <c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${count}"/></c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
        <c:holeSize val="55"/>
      </c:doughnutChart>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:overlay val="0"/>
      <c:spPr>${solidFill(BG)}</c:spPr>
      ${axisText(800)}
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
  ${chartBg()}
</c:chartSpace>`
}

// ── Gráfico de Pastel (valorización) ─────────────────────────────────────────

export function pieChartXml({ sheet, catRange, valRange, count }) {
  const pts = Array.from({ length: count }, (_, i) =>
    `<c:dPt><c:idx val="${i}"/><c:spPr>${solidFill(SERIES_COLORS[i % SERIES_COLORS.length])}<a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${C}" xmlns:a="${A}" xmlns:r="${R}">
  <c:date1904 val="0"/>
  <c:lang val="es-ES"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:layout/>
      ${plotAreaBg()}
      <c:pieChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          ${pts}
          <c:dLbls>
            <c:numFmt formatCode="General" sourceLinked="0"/>
            <c:spPr><a:noFill/></c:spPr>
            <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800">${solidFill(TEXT)}</a:defRPr></a:pPr></a:p></c:txPr>
            <c:showLegendKey val="0"/>
            <c:showVal val="0"/>
            <c:showCatName val="1"/>
            <c:showSerName val="0"/>
            <c:showPercent val="1"/>
            <c:separator> </c:separator>
          </c:dLbls>
          <c:cat>
            <c:strRef>
              <c:f>'${sheet}'!${catRange}</c:f>
              <c:strCache><c:ptCount val="${count}"/></c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>'${sheet}'!${valRange}</c:f>
              <c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${count}"/></c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
      </c:pieChart>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:overlay val="0"/>
      <c:spPr>${solidFill(BG)}</c:spPr>
      ${axisText(800)}
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
  ${chartBg()}
</c:chartSpace>`
}

// ── Drawing XML (posiciona charts en la hoja) ─────────────────────────────────

/**
 * @param {Array<{rId, fromCol, fromRow, toCol, toRow, id, name}>} charts
 */
export function drawingXml(charts) {
  const anchors = charts.map(c => `
  <xdr:twoCellAnchor moveWithCells="0" sizeWithCells="0">
    <xdr:from>
      <xdr:col>${c.fromCol}</xdr:col><xdr:colOff>114300</xdr:colOff>
      <xdr:row>${c.fromRow}</xdr:row><xdr:rowOff>114300</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>${c.toCol}</xdr:col><xdr:colOff>0</xdr:colOff>
      <xdr:row>${c.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff>
    </xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${c.id}" name="${c.name}"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="${C}">
          <c:chart xmlns:c="${C}" xmlns:r="${R}" r:id="${c.rId}"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${XDR}" xmlns:a="${A}" xmlns:r="${R}" xmlns:c="${C}">
  ${anchors}
</xdr:wsDr>`
}

/**
 * Relationships del drawing (drawing → charts)
 * @param {Array<{rId, chartFile}>} entries
 */
export function drawingRelsXml(entries) {
  const rels = entries.map(e =>
    `<Relationship Id="${e.rId}" Type="${R}/chart" Target="../charts/${e.chartFile}"/>`
  ).join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
</Relationships>`
}

/** Relationships vacíos de un chart (sin colores externos, etc.) */
export function chartRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
}
