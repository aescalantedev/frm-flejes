import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { KeyRound, Mail, Loader2, User, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react'

export default function LoginScreen({ showToast }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Mensajes de alerta en UI
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, completa todos los campos requeridos.')
      return
    }
    if (isRegister && !fullName.trim()) {
      setErrorMsg('Por favor, ingresa tu nombre completo.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (isRegister && password !== confirmPassword) {
      setErrorMsg('Las contraseñas ingresadas no coinciden. Por favor, verifícalas.')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        // REGISTRO DE NUEVA CUENTA
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: fullName.trim(),
              rol: 'Operador'
            }
          }
        })
        if (error) throw error
        
        // Supabase Auth auto-confirm check
        if (data.user && data.session === null) {
          setSuccessMsg('¡Cuenta registrada! Te hemos enviado un correo de confirmación. Por favor, revisa tu bandeja de entrada para verificar tu cuenta antes de iniciar sesión.')
        } else {
          showToast('Cuenta creada con éxito.')
        }
        
        // Reset fields
        setFullName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setIsRegister(false)
      } else {
        // INICIO DE SESIÓN
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        })
        if (error) {
          // Capturar error de correo no verificado en Supabase
          if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('confirm your email')) {
            throw new Error('Cuenta no verificada. Por favor revisa tu bandeja de entrada para activar tu cuenta antes de iniciar sesión.')
          }
          throw error
        }
        showToast('Acceso concedido')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.')
    } finally {
      setLoading(false)
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
        
        {/* Toggle tabs */}
        <div className="flex bg-bg p-0.5 border border-border rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false)
              setErrorMsg('')
              setSuccessMsg('')
              setEmail('')
              setPassword('')
              setConfirmPassword('')
              setFullName('')
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !isRegister 
                ? 'bg-surface text-accent shadow-xs' 
                : 'text-text-muted hover:text-foreground'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true)
              setErrorMsg('')
              setSuccessMsg('')
              setEmail('')
              setPassword('')
              setConfirmPassword('')
              setFullName('')
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isRegister 
                ? 'bg-surface text-accent shadow-xs' 
                : 'text-text-muted hover:text-foreground'
            }`}
          >
            Registrarse
          </button>
        </div>

        <div>
          <h2 className="text-sm font-bold text-foreground">
            {isRegister ? 'Crear nueva cuenta de operador' : 'Iniciar sesión en el sistema'}
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            {isRegister ? 'Completa tus datos de planta para registrarte.' : 'Ingresa tus credenciales autorizadas de Chilca.'}
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
          {isRegister && (
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

          {/* Confirmar Contraseña (solo en registro) */}
          {isRegister && (
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

          {/* Botón de Envió */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-bold py-3 rounded-xl cursor-pointer shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>{isRegister ? 'Crear Cuenta' : 'Ingresar'}</span>
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
