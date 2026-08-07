import React, { useState, useEffect } from 'react'
import { X, Plus, Edit3, Layers, Hash } from 'lucide-react'
import SearchableSelect from './SearchableSelect'

export default function TorreFormModal({ 
  isOpen, 
  onClose, 
  torre, 
  onSave,
  catalogoCostos = []
}) {
  const [posicion, setPosicion] = useState('')
  const [selectedProductoId, setSelectedProductoId] = useState('')
  const [nombreMedida, setNombreMedida] = useState('')
  const [cantidadMaxima, setCantidadMaxima] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (torre) {
        setPosicion(torre.posicion)
        setNombreMedida(torre.nombre_medida)
        setCantidadMaxima(torre.cantidad_maxima.toString())
        
        // Tratar de buscar si coincide con un producto
        const match = catalogoCostos.find(c => c.medida_corta === torre.nombre_medida || c.medida === torre.nombre_medida)
        if (match) setSelectedProductoId(match.producto_id || match.id)
        else setSelectedProductoId('')
      } else {
        setPosicion('')
        setNombreMedida('')
        setSelectedProductoId('')
        setCantidadMaxima('5') // default capacity
      }
    }
  }, [isOpen, torre])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!posicion.trim()) {
      alert('Ingresa la posición')
      return
    }
    const finalMedida = nombreMedida.trim()
    if (!finalMedida) {
      alert('Ingresa el nombre de la medida')
      return
    }
    const maxVal = parseInt(cantidadMaxima)
    if (!maxVal || maxVal <= 0) {
      alert('Ingresa una cantidad máxima válida')
      return
    }

    setGuardando(true)
    const success = await onSave({
      id: torre?.id, // Will be undefined if creating
      posicion: posicion.trim(),
      nombre_medida: finalMedida,
      producto_sugerido_id: selectedProductoId || null,
      cantidad_maxima: maxVal
    })
    setGuardando(false)
    if (success) {
      onClose()
    }
  }

  const isEdit = !!torre

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface rounded-2xl w-full max-w-md border border-border shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            {isEdit ? <Edit3 className="w-5 h-5 text-accent" /> : <Plus className="w-5 h-5 text-accent" />}
            <h3 className="font-bold text-base text-foreground">
              {isEdit ? 'Editar Torre' : 'Nueva Torre'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-hover border border-border text-text-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            
            {/* Posicion */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Posición</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ej: P01"
                  required
                  value={posicion}
                  onChange={(e) => setPosicion(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-foreground text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                />
                <Layers className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Nombre Medida */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Nombre Medida</label>
              <div className="relative h-11">
                <SearchableSelect
                  options={catalogoCostos.map(p => ({
                    value: p.producto_id || p.id,
                    label: p.medida_corta || p.medida,
                    sublabel: p.glosa ? `${p.codigo} - ${p.glosa}` : p.codigo
                  }))}
                  value={selectedProductoId}
                  onChange={(id) => {
                    setSelectedProductoId(id)
                    const p = catalogoCostos.find(x => (x.producto_id || x.id) === id)
                    if (p) setNombreMedida(p.medida_corta || p.medida)
                  }}
                  placeholder="Seleccionar Medida Oficial..."
                />
              </div>
            </div>

            {/* Cantidad Maxima */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Cantidad Máxima de Flejes</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="1"
                  placeholder="Ej: 5"
                  required
                  value={cantidadMaxima}
                  onChange={(e) => setCantidadMaxima(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-foreground text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                />
                <Hash className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 p-5 border-t border-border bg-surface-hover/20">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-surface hover:bg-surface-hover border border-border text-foreground px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={guardando}
              className="flex-1 bg-accent hover:bg-accent-hover text-white px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
