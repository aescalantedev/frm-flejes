import React, { useState } from 'react'

export default function PanoramaView({ torres, inventario, searchQuery, isLoading, onSelectTorre }) {
  const [filtroEstado, setFiltroEstado] = useState('todas')

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

  // 2. Calcular los contadores de cada chip basados en el filtro de búsqueda
  const counts = {
    todas: searchFiltered.length,
    llenas: searchFiltered.filter(t => (inventario[t.id] || []).length >= t.cantidad_maxima).length,
    parciales: searchFiltered.filter(t => {
      const len = (inventario[t.id] || []).length
      return len > 0 && len < t.cantidad_maxima
    }).length,
    vacias: searchFiltered.filter(t => (inventario[t.id] || []).length === 0).length
  }

  // 3. Filtrar según el estado seleccionado en los chips
  const filteredTorres = searchFiltered.filter(t => {
    const len = (inventario[t.id] || []).length
    if (filtroEstado === 'llenas') return len >= t.cantidad_maxima
    if (filtroEstado === 'parciales') return len > 0 && len < t.cantidad_maxima
    if (filtroEstado === 'vacias') return len === 0
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
    const pesoTorre = flejes.reduce((sum, f) => sum + f.peso, 0)
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
      porcentaje,
      statusText,
      statusClass
    }
  })

  const pesoTotalToneladas = pesoTotalAcumulado / 1000
  const capacidadPromedio = totalTorres > 0 ? (sumaPorcentajes / totalTorres).toFixed(0) : 0

  const statCards = [
    { label: 'Torres Filtradas', value: totalTorres, color: 'text-accent' },
    { label: 'Total Flejes', value: totalFlejes, color: 'text-accent' },
    { label: 'Peso Filtrado', value: `${pesoTotalToneladas.toFixed(3)} t`, color: 'text-warning' },
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

      {/* Filtros Rápidos en Formato de Chips (M3) */}
      <div className="flex flex-wrap gap-2 pb-2">
        {[
          { id: 'todas', label: 'Todas', count: counts.todas },
          { id: 'llenas', label: 'Llenas', count: counts.llenas },
          { id: 'parciales', label: 'Parciales', count: counts.parciales },
          { id: 'vacias', label: 'Vacías', count: counts.vacias }
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
          {torresData.map(({ torre, flejes, cantidadActual, capMax, pesoTorre, porcentaje, statusText, statusClass }) => {
            
            // Generar visualización de los pesos en la derecha (antiguo al tope, reciente a la base)
            const visualStack = []
            for (let i = 0; i < capMax; i++) {
              const itemIndex = capMax - i - 1
              const isOccupied = itemIndex < cantidadActual
              const fleje = isOccupied ? flejes[cantidadActual - 1 - itemIndex] : null
              
              if (isOccupied && fleje) {
                visualStack.push(
                  <div 
                    key={i} 
                    className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-1.5 flex items-center justify-between transition-all"
                  >
                    <span className="text-[9px] font-semibold text-text-muted font-mono">#{itemIndex + 1}</span>
                    <span className="text-xs font-bold text-accent font-mono">{fleje.peso.toFixed(2)}</span>
                    <span className="text-[9px] text-text-muted font-mono">kg</span>
                  </div>
                )
              } else {
                visualStack.push(
                  <div 
                    key={i} 
                    className="bg-bg/40 border border-border border-dashed rounded-xl px-3 py-1.5 flex items-center justify-between text-text-muted/30"
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
                svgCoils.push(
                  <g key={idx} className="transition-all duration-300">
                    {/* Borde / Cara de grosor tridimensional */}
                    <path 
                      d={`M ${30 - rx},${y} A ${rx},${ry} 0 0,0 ${30 + rx},${y} L ${30 + rx},${y + thickness} A ${rx},${ry} 0 0,1 ${30 - rx},${y + thickness} Z`} 
                      fill={`url(#metalSide-${torre.id})`} 
                    />
                    {/* Cara superior del rollo */}
                    <ellipse cx="30" cy={y} rx={rx} ry={ry} fill={`url(#metalTop-${torre.id})`} stroke="var(--color-accent)" strokeWidth="0.5" />
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

            return (
              <div 
                key={torre.id}
                onClick={() => onSelectTorre(torre.id)}
                className="bg-surface border border-border hover:border-accent/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex flex-col flex-1">
                  {/* Fila superior de información */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold text-foreground tracking-tight">{torre.posicion}</span>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-4">{torre.nombre_medida}</p>

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
                        
                        {/* Husillo vertical central */}
                        <rect x="27" y="15" width="6" height="152" rx="2" fill={`url(#postGrad-${torre.id})`} />

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

                {/* Pie de tarjeta con sumatoria de pesos */}
                <div className="flex justify-between items-center pt-3 border-t border-border mt-auto">
                  <span className="text-xs text-text-muted">Total Peso:</span>
                  <span className="text-sm font-bold text-warning font-mono">{pesoTorre.toFixed(2)} kg</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
    </div>
  )
}
