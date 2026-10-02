import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const clearMessages = () => {
    setErrorMsg('')
    setSuccessMsg('')
  }

  const signUp = async (email, password, fullName) => {
    setLoading(true)
    clearMessages()
    try {
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
      
      if (data.user && data.session === null) {
        setSuccessMsg('¡Cuenta registrada! Te hemos enviado un correo de confirmación. Por favor, revisa tu bandeja de entrada antes de iniciar sesión.')
        return { success: true, requireConfirmation: true }
      }
      return { success: true, requireConfirmation: false }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    clearMessages()
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      })
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('confirm your email')) {
          throw new Error('Cuenta no verificada. Por favor revisa tu bandeja de entrada para activar tu cuenta antes de iniciar sesión.')
        }
        throw error
      }
      return { success: true }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    setLoading(true)
    clearMessages()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // En un futuro se puede agregar un redirectTo si configuran una ruta específica en su router
        // redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccessMsg('Se han enviado las instrucciones a tu correo para restablecer la contraseña.')
      return { success: true }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    clearMessages,
    signUp,
    signIn,
    resetPassword
  }
}
