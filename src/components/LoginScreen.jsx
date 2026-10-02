import React, { useState } from 'react'
import { KeyRound, Mail, Loader2, User, Eye, EyeOff, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function LoginScreen({ showToast }) {
  // 'login' | 'register' | 'forgot_password'
  const [viewMode, setViewMode] = useState('login')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const {
    loading,
    errorMsg,
    setErrorMsg,
    successMsg,
    clearMessages,
    signUp,
    signIn,
    resetPassword
  } = useAuth()

  // Validación de formato de correo
  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  // Comprobar si el formulario actual está listo para enviarse
  const isFormValid = () => {
    if (!email.trim() || !isValidEmail(email)) return false
    
    if (viewMode === 'forgot_password') return true
    
    if (!password.trim() || password.length < 6) return false
    
    if (viewMode === 'register') {
      if (!fullName.trim()) return false
      if (password !== confirmPassword) return false
    }
    
    return true
  }

  const handleSwitchView = (mode) => {
    setViewMode(mode)
    clearMessages()
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFullName('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearMessages()

    if (!isValidEmail(email)) {
      setErrorMsg('Por favor, ingresa un correo electrónico válido.')
      return
    }

    if (viewMode === 'forgot_password') {
      await resetPassword(email)
      return
    }

    if (viewMode === 'register') {
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.')
        return
      }
      const res = await signUp(email, password, fullName)
      if (res.success && !res.requireConfirmation) {
        showToast('Cuenta creada con éxito.')
        handleSwitchView('login')
      } else if (res.success && res.requireConfirmation) {
        // Mantiene la vista, el successMsg ya muestra que revise el correo
        setFullName('')
        setPassword('')
        setConfirmPassword('')
      }
      return
    }

    if (viewMode === 'login') {
      const res = await signIn(email, password)
      if (res.success) {
        showToast('Acceso concedido')
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 transition-all duration-300">
      
      {/* Branding Header */}
      <div className="flex flex-col items-center justify-center mb-6 text-center animate-fadeIn">
        <div className="w-14 h-14 bg-accent/15 rounded-2xl flex items-center justify-center text-accent mb-3 shadow-md border border-accent/25">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">SISTEMA DE FLEJES</h1>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Control de Inventario y Trazabilidad</p>
      </div>

      {/* Tarjeta de Formulario */}
      <div className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-xl flex flex-col gap-4 animate-scaleUp">
        
        {/* Toggle tabs (ocultos si estamos en recuperación de contraseña) */}
        {viewMode !== 'forgot_password' && (
          <div className="flex bg-bg p-0.5 border border-border rounded-xl">
            <button
              type="button"
              onClick={() => handleSwitchView('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'login'
                  ? 'bg-surface text-accent shadow-xs' 
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView('register')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'register'
                  ? 'bg-surface text-accent shadow-xs' 
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              Registrarse
            </button>
          </div>
        )}

        {/* Botón Volver para recuperar contraseña */}
        {viewMode === 'forgot_password' && (
          <button
            type="button"
            onClick={() => handleSwitchView('login')}
            className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-foreground transition-colors w-max"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        )}

        <div>
          <h2 className="text-sm font-bold text-foreground">
            {viewMode === 'register' && 'Crear nueva cuenta de operador'}
            {viewMode === 'login' && 'Iniciar sesión en el sistema'}
            {viewMode === 'forgot_password' && 'Recuperar Contraseña'}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {viewMode === 'register' && 'Completa tus datos de planta para registrarte.'}
            {viewMode === 'login' && 'Ingresa tus credenciales autorizadas de Chilca.'}
            {viewMode === 'forgot_password' && 'Ingresa tu correo y te enviaremos instrucciones.'}
          </p>
        </div>

        {/* ALERTA DE ERROR */}
        {errorMsg && (
          <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl p-3 flex gap-2 items-start text-[11px] animate-fadeIn leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
            <div className="space-y-0.5">
              <span className="font-bold">Atención:</span>
              <p className="opacity-95">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ALERTA DE ÉXITO */}
        {successMsg && (
          <div className="bg-success/10 border border-success/20 text-success rounded-xl p-3 flex gap-2 items-start text-[11px] animate-fadeIn leading-relaxed">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-success" />
            <div className="space-y-0.5">
              <span className="font-bold">Confirmación:</span>
              <p className="opacity-95">{successMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nombre Completo */}
          {viewMode === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Nombre Completo</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none text-foreground font-semibold transition-colors"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Correo Electrónico</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="operador@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none text-foreground font-semibold transition-colors font-sans"
              />
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Contraseña */}
          {viewMode !== 'forgot_password' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2.5 pl-9 pr-10 text-xs outline-none text-foreground transition-colors font-mono"
                />
                <KeyRound className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg hover:bg-bg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirmar Contraseña (solo en registro) */}
          {viewMode === 'register' && (
            <div className="space-y-1 animate-slideDown">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2.5 pl-9 pr-10 text-xs outline-none text-foreground transition-colors font-mono"
                />
                <KeyRound className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Enlace de Olvidé mi contraseña */}
          {viewMode === 'login' && (
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => handleSwitchView('forgot_password')}
                className="text-[10px] text-accent hover:text-accent-hover font-semibold transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-bold py-3 rounded-xl cursor-pointer shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>
                {viewMode === 'register' && 'Crear Cuenta'}
                {viewMode === 'login' && 'Ingresar'}
                {viewMode === 'forgot_password' && 'Enviar Instrucciones'}
              </span>
            )}
          </button>
        </form>

      </div>

      <div className="text-[10px] text-text-muted/60 font-semibold mt-8 tracking-wider">
        SISTEMA DE FLEJES v2.0 • PLANTA CHILCA
      </div>
    </div>
  )
}
