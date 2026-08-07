const fs = require('fs')

let app = fs.readFileSync('src/App.jsx', 'utf8')
let detail = fs.readFileSync('src/components/DetailDrawer.jsx', 'utf8')

// App.jsx -> handleEditarFleje
app = app.replace(
  /const handleEditarFleje = async \(id, nuevoPeso, nuevaMedida\) => \{[\s\S]*?if \(error\) throw error/m,
  `const handleEditarFleje = async (id, nuevoPeso, nuevoProductoId, nuevoCosto) => {
    if (isNaN(nuevoPeso) || nuevoPeso <= 0) {
      showToast('El peso debe ser un número positivo', true)
      return false
    }

    try {
      const updateData = { peso_kg: nuevoPeso }
      if (nuevoProductoId !== undefined) {
        updateData.producto_id = nuevoProductoId
        if (nuevoCosto !== undefined) updateData.costo_kg_ingreso = nuevoCosto
      }

      const { error } = await supabase
        .from('flejes')
        .update(updateData)
        .eq('id', id)

      if (error) throw error`
)

// DetailDrawer.jsx -> Import SearchableSelect
detail = detail.replace(
  /import \{ (.*?) \} from 'lucide-react'/,
  `import { $1 } from 'lucide-react'
import SearchableSelect from './SearchableSelect'`
)

// DetailDrawer.jsx -> getProdId
detail = detail.replace(
  /const getProgressColor = \(pct\) => \{/,
  `// Utilidad para extraer ID del producto
  const getProdId = (p) => p.producto_id || p.id
  
  const getProgressColor = (pct) => {`
)

// DetailDrawer.jsx -> editModalConfig state and handleStartEdit
detail = detail.replace(
  /const handleStartEdit = \(fleje, num\) => \{[\s\S]*?setEditMedida\(fleje\.medida \|\| ''\)\s*\}/m,
  `const handleStartEdit = (fleje, num) => {
    setEditModalConfig({ 
      id: fleje.id, 
      num, 
      peso: fleje.peso, 
      producto_id: fleje.producto_id,
      medida: fleje.medida || '' 
    })
    setEditPeso(String(fleje.peso))
    setEditMedida(fleje.producto_id || '')
  }`
)

// DetailDrawer.jsx -> handleSaveEditClick
detail = detail.replace(
  /const handleSaveEditClick = \(\) => \{[\s\S]*?await onEditarFleje\(editModalConfig\.id, val, finalMedida\)[\s\S]*?\}\)/m,
  `const handleSaveEditClick = () => {
    const val = parseFloat(editPeso)
    if (isNaN(val) || val <= 0) {
      alert('Por favor ingresa un peso válido positivo.')
      return
    }
    
    // Abrir confirmación
    const msgChanges = []
    if (editPeso !== String(editModalConfig.peso)) {
      msgChanges.push(\`peso de \${editModalConfig.peso.toFixed(2)} kg a \${val.toFixed(2)} kg\`)
    }
    
    let prod = null
    if (editMedida !== editModalConfig.producto_id && editMedida !== '') {
      prod = catalogoCostos.find(p => getProdId(p) === editMedida)
      if (prod) {
        msgChanges.push(\`producto a \${prod.medida_corta || prod.medida}\`)
      }
    }
    
    if (msgChanges.length === 0) {
      setEditModalConfig(null)
      return
    }

    setConfirmConfig({
      title: 'Confirmar Modificación',
      message: \`¿Estás seguro de cambiar el \${msgChanges.join(' y la ')} del Fleje #\${editModalConfig.num}?\`,
      type: 'warning',
      onConfirm: async () => {
        let nProdId = undefined
        let nCosto = undefined
        if (prod) {
          nProdId = getProdId(prod)
          nCosto = prod.costo_kg || 0
        }
        await onEditarFleje(editModalConfig.id, val, nProdId, nCosto)
        setEditModalConfig(null)
        setConfirmConfig(null)
      }
    })`
)

// DetailDrawer.jsx -> edit modal render inputs
detail = detail.replace(
  /<div className="relative">\s*<input\s*type="text"\s*value=\{editMedida\}[\s\S]*?placeholder=\{`Ej\. \$\{torre\?\.nombre_medida \|\| '100X2\.0'\}`\}\s*\/>/,
  `<div className="relative h-11">
                    <SearchableSelect
                      options={catalogoCostos.map(p => ({
                        value: getProdId(p),
                        label: p.medida_corta || p.medida,
                        sublabel: p.glosa ? \`\${p.codigo} - \${p.glosa}\` : p.codigo
                      }))}
                      value={editMedida}
                      onChange={setEditMedida}
                      placeholder="Seleccionar Producto Oficial..."
                    />`
)

fs.writeFileSync('src/App.jsx', app)
fs.writeFileSync('src/components/DetailDrawer.jsx', detail)
console.log('Patch complete.')
