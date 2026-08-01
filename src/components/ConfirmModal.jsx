import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  isDestructive = true 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />
      
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 space-y-4 animate-scaleUp text-left">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
            ${isDestructive ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}
          `}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-base text-foreground tracking-tight">{title}</h4>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          {message}
        </p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 py-2.5 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center shadow-sm
              ${isDestructive ? 'bg-danger hover:bg-red-700' : 'bg-accent hover:bg-accent-hover'}
            `}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-bg hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
