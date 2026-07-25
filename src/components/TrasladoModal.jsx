import React, { useState, useEffect } from 'react'
import { X, Calendar, User, FileText, ArrowRightLeft } from 'lucide-react'

export default function TrasladoModal({ 
  torreId, 
  torres, 
  inventario, 
  onClose, 
  onConfirm 
}) {
  const [flejeId, setFlejeId] = useState('')
  const [motivo, setMotivo] = useState('consumo')
  const [numSolicitud, setNumSolicitud] = useState('')
  const [despachador, setDespachador] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [procesando, setProcesando] = useState(false)

  const torre = torres.find(t => t.id === torreId)
  const flejes = inventario[torreId] || []

  // Pre-fill local date and time in local format for datetime-local input
  useEffect(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16)
    setHoraInicio(localISOTime)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!flejeId) {
      alert('Selecciona un fleje')
      return
    }
    if (!numSolicitud.trim()) {
      alert('Ingresa el número de solicitud')
      return
    }
    if (!despachador.trim()) {
      alert('Ingresa el nombre del despachador')
      return
    }
    if (!horaInicio) {
      alert('Ingresa la fecha y hora de inicio')
      return
    }

    setProcesando(true)
    const success = await onConfirm({
      flejeId,
      motivo: motivo === 'consumo' ? 'Consumo' : 'Devolución',
      numSolicitud: numSolicitud.trim(),
      despachador: despachador.trim(),
      horaInicio
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
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">-- Seleccionar Fleje --</option>
                {flejes.map((f, i) => (
                  <option key={f.id} value={f.id}>
                    Fleje #{i + 1} ({f.peso.toFixed(2)} kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Motivo</label>
              <select 
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
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

            {/* Despachador */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Nombre - Despachador</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ej: Juan Pérez López"
                  required
                  value={despachador}
                  onChange={(e) => setDespachador(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Fecha y Hora de Inicio */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Fecha y Hora de Inicio</label>
              <div className="relative">
                <input 
                  type="datetime-local" 
                  required
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pl-10 text-foreground text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                />
                <Calendar className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
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
