import React from 'react'
import { X, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ConfirmSessionModal({
  isOpen,
  onClose,
  type, // 'reception' | 'dispatch'
  sessionData,
  torres = [],
  onConfirm
}) {
  if (!isOpen || !sessionData) return null

  // Calcular resúmenes
  const totalItems = sessionData.items.length
  
  // Para recepción, los items son { torre_id, peso }.
  // Para despacho, los items son objetos completos de flejes seleccionados.
  const totalPeso = type === 'reception'
    ? sessionData.items.reduce((sum, item) => sum + item.peso, 0)
    : sessionData.items.reduce((sum, item) => sum + item.peso, 0)

  // Agrupar items por torre para mostrar un desglose limpio
  const breakdown = {}
  
  if (type === 'reception') {
    sessionData.items.forEach(item => {
      let tName = 'Al Piso'
      if (item.torre_id) {
        const t = torres.find(x => x.id === item.torre_id)
        if (t) tName = t.posicion
      }
      if (!breakdown[tName]) {
        breakdown[tName] = { count: 0, peso: 0 }
      }
      breakdown[tName].count += 1
      breakdown[tName].peso += item.peso
    })
  } else {
    // Despacho: los items son flejes con torre_id
    sessionData.items.forEach(fleje => {
      let tName = 'Sin Torre'
      if (fleje.torre_id) {
        const t = torres.find(x => x.id === fleje.torre_id)
        if (t) tName = t.posicion
      }
      if (!breakdown[tName]) {
        breakdown[tName] = { count: 0, peso: 0 }
      }
      breakdown[tName].count += 1
      breakdown[tName].peso += fleje.peso
    })
  }

  const handleSave = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
        
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span>Confirmar {type === 'reception' ? 'Recepción' : 'Despacho'}</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Alerta Inicial */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-muted leading-relaxed">
              Por favor, verifica el resumen de la operación. Una vez confirmada, se guardarán los registros permanentes en el historial de auditoría.
            </p>
          </div>

          {/* Información General */}
          <div className="bg-bg/40 border border-border rounded-xl p-3.5 space-y-2">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Datos de la Sesión</h3>
            
            {type === 'reception' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted text-[10px]">Entregado por:</span>
                  <p className="font-semibold text-foreground truncate">{sessionData.entregado_por}</p>
                </div>
                <div>
                  <span className="text-text-muted text-[10px]">Fotos:</span>
                  <p className="font-semibold text-foreground font-mono">{sessionData.fotos.length} capturadas</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted text-[10px]">Destino:</span>
                  <p className="font-semibold text-foreground truncate">{sessionData.destino}</p>
                </div>
                <div>
                  <span className="text-text-muted text-[10px]">Solicitud / Guía:</span>
                  <p className="font-semibold text-accent font-mono truncate">{sessionData.num_solicitud}</p>
                </div>
                <div className="col-span-2 pt-1 border-t border-border/20">
                  <span className="text-text-muted text-[10px]">Motivo de Salida:</span>
                  <p className="font-semibold text-foreground truncate">{sessionData.motivo}</p>
                </div>
              </div>
            )}

            {sessionData.observaciones && (
              <div className="pt-2 border-t border-border/40 text-xs">
                <span className="text-text-muted text-[10px]">Observaciones:</span>
                <p className="italic text-text-muted/80 text-[11px]">{sessionData.observaciones}</p>
              </div>
            )}
          </div>

          {/* Desglose por Torres */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Distribución en Planta</h3>
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-bg/20">
              {Object.keys(breakdown).map((tName, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 text-xs">
                  <span className="font-bold text-foreground">{tName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{breakdown[tName].count} flejes</span>
                    <span className="font-semibold text-accent font-mono">{breakdown[tName].peso.toFixed(2)} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gran Totalizador */}
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-2xl flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Carga Total</span>
              <span className="text-sm font-bold text-foreground font-mono">{totalItems} flejes</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Peso Acumulado</span>
              <span className="text-lg font-bold text-accent font-mono">{totalPeso.toFixed(2)} kg</span>
            </div>
          </div>

        </div>

        {/* Acciones */}
        <div className="p-5 border-t border-border flex gap-2.5 bg-surface shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-bg border border-border hover:bg-surface-hover text-foreground font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all active:scale-98"
          >
            Corregir / Volver
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all active:scale-98"
          >
            Confirmar y Guardar
          </button>
        </div>

      </div>
    </div>
  )
}
