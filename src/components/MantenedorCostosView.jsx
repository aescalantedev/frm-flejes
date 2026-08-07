import React, { useState, useMemo, useRef } from 'react'
import { Plus, Search, Edit3, Trash2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, Loader2, X, MoreVertical, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import ExcelJS from 'exceljs'
import CustomDatePicker from './CustomDatePicker'

export default function MantenedorCostosView({ 
  catalogoProductos = [], 
  catalogoCostos = [], 
  showToast,
  setConfirmConfig
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)

  // Cerrar dropdown
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Modales locales (Crear/Editar)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, codigo: '', glosa: '', medida_corta: '', costo_kg: '', fecha_vigencia: new Date().toISOString().split('T')[0] })

  // Combinar datos para la tabla
  const dataList = useMemo(() => {
    let list = catalogoProductos.map(prod => {
      // Find latest cost for this product (assuming catalogoCostos is sorted by date desc or we just pick the first match)
      const costInfo = catalogoCostos.find(c => c.producto_id === prod.id || c.id === prod.id)
      return {
        ...prod,
        costo_kg: costInfo ? costInfo.costo_kg : 0,
        fecha_vigencia: costInfo ? costInfo.fecha_vigencia : 'N/A'
      }
    })

    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(item => 
        (item.codigo || '').toLowerCase().includes(s) ||
        (item.glosa || '').toLowerCase().includes(s) ||
        (item.medida || item.medida_corta || '').toLowerCase().includes(s)
      )
    }

    return list.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
  }, [catalogoProductos, catalogoCostos, search])

  const handleOpenCreate = () => {
    setEditForm({ id: null, codigo: '', glosa: '', medida_corta: '', costo_kg: '', fecha_vigencia: new Date().toISOString().split('T')[0] })
    setEditModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditForm({
      id: item.id,
      codigo: item.codigo || '',
      glosa: item.glosa || '',
      medida_corta: item.medida || item.medida_corta || '',
      costo_kg: item.costo_kg || '',
      fecha_vigencia: (item.fecha_vigencia && item.fecha_vigencia !== 'N/A') ? item.fecha_vigencia.split('T')[0] : new Date().toISOString().split('T')[0]
    })
    setEditModalOpen(true)
  }

  const handleDelete = (item) => {
    setConfirmConfig({
      title: 'Eliminar Producto',
      message: `¿Estás seguro de que deseas eliminar permanentemente el producto ${item.codigo} (${item.medida_corta})? Esto fallará si el producto ya ha sido usado en flejes.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          // First delete associated costs
          await supabase.from('kardex_costos').delete().eq('producto_id', item.id)
          // Then delete product
          const { error } = await supabase.from('catalogo_productos').delete().eq('id', item.id)
          if (error) throw error
          
          showToast('Producto eliminado exitosamente')
          queryClient.invalidateQueries({ queryKey: ['catalogo_productos'] })
          queryClient.invalidateQueries({ queryKey: ['kardex_costos'] })
        } catch (error) {
          console.error(error)
          showToast('Error al eliminar (puede estar en uso)', true)
        }
      }
    })
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()
    
    try {
      let prodId = editForm.id
      
      if (!prodId) {
        // Create Product
        const { data: newProd, error: pErr } = await supabase
          .from('catalogo_productos')
          .insert({
            codigo: editForm.codigo,
            glosa: editForm.glosa,
            medida_corta: editForm.medida_corta
          })
          .select('id')
          .single()
          
        if (pErr) throw pErr
        prodId = newProd.id
      } else {
        // Update Product
        const { error: pErr } = await supabase
          .from('catalogo_productos')
          .update({
            codigo: editForm.codigo,
            glosa: editForm.glosa,
            medida_corta: editForm.medida_corta
          })
          .eq('id', prodId)
        if (pErr) throw pErr
      }

      // Upsert Cost if provided
      if (editForm.costo_kg !== '') {
        const { error: cErr } = await supabase
          .from('kardex_costos')
          .insert({
            producto_id: prodId,
            costo_kg: parseFloat(editForm.costo_kg),
            fecha_vigencia: editForm.fecha_vigencia || new Date().toISOString().split('T')[0]
          })
        if (cErr) {
          // It might already exist for this exact date (unique constraint maybe?), but for now insert creates a new history entry if we use insert
          // If we want to strictly keep one active cost, we can update, but kardex_costos is usually a history.
          console.error('Insert cost error:', cErr)
          // If violation of uniqueness, we can fallback to update. Assuming it just inserts a new row.
        }
      }

      showToast(editForm.id ? 'Producto actualizado' : 'Producto creado')
      setEditModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['catalogo_productos'] })
      queryClient.invalidateQueries({ queryKey: ['kardex_costos'] })
    } catch (error) {
      console.error(error)
      showToast('Error al guardar el producto', true)
    }
  }

  // ============== IMPORTACIÓN EXCEL ==============

  const extractMedidaFromGlosa = (glosa) => {
    const match = glosa.match(/(\d+\.\d+)\s*[xX]\s*(\d+\.\d+)/)
    if (match) {
      let w = parseFloat(match[1])
      if (w < 1) w = Math.round(w * 1000)
      const h = parseFloat(match[2])
      return `${w}X${h}`
    }
    return ''
  }

  const handleExportData = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Catálogo y Costos')
      worksheet.columns = [
        { header: 'FECHA', key: 'fecha_vigencia', width: 15 },
        { header: 'PRODUCTO', key: 'codigo', width: 20 },
        { header: 'GLOSA', key: 'glosa', width: 40 },
        { header: 'PESO UNIT', key: 'peso_unit', width: 15 },
        { header: 'C. UNITARIO MAYO', key: 'costo_kg', width: 20 }
      ]
      
      dataList.forEach(item => {
        worksheet.addRow({
          fecha_vigencia: item.fecha_vigencia !== 'N/A' ? item.fecha_vigencia.split('T')[0].split('-').reverse().join('/') : '',
          codigo: item.codigo,
          glosa: item.glosa,
          peso_unit: '1.00',
          costo_kg: item.costo_kg || 0
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'catalogo_costos.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('Datos exportados exitosamente')
    } catch (e) {
      showToast('Error al exportar datos', true)
    }
  }

  const handleExportFormat = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Formato')
      worksheet.columns = [
        { header: 'FECHA', key: 'fecha', width: 15 },
        { header: 'PRODUCTO', key: 'codigo', width: 20 },
        { header: 'GLOSA', key: 'glosa', width: 40 },
        { header: 'PESO UNIT', key: 'peso', width: 15 },
        { header: 'C. UNITARIO MAYO', key: 'costo', width: 20 }
      ]
      
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'formato_importacion_costos.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      showToast('Error al generar formato', true)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validar tipo
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'xlsx' && ext !== 'csv') {
      showToast('Formato no soportado. Usa .xlsx o .csv', true)
      return
    }

    setConfirmConfig({
      title: 'Confirmar Importación',
      message: `¿Deseas leer el archivo "${file.name}" y actualizar la base de datos de productos y costos automáticamente?`,
      type: 'warning',
      onConfirm: async () => {
        setIsProcessingFile(true)
        try {
          const items = []
          let rowCount = 0
          let insertedCount = 0

          if (ext === 'csv') {
            const text = await file.text()
            const lines = text.split('\n')
            lines.forEach((line, index) => {
              if (index === 0 || !line.trim()) return // Skip header or empty
              const parts = line.split(';')
              if (parts.length >= 5) {
                const codigo = parts[1].trim()
                if (!codigo) return

                let fechaStr = new Date().toISOString().split('T')[0]
                const dateParts = parts[0].trim().split('/')
                if (dateParts.length === 3) {
                  fechaStr = new Date(dateParts[2], parseInt(dateParts[1])-1, dateParts[0]).toISOString().split('T')[0]
                }
                
                const glosa = parts[2].trim()
                let costoNum = parseFloat(parts[4].trim())
                if (isNaN(costoNum)) costoNum = 0

                items.push({
                  codigo,
                  glosa,
                  medida_corta: extractMedidaFromGlosa(glosa),
                  costo_kg: costoNum,
                  fecha_vigencia: fechaStr
                })
                rowCount++
              }
            })
          } else {
            const workbook = new ExcelJS.Workbook()
            const buffer = await file.arrayBuffer()
            await workbook.xlsx.load(buffer)
  
            const worksheet = workbook.worksheets[0]
            
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return // Skip header
              
              // Expected format: FECHA, PRODUCTO (Codigo), GLOSA, PESO, COSTO
              const fechaVal = row.getCell(1).value
              const codigo = row.getCell(2).value?.toString()?.trim()
              const glosa = row.getCell(3).value?.toString()?.trim()
              const costoVal = row.getCell(5).value
  
              if (!codigo) return
              
              let fechaStr = new Date().toISOString().split('T')[0]
              if (fechaVal instanceof Date) {
                fechaStr = fechaVal.toISOString().split('T')[0]
              } else if (typeof fechaVal === 'string') {
                const parts = fechaVal.split('/')
                if (parts.length === 3) {
                  fechaStr = new Date(parts[2], parseInt(parts[1])-1, parts[0]).toISOString().split('T')[0]
                }
              }
  
              let costoNum = parseFloat(costoVal)
              if (isNaN(costoNum)) costoNum = 0
  
              items.push({
                codigo,
                glosa: glosa || '',
                medida_corta: extractMedidaFromGlosa(glosa || ''),
                costo_kg: costoNum,
                fecha_vigencia: fechaStr
              })
              rowCount++
            })
          }

          // Procesar items contra BD
          for (const item of items) {
            // Check if product exists
            let prodId = null
            let { data: existingProd, error: eProd } = await supabase
              .from('catalogo_productos')
              .select('id')
              .eq('codigo', item.codigo)
              .single()

            if (eProd && eProd.code === 'PGRST116') {
              const { data: newP, error: insertP } = await supabase
                .from('catalogo_productos')
                .insert({ codigo: item.codigo, glosa: item.glosa, medida_corta: item.medida_corta })
                .select('id')
                .single()
              
              if (!insertP) {
                prodId = newP.id
              }
            } else if (existingProd) {
              prodId = existingProd.id
            }

            if (prodId) {
              // Insert cost
              await supabase
                .from('kardex_costos')
                .insert({
                  producto_id: prodId,
                  costo_kg: item.costo_kg,
                  fecha_vigencia: item.fecha_vigencia
                })
              insertedCount++
            }
          }

          showToast(`Archivo procesado. Se analizaron ${rowCount} filas y se actualizaron ${insertedCount} costos.`)
          queryClient.invalidateQueries({ queryKey: ['catalogo_productos'] })
          queryClient.invalidateQueries({ queryKey: ['kardex_costos'] })

        } catch (error) {
          console.error(error)
          showToast('Error procesando el archivo', true)
        } finally {
          setIsProcessingFile(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }
    })
  }

  return (
    <div className="space-y-6 section h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
            Catálogo y Costos
            <span className="text-xs px-2.5 py-1 bg-accent/10 text-accent rounded-full font-bold">
              {dataList.length} registros
            </span>
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Gestiona los productos base y actualiza los costos por kilogramo.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative" ref={menuRef}>
          {/* File Upload Hidden Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".xlsx, .csv" 
            className="hidden" 
            onChange={handleFileUpload}
          />

          <button 
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-accent/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 bg-surface-hover hover:bg-border text-foreground rounded-xl transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Opciones Menu Flotante */}
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn">
              <button 
                onClick={() => { fileInputRef.current?.click(); setMenuOpen(false) }}
                disabled={isProcessingFile}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors text-left disabled:opacity-50"
              >
                {isProcessingFile ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <Upload className="w-4 h-4 text-accent" />}
                Importar Data (Excel/CSV)
              </button>
              
              <div className="h-px bg-border my-1" />

              <button 
                onClick={() => { handleExportData(); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors text-left"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Data Actual
              </button>

              <button 
                onClick={() => { handleExportFormat(); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors text-left"
              >
                <Download className="w-4 h-4" />
                Descargar Plantilla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input 
          type="text" 
          placeholder="Buscar por código, glosa o medida..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface border border-border focus:border-accent rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none transition-colors"
        />
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 bg-surface border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-bg/50 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3.5 font-bold text-text-muted uppercase text-[10px] tracking-wider">Código</th>
                <th className="px-5 py-3.5 font-bold text-text-muted uppercase text-[10px] tracking-wider w-full">Glosa / Descripción</th>
                <th className="px-5 py-3.5 font-bold text-text-muted uppercase text-[10px] tracking-wider">Medida Corta</th>
                <th className="px-5 py-3.5 font-bold text-text-muted uppercase text-[10px] tracking-wider">Última Fecha Vig.</th>
                <th className="px-5 py-3.5 font-bold text-text-muted uppercase text-[10px] tracking-wider text-right">Costo / KG</th>
                <th className="px-5 py-3.5 font-bold text-text-muted uppercase text-[10px] tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dataList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-text-muted">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                dataList.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover/50 transition-colors group">
                    <td className="px-5 py-3.5 font-mono text-accent font-bold">
                      {item.codigo}
                    </td>
                    <td className="px-5 py-3.5 text-text-muted">
                      {item.glosa || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-bg border border-border rounded text-[10px] font-bold font-mono">
                        {item.medida || item.medida_corta || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-text-muted">
                      {item.fecha_vigencia && item.fecha_vigencia !== 'N/A' ? item.fecha_vigencia.split('T')[0] : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                      S/ {(item.costo_kg || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-surface hover:bg-accent/10 text-text-muted hover:text-accent rounded-lg border border-border hover:border-accent/30 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item)}
                          className="p-1.5 bg-surface hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg border border-border hover:border-danger/30 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg relative z-10 shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-foreground tracking-tight">
                  {editForm.id ? 'Editar Producto / Costo' : 'Nuevo Producto'}
                </h3>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="p-2 text-text-muted hover:text-foreground hover:bg-surface-hover rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <form id="prod-form" onSubmit={handleSaveForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Código del Producto *</label>
                    <input 
                      required
                      type="text" 
                      value={editForm.codigo}
                      onChange={e => setEditForm({...editForm, codigo: e.target.value})}
                      className="w-full bg-bg border border-border focus:border-accent rounded-xl px-3 py-2 text-sm outline-none font-mono text-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Medida Corta (Ej: 100x2.5)</label>
                    <input 
                      type="text" 
                      value={editForm.medida_corta}
                      onChange={e => setEditForm({...editForm, medida_corta: e.target.value})}
                      className="w-full bg-bg border border-border focus:border-accent rounded-xl px-3 py-2 text-sm outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Glosa / Descripción Completa</label>
                  <input 
                    type="text" 
                    value={editForm.glosa}
                    onChange={e => setEditForm({...editForm, glosa: e.target.value})}
                    className="w-full bg-bg border border-border focus:border-accent rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-border mt-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Nuevo Costo (S/ por KG)</label>
                    <input 
                      type="number" 
                      step="0.001"
                      min="0"
                      value={editForm.costo_kg}
                      onChange={e => setEditForm({...editForm, costo_kg: e.target.value})}
                      placeholder={editForm.id ? "Dejar en blanco para no actualizar" : "0.00"}
                      className="w-full bg-bg border border-border focus:border-accent rounded-xl px-3 py-2 text-sm outline-none font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5 relative">
                    <CustomDatePicker 
                      label="Fecha de Vigencia"
                      value={editForm.fecha_vigencia}
                      onChange={(val) => setEditForm({...editForm, fecha_vigencia: val})}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-border bg-surface/50 rounded-b-2xl flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-5 py-2.5 bg-transparent hover:bg-surface-hover text-text-muted font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="prod-form"
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-lg shadow-accent/20 transition-transform active:scale-95"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
