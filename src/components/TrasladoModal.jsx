import React, { useState } from 'react'
import { X, FileText, ArrowRightLeft, MapPin, AlertTriangle } from 'lucide-react'

export default function TrasladoModal({ 
  torreId, 
  torres, 
  inventario, 
  userProfile,
  onClose, 
  onConfirm 
}) {
  const [flejeId, setFlejeId] = useState('')
  const [motivo, setMotivo] = useState('consumo')
  const [numSolicitud, setNumSolicitud] = useState('')
  const [destino, setDestino] = useState('')
  const [procesando, setProcesando] = useState(false)

  const torre = torres.find(t => t.id === torreId)
  const flejes = inventario[torreId] || []
  const topFleje = flejes.length > 0 ? flejes[flejes.length - 1] : null

  React.useEffect(() => {
    if (topFleje) {
      setFlejeId(topFleje.id)
    }
  }, [topFleje])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!flejeId) {
      alert('Por favor, selecciona un fleje')
      return
    }
    if (!numSolicitud.trim()) {
      alert('Por favor, ingresa el número de solicitud')
      return
    }
    if (!destino.trim()) {
      alert('Por favor, ingresa el destino')
      return
    }

    setProcesando(true)
    const success = await onConfirm({
      flejeId,
      motivo: motivo === 'consumo' ? 'Consumo' : 'Devolución',
      numSolicitud: numSolicitud.trim(),
      despachador: userProfile?.name || 'Operador',
      destino: destino.trim(),
      horaInicio: new Date().toISOString()
    })
    setProcesando(false)
    if (success) {
      onClose()
    }
  }

  if (!torre) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface rounded-2xl w-full max-w-md border border-border shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-warning" />
            <h3 className="font-bold text-base text-foreground">Salida / Consumo ({torre.posicion})</h3>
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
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            
            {/* Seleccionar Fleje */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Seleccionar Fleje</label>
              <select 
                value={flejeId}
                onChange={(e) => setFlejeId(e.target.value)}
                required
                disabled
                className="w-full bg-bg/50 border border-border rounded-xl px-4 py-2.5 text-foreground font-bold text-sm outline-none opacity-80 cursor-not-allowed"
              >
                {topFleje ? (
                  <option value={topFleje.id}>
                    Fleje #{flejes.length} ({topFleje.peso.toFixed(2)} kg) - En Cima
                  </option>
                ) : (
                  <option value="">-- No hay flejes --</option>
                )}
              </select>
              <p className="text-[10px] text-warning mt-1.5 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Por física, solo puedes despachar el fleje que está en la cima.
              </p>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Motivo</label>
              <select 
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
              >
                <option value="consumo">Consumo</option>
                <option value="devolucion">Devolución</option>
              </select>
            </div>

            {/* Número de Solicitud */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Número de Solicitud</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ej: SOL-001"
                  required
                  value={numSolicitud}
                  onChange={(e) => setNumSolicitud(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
                />
                <FileText className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Destino */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Destino / Área Destinataria</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ej: Planta A, Taller, Descarte..."
                  required
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
                />
                <MapPin className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
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
              disabled={procesando}
              className="flex-1 bg-warning hover:bg-amber-600 text-white px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {procesando ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
