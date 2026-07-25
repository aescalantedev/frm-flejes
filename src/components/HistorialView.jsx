import React from 'react'
import { Calendar, User, FileText, Clock, FileSpreadsheet } from 'lucide-react'

export default function HistorialView({ historial, filtroFecha, isLoading }) {
  
  // RENDER SKELETON LOADER
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center animate-pulse">
          <div className="h-5 w-32 bg-border/60 rounded" />
          <div className="h-4 w-24 bg-border/40 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-border/60 rounded" />
                <div className="h-5 w-16 bg-border/65 rounded-full" />
              </div>
              <div className="h-6 w-40 bg-border/70 rounded" />
              <div className="h-8 w-20 bg-border/50 rounded-xl" />
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="h-3.5 w-32 bg-border/40 rounded" />
                <div className="h-3.5 w-48 bg-border/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Filtrar el historial si se define una fecha
  const filteredHistorial = filtroFecha 
    ? historial.filter(m => m.created_at.startsWith(filtroFecha))
    : historial

  return (
    <div className="space-y-6">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Registro de Salidas</h2>
        <span className="text-xs text-text-muted font-medium font-mono">{filteredHistorial.length} movimientos</span>
      </div>

      {filteredHistorial.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-16 text-center text-text-muted italic">
          No se encontraron movimientos registrados {filtroFecha ? 'para la fecha seleccionada' : ''}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistorial.map((mov) => {
            const dateObj = new Date(mov.created_at)
            const formattedDate = dateObj.toLocaleDateString()
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            
            const esConsumo = mov.motivo === 'Consumo'
            const statusClass = esConsumo 
              ? 'bg-warning/10 text-warning border border-warning/20' 
              : 'bg-accent/10 text-accent border border-accent/20'

            return (
              <div 
                key={mov.id}
                className="bg-surface border border-border border-l-4 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200"
                style={{ borderLeftColor: esConsumo ? 'var(--color-warning)' : 'var(--color-accent)' }}
              >
                <div>
                  {/* Fila superior */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[10px] text-text-muted font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formattedDate} {formattedTime}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${statusClass}`}>
                      {mov.motivo}
                    </span>
                  </div>

                  {/* Posicion y Medida */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-foreground tracking-tight font-mono">{mov.posicion}</span>
                    <span className="text-text-muted text-xs">•</span>
                    <span className="text-text-muted text-xs font-semibold">{mov.medida}</span>
                  </div>

                  {/* Peso */}
                  <div className="bg-bg border border-border rounded-xl px-4 py-2.5 inline-flex items-baseline gap-1 mb-4 font-mono">
                    <span className="text-lg font-bold text-warning">{mov.peso_fleje.toFixed(2)}</span>
                    <span className="text-[10px] text-text-muted font-sans font-semibold">kg</span>
                  </div>
                </div>

                {/* Detalles en el pie */}
                <div className="space-y-2 text-xs pt-3.5 border-t border-border mt-auto">
                  <div className="flex items-center gap-2 text-text-muted">
                    <FileSpreadsheet className="w-4 h-4 text-text-muted/60 shrink-0" />
                    <span className="font-medium">Solicitud:</span>
                    <span className="font-semibold text-foreground">{mov.num_solicitud || '-'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-text-muted">
                    <User className="w-4 h-4 text-text-muted/60 shrink-0" />
                    <span className="font-medium">Despachador:</span>
                    <span className="font-semibold text-foreground">{mov.despachador || '-'}</span>
                  </div>

                  {/* Hora de inicio */}
                  {mov.hora_inicio && (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Clock className="w-4 h-4 text-text-muted/60 shrink-0" />
                      <span className="font-medium">Inicio:</span>
                      <span className="font-semibold text-foreground font-mono">
                        {new Date(mov.hora_inicio).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
