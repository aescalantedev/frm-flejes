import React, { useState } from 'react'
import { X, Plus, Trash2, ArrowRightLeft, Percent, Scale, Check, AlertTriangle, Edit3 } from 'lucide-react'
import SearchableSelect from './SearchableSelect'
import ReactECharts from 'echarts-for-react'

// Utilidad para normalizar medidas ("284 X 2.0" -> "284X2") y asegurar que coincida con la DB
const normalizeMedida = (m) => {
  if (!m) return ''
  const s = m.replace(/\s+/g, '').toUpperCase()
  const parts = s.split('X')
  if (parts.length === 2) {
    const w = parseFloat(parts[0])
    const h = parseFloat(parts[1])
    if (!isNaN(w) && !isNaN(h)) {
      return `${w}X${h}`
    }
  }
  return s
}

export default function DetailDrawer({ 
  torreId, 
  torres, 
  inventario, 
  onClose, 
  onOpenBatchIngreso, 
  onEliminarFleje,
  onEditarFleje,
  onEliminarVariosFlejes,
  onAbrirTraslado,
  catalogoCostos = [],
  catalogoProductos = [],
  userProfile 
}) {
  // Estado del menú de opciones de fleje activo (Bottom Sheet / Dialog)
  const [activeFlejeMenu, setActiveFlejeMenu] = useState(null) // { id, num, peso }
  
  // Estado del modal de edición de peso y medida
  const [editModalConfig, setEditModalConfig] = useState(null) // { id, num, peso, medida }
  const [editPeso, setEditPeso] = useState('')
  const [editMedida, setEditMedida] = useState('')

  // Estado de confirmación local personalizado (Tailwind CSS Modal)
  const [confirmConfig, setConfirmConfig] = useState(null) // { title, message, type, onConfirm }

  // Estados para selección múltiple
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedFlejeIds, setSelectedFlejeIds] = useState([])

  if (!torreId) return null

  const torre = torres.find(t => t.id === torreId)
  if (!torre) return null

  const flejes = inventario[torreId] || []
  const cantidadActual = flejes.length
  const cantidadMaxima = torre.cantidad_maxima
  const lleno = cantidadActual >= cantidadMaxima
  const porcentaje = cantidadMaxima > 0 ? (cantidadActual / cantidadMaxima) * 100 : 0
  const pesoTotal = flejes.reduce((sum, f) => sum + f.peso, 0)
  const costoTotalTorre = flejes.reduce((sum, f) => sum + (f.peso * (parseFloat(f.costo_kg_ingreso) || 0)), 0)
  const pesoPromedio = cantidadActual > 0 ? pesoTotal / cantidadActual : 0

  // Toggles de selección múltiple
  const handleToggleSelectFleje = (id) => {
    setSelectedFlejeIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedFlejeIds.length === flejes.length) {
      setSelectedFlejeIds([])
    } else {
      setSelectedFlejeIds(flejes.map(f => f.id))
    }
  }

  // Confirmación masiva de borrado
  const handleBatchDeleteClick = () => {
    if (selectedFlejeIds.length === 0) return
    setConfirmConfig({
      title: 'Eliminar Flejes Seleccionados',
      message: `¿Estás seguro de que deseas eliminar permanentemente estos ${selectedFlejeIds.length} flejes del inventario? Esta acción es irreversible.`,
      type: 'danger',
      onConfirm: async () => {
        const success = await onEliminarVariosFlejes(selectedFlejeIds)
        if (success) {
          setSelectedFlejeIds([])
          setSelectionMode(false)
        }
        setConfirmConfig(null)
      }
    })
  }

  const handleCancelSelectionMode = () => {
    setSelectedFlejeIds([])
    setSelectionMode(false)
  }

  // Configuración de la edición de peso y medida
  const handleStartEdit = (fleje, num) => {
    let initProdId = fleje.producto_id || ''
    // FIX OLD BAD DATA: If initProdId is actually a kardex_costos.id (from the old bug), convert it to catalogo_productos.id
    if (initProdId && !catalogoProductos.find(p => p.id === initProdId)) {
      const kMatch = catalogoCostos.find(k => k.id === initProdId)
      if (kMatch) {
        initProdId = kMatch.producto_id
      }
    }
    
    setEditModalConfig({ 
      id: fleje.id, 
      num, 
      peso: fleje.peso, 
      producto_id: initProdId,
      medida: fleje.medida || (catalogoProductos.find(p => p.id === initProdId)?.medida || '')
    })
    setEditPeso(String(fleje.peso))
    setEditMedida(initProdId)
  }

  const handleSaveEditClick = () => {
    const val = parseFloat(editPeso)
    if (isNaN(val) || val <= 0) {
      alert('Por favor ingresa un peso válido positivo.')
      return
    }
    
    // Abrir confirmación
    const msgChanges = []
    if (editPeso !== String(editModalConfig.peso)) {
      msgChanges.push(`peso de ${editModalConfig.peso.toFixed(2)} kg a ${val.toFixed(2)} kg`)
    }
    
    let prod = null
    if (editMedida !== editModalConfig.producto_id && editMedida !== '') {
      // Find cost info using catalogoCostos but we select using full catalogoProductos
      const costoInfo = catalogoCostos.find(p => getProdId(p) === editMedida)
      prod = catalogoProductos.find(p => p.id === editMedida) || costoInfo
      if (prod) {
        msgChanges.push(`producto a ${prod.medida_corta || prod.medida}`)
      }
    }
    
    if (msgChanges.length === 0) {
      setEditModalConfig(null)
      return
    }

    setConfirmConfig({
      title: 'Confirmar Modificación',
      message: `¿Estás seguro de cambiar el ${msgChanges.join(' y la ')} del Fleje #${editModalConfig.num}?`,
      type: 'warning',
      onConfirm: async () => {
        let nProdId = editMedida || null
        let nCosto = 0
        if (nProdId) {
          const costoInfo = catalogoCostos.find(c => getProdId(c) === nProdId)
          nCosto = costoInfo ? costoInfo.costo_kg : 0
        }
        await onEditarFleje(editModalConfig.id, val, nProdId, nCosto)
        setEditModalConfig(null)
        setConfirmConfig(null)
      }
    })
  }

  // Confirmación de borrado individual desde el menú
  const handleSingleDeleteClick = (id, num, peso) => {
    setConfirmConfig({
      title: 'Eliminar Fleje',
      message: `¿Estás seguro de que deseas eliminar permanentemente el Fleje #${num} (${peso.toFixed(2)} kg) del inventario?`,
      type: 'danger',
      onConfirm: async () => {
        await onEliminarFleje(id)
        setConfirmConfig(null)
      }
    })
  }

  // Al hacer clic en un chip de fleje
  const handleChipClick = (fleje, num) => {
    if (selectionMode) {
      handleToggleSelectFleje(fleje.id)
    } else {
      // Abre el menú inferior/popover de opciones para este fleje
      setActiveFlejeMenu({ ...fleje, num })
    }
  }

  // Color de barra de progreso
  // Utilidad para extraer ID del producto
  const getProdId = (p) => p.producto_id || p.id
  
  const getProgressColor = (pct) => {
    if (pct >= 100) return 'bg-danger'
    if (pct >= 60) return 'bg-warning'
    return 'bg-accent'
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Panel del Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] z-40 bg-surface border-l border-border shadow-2xl flex flex-col transition-transform duration-300 translate-x-0">
        
        {/* Cabecera */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <h2 className="font-bold text-base text-foreground">Detalle de Torre</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-hover border border-border text-text-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Desplazable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Ficha Informativa de la Torre */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-accent tracking-tight">{torre.posicion}</h3>
              <div className="mt-1">
                <span className="text-sm font-bold text-foreground mr-2">{torre.nombre_medida}</span>
                {(() => {
                  const cat = catalogoCostos.find(c => c.medida_corta === torre.nombre_medida || c.medida === torre.nombre_medida)
                  const finalGlosa = torre.glosa_medida || (cat ? cat.glosa : null)
                  return finalGlosa ? (
                    <span className="text-xs text-text-muted italic block mt-0.5">{finalGlosa}</span>
                  ) : null
                })()}
              </div>
            </div>
            <div className="text-right bg-bg border border-border rounded-xl px-4 py-2 font-mono shrink-0 ml-4">
              <span className="text-[10px] text-text-muted block uppercase font-sans font-medium">Flejes</span>
              <span className="text-lg font-bold text-accent">{cantidadActual}</span>
              <span className="text-text-muted"> / {cantidadMaxima}</span>
            </div>
          </div>

          {/* Gráfico Donut de Capacidad / Distribución */}
          {(() => {
            const grouped = {}
            flejes.forEach(f => {
              const m = f.medida || torre.nombre_medida || 'No asignada'
              grouped[m] = (grouped[m] || 0) + 1
            })

            const isMixed = Object.keys(grouped).length > 1
            let chartOptions = {}

            if (isMixed) {
              const huecosVacios = Math.max(0, cantidadMaxima - cantidadActual)
              const data = Object.keys(grouped).map(m => ({ name: m, value: grouped[m] }))
              if (huecosVacios > 0) {
                data.push({ name: 'Disponible', value: huecosVacios, itemStyle: { color: '#2a2a35' } })
              }
              
              chartOptions = {
                tooltip: { trigger: 'item', formatter: '{b}: {c} flejes ({d}%)', backgroundColor: '#1a1b1e', textStyle: { color: '#e5e7eb', fontSize: 10, fontFamily: 'monospace' }, borderColor: '#2d2d3b', padding: [8, 12] },
                series: [{
                  type: 'pie',
                  radius: ['45%', '75%'],
                  center: ['50%', '50%'],
                  avoidLabelOverlap: false,
                  itemStyle: { borderRadius: 4, borderColor: '#18191f', borderWidth: 2 },
                  label: { show: false },
                  data: data,
                  color: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4']
                }]
              }
            } else {
              const huecosVacios = Math.max(0, cantidadMaxima - cantidadActual)
              
              let pctColor = '#f97316' // accent
              if (porcentaje >= 100) pctColor = '#ef4444' // danger
              else if (porcentaje >= 60) pctColor = '#f59e0b' // warning

              chartOptions = {
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: '#1a1b1e', textStyle: { color: '#e5e7eb', fontSize: 10, fontFamily: 'monospace' }, borderColor: '#2d2d3b', padding: [8, 12] },
                series: [{
                  type: 'pie',
                  radius: ['55%', '75%'],
                  center: ['50%', '50%'],
                  avoidLabelOverlap: false,
                  itemStyle: { borderRadius: 4, borderColor: '#18191f', borderWidth: 2 },
                  label: { show: false },
                  data: [
                    { value: cantidadActual, name: 'Ocupados', itemStyle: { color: pctColor } },
                    { value: huecosVacios, name: 'Vacíos', itemStyle: { color: '#2a2a35' } }
                  ]
                }]
              }
            }

            return (
              <div className="bg-bg/40 border border-border/50 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                <div className="w-[120px] h-[100px] shrink-0">
                  <ReactECharts option={chartOptions} style={{ height: '100%', width: '100%' }} />
                </div>
                <div className="flex-1 pl-4 flex flex-col justify-center gap-1.5 border-l border-border/30 ml-2">
                  <div className="text-[10px] text-text-muted font-bold tracking-wide uppercase mb-1">
                    {isMixed ? 'Distribución de Flejes' : 'Capacidad Ocupada'}
                  </div>
                  {isMixed ? (
                    <>
                      {Object.keys(grouped).map((m, idx) => {
                        const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4']
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs font-mono pr-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: colors[idx % colors.length] }} />
                              <span>{m}</span>
                            </div>
                            <span className="font-bold text-foreground">{grouped[m]} <span className="text-[9px] text-text-muted/60">ud</span></span>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between text-xs font-mono pr-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a35] shadow-xs" />
                          <span className="text-text-muted">Disponible</span>
                        </div>
                        <span className="font-bold text-text-muted">{Math.max(0, cantidadMaxima - cantidadActual)} <span className="text-[9px] text-text-muted/60">ud</span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs font-mono pr-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: porcentaje >= 100 ? '#ef4444' : porcentaje >= 60 ? '#f59e0b' : '#f97316' }} />
                          <span>Ocupado</span>
                        </div>
                        <span className="font-bold text-foreground">{cantidadActual} <span className="text-[9px] text-text-muted/60">ud</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono pr-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a35] shadow-xs" />
                          <span className="text-text-muted">Disponible</span>
                        </div>
                        <span className="font-bold text-text-muted">{Math.max(0, cantidadMaxima - cantidadActual)} <span className="text-[9px] text-text-muted/60">ud</span></span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Botones principales de acción */}
          <div className="flex gap-2">
            <button 
              onClick={() => onOpenBatchIngreso(torre.id, torre.posicion, cantidadMaxima, cantidadActual)}
              disabled={lleno}
              className="flex-1 flex items-center justify-center gap-2 bg-accent/15 hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed border border-accent/30 text-accent px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Ingresar Flejes
            </button>
            <button 
              onClick={onAbrirTraslado}
              disabled={cantidadActual === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-warning/10 hover:bg-warning/20 disabled:opacity-40 disabled:cursor-not-allowed border border-warning/20 text-warning px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Salida / Consumo
            </button>
          </div>

          {/* Listado de Flejes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Flejes Almacenados</h4>
              
              {flejes.length > 0 && !selectionMode && (
                <button
                  onClick={() => setSelectionMode(true)}
                  className="text-[10px] font-bold text-accent hover:text-accent-hover cursor-pointer animate-fadeIn"
                >
                  Seleccionar varios
                </button>
              )}

              {selectionMode && (
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-accent hover:text-accent-hover cursor-pointer"
                >
                  {selectedFlejeIds.length === flejes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              )}
            </div>

            {/* Barra de acciones por lote si hay seleccionados */}
            {selectionMode && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 flex items-center justify-between animate-fadeIn">
                <span className="text-xs font-bold text-danger">
                  {selectedFlejeIds.length} seleccionado(s)
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleBatchDeleteClick}
                    disabled={selectedFlejeIds.length === 0}
                    className="flex items-center gap-1 bg-danger hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                  <button 
                    onClick={handleCancelSelectionMode}
                    className="bg-surface hover:bg-surface-hover text-text-muted border border-border text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {cantidadActual === 0 ? (
              <div className="bg-bg/50 border border-border border-dashed rounded-2xl p-8 text-center text-xs italic text-text-muted">
                No hay flejes registrados en esta torre
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 w-full">
                {flejes.map((fleje, idx) => {
                  const isSelected = selectedFlejeIds.includes(fleje.id)
                  const num = idx + 1
                  
                  const costoFleje = fleje.peso * (parseFloat(fleje.costo_kg_ingreso) || 0)

                  return (
                    <div 
                      key={fleje.id} 
                      onClick={() => handleChipClick(fleje, num)}
                      className={`
                        relative border rounded-xl p-2.5 flex flex-col gap-1.5 transition-all 
                        cursor-pointer select-none active:scale-97
                        ${isSelected 
                          ? 'bg-accent/15 border-accent shadow-xs ring-1 ring-accent/30' 
                          : 'bg-bg hover:bg-surface-hover border-border hover:border-accent/30'
                        }
                      `}
                    >
                      {/* Indicador Checkmark discreto en esquina en modo selección */}
                      {selectionMode && (
                        <div className={`
                          absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm border z-10
                          ${isSelected ? 'bg-accent border-accent/20 text-bg' : 'bg-surface border-border text-transparent'}
                        `}>
                          {isSelected && <Check className="w-2.5 h-2.5 font-bold" />}
                        </div>
                      )}

                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] text-text-muted font-bold font-mono bg-bg/50 px-1.5 py-0.5 rounded border border-border/50">
                          #{num}
                        </span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border truncate max-w-[80px] font-bold uppercase flex items-center justify-center gap-1 ${fleje.medida && fleje.medida !== torre.nombre_medida ? 'bg-accent/20 text-accent border-accent/40' : 'bg-bg/50 text-text-muted border-border/30'}`}>
                          {fleje.medida || torre.nombre_medida}
                          {fleje.medida && fleje.medida !== torre.nombre_medida && <AlertTriangle className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <div className="flex justify-between items-end w-full">
                        <span className="text-sm font-black text-foreground font-mono">
                          {fleje.peso.toFixed(2)} <span className="text-[10px] text-text-muted font-bold uppercase">kg</span>
                        </span>
                        {costoFleje > 0 && (
                          <span className="text-xs text-foreground font-black animate-fadeIn font-mono">
                            S/ {costoFleje.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Espacio para estirar */}
          <div className="h-2" />

          {/* Resumen General de Pesos de la Torre */}
          <div className="bg-bg border border-border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Total Peso:
              </span>
              <strong className="text-foreground font-mono text-sm">{pesoTotal.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" />
                Promedio:
              </span>
              <strong className="text-foreground font-mono text-sm">{pesoPromedio.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-border mt-2">
              <span className="text-[10px] text-text-muted font-bold tracking-wide uppercase">
                VALORIZADO:
              </span>
              <strong className="text-accent font-mono text-sm">S/ {costoTotalTorre.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
            </div>
          </div>

        </div>
      </div>

      {/* ==================== BOTTOM SHEET / MENU DE ACCIONES EN MOVIL & PC ==================== */}
      {activeFlejeMenu && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setActiveFlejeMenu(null)}
          />
          
          {/* Panel */}
          <div className="relative w-full bg-surface border-t md:border border-border rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-4 animate-slideUp md:animate-scaleUp md:max-w-sm">
            
            {/* Pestaña de arrastre (solo decorativa para móviles) */}
            <div className="md:hidden flex justify-center mb-1">
              <div className="w-12 h-1 bg-border rounded-full" />
            </div>

            <div className="text-center md:text-left">
              <h4 className="font-bold text-base text-foreground">Fleje #{activeFlejeMenu.num}</h4>
              <p className="text-xs text-text-muted mt-0.5">
                Peso actual: <span className="font-mono font-bold text-accent">{activeFlejeMenu.peso.toFixed(2)} kg</span>
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  handleStartEdit(activeFlejeMenu, activeFlejeMenu.num)
                  setActiveFlejeMenu(null)
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-accent/10 hover:bg-accent/15 text-accent rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Peso</span>
                </div>
                <span className="text-[10px] text-accent/60 font-semibold uppercase">Modificar</span>
              </button>

              <button
                onClick={() => {
                  handleSingleDeleteClick(activeFlejeMenu.id, activeFlejeMenu.num, activeFlejeMenu.peso)
                  setActiveFlejeMenu(null)
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-danger/10 hover:bg-danger/15 text-danger rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Fleje</span>
                </div>
                <span className="text-[10px] text-danger/60 font-semibold uppercase">Quitar</span>
              </button>

              <button
                onClick={() => setActiveFlejeMenu(null)}
                className="w-full py-3 bg-bg hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center mt-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DE INGRESO / EDICIÓN DE PESO ==================== */}
      {editModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setEditModalConfig(null)}
          />
          
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 space-y-4 animate-scaleUp text-left">
            <div>
              <h4 className="font-bold text-base text-foreground tracking-tight">Modificar Fleje</h4>
              <p className="text-xs text-text-muted mt-0.5">Ingresa los nuevos datos para el Fleje #{editModalConfig.num}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Nuevo Peso</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editPeso}
                    onChange={(e) => setEditPeso(e.target.value)}
                    className="w-full bg-bg border border-border focus:border-accent rounded-xl px-4 py-2.5 pr-10 text-sm font-bold font-mono outline-none"
                    placeholder="0.00"
                  />
                  <span className="text-xs font-bold text-text-muted absolute right-4 top-1/2 -translate-y-1/2">kg</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Medida (Opcional)</label>
                <div className="relative h-11">
                    <SearchableSelect
                      options={catalogoProductos.map(p => ({
                        value: p.id,
                        label: p.medida_corta || p.medida,
                        sublabel: p.glosa ? `${p.codigo} - ${p.glosa}` : p.codigo
                      }))}
                      value={editMedida}
                      onChange={setEditMedida}
                      placeholder="Seleccionar Producto Oficial..."
                      fallbackLabel={editModalConfig.medida}
                    />
                </div>
                <p className="text-[10px] text-text-muted/60 mt-1">Si dejas esto en blanco, se usará la medida por defecto de la torre.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveEditClick}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center shadow-sm"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditModalConfig(null)}
                className="flex-1 py-2.5 bg-bg hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DE CONFIRMACIÓN LOCAL (TAILWIND CSS) ==================== */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setConfirmConfig(null)}
          />
          
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 space-y-4 animate-scaleUp text-left">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${confirmConfig.type === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}
              `}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-foreground tracking-tight">{confirmConfig.title}</h4>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {confirmConfig.message}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmConfig.onConfirm}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center shadow-sm
                  ${confirmConfig.type === 'danger' ? 'bg-danger hover:bg-red-700' : 'bg-accent hover:bg-accent-hover'}
                `}
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmConfig(null)}
                className="flex-1 py-2.5 bg-bg hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
