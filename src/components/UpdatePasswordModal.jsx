import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'

export default function UpdatePasswordModal({ onClose }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleUpdate = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      if (error) throw error
      
      localStorage.removeItem('forcePasswordReset')
      setSuccessMsg('¡Contraseña actualizada con éxito!')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-xl flex flex-col gap-4 animate-scaleUp">
        <div className="flex flex-col items-center justify-center mb-2">
          <div className="w-12 h-12 bg-accent/15 rounded-xl flex items-center justify-center text-accent mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">Actualizar Contraseña</h2>
          <p className="text-xs text-text-muted text-center mt-1">
            Has accedido mediante un enlace de recuperación. Por favor, ingresa tu nueva contraseña para proteger tu cuenta.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl p-3 flex gap-2 items-start text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-success/10 border border-success/20 text-success rounded-xl p-3 flex gap-2 items-start text-[11px]">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2 pl-9 pr-10 text-xs outline-none text-foreground font-mono"
              />
              <KeyRound className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2 pl-9 pr-3 text-xs outline-none text-foreground font-mono"
              />
              <KeyRound className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
