const fs = require('fs')

let app = fs.readFileSync('src/App.jsx', 'utf8')
app = app.replace(
  /<TorreFormModal\s+isOpen=\{torreFormOpen\}\s+onClose=\{.*?\}\s+torre=\{editingTorre\}\s+onSave=\{handleSaveTorre\}\s+\/>/,
  `<TorreFormModal 
          isOpen={torreFormOpen}
          onClose={() => setTorreFormOpen(false)}
          torre={editingTorre}
          onSave={handleSaveTorre}
          catalogoCostos={catalogoCostos}
        />`
)
fs.writeFileSync('src/App.jsx', app)

let form = fs.readFileSync('src/components/TorreFormModal.jsx', 'utf8')
form = form.replace(
  /import \{ (.*?) \} from 'lucide-react'/,
  `import { $1 } from 'lucide-react'\nimport SearchableSelect from './SearchableSelect'`
)
form = form.replace(
  /export default function TorreFormModal\(\{ \n  isOpen, \n  onClose, \n  torre, \n  onSave \n\}\) \{/,
  `export default function TorreFormModal({ 
  isOpen, 
  onClose, 
  torre, 
  onSave,
  catalogoCostos = []
}) {`
)

form = form.replace(
  /const \[nombreMedida, setNombreMedida\] = useState\(''\)/,
  `const [selectedProductoId, setSelectedProductoId] = useState('')
  const [nombreMedida, setNombreMedida] = useState('')`
)

// In useEffect
form = form.replace(
  /if \(torre\) \{\n        setPosicion\(torre\.posicion\)\n        setNombreMedida\(torre\.nombre_medida\)\n        setCantidadMaxima\(torre\.cantidad_maxima\.toString\(\)\)\n      \} else \{/,
  `if (torre) {
        setPosicion(torre.posicion)
        setNombreMedida(torre.nombre_medida)
        setCantidadMaxima(torre.cantidad_maxima.toString())
        
        // Tratar de buscar si coincide con un producto
        const match = catalogoCostos.find(c => c.medida_corta === torre.nombre_medida || c.medida === torre.nombre_medida)
        if (match) setSelectedProductoId(match.producto_id || match.id)
        else setSelectedProductoId('')
      } else {`
)
form = form.replace(
  /setNombreMedida\(''\)\n        setCantidadMaxima\('5'\) \/\/ default capacity/,
  `setNombreMedida('')
        setSelectedProductoId('')
        setCantidadMaxima('5') // default capacity`
)

// In handleSubmit
form = form.replace(
  /if \(!nombreMedida\.trim\(\)\) \{/,
  `const finalMedida = nombreMedida.trim()
    if (!finalMedida) {`
)
form = form.replace(
  /nombre_medida: nombreMedida\.trim\(\),/,
  `nombre_medida: finalMedida,`
)

// Render input
form = form.replace(
  /<div className="relative">\s*<input\s*type="text"\s*placeholder="Ej: 304 x 2\.00"[\s\S]*?<\/div>/,
  `<div className="relative h-11">
                <SearchableSelect
                  options={catalogoCostos.map(p => ({
                    value: p.producto_id || p.id,
                    label: p.medida_corta || p.medida,
                    sublabel: p.glosa ? \`\${p.codigo} - \${p.glosa}\` : p.codigo
                  }))}
                  value={selectedProductoId}
                  onChange={(id) => {
                    setSelectedProductoId(id)
                    const p = catalogoCostos.find(x => (x.producto_id || x.id) === id)
                    if (p) setNombreMedida(p.medida_corta || p.medida)
                  }}
                  placeholder="Seleccionar Medida Oficial..."
                />
              </div>`
)

fs.writeFileSync('src/components/TorreFormModal.jsx', form)
console.log('Done patching form modal')
