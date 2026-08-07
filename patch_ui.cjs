const fs = require('fs')

let pano = fs.readFileSync('src/components/PanoramaView.jsx', 'utf8')
let detail = fs.readFileSync('src/components/DetailDrawer.jsx', 'utf8')

// PANORAMAVIEW
// Fix costoTotalTorre calculation
pano = pano.replace(
  /const medidaToUse = f\.medida \|\| torre\.nombre_medida\s+if \(medidaToUse\) \{\s+const normalized = normalizeMedida\(medidaToUse\)\s+const catItem = catalogoCostos\.find\(c => c\.medida === normalized\)\s+if \(catItem\) \{\s+costoTotalTorre \+= \(f\.peso \* parseFloat\(catItem\.costo_kg\)\)\s+\}\s+\}/g,
  `costoTotalTorre += (f.peso * (parseFloat(f.costo_kg_ingreso) || 0))`
)

// Remove Administrador restriction in PanoramaView
pano = pano.replace(
  /\{userProfile\?\.rol === 'Administrador' && \(\s*<div className="flex justify-between items-center pt-1\.5 animate-fadeIn">/g,
  `<div className="flex justify-between items-center pt-1.5 animate-fadeIn">`
)
pano = pano.replace(
  /<\/span>\s*<\/div>\s*\)\}/g,
  `</span>
                    </div>`
)

// DETAIL DRAWER
// Fix costoFleje calculation
detail = detail.replace(
  /const medidaToUse = fleje\.medida \|\| torre\.nombre_medida\s+let costoFleje = 0\s+if \(medidaToUse\) \{\s+const normalized = normalizeMedida\(medidaToUse\)\s+const catItem = catalogoCostos\.find\(c => c\.medida === normalized\)\s+if \(catItem\) costoFleje = fleje\.peso \* parseFloat\(catItem\.costo_kg\)\s+\}/g,
  `const costoFleje = fleje.peso * (parseFloat(fleje.costo_kg_ingreso) || 0)`
)

// In DetailDrawer, the total valorizado is not there. Wait, is it? Let's check if the first screenshot was DetailDrawer.
// The first screenshot is definitely DetailDrawer. It has "#5, #4, #3", "Total Peso: 12.530 t", "VALORIZADO: S/ 33,705.70".
// Let's add VALORIZADO to DetailDrawer if it doesn't have it, or modify it.
// The code I read from DetailDrawer:
/*
          <div className="bg-bg border border-border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Total Peso:
              </span>
              <strong className="text-foreground font-mono text-sm">{pesoTotal.toFixed(2)} kg</strong>
            </div>
            ...
*/
// Let's inject VALORIZADO into DetailDrawer.
detail = detail.replace(
  /const pesoTotal = flejes\.reduce\(\(sum, f\) => sum \+ f\.peso, 0\)/,
  `const pesoTotal = flejes.reduce((sum, f) => sum + f.peso, 0)
  const costoTotalTorre = flejes.reduce((sum, f) => sum + (f.peso * (parseFloat(f.costo_kg_ingreso) || 0)), 0)`
)

detail = detail.replace(
  /<strong className="text-foreground font-mono text-sm">\{pesoPromedio\.toFixed\(2\)\} kg<\/strong>\s*<\/div>\s*<\/div>/,
  `<strong className="text-foreground font-mono text-sm">{pesoPromedio.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-border mt-2">
              <span className="text-[10px] text-text-muted font-bold tracking-wide uppercase">
                VALORIZADO:
              </span>
              <strong className="text-accent font-mono text-sm">S/ {costoTotalTorre.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
            </div>
          </div>`
)

fs.writeFileSync('src/components/PanoramaView.jsx', pano)
fs.writeFileSync('src/components/DetailDrawer.jsx', detail)
console.log('UI Patched')
