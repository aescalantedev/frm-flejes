import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { KeyRound, Mail, Loader2, User, Eye, EyeOff } from 'lucide-react'

export default function LoginScreen({ showToast }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      showToast('Por favor complete todos los campos', true)
      return
    }
    if (isRegister && !fullName.trim()) {
      showToast('Por favor ingrese su nombre completo', true)
      return
    }
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', true)
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        // Registro de usuario nuevo
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: fullName.trim(),
              rol: 'Operador' // Rol inicial asignado
            }
          }
        })
        if (error) throw error
        
        showToast('Registro exitoso. Ya puedes iniciar sesión.')
        setIsRegister(false)
        setPassword('')
      } else {
        // Inicio de sesión
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        })
        if (error) throw error
        showToast('Acceso concedido')
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al procesar la solicitud', true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 transition-all duration-300">
      
      {/* Branding Logo / Icono */}
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <div className="w-14 h-14 bg-accent/15 rounded-2xl flex items-center justify-center text-accent mb-3 shadow-md">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">SISTEMA DE FLEJES</h1>
        <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mt-1">Control de Inventario y Trazabilidad</p>
      </div>

      {/* Formulario */}
      <div className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        
        {/* Toggle tabs */}
        <div className="flex bg-bg p-0.5 border border-border rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false)
              setEmail('')
              setPassword('')
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
              setEmail('')
              setPassword('')
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
            {isRegister ? 'Completa tus datos para registrarte.' : 'Ingresa tus credenciales autorizadas.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Nombre Completo (solo en registro) */}
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
                  className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none text-foreground font-semibold transition-colors font-sans"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Campo Email */}
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

          {/* Campo Password */}
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

          {/* Botón de Envío */}
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
        SISTEMA DE FLEJES v2.0 • PLANTA CENTRAL
      </div>
    </div>
  )
}
