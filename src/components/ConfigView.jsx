import React, { useState, useEffect, useRef } from 'react'
import { User, Lock, Sliders, Database, Info, Paintbrush, Bell, Shield, HelpCircle, Check, LogOut, Eye, EyeOff, Truck, Plus, Trash2, RefreshCw } from 'lucide-react'
import { themes, applyTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function ConfigView({ userProfile, onUpdateProfile, onLogout, showToast }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [procesandoExport, setProcesandoExport] = useState(false)
  const [procesandoImport, setProcesandoImport] = useState(false)
  
  // Profile state
  const [profileName, setProfileName] = useState(userProfile?.name || 'Administrador')
  const [profileEmail, setProfileEmail] = useState(userProfile?.email || 'admin@flejes.com')
  const [procesandoProfile, setProcesandoProfile] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [procesandoPassword, setProcesandoPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Preferences state
  const [transportSubTab, setTransportSubTab] = useState('empresas')
  const [empresas, setEmpresas] = useState([])
  const [placas, setPlacas] = useState([])
  const [conductores, setConductores] = useState([])
  const [loadingTransport, setLoadingTransport] = useState(false)

  // Form states
  const [newEmpresaNombre, setNewEmpresaNombre] = useState('')
  const [newPlacaEmpresaId, setNewPlacaEmpresaId] = useState('')
  const [newPlacaRemolque, setNewPlacaRemolque] = useState('')
  const [newPlacaSemiremolque, setNewPlacaSemiremolque] = useState('')
  const [newConductorEmpresaId, setNewConductorEmpresaId] = useState('')
  const [newConductorDni, setNewConductorDni] = useState('')
  const [newConductorNombre, setNewConductorNombre] = useState('')

  const fetchTransportData = async () => {
    setLoadingTransport(true)
    try {
      const { data: empData, error: empErr } = await supabase
        .from('empresas_transporte')
        .select('*')
        .order('nombre', { ascending: true })
      if (empErr) throw empErr
      setEmpresas(empData || [])

      const { data: placData, error: placErr } = await supabase
        .from('placas')
        .select(`
          id,
          empresa_id,
          placa_remolque,
          placa_semiremolque,
          created_at,
          empresas_transporte (
            nombre
          )
        `)
        .order('created_at', { ascending: false })
      if (placErr) throw placErr
      setPlacas(placData || [])

      const { data: condData, error: condErr } = await supabase
        .from('conductores')
        .select(`
          id,
          empresa_id,
          dni,
          nombre,
          created_at,
          empresas_transporte (
            nombre
          )
        `)
        .order('nombre', { ascending: true })
      if (condErr) throw condErr
      setConductores(condData || [])
    } catch (err) {
      console.error(err)
      showToast('Error al cargar datos de transporte', true)
    } finally {
      setLoadingTransport(false)
    }
  }

  const handleCreateEmpresa = async (e) => {
    e.preventDefault()
    if (!newEmpresaNombre.trim()) {
      showToast('Ingresa el nombre de la empresa', true)
      return
    }
    try {
      const { error } = await supabase
        .from('empresas_transporte')
        .insert([{ nombre: newEmpresaNombre.trim().toUpperCase() }])
      if (error) throw error
      showToast('Empresa de transporte registrada')
      setNewEmpresaNombre('')
      fetchTransportData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al registrar empresa', true)
    }
  }

  const handleDeleteEmpresa = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta empresa? Se borrarán sus conductores y vehículos asociados.')) return
    try {
      const { error } = await supabase
        .from('empresas_transporte')
        .delete()
        .eq('id', id)
      if (error) throw error
      showToast('Empresa eliminada exitosamente')
      fetchTransportData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al eliminar empresa', true)
    }
  }

  const handleCreatePlaca = async (e) => {
    e.preventDefault()
    if (!newPlacaEmpresaId) {
      showToast('Selecciona una empresa', true)
      return
    }
    if (!newPlacaRemolque.trim()) {
      showToast('Ingresa la placa de remolque', true)
      return
    }
    try {
      const { error } = await supabase
        .from('placas')
        .insert([{
          empresa_id: newPlacaEmpresaId,
          placa_remolque: newPlacaRemolque.trim().toUpperCase(),
          placa_semiremolque: newPlacaSemiremolque.trim().toUpperCase() || null
        }])
      if (error) throw error
      showToast('Placas registradas exitosamente')
      setNewPlacaRemolque('')
      setNewPlacaSemiremolque('')
      fetchTransportData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al registrar placas', true)
    }
  }

  const handleDeletePlaca = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este vehículo?')) return
    try {
      const { error } = await supabase
        .from('placas')
        .delete()
        .eq('id', id)
      if (error) throw error
      showToast('Vehículo eliminado exitosamente')
      fetchTransportData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al eliminar vehículo', true)
    }
  }

  const handleCreateConductor = async (e) => {
    e.preventDefault()
    if (!newConductorEmpresaId) {
      showToast('Selecciona una empresa', true)
      return
    }
    if (!newConductorDni.trim() || !newConductorNombre.trim()) {
      showToast('Ingresa el DNI y Nombre del conductor', true)
      return
    }
    try {
      const { error } = await supabase
        .from('conductores')
        .insert([{
          empresa_id: newConductorEmpresaId,
          dni: newConductorDni.trim().toUpperCase(),
          nombre: newConductorNombre.trim().toUpperCase()
        }])
      if (error) throw error
      showToast('Conductor registrado exitosamente')
      setNewConductorDni('')
      setNewConductorNombre('')
      fetchTransportData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al registrar conductor', true)
    }
  }

  const handleDeleteConductor = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este conductor?')) return
    try {
      const { error } = await supabase
        .from('conductores')
        .delete()
        .eq('id', id)
      if (error) throw error
      showToast('Conductor eliminado exitosamente')
      fetchTransportData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al eliminar conductor', true)
    }
  }
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'darkMinimal')
  const [soundAlerts, setSoundAlerts] = useState(() => localStorage.getItem('soundAlerts') === 'true')
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('unitSystem') || 'kg')

  // Sync profile state when prop changes
  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name)
      setProfileEmail(userProfile.email)
    }
  }, [userProfile])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim() || !profileEmail.trim()) {
      showToast('Por favor, completa todos los campos del perfil', true)
      return
    }
    
    setProcesandoProfile(true)
    await onUpdateProfile({ name: profileName, email: profileEmail })
    setProcesandoProfile(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Por favor, completa todos los campos de contraseña', true)
      return
    }
    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', true)
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('La confirmación de la contraseña no coincide', true)
      return
    }
    
    setProcesandoPassword(true)
    try {
      // Supabase Auth actualiza la contraseña del usuario logueado en su sesión
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim()
      })
      if (error) throw error

      showToast('Contraseña actualizada exitosamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al actualizar la contraseña', true)
    } finally {
      setProcesandoPassword(false)
    }
  }

  const handleExportBackup = async () => {
    setProcesandoExport(true)
    try {
      const { data: dbTorres, error: errorTorres } = await supabase
        .from('torres')
        .select('*')
      if (errorTorres) throw errorTorres

      const { data: dbInventario, error: errorInv } = await supabase
        .from('inventario')
        .select('*')
      if (errorInv) throw errorInv

      const backupData = {
        system: 'Sistema de Flejes v2.0',
        exportedAt: new Date().toISOString(),
        torres: dbTorres || [],
        inventario: dbInventario || []
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", `backup_inventario_flejes_${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      
      showToast('Copia de seguridad del inventario exportada con éxito')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al exportar la copia de seguridad', true)
    } finally {
      setProcesandoExport(false)
    }
  }

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result)
        
        if (json.system !== 'Sistema de Flejes v2.0' || !Array.isArray(json.inventario)) {
          throw new Error('El archivo seleccionado no es un respaldo válido de este sistema.')
        }

        const confirmRestore = window.confirm(
          `⚠️ ADVERTENCIA DE RESTAURACIÓN:\n\n` +
          `Este archivo contiene ${json.inventario.length} flejes del ${new Date(json.exportedAt).toLocaleString()}.\n` +
          `Al restaurar, se ELIMINARÁ por completo el inventario actual de todas las torres y se reemplazará por el del archivo.\n\n` +
          `¿Estás seguro de que deseas proceder con la restauración de datos?`
        )

        if (!confirmRestore) return

        setProcesandoImport(true)

        // a) Delete all current active inventory
        const { error: deleteError } = await supabase
          .from('inventario')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
        
        if (deleteError) throw deleteError

        // b) Insert backed-up inventory
        if (json.inventario.length > 0) {
          const cleanItems = json.inventario.map(item => ({
            id: item.id,
            torre_id: item.torre_id,
            peso: item.peso,
            secuencia: item.secuencia,
            recepcion_id: item.recepcion_id
          }))

          const { error: insertError } = await supabase
            .from('inventario')
            .insert(cleanItems)

          if (insertError) throw insertError
        }

        showToast('Restauración de inventario completada con éxito')
        queryClient.invalidateQueries({ queryKey: ['torres'] })
      } catch (err) {
        console.error(err)
        showToast(err.message || 'Error al procesar el archivo de respaldo', true)
      } finally {
        setProcesandoImport(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleSelectTheme = (themeKey) => {
    setCurrentTheme(themeKey)
    applyTheme(themeKey)
    showToast(`Tema cambiado a: ${themes[themeKey].name}`)
  }

  const handleToggleSound = () => {
    const nextVal = !soundAlerts
    setSoundAlerts(nextVal)
    localStorage.setItem('soundAlerts', String(nextVal))
    showToast(nextVal ? 'Alertas sonoras activadas' : 'Alertas sonoras desactivadas')
  }

  const handleUnitChange = (val) => {
    setUnitSystem(val)
    localStorage.setItem('unitSystem', val)
    showToast(`Unidad de medida cambiada a: ${val === 'kg' ? 'Kilogramos' : 'Toneladas'}`)
  }

  const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'password', label: 'Seguridad', icon: Lock },
    { id: 'preferences', label: 'Preferencias', icon: Sliders }
  ]
  
  if (userProfile?.rol === 'Administrador') {
    tabs.push({ id: 'backup', label: 'Backup', icon: Database })
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0">
      
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <Sliders className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground tracking-tight">Configuración global</h2>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-4 gap-6 w-full min-w-0">
        
        {/* Navigation Sidebar / Horizontal mobile bar */}
        <div className="md:col-span-1 w-full min-w-0">
          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all text-left cursor-pointer
                    ${isActive 
                      ? 'bg-accent/10 text-accent' 
                      : 'text-text-muted hover:bg-surface-hover hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Scrollable Tabs */}
          <div className="md:hidden flex overflow-x-auto gap-1 border-b border-border/60 pb-2 w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-accent/10 text-accent' 
                      : 'text-text-muted hover:bg-surface-hover'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 w-full min-w-0">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-foreground">Perfil de Usuario</h3>
                <p className="text-[11px] text-text-muted">Actualiza tus datos de operador e identificación.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl px-4 py-2.5 text-xs outline-none text-foreground font-medium transition-colors"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl px-4 py-2.5 text-xs outline-none text-foreground font-medium transition-colors"
                      placeholder="Ej. juan@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-text-muted/60" />
                      Rol de Permisos
                    </label>
                    <input 
                      type="text" 
                      value={userProfile?.rol || 'Operador'} 
                      disabled
                      className="w-full bg-bg/50 border border-border/40 rounded-xl px-4 py-2.5 text-xs text-text-muted/60 font-semibold cursor-not-allowed select-none capitalize"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-text-muted/60" />
                      Sede Física
                    </label>
                    <input 
                      type="text" 
                      value="Planta Chilca - Lima" 
                      disabled
                      className="w-full bg-bg/50 border border-border/40 rounded-xl px-4 py-2.5 text-xs text-text-muted/60 font-semibold cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex justify-between items-center gap-2">
                  <button 
                    type="button"
                    onClick={onLogout}
                    className="md:hidden flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                  <button 
                    type="submit"
                    disabled={procesandoProfile}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors ml-auto"
                  >
                    {procesandoProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: PASSWORD */}
          {activeTab === 'password' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-foreground">Seguridad de la Cuenta</h3>
                <p className="text-[11px] text-text-muted">Modifica tu contraseña de acceso para resguardar tu cuenta.</p>
              </div>

               <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Contraseña Actual</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPassword ? 'text' : 'password'} 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl pl-4 pr-10 py-2.5 text-xs outline-none text-foreground transition-colors font-mono"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg hover:bg-bg/50 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Nueva Contraseña</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? 'text' : 'password'} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl pl-4 pr-10 py-2.5 text-xs outline-none text-foreground transition-colors font-mono"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg hover:bg-bg/50 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Confirmar Nueva Contraseña</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-bg border border-border focus:border-accent/80 rounded-xl pl-4 pr-10 py-2.5 text-xs outline-none text-foreground transition-colors font-mono"
                        placeholder="Repite la contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg hover:bg-bg/50 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex justify-end">
                  <button 
                    type="submit"
                    disabled={procesandoPassword}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
                  >
                    {procesandoPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-foreground">Preferencias de la Interfaz</h3>
                <p className="text-[11px] text-text-muted">Personaliza la apariencia y comportamiento de tu aplicación.</p>
              </div>

              {/* Theme Picker */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Paintbrush className="w-3.5 h-3.5 text-text-muted/60" />
                  Tema de Apariencia
                </label>

                {/* Oscuros */}
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">— Oscuros</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(themes).filter(([, t]) => {
                    const bg = t.colors.bg
                    // Light themes have high luminance (starts with #F or #FA etc.)
                    return !['#F8', '#FA', '#F5'].some(p => bg.toUpperCase().startsWith(p))
                  }).map(([key, theme]) => {
                    const isSelected = currentTheme === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectTheme(key)}
                        className={`
                          p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 group relative overflow-hidden
                          ${isSelected
                            ? 'border-accent ring-1 ring-accent shadow-md'
                            : 'border-border hover:border-border/80 hover:shadow-sm'
                          }
                        `}
                        style={{ backgroundColor: theme.colors.bg }}
                      >
                        {/* Accent dot */}
                        <div className="flex items-center justify-between">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold truncate w-full" style={{ color: theme.colors.text }}>
                          {theme.name}
                        </span>
                        {theme.description && (
                          <span className="text-[9px] leading-tight" style={{ color: theme.colors['text-muted'] }}>
                            {theme.description}
                          </span>
                        )}
                        {/* Color swatches */}
                        <div className="flex gap-1 mt-auto">
                          <span className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} />
                          <span className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: theme.colors.accent, borderColor: theme.colors.border }} />
                          <span className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: theme.colors['text-muted'], borderColor: theme.colors.border }} />
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Claros */}
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-3">— Claros</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(themes).filter(([, t]) => {
                    const bg = t.colors.bg
                    return ['#F8', '#FA', '#F5'].some(p => bg.toUpperCase().startsWith(p))
                  }).map(([key, theme]) => {
                    const isSelected = currentTheme === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectTheme(key)}
                        className={`
                          p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 group relative overflow-hidden
                          ${isSelected
                            ? 'border-accent ring-1 ring-accent shadow-md'
                            : 'border-border hover:border-gray-300 hover:shadow-sm'
                          }
                        `}
                        style={{ backgroundColor: theme.colors.bg }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold truncate w-full" style={{ color: theme.colors.text }}>
                          {theme.name}
                        </span>
                        {theme.description && (
                          <span className="text-[9px] leading-tight" style={{ color: theme.colors['text-muted'] }}>
                            {theme.description}
                          </span>
                        )}
                        <div className="flex gap-1 mt-auto">
                          <span className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} />
                          <span className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: theme.colors.accent, borderColor: theme.colors.border }} />
                          <span className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: theme.colors['text-muted'], borderColor: theme.colors.border }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* General Options */}
              <div className="border-t border-border/60 pt-6 space-y-4">
                
                {/* Audio Alert Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4.5 h-4.5 text-text-muted" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Alertas de Sonido</p>
                      <p className="text-[10px] text-text-muted">Reproducir alertas auditivas para mensajes de confirmación.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleSound}
                    className={`
                      w-10 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer relative outline-none
                      ${soundAlerts ? 'bg-accent' : 'bg-border/80'}
                    `}
                  >
                    <span 
                      className={`
                        block w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200
                        ${soundAlerts ? 'translate-x-4' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>

                {/* Weight Units Selector */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Database className="w-4.5 h-4.5 text-text-muted" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Unidad de Medida Principal</p>
                      <p className="text-[10px] text-text-muted">Configura si los listados se consolidan en kilogramos o toneladas.</p>
                    </div>
                  </div>
                  <div className="flex bg-bg p-0.5 border border-border rounded-xl">
                    <button 
                      onClick={() => handleUnitChange('kg')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        unitSystem === 'kg' 
                          ? 'bg-surface text-accent shadow-xs' 
                          : 'text-text-muted hover:text-foreground'
                      }`}
                    >
                      KG
                    </button>
                    <button 
                      onClick={() => handleUnitChange('t')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        unitSystem === 't' 
                          ? 'bg-surface text-accent shadow-xs' 
                          : 'text-text-muted hover:text-foreground'
                      }`}
                    >
                      TN (t)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: BACKUP */}
          {activeTab === 'backup' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-foreground">Copias de Seguridad</h3>
                <p className="text-[11px] text-text-muted">Resguarda tu base de datos o restaura registros históricos en lote.</p>
              </div>

              <div className="p-4 border border-border/80 bg-surface-hover/30 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">Respaldar Inventario en JSON</p>
                  <p className="text-[10px] text-text-muted">Descarga un archivo local conteniendo las torres y los flejes actuales.</p>
                </div>
                <button
                  onClick={handleExportBackup}
                  disabled={procesandoExport}
                  className="bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer w-full sm:w-auto text-center disabled:opacity-50"
                >
                  {procesandoExport ? 'Exportando...' : 'Exportar JSON'}
                </button>
              </div>

              <div className="p-4 border border-border/80 bg-surface-hover/30 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">Importar Registros Externos</p>
                  <p className="text-[10px] text-text-muted">Carga un archivo de respaldo previamente exportado.</p>
                </div>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={procesandoImport}
                  className="bg-surface-hover hover:bg-border/60 border border-border text-text-muted hover:text-foreground text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer w-full sm:w-auto text-center disabled:opacity-50"
                >
                  {procesandoImport ? 'Restaurando...' : 'Cargar Archivo'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted font-semibold uppercase tracking-wider py-4 border-t border-border/40">
        <Info className="w-3.5 h-3.5 text-text-muted/60" />
        <span>Sistema de Flejes v2.0 • Material 3 Design</span>
      </div>

    </div>
  )
}
