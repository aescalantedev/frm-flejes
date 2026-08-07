const fs = require('fs');

// 1. Update AnalisisView.jsx
let analisis = fs.readFileSync('src/components/AnalisisView.jsx', 'utf8');

analisis = analisis.replace(
  /rows\.push\(\{ torre: t\.posicion, nivel: idx \+ 1, medida, peso, valor \}\)/g,
  'rows.push({ torre: t.posicion, nivel: idx + 1, codigo: f.codigo, glosa: f.glosa, medida, peso, valor })'
);

analisis = analisis.replace(
  /\{\s*key:\s*"nivel",\s*label:\s*"#",\s*align:\s*"center"\s*\},\s*\{\s*key:\s*"medida",\s*label:\s*"Medida",\s*align:\s*"center"\s*\}/g,
  `{ key: "nivel", label: "#", align: "center" },
                      { key: "codigo", label: "Código", align: "left" },
                      { key: "glosa", label: "Descripción", align: "left" },
                      { key: "medida", label: "Medida", align: "center" }`
);

analisis = analisis.replace(
  /<td className="px-4 py-2\.5 text-center text-xs text-text-muted">#\{row\.nivel\}<\/td>\s*<td className="px-4 py-2\.5 text-center font-mono text-xs">\{row\.medida\}<\/td>/g,
  `<td className="px-4 py-2.5 text-center text-xs text-text-muted">#{row.nivel}</td>
                      <td className="px-4 py-2.5 text-left font-mono text-xs text-text-muted">{row.codigo || "-"}</td>
                      <td className="px-4 py-2.5 text-left text-xs truncate max-w-[150px]">{row.glosa || "-"}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs">{row.medida}</td>`
);
analisis = analisis.replace(
  /<td colSpan="3" className="px-4 py-2\.5 text-\[10px\] font-bold text-text-muted uppercase tracking-wider">Total/g,
  `<td colSpan="5" className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Total`
);
analisis = analisis.replace(
  /<td colSpan="5" className="px-6 py-10/g,
  `<td colSpan="7" className="px-6 py-10`
);

fs.writeFileSync('src/components/AnalisisView.jsx', analisis);

// 2. Update reportUtils.js
let report = fs.readFileSync('src/lib/reportUtils.js', 'utf8');

report = report.replace(
  /const columns = \[\s*\{\s*header:\s*'Torre',([^}]+)\},\s*\{\s*header:\s*'Nivel \(Fleje\)',([^}]+)\},\s*\{\s*header:\s*'Medida',([^}]+)\},\s*\{\s*header:\s*`Peso\s*\(\$\{isTN \? 't' : 'kg'\}\)`,\s*key:\s*'peso',\s*width:\s*15\s*\},/g,
  `const columns = [
    { header: 'Torre', $1 },
    { header: 'Nivel (Fleje)', $2 },
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Glosa', key: 'glosa', width: 30 },
    { header: 'Medida', $3 },
    { header: \`Peso (\${isTN ? 't' : 'kg'})\`, key: 'peso', width: 15 },`
);

report = report.replace(
  /let rowData = \{\s*torre:\s*t\.posicion,\s*nivel:\s*`#\$\{idx \+ 1\}`,\s*medida:\s*medidaToUse,\s*peso:\s*pesoFormat\s*\}/g,
  `let rowData = {
        torre: t.posicion,
        nivel: \`#\${idx + 1}\`,
        codigo: f.codigo || '-',
        glosa: f.glosa || '-',
        medida: medidaToUse,
        peso: pesoFormat
      }`
);

// We need to adjust cell formatting indices in reportUtils.js for exportarInventarioExcel
report = report.replace(
  /if \(colNumber === 3\) cell\.alignment\.horizontal = 'center' \/\/ Medida/g,
  `if (colNumber === 5) cell.alignment.horizontal = 'center' // Medida
          if (colNumber === 3 || colNumber === 4) cell.alignment.horizontal = 'left' // Codigo, Glosa`
);
report = report.replace(
  /row\.getCell\(4\)\.numFmt = '#,##0\.00'/g,
  `row.getCell(6).numFmt = '#,##0.00'`
);
report = report.replace(
  /row\.getCell\(5\)\.numFmt = '"S\/" #,##0\.00'/g,
  `row.getCell(7).numFmt = '"S/" #,##0.00'`
);
report = report.replace(
  /to:\s*isAdmin \? 'E1' : 'D1'/g,
  `to: isAdmin ? 'G1' : 'F1'`
);

// update sheet 2 for exportarAnalisisExcel
report = report.replace(
  /const colsInv = \[\s*\{\s*header:\s*'Torre',\s*key:\s*'torre',\s*width:\s*14\s*\},\s*\{\s*header:\s*'Nivel',\s*key:\s*'nivel',\s*width:\s*10\s*\},\s*\{\s*header:\s*'Medida',\s*key:\s*'medida',\s*width:\s*22\s*\},\s*\{\s*header:\s*`Peso\s*\(\$\{unit\}\)`,\s*key:\s*'peso',\s*width:\s*16\s*\},\s*\.\.\.\(isAdmin \? \[\{\s*header:\s*'Valorización \(S\/\)',\s*key:\s*'valor',\s*width:\s*22\s*\}\] : \[\]\),\s*\]/g,
  `const colsInv = [
    { header: 'Torre',  key: 'torre',  width: 14 },
    { header: 'Nivel',  key: 'nivel',  width: 10 },
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Glosa', key: 'glosa', width: 30 },
    { header: 'Medida', key: 'medida', width: 22 },
    { header: \`Peso (\${unit})\`, key: 'peso', width: 16 },
    ...(isAdmin ? [{ header: 'Valorización (S/)', key: 'valor', width: 22 }] : []),
  ]`
);

report = report.replace(
  /const rowData = \{\s*torre:\s*t\.posicion,\s*nivel:\s*`#\$\{idx \+ 1\}`,\s*medida,\s*peso:\s*parseFloat\(pesoVal\.toFixed\(2\)\)\s*\}/g,
  `const rowData = { torre: t.posicion, nivel: \`#\${idx + 1}\`, codigo: f.codigo || '-', glosa: f.glosa || '-', medida, peso: parseFloat(pesoVal.toFixed(2)) }`
);

report = report.replace(
  /row\.getCell\(4\)\.numFmt = '#,##0\.00'/g,
  `row.getCell(6).numFmt = '#,##0.00'`
);
report = report.replace(
  /if \(isAdmin\) row\.getCell\(5\)\.numFmt = '"S\/" #,##0\.00'/g,
  `if (isAdmin) row.getCell(7).numFmt = '"S/" #,##0.00'`
);


fs.writeFileSync('src/lib/reportUtils.js', report);
console.log('AnalisisView.jsx and reportUtils.js updated');
