import React, { useState } from 'react'
import { ArrowUp, ArrowDown, Edit3, Trash2, FileSpreadsheet } from 'lucide-react'
import { exportarTorresExcel } from '../lib/reportUtils'
import { useUnitSystem } from '../hooks/useUnitSystem'

export default function TorresView({ 
  torres, 
  inventario, 
  catalogoCostos = [],
  searchQuery,
  isLoading,
  onSelectTorre, 
  onEditTorre, 
  onEliminarTorre, 
  onMoverTorre 
}) {
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const { isTN } = useUnitSystem()

  // RENDER SKELETON LOADER
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-5 w-32 bg-border/60 rounded" />
          <div className="h-4 w-24 bg-border/40 rounded" />
        </div>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border/60 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-5 flex items-center justify-between">
              <div className="h-5 w-10 bg-border/60 rounded" />
              <div className="h-5 w-32 bg-border/50 rounded" />
              <div className="h-6 w-16 bg-border/40 rounded-full" />
              <div className="h-5 w-20 bg-border/60 rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-border/30 rounded-lg" />
                <div className="h-8 w-8 bg-border/30 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 1. Filtrar las torres primero según el texto de búsqueda
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

  const getTowerStats = (torreId) => {
    const flejes = inventario[torreId] || []
    const cantidad = flejes.length
    const pesoTotal = flejes.reduce((sum, f) => sum + f.peso, 0)
    return { cantidad, pesoTotal }
  }

  return (
    <div className="space-y-6">
      
      {/* Cabecera del Listado */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Listado de Torres</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-medium font-mono">
            {searchQuery || filtroEstado !== 'todas' 
              ? `${filteredTorres.length} de ` 
              : ''}{torres.length} torres
          </span>
          <button
            onClick={() => exportarTorresExcel(torres, inventario, isTN)}
            title="Exportar Torres a Excel"
            className="bg-accent hover:bg-accent-hover text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Filtros Rápidos en Chips (M3) */}
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

      {filteredTorres.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-16 text-center text-text-muted italic">
          {searchQuery || filtroEstado !== 'todas' 
            ? 'No hay torres coincidentes con los filtros de búsqueda.' 
            : 'No hay torres creadas. Haz clic en "Nueva Torre" en la barra superior.'}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
          
          {/* Vista Tabla de Escritorio */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-hover/20 text-xs font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-4 px-6">Posición</th>
                  <th className="py-4 px-6">Nombre de Medida</th>
                  <th className="py-4 px-6 text-center">Capacidad</th>
                  <th className="py-4 px-6 text-right">Peso Almacenado</th>
                  <th className="py-4 px-6 text-center">Reordenar</th>
                  <th className="py-4 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTorres.map((torre, index) => {
                  const { cantidad, pesoTotal } = getTowerStats(torre.id)
                  const lleno = cantidad >= torre.cantidad_maxima
                  
                  return (
                    <tr 
                      key={torre.id}
                      onClick={() => onSelectTorre(torre.id)}
                      className="hover:bg-surface-hover/30 transition-colors cursor-pointer group text-sm"
                    >
                      {/* Posición */}
                      <td className="py-4 px-6 font-bold text-accent font-mono">{torre.posicion}</td>
                      
                      {/* Medida */}
                      <td className="py-4 px-6">
                        {torre.nombre_medida !== 'No asignada' ? (() => {
                          const cat = catalogoCostos.find(c => c.medida_corta === torre.nombre_medida || c.medida === torre.nombre_medida)
                          const finalGlosa = torre.glosa_medida || (cat ? cat.glosa : null)
                          return (
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-foreground">{torre.nombre_medida}</span>
                              {finalGlosa && (
                                <span className="mt-1 inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface border border-border text-text-muted truncate max-w-full" title={finalGlosa}>
                                  {finalGlosa}
                                </span>
                              )}
                            </div>
                          )
                        })() : (
                          <span className="font-medium text-text-muted italic">{torre.nombre_medida}</span>
                        )}
                      </td>
                      
                      {/* Capacidad */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block font-mono text-xs px-3 py-1 rounded-full font-semibold ${
                          lleno ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-accent/10 text-accent border border-accent/20'
                        }`}>
                          {cantidad} / {torre.cantidad_maxima}
                        </span>
                      </td>
                      
                      {/* Peso */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-warning">{pesoTotal.toFixed(2)} kg</td>
                      
                      {/* Reordenar */}
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onMoverTorre(index, -1)}
                            disabled={index === 0}
                            className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-foreground cursor-pointer flex items-center justify-center transition-colors"
                            title="Subir posición"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onMoverTorre(index, 1)}
                            disabled={index === torres.length - 1}
                            className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-foreground cursor-pointer flex items-center justify-center transition-colors"
                            title="Bajar posición"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      
                      {/* Acciones */}
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEditTorre(torre)}
                            className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-info/10 text-text-muted hover:text-info cursor-pointer flex items-center justify-center transition-all duration-200"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEliminarTorre(torre)}
                            className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-danger/10 text-text-muted hover:text-danger cursor-pointer flex items-center justify-center transition-all duration-200"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Vista Lista de Tarjetas Móviles (para Android) */}
          <div className="block md:hidden divide-y divide-border">
            {filteredTorres.map((torre, index) => {
              const { cantidad, pesoTotal } = getTowerStats(torre.id)
              const lleno = cantidad >= torre.cantidad_maxima
              
              return (
                <div 
                  key={torre.id}
                  onClick={() => onSelectTorre(torre.id)}
                  className="p-4 active:bg-surface-hover/40 transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-accent font-mono">{torre.posicion}</span>
                    <span className={`text-[10px] font-bold font-mono px-3 py-1 rounded-full ${
                      lleno ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-accent/10 text-accent border border-accent/20'
                    }`}>
                      {cantidad} / {torre.cantidad_maxima}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="flex flex-col min-w-0">
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
                    <p className="text-sm font-bold text-warning font-mono shrink-0">{pesoTotal.toFixed(2)} kg</p>
                  </div>

                  {/* Acciones y Reordenamiento (Móvil) */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onMoverTorre(index, -1)}
                        disabled={index === 0}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-surface disabled:opacity-30 text-xs font-semibold text-text-muted flex items-center gap-1 transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" />
                        Subir
                      </button>
                      <button
                        onClick={() => onMoverTorre(index, 1)}
                        disabled={index === torres.length - 1}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-surface disabled:opacity-30 text-xs font-semibold text-text-muted flex items-center gap-1 transition-colors"
                      >
                        <ArrowDown className="w-3 h-3" />
                        Bajar
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditTorre(torre)}
                        className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-info transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEliminarTorre(torre)}
                        className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}

    </div>
  )
}
