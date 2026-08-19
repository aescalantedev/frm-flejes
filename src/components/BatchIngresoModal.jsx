import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Info } from 'lucide-react'
import SearchableSelect from './SearchableSelect'

export default function BatchIngresoModal({
  isOpen,
  onClose,
  torreId,
  torreName, 
  torreMedida = '', 
  torreProductoId = null,
  capMax = 12,
  currentCount = 0,
  onConfirm,
  showToast,
  catalogoProductos = [],
  catalogoCostos = []
}) {
  const [pesosList, setPesosList] = useState([])
  const [currentPeso, setCurrentPeso] = useState('')
  const [currentProductoId, setCurrentProductoId] = useState('')
  const [currentLote, setCurrentLote] = useState('')
  const inputRef = useRef(null)

  const isFloor = !torreId || torreName === 'Al Piso'
  const spacesAvailable = isFloor ? 999 : capMax - currentCount
  const currentBatchCount = pesosList.length
  const spacesLeft = isFloor ? 999 : spacesAvailable - currentBatchCount

  useEffect(() => {
    if (isOpen) {
      setPesosList([])
      setCurrentPeso('')
      setCurrentLote('')
      // Preseleccionar el producto oficial de la torre si lo tiene
      if (torreProductoId) {
        setCurrentProductoId(torreProductoId)
      } else {
        const match = catalogoProductos.find(c => c.medida_corta === torreName || c.medida === torreName)
        setCurrentProductoId(match ? match.id : '')
      }
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, torreProductoId])

  if (!isOpen) return null

  const handleAddPeso = (e) => {
    if (e) e.preventDefault()
    const val = parseFloat(currentPeso)
    
    if (isNaN(val) || val <= 0) {
      showToast('Por favor ingresa un peso válido', true)
      return
    }

    if (!currentProductoId) {
      showToast('Debes seleccionar un producto oficial', true)
      return
    }

    if (!isFloor && spacesLeft <= 0) {
      showToast(`Límite de capacidad de la torre alcanzado (${capMax} máx.)`, true)
      return
    }

    // Buscar la info del producto seleccionado para mostrarla en la lista
    const prodInfo = catalogoProductos.find(p => p.id === currentProductoId) || {}
                     
    // Extraer costo de catalogoCostos
    const pId = prodInfo.id
    const costoInfo = catalogoCostos.find(c => c.producto_id === pId || c.id === currentProductoId)
    const costoToApply = costoInfo ? costoInfo.costo_kg : 0

    setPesosList(prev => [...prev, { 
      peso: val, 
      producto_id: pId,
      medida: prodInfo.medida || prodInfo.medida_corta || 'N/A',
      codigo: prodInfo.codigo || '',
      costo_kg_aplicado: costoToApply,
      lote: currentLote.trim()
    }])
    setCurrentPeso('')
    // NO limpiamos el lote porque en una misma recepción, los flejes suelen compartir lote
    // Mantiene seleccionado el mismo producto para carga más rápida
    inputRef.current?.focus()
  }

  const handleRemovePeso = (idxToRemove) => {
    setPesosList(prev => prev.filter((_, idx) => idx !== idxToRemove))
  }

  const handleConfirm = () => {
    if (pesosList.length === 0) {
      showToast('Debes ingresar al menos un peso', true)
      return
    }
    onConfirm(pesosList)
    onClose()
  }

  const totalPesoBatch = pesosList.reduce((sum, item) => sum + item.peso, 0)

  // Asegurarnos de usar un ID único real para los values del select
  // Si catalogoProductos viene de kardex_costos, la prop es producto_id. Si viene de catalogo_productos, es id.
  const getProdId = (p) => p.producto_id || p.id

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
        
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Ingresar Flejes - <span className="text-accent">{torreName}</span>
            </h2>
            {!isFloor && (
              <p className="text-[10px] text-text-muted mt-0.5">
                Capacidad: {currentCount} ocupados de {capMax} máx. ({spacesAvailable} libres)
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col min-h-0">
          
          {/* Formulario */}
          <form onSubmit={handleAddPeso} className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2">
              {/* Primera fila: Lote y Peso */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Lote (Opcional)"
                    value={currentLote}
                    onChange={(e) => setCurrentLote(e.target.value.toUpperCase())}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:border-accent font-mono"
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="Peso (Kg). Ej. 750.5"
                    value={currentPeso}
                    onChange={(e) => setCurrentPeso(e.target.value)}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:border-accent font-mono pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted font-mono">kg</span>
                </div>
              </div>
              
              {/* Segunda fila: Selector de Producto */}
              <div className="w-full">
                <div className="h-11 w-full">
                  <SearchableSelect
                    options={catalogoProductos.map(p => ({
                      value: getProdId(p),
                      label: p.medida_corta || p.medida,
                      sublabel: p.glosa ? `${p.codigo} - ${p.glosa}` : p.codigo
                    }))}
                    value={currentProductoId}
                    onChange={setCurrentProductoId}
                    placeholder="Seleccionar Producto Oficial..."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-accent hover:bg-accent-hover text-white px-4 py-3 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                title="Agregar fleje"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Estado de capacidad / guía */}
          {!isFloor && (
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted bg-bg/60 border border-border/50 rounded-lg p-2">
              <Info className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                Espacios restantes en esta torre: <strong className="text-accent">{spacesLeft}</strong>
              </span>
            </div>
          )}

          {/* Listado de pesos acumulados */}
          <div className="mt-4 flex-1 overflow-y-auto border border-border rounded-xl bg-bg/30 p-2 min-h-[140px] max-h-[220px]">
            {pesosList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted/40 italic">
                Ningún fleje en lista
              </div>
            ) : (
              <div className="space-y-1.5">
                {pesosList.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface border border-border/60 rounded-lg px-3 py-2 animate-fadeIn gap-2"
                  >
                    <div className="flex flex-col items-start w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-text-muted font-mono">#{idx + 1}</span>
                        <span className="text-xs font-bold text-foreground font-mono">{item.peso.toFixed(2)} kg</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-semibold text-accent font-mono uppercase bg-accent/5 border border-accent/20 px-1 py-0.5 rounded line-clamp-1 max-w-[200px]" title={item.codigo}>
                          {item.codigo} - {item.medida}
                        </span>
                        {item.lote && (
                          <span className="text-[9px] font-semibold text-foreground/70 font-mono bg-bg border border-border/50 px-1 py-0.5 rounded max-w-[100px] truncate" title={`Lote: ${item.lote}`}>
                            {item.lote}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                       <span className="text-[10px] font-bold text-text-muted font-mono">
                         S/ {(item.peso * (item.costo_kg_aplicado || 0)).toFixed(2)}
                       </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePeso(idx)}
                        className="p-1.5 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totalizador del Lote */}
          {pesosList.length > 0 && (
            <div className="mt-4 p-3 bg-accent/5 border border-accent/25 rounded-xl flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Flejes en Lote</span>
                <span className="text-xs font-bold text-foreground font-mono">{pesosList.length} items</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Peso Total</span>
                <span className="text-sm font-bold text-accent font-mono">{totalPesoBatch.toFixed(2)} kg</span>
              </div>
            </div>
          )}

        </div>

        {/* Acciones */}
        <div className="p-5 border-t border-border flex gap-2.5 bg-surface shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-bg border border-border hover:bg-surface-hover text-foreground font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all active:scale-98"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={pesosList.length === 0}
            className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
          >
            Agregar a la Recepción
          </button>
        </div>

      </div>
    </div>
  )
}
