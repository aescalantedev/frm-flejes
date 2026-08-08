import React, { useState, useRef, useEffect } from 'react'
import { Plus, Truck, Send, Check } from 'lucide-react'
import { useUnitSystem } from '../hooks/useUnitSystem'

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

export default function PanoramaView({ 
  torres, 
  inventario, 
  searchQuery, 
  isLoading, 
  onSelectTorre,
  // Flujos de trazabilidad
  receptionSession,
  dispatchSession,
  onStartReception,
  onStartDispatch,
  onOpenBatchIngreso,
  onToggleSelectFleje,
  dispatchCart = [],
  showToast,
  catalogoCostos = [],
  userProfile,
  isPublicView
}) {
  const { isTN } = useUnitSystem()
  const [filtroEstado, setFiltroEstado] = useState('todas')

  // Observer para mostrar FABs solo al hacer scroll
  const topButtonsRef = useRef(null)
  const [showFABs, setShowFABs] = useState(false)

  useEffect(() => {
    if (!topButtonsRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFABs(!entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(topButtonsRef.current)
    return () => observer.disconnect()
  }, [])

  const receptionActive = !!receptionSession
  const dispatchActive = !!dispatchSession

  // RENDER SKELETON LOADER
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Statistics Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center space-y-2.5">
              <div className="h-3.5 w-24 bg-border/60 rounded" />
              <div className="h-7 w-16 bg-border rounded" />
            </div>
          ))}
        </div>

        {/* Towers Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-5 h-[360px] flex flex-col">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-16 bg-border rounded" />
                  <div className="h-5 w-16 bg-border/80 rounded-full" />
                </div>
                <div className="h-3 w-32 bg-border/60 rounded" />
              </div>
              
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-border/40 rounded-full" />
                <div className="space-y-1.5 pt-2">
                  <div className="h-9 w-full bg-border/60 rounded-xl" />
                  <div className="h-9 w-full bg-border/40 rounded-xl" />
                  <div className="h-9 w-full bg-border/20 rounded-xl" />
                </div>
              </div>

              <div className="h-4 w-28 bg-border/60 rounded mt-auto pt-3 border-t border-border" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 1. Filtrar torres primero según la query de búsqueda en el header
  const searchFiltered = searchQuery
    ? torres.filter(t => 
        t.posicion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nombre_medida.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : torres

  const selectedTorreIds = new Set(dispatchCart.map(item => item.torre_id).filter(Boolean))

  // 2. Calcular los contadores de cada chip basados en el filtro de búsqueda
  const counts = {
    todas: searchFiltered.length,
    llenas: searchFiltered.filter(t => (inventario[t.id] || []).length >= t.cantidad_maxima).length,
    parciales: searchFiltered.filter(t => {
      const len = (inventario[t.id] || []).length
      return len > 0 && len < t.cantidad_maxima
    }).length,
    vacias: searchFiltered.filter(t => (inventario[t.id] || []).length === 0).length,
    seleccionados: searchFiltered.filter(t => selectedTorreIds.has(t.id)).length
  }

  // 3. Filtrar según el estado seleccionado en los chips
  const filteredTorres = searchFiltered.filter(t => {
    const len = (inventario[t.id] || []).length
    if (filtroEstado === 'llenas') return len >= t.cantidad_maxima
    if (filtroEstado === 'parciales') return len > 0 && len < t.cantidad_maxima
    if (filtroEstado === 'vacias') return len === 0
    if (filtroEstado === 'seleccionados') return selectedTorreIds.has(t.id)
    return true
  })

  // Cálculos estadísticos basados en la lista final filtrada
  const totalTorres = filteredTorres.length
  
  let totalFlejes = 0
  let pesoTotalAcumulado = 0 // en kg
  let sumaPorcentajes = 0

  const torresData = filteredTorres.map(torre => {
    const flejes = inventario[torre.id] || []
    const cantidadActual = flejes.length
    let pesoTorre = 0
    let costoTotalTorre = 0
    
    flejes.forEach(f => {
      pesoTorre += f.peso
      costoTotalTorre += (f.peso * (parseFloat(f.costo_kg_ingreso) || 0))
    })

    const capMax = torre.cantidad_maxima
    const porcentaje = capMax > 0 ? (cantidadActual / capMax) * 100 : 0
    
    totalFlejes += cantidadActual
    pesoTotalAcumulado += pesoTorre
    sumaPorcentajes += porcentaje

    let statusText = 'Vacío'
    let statusClass = 'bg-text-muted/10 text-text-muted border border-text-muted/20'

    if (cantidadActual >= capMax) {
      statusText = 'Lleno'
      statusClass = 'bg-danger/10 text-danger border border-danger/20'
    } else if (cantidadActual > 0) {
      statusText = 'Parcial'
      statusClass = 'bg-warning/10 text-warning border border-warning/20'
    }

    return {
      torre,
      flejes,
      cantidadActual,
      capMax,
      pesoTorre,
      costoTotalTorre,
      porcentaje,
      statusText,
      statusClass
    }
  })
  
  const displayTotalPeso = isTN ? (pesoTotalAcumulado / 1000).toFixed(3) : pesoTotalAcumulado.toFixed(2)
  const displayTotalPesoLabel = isTN ? 't' : 'kg'
  const capacidadPromedio = totalTorres > 0 ? (sumaPorcentajes / totalTorres).toFixed(0) : 0

  const statCards = [
    { label: 'Torres Filtradas', value: totalTorres, color: 'text-accent' },
    { label: 'Total Flejes', value: totalFlejes, color: 'text-accent' },
    { label: 'Peso Filtrado', value: `${displayTotalPeso} ${displayTotalPesoLabel}`, color: 'text-warning' },
    { label: 'Capacidad Promedio', value: `${capacidadPromedio}%`, color: 'text-info' }
  ]

  return (
    <div className="space-y-6">
      
      {/* Indicadores Estadísticos de Material 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center shadow-xs">
            <span className="text-xs font-semibold text-text-muted mb-1.5">{stat.label}</span>
            <span className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Operaciones Rápidas de Almacén (Solo visibles si no hay sesión activa, no está cargando y no es vista pública) */}
      {!receptionActive && !dispatchActive && !isPublicView && (
        <div ref={topButtonsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 animate-fadeIn">
          <button 
            onClick={onStartReception}
            className="bg-accent/5 border border-accent/25 hover:border-accent/40 hover:bg-accent/10 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all active:scale-98 shadow-xs text-left group min-h-[72px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-md">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Recepción de Camión</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Ingresar lote de flejes (directo a torres o al piso)</p>
              </div>
            </div>
            <Plus className="w-4 h-4 text-accent shrink-0 ml-2" />
          </button>

          <button 
            onClick={onStartDispatch}
            className="bg-warning/5 border border-warning/25 hover:border-warning/40 hover:bg-warning/10 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all active:scale-98 shadow-xs text-left group min-h-[72px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-md">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Despacho de Material</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Retirar lote de flejes y registrar salida</p>
              </div>
            </div>
            <Plus className="w-4 h-4 text-warning shrink-0 ml-2" />
          </button>
        </div>
      )}

      {/* Filtros Rápidos en Chips */}
      <div className="flex flex-wrap gap-2 pb-2">
        {[
          { id: 'todas', label: 'Todas', count: counts.todas },
          { id: 'llenas', label: 'Llenas', count: counts.llenas },
          { id: 'parciales', label: 'Parciales', count: counts.parciales },
          { id: 'vacias', label: 'Vacías', count: counts.vacias },
          ...(dispatchActive ? [{ id: 'seleccionados', label: 'Por Despachar', count: counts.seleccionados }] : [])
        ].map(chip => {
          const isSelected = filtroEstado === chip.id
          return (
            <button
              key={chip.id}
              onClick={() => setFiltroEstado(chip.id)}
              className={`
                px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer flex items-center gap-2
                ${isSelected 
                  ? 'bg-accent/15 border-accent/40 text-accent font-bold shadow-xs' 
                  : 'bg-surface border-border text-text-muted hover:bg-surface-hover hover:text-foreground'
                }
              `}
            >
              <span>{chip.label}</span>
              <span className={`
                text-[9px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors
                ${isSelected ? 'bg-accent text-white' : 'bg-bg text-text-muted'}
              `}>
                {chip.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid de Torres */}
      {torresData.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-16 text-center text-text-muted italic">
          {searchQuery || filtroEstado !== 'todas' 
            ? 'No hay torres coincidentes con los filtros aplicados.' 
            : 'No hay torres registradas en el sistema.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {torresData.map(({ torre, flejes, cantidadActual, capMax, pesoTorre, costoTotalTorre, porcentaje, statusText, statusClass }) => {
            
            const isEmpty = cantidadActual === 0
            const isFull = cantidadActual >= capMax
            const isDimmed = dispatchActive && isEmpty

            // Lógica física: Solo se puede tomar el fleje libre más alto, o devolver el fleje seleccionado más bajo
            let highestUnselectedIdx = -1
            let lowestSelectedIdx = -1

            if (dispatchActive) {
              for (let j = cantidadActual - 1; j >= 0; j--) {
                const isSel = dispatchCart.some(item => item.id === flejes[j].id)
                if (!isSel) {
                  highestUnselectedIdx = j
                  break
                }
              }
              for (let j = 0; j < cantidadActual; j++) {
                const isSel = dispatchCart.some(item => item.id === flejes[j].id)
                if (isSel) {
                  lowestSelectedIdx = j
                  break
                }
              }
            }

            // Generar visualización de los pesos en la derecha (antiguo al tope, reciente a la base)
            const visualStack = []
            for (let i = 0; i < capMax; i++) {
              const itemIndex = capMax - i - 1
              const isOccupied = itemIndex < cantidadActual
              const fleje = isOccupied ? flejes[itemIndex] : null
              
              if (isOccupied && fleje) {
                const isSelected = dispatchActive && dispatchCart.some(item => item.id === fleje.id)
                const canSelect = !dispatchActive || (itemIndex === highestUnselectedIdx || itemIndex === lowestSelectedIdx)
                const showDiffMeasure = fleje.medida && fleje.medida !== torre.nombre_medida
                const costoFleje = fleje.peso * (parseFloat(fleje.costo_kg_ingreso) || 0)

                visualStack.push(
                  <div 
                    key={i} 
                    onClick={(e) => {
                      if (dispatchActive) {
                        e.stopPropagation() // Evita clicks en el card
                        if (canSelect) {
                          onToggleSelectFleje(fleje)
                        }
                      }
                    }}
                    className={`
                      border rounded-xl px-3 py-1.5 flex items-center justify-between transition-all select-none min-h-[34px]
                      ${dispatchActive && canSelect ? 'cursor-pointer active:scale-95' : ''}
                      ${dispatchActive && !canSelect && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
                      ${dispatchActive && !canSelect && isSelected ? 'opacity-80 cursor-not-allowed' : ''}
                      ${isSelected 
                        ? 'bg-warning text-white border-warning shadow-md scale-98 font-bold' 
                        : dispatchActive && canSelect
                          ? 'bg-surface border-accent/40 text-accent hover:bg-accent/5'
                          : 'bg-accent/10 border-accent/30 text-accent'
                      }
                    `}
                  >
                    <span className={`text-[9px] font-semibold font-mono w-4 shrink-0 ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>#{itemIndex + 1}</span>
                    <div className="flex flex-1 items-center justify-between overflow-hidden mx-1.5">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold font-mono">{isTN ? (fleje.peso / 1000).toFixed(3) : fleje.peso.toFixed(2)} {isTN ? 't' : 'kg'}</span>
                        {showDiffMeasure && (
                          <span 
                            title={`Medida diferente: ${fleje.medida}`}
                            className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border leading-none font-mono uppercase ${
                              isSelected
                                ? 'bg-white text-warning border-white'
                                : 'bg-warning/15 text-warning border-warning/30 animate-pulse'
                            }`}
                          >
                            {fleje.medida}
                          </span>
                        )}
                      </div>
                      
                      {costoFleje > 0 && (
                        <span className={`text-[9.5px] font-black font-mono px-2 py-0.5 rounded border shadow-xs ml-2 truncate tracking-tight ${
                          isSelected 
                            ? 'bg-white/20 text-white border-white/30' 
                            : 'bg-surface border-border/60 text-foreground/90'
                        }`}>
                          S/ {costoFleje.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      )}
                    </div>

                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-white animate-scaleUp shrink-0" />
                    ) : (
                      <div className="w-3.5 shrink-0" />
                    )}
                  </div>
                )
              } else {
                visualStack.push(
                  <div 
                    key={i} 
                    className="bg-bg/40 border border-border border-dashed rounded-xl px-3 py-1.5 flex items-center justify-between text-text-muted/30 min-h-[34px]"
                  >
                    <span className="text-[9px] font-medium font-mono">#{itemIndex + 1}</span>
                    <span className="text-xs font-mono tracking-wider">---</span>
                    <span className="text-[9px] font-mono">kg</span>
                  </div>
                )
              }
            }

            // Generar dibujo isométrico SVG dinámico de las bobinas en el poste
            const svgCoils = []
            const spacing = 135 / capMax
            const thickness = Math.max(3, Math.min(10, 100 / capMax))
            const rx = Math.max(12, Math.min(22, 110 / capMax))
            const ry = rx * 0.3
            
            for (let idx = 0; idx < capMax; idx++) {
              const isOccupied = idx < cantidadActual
              const y = 160 - (idx * spacing)
              
              if (isOccupied) {
                const fleje = flejes[idx]
                const isSelected = dispatchActive && fleje && dispatchCart.some(item => item.id === fleje.id)
                svgCoils.push(
                  <g key={idx} className="transition-all duration-300">
                    {/* Borde / Cara de grosor tridimensional */}
                    <path 
                      d={`M ${30 - rx},${y} A ${rx},${ry} 0 0,0 ${30 + rx},${y} L ${30 + rx},${y + thickness} A ${rx},${ry} 0 0,1 ${30 - rx},${y + thickness} Z`} 
                      fill={isSelected ? '#c2410c' : `url(#metalSide-${torre.id})`} 
                    />
                    {/* Cara superior del rollo */}
                    <ellipse 
                      cx="30" 
                      cy={y} 
                      rx={rx} 
                      ry={ry} 
                      fill={isSelected ? '#ea580c' : `url(#metalTop-${torre.id})`} 
                      stroke={isSelected ? '#ffffff' : 'var(--color-accent)'} 
                      strokeWidth="0.5" 
                    />
                    {/* Agujero central */}
                    <ellipse cx="30" cy={y} rx={rx * 0.33} ry={ry * 0.33} fill="#1c1d22" stroke="var(--color-accent-border, var(--color-border))" strokeWidth="0.3" />
                  </g>
                )
              } else {
                // Hueco vacío (elipse discontinua sutil flotante en el poste)
                svgCoils.push(
                  <ellipse 
                    key={idx}
                    cx="30" 
                    cy={y} 
                    rx={rx} 
                    ry={ry} 
                    fill="none" 
                    stroke="var(--color-border)" 
                    strokeWidth="0.75" 
                    strokeDasharray="2,2" 
                    opacity="0.25"
                  />
                )
              }
            }

            const handleCardClick = () => {
              if (isPublicView) return;
              if (receptionActive) {
                if (isFull) {
                  showToast('Esta torre está llena', true)
                  return
                }
                onOpenBatchIngreso(torre.id, torre.posicion, capMax, cantidadActual)
              } else if (dispatchActive) {
                // No abrir nada, se maneja mediante toques en las filas del peso
              } else {
                onSelectTorre(torre.id)
              }
            }

            const selectedFromThisTorre = dispatchActive
              ? dispatchCart.filter(item => item.torre_id === torre.id).length
              : 0
            const hasSelections = selectedFromThisTorre > 0
            const isSelectedTorre = dispatchActive && hasSelections

            return (
              <div 
                key={torre.id}
                onClick={handleCardClick}
                className={`
                  bg-surface border rounded-2xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between
                  ${isDimmed ? 'opacity-30 pointer-events-none border-border' : 'hover:shadow-md cursor-pointer'}
                  ${receptionActive && isFull ? 'opacity-40 border-border pointer-events-none' : ''}
                  ${receptionActive && !isFull ? 'border-accent/40 bg-accent/2 hover:border-accent' : ''}
                  ${isSelectedTorre 
                    ? 'border-warning bg-warning/2 ring-2 ring-warning/25 shadow-md shadow-warning/5 scale-102 z-10' 
                    : !receptionActive ? 'border-border hover:border-accent/40' : ''
                  }
                `}
              >
                <div className="flex flex-col flex-1">
                  {/* Fila superior de información */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-foreground tracking-tight">{torre.posicion}</span>
                      {dispatchActive && selectedFromThisTorre > 0 && (
                        <span className="bg-warning text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-fadeIn font-mono shadow-xs">
                          {selectedFromThisTorre} {selectedFromThisTorre === 1 ? 'seleccionado' : 'seleccionados'}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 mb-4">
                    <p className="text-sm text-foreground font-bold truncate max-w-[200px]">{torre.nombre_medida}</p>
                    {(() => {
                      const cat = catalogoCostos.find(c => c.medida_corta === torre.nombre_medida || c.medida === torre.nombre_medida)
                      const finalGlosa = torre.glosa_medida || (cat ? cat.glosa : null)
                      return finalGlosa && torre.nombre_medida !== 'No asignada' && (
                        <span className="mt-1 inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface border border-border text-text-muted truncate max-w-full" title={finalGlosa}>
                          {finalGlosa}
                        </span>
                      )
                    })()}
                  </div>
                  {/* Barra de progreso de ocupación */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-text-muted mb-1 font-semibold">
                      <span>Ocupación</span>
                      <span>{cantidadActual} / {capMax}</span>
                    </div>
                    <div className="h-1.5 bg-bg rounded-full overflow-hidden border border-border/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          porcentaje >= 100 ? 'bg-danger' : porcentaje >= 60 ? 'bg-warning' : 'bg-accent'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>

                  {/* Vista física SVG y listado lado a lado */}
                  <div className="flex gap-4 items-start mt-auto mb-4">
                    {/* Columna Izquierda: Dibujo físico SVG */}
                    <div className="w-[85px] sm:w-[95px] flex items-end justify-center bg-bg/20 border border-border/30 rounded-2xl py-1.5 px-2 select-none relative overflow-hidden shrink-0" style={{ height: `${capMax * 33.5}px` }}>
                      <svg className="w-full h-full" viewBox="0 0 60 180" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          {/* Poste central degradado metálico */}
                          <linearGradient id={`postGrad-${torre.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#888c94" />
                            <stop offset="35%" stopColor="#cacdd4" />
                            <stop offset="70%" stopColor="#f3f4f6" />
                            <stop offset="100%" stopColor="#555b66" />
                          </linearGradient>
                          {/* Bobina tapa degradado metálico */}
                          <radialGradient id={`metalTop-${torre.id}`} cx="50%" cy="30%" r="50%">
                            <stop offset="0%" stopColor="var(--color-surface)" />
                            <stop offset="75%" stopColor="var(--color-accent)" opacity="0.8" />
                            <stop offset="100%" stopColor="var(--color-accent)" />
                          </radialGradient>
                          {/* Bobina grosor degradado metálico */}
                          <linearGradient id={`metalSide-${torre.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--color-accent)" />
                            <stop offset="50%" stopColor="var(--color-surface)" opacity="0.6" />
                            <stop offset="100%" stopColor="var(--color-accent)" opacity="0.9" />
                          </linearGradient>
                        </defs>
                        
                        {/* Base de la torre */}
                        <path d="M12 174 L48 174 L43 167 L17 167 Z" fill="var(--color-border)" />
                        
                        {/* Husillo vertical central (oculto a pedido del usuario) */}
                        {/* <rect x="27" y="15" width="6" height="152" rx="2" fill={`url(#postGrad-${torre.id})`} /> */}

                        {/* Stacking Coils */}
                        {svgCoils}
                      </svg>
                    </div>

                    {/* Columna Derecha: Pesos detallados */}
                    <div className="flex-1 flex flex-col space-y-1">
                      {visualStack}
                    </div>
                  </div>
                </div>

                {/* Botón de ingreso rápido táctil (solo en recepción activa) */}
                {receptionActive && !isFull && !isPublicView && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenBatchIngreso(torre.id, torre.posicion, capMax, cantidadActual)
                    }}
                    className="mt-3 w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shrink-0 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Ingresar Flejes</span>
                  </button>
                )}

                {/* Pie de tarjeta con sumatoria de pesos */}
                <div className="flex justify-between items-center pt-3 border-t border-border mt-auto">
                  <span className="text-xs text-text-muted">Total Peso:</span>
                  <span className="text-sm font-bold text-warning font-mono">{isTN ? (pesoTorre / 1000).toFixed(3) : pesoTorre.toFixed(2)} {isTN ? 't' : 'kg'}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 animate-fadeIn">
                    <span className="text-[10px] text-text-muted font-bold tracking-wide uppercase">Valorizado:</span>
                    <span className="text-xs font-bold text-accent font-mono">S/ {costoTotalTorre.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* ==================== FLOATING ACTION BUTTONS (FAB) ==================== */}
      {showFABs && !receptionActive && !dispatchActive && !isPublicView && (
        <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 flex flex-col gap-4 animate-slideUp">
          {/* Dispatch FAB */}
          <button 
            onClick={onStartDispatch}
            title="Despacho de Material"
            className="w-14 h-14 bg-warning hover:bg-warning-hover text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border border-warning/50"
          >
            <Send className="w-6 h-6" />
          </button>
          
          {/* Reception FAB */}
          <button 
            onClick={onStartReception}
            title="Recepción de Camión"
            className="w-14 h-14 bg-accent hover:bg-accent-hover text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border border-accent/50"
          >
            <Truck className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}
