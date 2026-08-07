const fs = require('fs')
let batch = fs.readFileSync('src/components/BatchIngresoModal.jsx', 'utf8')

batch = batch.replace(
  /import \{ (.*?) \} from 'lucide-react'/,
  `import { $1 } from 'lucide-react'
import SearchableSelect from './SearchableSelect'`
)

batch = batch.replace(
  /<select[\s\S]*?<\/select>/,
  `<div className="h-11 w-full">
                  <SearchableSelect
                    options={catalogoProductos.map(p => ({
                      value: getProdId(p),
                      label: p.medida_corta || p.medida,
                      sublabel: p.glosa ? \`\${p.codigo} - \${p.glosa}\` : p.codigo
                    }))}
                    value={currentProductoId}
                    onChange={setCurrentProductoId}
                    placeholder="Seleccionar Producto Oficial..."
                  />
                </div>`
)

fs.writeFileSync('src/components/BatchIngresoModal.jsx', batch)
console.log('BatchIngresoModal patched.')
