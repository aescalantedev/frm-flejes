import React, { useState } from 'react'
import { Plus, Check, X, Truck, Send, Trash2, ArrowRight } from 'lucide-react'

export default function SessionBanner({
  type, // 'reception' | 'dispatch'
  sessionData,
  torres,
  onAddFloor, // Para recepción
  onFinish,
  onCancel,
  onRemoveItem
}) {
  const [showCartDetail, setShowCartDetail] = useState(false)

  if (!sessionData) return null

  const totalItems = sessionData.items.length
  const totalPeso = sessionData.items.reduce((sum, item) => sum + item.peso, 0)

  return (
    <>
      {/* Banner inferior colapsado (Diseñado para ser un botón grande e interactivo) */}
      <div 
        onClick={() => setShowCartDetail(true)}
        className="fixed bottom-[76px] md:bottom-4 left-4 right-4 z-40 bg-accent text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all active:scale-97 select-none max-w-xl mx-auto hover:brightness-105"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            {type === 'reception' ? <Truck className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest block font-mono">
              {type === 'reception' ? 'RECEPCIÓN ACTIVA EN CURSO' : 'DESPACHO ACTIVO EN CURSO'}
            </span>
            <h4 className="text-xs font-bold truncate">
              {type === 'reception' 
                ? `Chofer: ${sessionData.entregado_por}` 
                : `Destino: ${sessionData.destino} (${sessionData.motivo})`}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-md font-mono">
                {totalItems} {totalItems === 1 ? 'fleje' : 'flejes'}
              </span>
              <span className="text-[10px] font-bold bg-white/30 px-2 py-0.5 rounded-md font-mono">
                {totalPeso.toFixed(2)} kg
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white text-accent px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition-transform shrink-0">
          <span>Ver Lote</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </div>
      </div>

      {/* PANTALLA COMPLETA EN MÓVIL (Slide-up modal gigante para baja visión y fácil manejo) */}
      {showCartDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center animate-fadeIn p-0 sm:p-4">
          <div className="bg-surface border border-border w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            
            {/* Cabecera del Lote */}
            <div className="px-6 py-5 border-b border-border bg-bg/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${type === 'reception' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}
                `}>
                  {type === 'reception' ? <Truck className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {type === 'reception' ? 'Lote de Recepción' : 'Lote de Despacho'}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {type === 'reception' 
                      ? `Entregado por: ${sessionData.entregado_por}` 
                      : `Destino: ${sessionData.destino} (${sessionData.motivo})`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCartDetail(false)}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-bg border border-border text-text-muted hover:text-foreground cursor-pointer transition-colors active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Listado de Flejes en Lote */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-bg/10">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Detalle del Lote
                </span>
                <span className="text-xs text-accent font-bold font-mono">
                  {totalItems} items seleccionados
                </span>
              </div>

              {totalItems === 0 ? (
                <div className="bg-surface border border-border border-dashed rounded-2xl p-10 text-center text-xs text-text-muted italic">
                  No hay flejes seleccionados en este lote
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionData.items.map((item, idx) => {
                    let tName = 'Al Piso'
                    let tMedida = 'Almacenamiento temporal en piso'
                    if (item.torre_id) {
                      const t = torres.find(x => x.id === item.torre_id)
                      if (t) {
                        tName = `Torre ${t.posicion}`
                        tMedida = t.nombre_medida
                      }
                    }

                    return (
                      <div 
                        key={idx}
                        className="flex justify-between items-center bg-surface border border-border hover:border-accent/40 rounded-2xl p-4 transition-all shadow-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-foreground block">{tName}</span>
                          <span className="text-[10px] text-text-muted block mt-0.5 truncate">{tMedida}</span>
                          {item.lote && (
                            <span className="inline-flex w-fit items-center px-1.5 py-0.5 mt-1.5 rounded text-[9px] font-bold bg-accent/10 border border-accent/20 text-accent truncate" title={`Lote: ${item.lote}`}>
                              Lote: {item.lote}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <span className="text-base font-bold text-accent font-mono">{item.peso.toFixed(2)} kg</span>
                          <button
                            onClick={() => onRemoveItem(type === 'reception' ? idx : item)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-danger/10 text-danger hover:bg-danger/25 transition-colors cursor-pointer active:scale-90"
                            title="Quitar del lote"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Totalizadores Generales */}
            <div className="p-6 border-t border-border bg-bg/50 shrink-0 space-y-4">
              <div className="bg-surface border border-border rounded-2xl p-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Flejes</span>
                  <span className="text-xl font-bold text-foreground font-mono">{totalItems} uds</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Peso Acumulado</span>
                  <span className="text-xl font-bold text-accent font-mono">{totalPeso.toFixed(2)} kg</span>
                </div>
              </div>

              {/* Botón Terminar Operación y Botones Auxiliares */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onFinish()
                    setShowCartDetail(false)
                  }}
                  disabled={totalItems === 0}
                  className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl text-sm cursor-pointer transition-all active:scale-98 shadow-md flex items-center justify-center gap-2 min-h-[52px]"
                >
                  <Check className="w-5 h-5" />
                  <span>{type === 'reception' ? 'Confirmar y Guardar Recepción' : 'Confirmar y Guardar Despacho'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCartDetail(false)}
                    className="flex-1 bg-surface border border-border hover:bg-surface-hover text-foreground font-semibold py-3 px-4 rounded-xl text-xs cursor-pointer transition-all active:scale-95 text-center min-h-[44px]"
                  >
                    Seguir Seleccionando
                  </button>

                  <button
                    onClick={() => {
                      onCancel()
                      setShowCartDetail(false)
                    }}
                    className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 font-semibold px-4 rounded-xl text-xs cursor-pointer transition-all active:scale-95 text-center shrink-0 min-h-[44px]"
                  >
                    Descartar Todo
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
