import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { 
  LayoutDashboard, 
  Layers, 
  History, 
  Settings, 
  Loader2, 
  Info,
  AlertTriangle
} from 'lucide-react'
import { applyTheme } from './lib/theme'

// Import components
import Sidebar from './components/Sidebar'
import AppBar from './components/AppBar'
import PanoramaView from './components/PanoramaView'
import TorresView from './components/TorresView'
import HistorialView from './components/HistorialView'
import ConfigView from './components/ConfigView'
import DetailDrawer from './components/DetailDrawer'
import TrasladoModal from './components/TrasladoModal'
import TorreFormModal from './components/TorreFormModal'

function App() {
  const queryClient = useQueryClient()

  // User profile state loaded from localStorage
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('userProfile')
    return saved ? JSON.parse(saved) : { name: 'Administrador', email: 'admin@flejes.com' }
  })

  // Apply active theme on app mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'darkMinimal'
    applyTheme(savedTheme)
  }, [])

  const handleUpdateProfile = (profile) => {
    setUserProfile(profile)
    localStorage.setItem('userProfile', JSON.stringify(profile))
  }
  
  // Navigation & UI state
  const [seccionActual, setSeccionActual] = useState('panorama')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Selected items & Modals
  const [torreActualId, setTorreActualId] = useState(null)
  const [torreFormOpen, setTorreFormOpen] = useState(false)
  const [editingTorre, setEditingTorre] = useState(null) // null for create, object for edit
  const [trasladoOpen, setTrasladoOpen] = useState(false)
  
  // Filters
  const [filtroFecha, setFiltroFecha] = useState(null)
  
  // Toast notifications
  const [toast, setToast] = useState(null)
  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3000)
  }

  // Global custom confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState(null)

  // Handle tab change and reset filter query
  const handleNavChange = (seccion) => {
    setSeccionActual(seccion)
    setSearchQuery('')
  }

  // ==================== QUERIES ====================
  
  // 1. Fetch Torres along with their Inventario items in ONE optimized query (solves N+1 problem)
  const { 
    data: torres = [], 
    isLoading: loadingTorres, 
    isFetching: fetchingTorres,
    refetch: refetchTorres 
  } = useQuery({
    queryKey: ['torres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('torres')
        .select('*, inventario(*)')
      if (error) {
        showToast('Error al cargar torres', true)
        throw error
      }
      
      // Sort torres by position alphanumerically (P01, P02...)
      const sorted = (data || []).sort((a, b) => 
        a.posicion.localeCompare(b.posicion, undefined, { numeric: true, sensitivity: 'base' })
      )
      return sorted
    }
  })

  // 2. Fetch Historial of movements
  const { 
    data: historial = [], 
    isLoading: loadingHistorial,
    refetch: refetchHistorial 
  } = useQuery({
    queryKey: ['historial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historial')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        showToast('Error al cargar historial', true)
        throw error
      }
      return data || []
    }
  })

  // Process data in memory for fast layout binding
  const inventarioMap = {}
  torres.forEach(t => {
    inventarioMap[t.id] = t.inventario || []
  })

  // ==================== ACTIONS / OPERATIONS ====================

  // Create or Update a Tower
  const handleSaveTorre = async (torreData) => {
    try {
      if (torreData.id) {
        // Edit existing tower
        const { error } = await supabase
          .from('torres')
          .update({
            posicion: torreData.posicion,
            nombre_medida: torreData.nombre_medida,
            cantidad_maxima: torreData.cantidad_maxima
          })
          .eq('id', torreData.id)

        if (error) throw error
        showToast('Torre actualizada exitosamente')
      } else {
        // Create new tower
        const { error } = await supabase
          .from('torres')
          .insert([{
            posicion: torreData.posicion,
            nombre_medida: torreData.nombre_medida,
            cantidad_maxima: torreData.cantidad_maxima
          }])

        if (error) throw error
        showToast('Torre creada exitosamente')
      }
      
      queryClient.invalidateQueries({ queryKey: ['torres'] })
      return true
    } catch (e) {
      console.error(e)
      showToast('Error al guardar la torre', true)
      return false
    }
  }

  // Delete a Tower
  const handleEliminarTorre = async (torre) => {
    const flejes = inventarioMap[torre.id] || []
    const confirmMessage = flejes.length > 0
      ? `La torre "${torre.posicion}" tiene ${flejes.length} flejes. ¿Deseas eliminar la torre y todo su contenido permanentemente?`
      : `¿Estás seguro de que deseas eliminar permanentemente la torre "${torre.posicion}"?`
      
    setConfirmConfig({
      title: 'Eliminar Torre',
      message: confirmMessage,
      type: 'danger',
      onConfirm: async () => {
        try {
          // First delete inventory items due to relationship
          if (flejes.length > 0) {
            const { error: eInv } = await supabase
              .from('inventario')
              .delete()
              .eq('torre_id', torre.id)
            if (eInv) throw eInv
          }

          // Then delete tower
          const { error: eTorre } = await supabase
            .from('torres')
            .delete()
            .eq('id', torre.id)
          if (eTorre) throw eTorre

          showToast('Torre eliminada')
          if (torreActualId === torre.id) {
            setTorreActualId(null)
          }
          queryClient.invalidateQueries({ queryKey: ['torres'] })
        } catch (e) {
          console.error(e)
          showToast('Error al eliminar la torre', true)
        }
      }
    })
  }

  // Reorder Towers (Swap positions)
  const handleMoverTorre = async (index, direccion) => {
    const nuevoIndex = index + direccion
    if (nuevoIndex < 0 || nuevoIndex >= torres.length) return

    showToast('Reordenando posiciones...')
    
    try {
      // Swap copy in local array
      const localTorres = [...torres]
      const temp = localTorres[index]
      localTorres[index] = localTorres[nuevoIndex]
      localTorres[nuevoIndex] = temp

      // Update sequentially in DB to match new indexing (P01, P02...)
      for (let i = 0; i < localTorres.length; i++) {
        const codPosicion = `P${String(i + 1).padStart(2, '0')}`
        const { error } = await supabase
          .from('torres')
          .update({ posicion: codPosicion })
          .eq('id', localTorres[i].id)
        if (error) throw error
      }

      showToast('Posiciones actualizadas')
      queryClient.invalidateQueries({ queryKey: ['torres'] })
    } catch (e) {
      console.error(e)
      showToast('Error al reordenar posiciones', true)
    }
  }

  // Add Strapping Band (Fleje) to a Tower
  const handleAgregarFleje = async (torreId, peso) => {
    const targetTorre = torres.find(t => t.id === torreId)
    const flejes = inventarioMap[torreId] || []

    if (flejes.length >= targetTorre.cantidad_maxima) {
      showToast('Capacidad límite alcanzada', true)
      return false
    }

    try {
      const { error } = await supabase
        .from('inventario')
        .insert([{ 
          torre_id: torreId, 
          peso 
        }])

      if (error) throw error
      showToast('Fleje agregado')
      queryClient.invalidateQueries({ queryKey: ['torres'] })
      return true
    } catch (e) {
      console.error(e)
      showToast('Error al agregar el fleje', true)
      return false
    }
  }

  // Delete Strapping Band (Fleje) directly
  const handleEliminarFleje = async (id) => {
    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id)

      if (error) throw error
      showToast('Fleje eliminado')
      queryClient.invalidateQueries({ queryKey: ['torres'] })
    } catch (e) {
      console.error(e)
      showToast('Error al eliminar el fleje', true)
    }
  }

  // Edit Strapping Band (Fleje) weight
  const handleEditarFleje = async (id, nuevoPeso) => {
    if (isNaN(nuevoPeso) || nuevoPeso <= 0) {
      showToast('El peso debe ser un número positivo', true)
      return false
    }

    try {
      const { error } = await supabase
        .from('inventario')
        .update({ peso: nuevoPeso })
        .eq('id', id)

      if (error) throw error
      showToast('Peso del fleje actualizado')
      queryClient.invalidateQueries({ queryKey: ['torres'] })
      return true
    } catch (e) {
      console.error(e)
      showToast('Error al actualizar el peso', true)
      return false
    }
  }

  // Delete multiple Strapping Bands (Flejes) in batch
  const handleEliminarVariosFlejes = async (ids) => {
    if (!ids || ids.length === 0) return false

    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .in('id', ids)

      if (error) throw error
      showToast(`${ids.length} flejes eliminados`)
      queryClient.invalidateQueries({ queryKey: ['torres'] })
      return true
    } catch (e) {
      console.error(e)
      showToast('Error al eliminar los flejes', true)
      return false
    }
  }

  // Confirm Output / Consumption (Traslado)
  const handleConfirmarTraslado = async (trasladoData) => {
    const targetTorre = torres.find(t => t.id === torreActualId)
    const currentInventory = inventarioMap[torreActualId] || []
    const targetFleje = currentInventory.find(f => f.id === trasladoData.flejeId)

    if (!targetTorre || !targetFleje) {
      showToast('Error: Datos no encontrados', true)
      return false
    }

    try {
      // 1. Insert record into History logs
      const { error: eHistorial } = await supabase
        .from('historial')
        .insert([{
          torre_id: torreActualId,
          posicion: targetTorre.posicion,
          medida: targetTorre.nombre_medida,
          peso_fleje: targetFleje.peso,
          motivo: trasladoData.motivo,
          num_solicitud: trasladoData.numSolicitud,
          despachador: trasladoData.despachador,
          hora_inicio: trasladoData.horaInicio
        }])

      if (eHistorial) throw eHistorial

      // 2. Remove strap from active Inventory table
      const { error: eInventario } = await supabase
        .from('inventario')
        .delete()
        .eq('id', trasladoData.flejeId)

      if (eInventario) throw eInventario

      showToast(`${trasladoData.motivo} registrado con solicitud ${trasladoData.numSolicitud}`)
      
      // Invalidate queries to refresh UI reactively
      queryClient.invalidateQueries({ queryKey: ['torres'] })
      queryClient.invalidateQueries({ queryKey: ['historial'] })
      return true
    } catch (e) {
      console.error(e)
      showToast('Error al registrar la salida', true)
      return false
    }
  }

  const handleOpenNuevaTorre = () => {
    setEditingTorre(null)
    setTorreFormOpen(true)
  }

  const handleOpenEditarTorre = (torre) => {
    setEditingTorre(torre)
    setTorreFormOpen(true)
  }

  // Refresh database trigger
  const handleManualRefresh = () => {
    showToast('Actualizando datos...')
    refetchTorres()
    refetchHistorial()
  }

  // Mobile Bottom Nav items list
  const bottomNavItems = [
    { id: 'panorama', label: 'Panorama', icon: LayoutDashboard },
    { id: 'torres', label: 'Torres', icon: Layers },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'config', label: 'Config', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-bg text-text flex">
      
      {/* Sidebar Navigation (Desktop only) */}
      <Sidebar 
        seccionActual={seccionActual}
        setSeccionActual={handleNavChange}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        userProfile={userProfile}
      />

      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 pb-20 md:pb-6 min-w-0
          ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        {/* AppBar Header with Inline Search */}
        <AppBar 
          seccionActual={seccionActual}
          setSeccionActual={handleNavChange}
          onNuevaTorre={handleOpenNuevaTorre}
          onRefresh={handleManualRefresh}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filtroFecha={filtroFecha}
          setFiltroFecha={setFiltroFecha}
          userProfile={userProfile}
        />

        {/* Dynamic Section Renderer with Skeleton support */}
        <main className="flex-1 p-6 overflow-y-auto">
          {seccionActual === 'panorama' && (
            <PanoramaView 
              torres={torres}
              inventario={inventarioMap}
              searchQuery={searchQuery}
              isLoading={loadingTorres}
              onSelectTorre={setTorreActualId}
            />
          )}

          {seccionActual === 'torres' && (
            <TorresView 
              torres={torres}
              inventario={inventarioMap}
              searchQuery={searchQuery}
              isLoading={loadingTorres}
              onSelectTorre={setTorreActualId}
              onEditTorre={handleOpenEditarTorre}
              onEliminarTorre={handleEliminarTorre}
              onMoverTorre={handleMoverTorre}
            />
          )}

          {seccionActual === 'historial' && (
            <HistorialView 
              historial={historial}
              filtroFecha={filtroFecha}
              isLoading={loadingHistorial}
            />
          )}

          {seccionActual === 'config' && (
            <ConfigView 
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* ==================== BOTTOM NAV (Mobile Android viewport only) ==================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border z-30 flex items-center justify-around pb-safe shadow-lg">
        {bottomNavItems.map(item => {
          const Icon = item.icon
          const isActive = seccionActual === item.id
          return (
            <button 
              key={item.id} 
              onClick={() => handleNavChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-200 cursor-pointer
                ${isActive 
                  ? 'text-accent bg-accent/5 font-bold border-t-2 border-accent' 
                  : 'text-text-muted hover:text-foreground'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ==================== DETAIL DRAWER (Right Slideover) ==================== */}
      {torreActualId && (
        <DetailDrawer 
          torreId={torreActualId}
          torres={torres}
          inventario={inventarioMap}
          onClose={() => setTorreActualId(null)}
          onEditTorre={handleOpenEditarTorre}
          onAgregarFleje={handleAgregarFleje}
          onEliminarFleje={handleEliminarFleje}
          onEditarFleje={handleEditarFleje}
          onEliminarVariosFlejes={handleEliminarVariosFlejes}
          onAbrirTraslado={() => setTrasladoOpen(true)}
        />
      )}

      {/* ==================== MODAL: SALIDA / CONSUMO (Traslado) ==================== */}
      {trasladoOpen && (
        <TrasladoModal 
          torreId={torreActualId}
          torres={torres}
          inventario={inventarioMap}
          onClose={() => setTrasladoOpen(false)}
          onConfirm={handleConfirmarTraslado}
        />
      )}

      {/* ==================== MODAL: CREAR / EDITAR TORRE ==================== */}
      <TorreFormModal 
        isOpen={torreFormOpen}
        onClose={() => setTorreFormOpen(false)}
        torre={editingTorre}
        onSave={handleSaveTorre}
      />

      {/* ==================== TOAST NOTIFICATION POPUP ==================== */}
      {toast && (
        <div 
          className={`
            fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-semibold text-xs tracking-wide shadow-lg z-50 text-white flex items-center gap-2
            ${toast.isError ? 'bg-danger shadow-danger/25' : 'bg-accent shadow-accent/25'}
          `}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Global Confirmation Dialog (Tailwind CSS Modal) */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setConfirmConfig(null)}
          />
          
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 space-y-4 animate-scaleUp text-left">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${confirmConfig.type === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}
              `}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-foreground tracking-tight">{confirmConfig.title}</h4>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {confirmConfig.message}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  await confirmConfig.onConfirm()
                  setConfirmConfig(null)
                }}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center shadow-sm
                  ${confirmConfig.type === 'danger' ? 'bg-danger hover:bg-red-700' : 'bg-accent hover:bg-accent-hover'}
                `}
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmConfig(null)}
                className="flex-1 py-2.5 bg-bg hover:bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
