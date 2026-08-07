const fs = require('fs')

let pano = fs.readFileSync('src/components/PanoramaView.jsx', 'utf8')

pano = pano.replace(
  /const showDiffMeasure = fleje\.medida && fleje\.medida !== torre\.nombre_medida/,
  `const showDiffMeasure = fleje.medida && fleje.medida !== torre.nombre_medida
                const costoFleje = fleje.peso * (parseFloat(fleje.costo_kg_ingreso) || 0)`
)

pano = pano.replace(
  /<div className="flex items-center gap-1\.5 overflow-hidden">([\s\S]*?)<\/div>/,
  `<div className="flex flex-col items-center justify-center flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        $1
                      </div>
                      {costoFleje > 0 && (
                        <span className={\`text-[8.5px] font-bold font-mono leading-none mt-0.5 \${isSelected ? 'text-white/90' : 'text-accent'}\`}>
                          S/ {costoFleje.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      )}
                    </div>`
)

fs.writeFileSync('src/components/PanoramaView.jsx', pano)
console.log('PanoramaView updated to show individual valuation.')
