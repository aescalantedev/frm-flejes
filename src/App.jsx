import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { 
  LayoutDashboard, 
  Layers, 
  History, 
  Settings, 
  Loader2, 
  Info,
  AlertTriangle,
  Clock,
  Truck,
  LineChart,
  X,
  Link as LinkIcon
} from 'lucide-react'
import { applyTheme } from './lib/theme'

// Import components
import Sidebar from './components/Sidebar'
import AppBar from './components/AppBar'
import PanoramaView from './components/PanoramaView'
import TorresView from './components/TorresView'
import HistorialView from './components/HistorialView'
import ConfigView from './components/ConfigView'
import TransportView from './components/TransportView'
import UsersView from './components/UsersView'
import AnalisisView from './components/AnalisisView'
import LoginScreen from './components/LoginScreen'
import MantenedorCostosView from './components/MantenedorCostosView'
import DetailDrawer from './components/DetailDrawer'
import TrasladoModal from './components/TrasladoModal'
import TorreFormModal from './components/TorreFormModal'
import SessionInitModal from './components/SessionInitModal'
import BatchIngresoModal from './components/BatchIngresoModal'
import ConfirmSessionModal from './components/ConfirmSessionModal'
import SessionBanner from './components/SessionBanner'

function App() {
  const queryClient = useQueryClient()

  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false)

  const urlParams = new URLSearchParams(window.location.search)
  const isPublicView = urlParams.get('public') === 'true'
  const activeProfile = isPublicView ? { name: 'Espectador', rol: 'Publico', aprobado: true } : userProfile


  // Escuchar estado de autenticación y cargar perfil de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        setLoadingAuth(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        setUserProfile(null)
        setLoadingAuth(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setUserProfile(data)
      } else {
        // Fallback en caso de retardo de sincronización de la DB
        setUserProfile({
          id: userId,
          name: 'Operador de Planta',
          email: userEmail,
          rol: 'Operador'
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAuth(false)
    }
  }

  // Apply active theme on app mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'darkMinimal'
    applyTheme(savedTheme)
  }, [])

  const handleUpdateProfile = async (profileData) => {
    if (!session?.user?.id) return
    try {
      const emailChanged = profileData.email.trim().toLowerCase() !== userProfile.email.toLowerCase()
      
      // 1. Actualizar tabla profiles
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          name: profileData.name.trim(),
          email: profileData.email.trim()
        })
        .eq('id', session.user.id)
      
      if (dbError) throw dbError
      
      // 2. Si cambió el correo, actualizar en Supabase Auth
      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profileData.email.trim()
        })
        if (authError) throw authError
        showToast('Perfil guardado. Revisa tu bandeja de entrada para verificar tu nuevo correo.')
      } else {
        showToast('Perfil actualizado correctamente')
      }
      
      // Actualizar estado local
      setUserProfile(prev => ({ 
        ...prev, 
        name: profileData.name.trim(),
        email: profileData.email.trim()
      }))
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al actualizar el perfil', true)
    }
  }
  
  // Navigation & UI state
  const [seccionActual, setSeccionActual] = useState('panorama')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Redirección de seguridad: Operadores no pueden ver Torres
  useEffect(() => {
    if (activeProfile && activeProfile.rol !== 'Administrador' && seccionActual === 'torres') {
      setSeccionActual('panorama')
    }
  }, [seccionActual, userProfile])
  
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

  // ==================== TRAZABILIDAD Y SESIONES (Persistencia local ante F5 / suspensión) ====================
  const [receptionSession, setReceptionSession] = useState(() => {
    try {
      const saved = localStorage.getItem('sistema_flejes_reception_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [dispatchSession, setDispatchSession] = useState(() => {
    try {
      const saved = localStorage.getItem('sistema_flejes_dispatch_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Sincronizar Recepción con LocalStorage y Supabase Storage (active_sessions)
  useEffect(() => {
    const syncReception = async () => {
      if (receptionSession) {
        localStorage.setItem('sistema_flejes_reception_session', JSON.stringify(receptionSession))
        if (userProfile?.name) {
          try {
            await supabase.from('active_sessions').upsert({
              tipo: 'reception',
              operador: userProfile.name,
              datos: receptionSession,
              updated_at: new Date().toISOString()
            }, { onConflict: 'tipo,operador' })
          } catch (e) {
            console.error('Error syncing reception to DB:', e)
          }
        }
      } else {
        localStorage.removeItem('sistema_flejes_reception_session')
        if (userProfile?.name) {
          try {
            await supabase.from('active_sessions').delete().eq('tipo', 'reception').eq('operador', userProfile.name)
          } catch (e) {
            console.error('Error deleting reception from DB:', e)
          }
        }
      }
    }
    syncReception()
  }, [receptionSession, userProfile?.name])

  // Sincronizar Despacho con LocalStorage y Supabase Storage (active_sessions)
  useEffect(() => {
    const syncDispatch = async () => {
      if (dispatchSession) {
        localStorage.setItem('sistema_flejes_dispatch_session', JSON.stringify(dispatchSession))
        if (userProfile?.name) {
          try {
            await supabase.from('active_sessions').upsert({
              tipo: 'dispatch',
              operador: userProfile.name,
              datos: dispatchSession,
              updated_at: new Date().toISOString()
            }, { onConflict: 'tipo,operador' })
          } catch (e) {
            console.error('Error syncing dispatch to DB:', e)
          }
        }
      } else {
        localStorage.removeItem('sistema_flejes_dispatch_session')
        if (userProfile?.name) {
          try {
            await supabase.from('active_sessions').delete().eq('tipo', 'dispatch').eq('operador', userProfile.name)
          } catch (e) {
            console.error('Error deleting dispatch from DB:', e)
          }
        }
      }
    }
    syncDispatch()
  }, [dispatchSession, userProfile?.name])

  // Restaurar borradores activos de la Base de Datos Supabase al iniciar (Soporte Multi-dispositivo)
  useEffect(() => {
    const restoreFromDB = async () => {
      if (!userProfile?.name) return
      try {
        const { data, error } = await supabase
          .from('active_sessions')
          .select('*')
          .eq('operador', userProfile.name)
        if (error || !data) return
        
        data.forEach(session => {
          if (session.tipo === 'reception' && !receptionSession) {
            setReceptionSession(session.datos)
          } else if (session.tipo === 'dispatch' && !dispatchSession) {
            setDispatchSession(session.datos)
          }
        })
      } catch (err) {
        console.error('Error restoring sessions from DB:', err)
      }
    }
    restoreFromDB()
  }, [userProfile?.name])
  
  const [receptionInitOpen, setReceptionInitOpen] = useState(false)
  const [dispatchInitOpen, setDispatchInitOpen] = useState(false)
  
  const [batchIngresoConfig, setBatchIngresoConfig] = useState(null) // { open, torreId, torreName, capMax, currentCount }
  const [confirmSessionConfig, setConfirmSessionConfig] = useState(null) // { open, type }

  // Handle tab change and reset filter query
  const handleNavChange = (seccion) => {
    if (receptionSession || dispatchSession) {
      showToast('Debes terminar o cancelar la sesión activa primero', true)
      return
    }
    setSeccionActual(seccion)
    setSearchQuery('')
    setTorreActualId(null) // Cerrar el detalle de la torre si está abierto al cambiar de sección
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
        .from('ubicaciones')
        .select(`
          id,
          codigo_posicion,
          capacidad_maxima,
          orden_visual,
          producto_sugerido_id,
          catalogo_productos!producto_sugerido_id(medida_corta, glosa),
          flejes (
            id,
            ubicacion_id,
            peso_kg,
            secuencia,
            recepcion_id,
            producto_id,
            costo_kg_ingreso,
            lote,
            fecha_ingreso,
            created_at,
            catalogo_productos(codigo, glosa, medida_corta)
          )
        `)
        .order('orden_visual', { ascending: true })
        // Nota: no podemos ordenar tablas anidadas fácilmente sin RPC o views en supabase-js V2 a menos que hagamos sorting en memoria.
      if (error) {
        showToast('Error al cargar torres', true)
        throw error
      }
      
      const mapped = (data || []).map(u => ({
        id: u.id,
        posicion: u.codigo_posicion,
        nombre_medida: u.catalogo_productos?.medida_corta || 'No asignada',
        glosa_medida: u.catalogo_productos?.glosa || '',
        cantidad_maxima: u.capacidad_maxima,
        orden: u.orden_visual,
        producto_sugerido_id: u.producto_sugerido_id,
        inventario: (u.flejes || []).sort((a,b) => a.secuencia - b.secuencia).map(f => ({
          id: f.id,
          torre_id: f.ubicacion_id,
          peso: f.peso_kg,
          medida: f.catalogo_productos?.medida_corta || '',
          codigo: f.catalogo_productos?.codigo || '',
          glosa: f.catalogo_productos?.glosa || '',
          producto_id: f.producto_id,
          recepcion_id: f.recepcion_id,
          secuencia: f.secuencia,
          costo_kg_ingreso: f.costo_kg_ingreso,
          lote: f.lote,
          fecha_ingreso: f.fecha_ingreso,
          created_at: f.created_at
        }))
      }))
      return mapped
    }
  })

  // 1.5 Fetch Catalogo Costos
  const { 
    data: catalogoCostos = [],
  } = useQuery({
    queryKey: ['catalogo_costos'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('kardex_costos')
          .select(`
            id,
            costo_kg,
            producto_id,
            fecha_vigencia,
            catalogo_productos(codigo, medida_corta, glosa)
          `)
        if (error) throw error
        return (data || []).map(k => ({
          id: k.id,
          costo_kg: k.costo_kg,
          producto_id: k.producto_id,
          fecha_vigencia: k.fecha_vigencia,
          medida: k.catalogo_productos?.medida_corta || '',
          codigo: k.catalogo_productos?.codigo || '',
          glosa: k.catalogo_productos?.glosa || ''
        }))
      } catch (e) {
        return []
      }
    }
  })

  // 1.6 Fetch Full Catalogo Productos
  const { 
    data: catalogoProductos = [],
  } = useQuery({
    queryKey: ['catalogo_productos'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('catalogo_productos')
          .select('id, codigo, medida_corta, glosa')
          .order('medida_corta')
        if (error) throw error
        return (data || []).map(p => ({
          id: p.id,
          producto_id: p.id,
          medida: p.medida_corta || '',
          codigo: p.codigo || '',
          glosa: p.glosa || ''
        }))
      } catch (e) {
        return []
      }
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
        .from('historial_movimientos')
        .select(`
          id,
          lote,
          ubicacion_id,
          ubicaciones(codigo_posicion),
          catalogo_productos(codigo, glosa, medida_corta),
          peso_kg,
          costo_kg_aplicado,
          motivo, usuario, recepcion_id, despacho_id, created_at,
          recepciones(*), despachos(*)
        `)
        .order('created_at', { ascending: false })
      if (error) {
        showToast('Error al cargar historial', true)
        throw error
      }
      return (data || []).map(h => ({
         id: h.id,
         torre_id: h.ubicacion_id,
         posicion: h.ubicaciones?.codigo_posicion || 'Sin Torre',
         medida: h.catalogo_productos?.medida_corta || 'Mixto',
         codigo: h.catalogo_productos?.codigo || '',
         glosa: h.catalogo_productos?.glosa || '',
         lote: h.lote || null,
         peso_fleje: h.peso_kg,
         costo_kg_aplicado: h.costo_kg_aplicado,
         motivo: h.motivo,
         usuario: h.usuario,
         recepcion_id: h.recepcion_id,
         despacho_id: h.despacho_id,
         recepciones: h.recepciones,
         despachos: h.despachos,
         created_at: h.created_at
      }))
    }
  })

  // 3. Consulta de operaciones en curso (Monitoreo en Tiempo Real - Polling cada 5 segs)
  const { 
    data: activeSessions = [],
    refetch: refetchActiveSessions 
  } = useQuery({
    queryKey: ['active_sessions'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('active_sessions')
          .select('*')
        if (error) throw error
        return data || []
      } catch (e) {
        // Silencioso por si la tabla aún no se ha creado
        return []
      }
    },
    refetchInterval: 5000
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
          .from('ubicaciones')
          .update({
            codigo_posicion: torreData.posicion,
            producto_sugerido_id: torreData.producto_sugerido_id,
            capacidad_maxima: torreData.cantidad_maxima
          })
          .eq('id', torreData.id)

        if (error) throw error
        showToast('Torre actualizada exitosamente')
      } else {
        // Create new tower
        const { error } = await supabase
          .from('ubicaciones')
          .insert([{
            codigo_posicion: torreData.posicion,
            producto_sugerido_id: torreData.producto_sugerido_id,
            capacidad_maxima: torreData.cantidad_maxima
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
              .from('flejes')
              .delete()
              .eq('ubicacion_id', torre.id)
            if (eInv) throw eInv
          }

          // Then delete tower
          const { error: eTorre } = await supabase
            .from('ubicaciones')
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
          .from('ubicaciones')
          .update({ codigo_posicion: codPosicion, orden_visual: i + 1 })
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

  // Iniciar Recepción
  const handleStartReception = (data) => {
    setReceptionSession({
      ...data,
      hora_inicio: new Date().toISOString(),
      items: []
    })
    setSeccionActual('panorama')
    showToast('Recepción Iniciada')
  }

  // Iniciar Despacho
  const handleStartDispatch = (data) => {
    setDispatchSession({
      ...data,
      hora_inicio: new Date().toISOString(),
      items: []
    })
    setSeccionActual('panorama')
    showToast('Despacho Iniciado')
  }

  // Cancelar Operación Activa
  const handleCancelActiveSession = (type) => {
    const isRec = type === 'reception'
    const sessionToCancel = isRec ? receptionSession : dispatchSession

    setConfirmConfig({
      title: isRec ? 'Descartar Recepción' : 'Descartar Despacho',
      message: `¿Estás seguro de que deseas cancelar y descartar todo el lote de ${isRec ? 'recepción de camión' : 'despacho de material'} en curso? Esta acción es irreversible y vaciará el borrador actual.`,
      type: 'danger',
      onConfirm: async () => {
        // 1. Limpiar fotos huérfanas del Storage
        if (sessionToCancel && sessionToCancel.fotos && sessionToCancel.fotos.length > 0) {
          try {
            const filePaths = sessionToCancel.fotos.map(url => {
              const parts = url.split('/fotos/')
              return parts.length > 1 ? parts[1] : null
            }).filter(Boolean)
            
            if (filePaths.length > 0) {
              await supabase.storage.from('fotos').remove(filePaths)
            }
          } catch (e) {
            console.error('Error eliminando fotos huérfanas de storage:', e)
          }
        }

        // 2. Descartar sesión localmente
        if (isRec) setReceptionSession(null)
        else setDispatchSession(null)
        
        showToast(isRec ? 'Recepción descartada' : 'Despacho descartado', true)
      }
    })
  }

  const handleReorderFleje = async (torreId, flejeId, direction) => {
    if (isPublicView) return;
    try {
      const flejesEnTorre = inventarioMap[torreId] || [];
      const currentIndex = flejesEnTorre.findIndex(f => f.id === flejeId);
      if (currentIndex === -1) return;

      const swapIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
      if (swapIndex < 0 || swapIndex >= flejesEnTorre.length) return;

      const f1 = flejesEnTorre[currentIndex];
      const f2 = flejesEnTorre[swapIndex];

      const sec1 = f1.secuencia;
      const sec2 = f2.secuencia;

      const { error: e1 } = await supabase.from('flejes').update({ secuencia: sec2 }).eq('id', f1.id);
      const { error: e2 } = await supabase.from('flejes').update({ secuencia: sec1 }).eq('id', f2.id);

      if (e1 || e2) throw new Error('Error actualizando secuencias');
      
      showToast(`Fleje movido ${direction === 'up' ? 'arriba' : 'abajo'}`);
      queryClient.invalidateQueries({ queryKey: ['torres'] });
    } catch (e) {
      console.error(e);
      showToast('Error al reordenar', true);
    }
  };

  // Abrir Modal de Ingreso en Lote
  const handleOpenBatchIngreso = (torreId, torreName, capMax, currentCount) => {
    const t = torres.find(x => x.id === torreId)
    setBatchIngresoConfig({
      open: true,
      torreId,
      torreName,
      capMax,
      currentCount,
      torreMedida: t ? t.nombre_medida : '',
        torreProductoId: t ? t.producto_sugerido_id : null
      })
  }

  // Confirmar pesos desde BatchIngresoModal
  const handleConfirmBatchIngreso = async (weightsList) => {
    const { torreId, torreName } = batchIngresoConfig

    // Si hay una recepción activa, los guardamos localmente en la sesión
    if (receptionSession) {
      const newItems = weightsList.map(item => ({
        torre_id: torreId,
        peso: item.peso,
        medida: item.medida,
        producto_id: item.producto_id,
        codigo: item.codigo,
        costo_kg_aplicado: item.costo_kg_aplicado,
        lote: item.lote || null
      }))
      setReceptionSession(prev => ({
        ...prev,
        items: [...prev.items, ...newItems]
      }))
      showToast(`${weightsList.length} flejes agregados al camión de recepción`)
    } else {
      // Ajuste manual directo (sin sesión activa - Crea Recepción de Respaldo)
      try {
        // 1. Crear Recepción
        const { data: recData, error: eRec } = await supabase
          .from('recepciones')
          .insert([{
            entregado_por: 'Ajuste Manual',
            usuario_receptor: userProfile.name,
            observaciones: 'Ingreso directo a torre',
            fotos: [],
            estado: 'COMPLETADO',
            hora_inicio: new Date().toISOString(),
            hora_fin: new Date().toISOString()
          }])
          .select()

        if (eRec) throw eRec
        const recepcionId = recData[0].id

        // 2. Insertar en inventario vinculando recepcion_id
        const currentFlejes = inventarioMap[torreId] || []
        const baseSec = currentFlejes.length > 0 ? Math.max(...currentFlejes.map(f => f.secuencia || 0)) : 0

        const { error: eInv } = await supabase
          .from('flejes')
          .insert(weightsList.map((item, i) => ({
            ubicacion_id: torreId,
            peso_kg: item.peso,
            producto_id: item.producto_id,
            costo_kg_ingreso: item.costo_kg_aplicado,
            recepcion_id: recepcionId,
            secuencia: baseSec + i + 1,
            lote: item.lote || null,
            fecha_ingreso: new Date().toISOString()
          })))
        if (eInv) throw eInv

        // 3. Insertar en historial vinculando recepcion_id
        const { error: eHist } = await supabase
          .from('historial_movimientos')
          .insert(weightsList.map(item => ({
            ubicacion_id: torreId,
            peso_kg: item.peso,
            producto_id: item.producto_id,
            costo_kg_aplicado: item.costo_kg_aplicado,
            motivo: 'Ajuste Ingreso',
            usuario: userProfile.name,
            recepcion_id: recepcionId,
            lote: item.lote || null
          })))
        if (eHist) throw eHist

        showToast('Ajuste de inventario guardado')
        queryClient.invalidateQueries({ queryKey: ['torres'] })
        queryClient.invalidateQueries({ queryKey: ['historial'] })
      } catch (e) {
        console.error(e)
        showToast('Error al guardar el ajuste de inventario', true)
      }
    }
    setBatchIngresoConfig(null)
  }

  // Alternar selección de fleje en Despacho
  const handleToggleSelectFleje = (fleje) => {
    if (!dispatchSession) return
    setDispatchSession(prev => {
      const exists = prev.items.some(item => item.id === fleje.id)
      const newItems = exists
        ? prev.items.filter(item => item.id !== fleje.id)
        : [...prev.items, fleje]
      return {
        ...prev,
        items: newItems
      }
    })
  }

  // Confirmar y Guardar Sesión de Recepción o Despacho
  const handleConfirmSaveSession = async () => {
    const isReception = !!receptionSession
    const session = isReception ? receptionSession : dispatchSession

    try {
      if (isReception) {
        // 1. Crear Recepción
        const { data: recData, error: eRec } = await supabase
          .from('recepciones')
          .insert([{
            entregado_por: session.entregado_por,
            usuario_receptor: userProfile.name,
            observaciones: session.observaciones,
            fotos: session.fotos,
            estado: 'COMPLETADO',
            hora_fin: new Date().toISOString(),
            empresa_transporte: session.empresa_transporte || null,
            placa_remolque: session.placa_remolque || null,
            placa_semiremolque: session.placa_semiremolque || null,
            conductor_dni: session.conductor_dni || null
          }])
          .select()

        if (eRec) throw eRec
        const recepcionId = recData[0].id

        // 2. Insertar en Inventario
        const secTracker = {}
        const { error: eInv } = await supabase
          .from('flejes')
          .insert(session.items.map(item => {
            if (secTracker[item.torre_id] === undefined) {
              const currentF = inventarioMap[item.torre_id] || []
              secTracker[item.torre_id] = currentF.length > 0 ? Math.max(...currentF.map(f => f.secuencia || 0)) : 0
            }
            secTracker[item.torre_id] += 1
            
            return {
              ubicacion_id: item.torre_id,
              peso_kg: item.peso,
              producto_id: item.producto_id,
              costo_kg_ingreso: item.costo_kg_aplicado,
              recepcion_id: recepcionId,
              secuencia: secTracker[item.torre_id],
              lote: item.lote || null,
              fecha_ingreso: new Date().toISOString()
            }
          }))
        if (eInv) throw eInv

        // 3. Insertar en Historial
        const { error: eHist } = await supabase
          .from('historial_movimientos')
          .insert(session.items.map(item => {
            return {
              ubicacion_id: item.torre_id,
              peso_kg: item.peso,
              producto_id: item.producto_id,
              costo_kg_aplicado: item.costo_kg_aplicado,
              motivo: 'Ingreso',
              usuario: userProfile.name,
              recepcion_id: recepcionId,
              lote: item.lote || null
            }
          }))
        if (eHist) throw eHist

        setReceptionSession(null)
        showToast('Recepción de camión registrada con éxito')

      } else {
        // 1. Crear Despacho
        const { data: despData, error: eDesp } = await supabase
          .from('despachos')
          .insert([{
            destino: session.destino,
            num_solicitud: session.num_solicitud,
            motivo: session.motivo,
            usuario_despachador: userProfile.name,
            observaciones: session.observaciones,
            fotos: session.fotos,
            estado: 'ENTREGADO',
            hora_fin: new Date().toISOString()
          }])
          .select()

        if (eDesp) throw eDesp
        const despachoId = despData[0].id

        // 2. Eliminar del Inventario Activo
        const idsToDelete = session.items.map(item => item.id)
        const { error: eDel } = await supabase
          .from('flejes')
          .delete()
          .in('id', idsToDelete)
        if (eDel) throw eDel

        // 3. Insertar en Historial
        const { error: eHist } = await supabase
          .from('historial_movimientos')
          .insert(session.items.map(item => {
            return {
              ubicacion_id: item.torre_id,
              peso_kg: item.peso,
              producto_id: item.producto_id,
              motivo: session.motivo || 'Despacho',
              usuario: userProfile.name,
              recepcion_id: item.recepcion_id,
              despacho_id: despachoId,
              lote: item.lote || null
            }
          }))
        if (eHist) throw eHist

        setDispatchSession(null)
        showToast('Despacho de material registrado con éxito')
      }

      queryClient.invalidateQueries({ queryKey: ['torres'] })
      queryClient.invalidateQueries({ queryKey: ['historial'] })
    } catch (err) {
      console.error(err)
      showToast('Error al registrar la operación', true)
    }
  }

  // Delete Strapping Band (Fleje) directly
  const handleEliminarFleje = async (id) => {
    try {
      const { error } = await supabase
        .from('flejes')
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

  // Edit Strapping Band (Fleje) weight and/or medida
  const handleEditarFleje = async (id, nuevoPeso, nuevoProductoId, nuevoCosto, nuevoLote, nuevaFechaIngreso) => {
    if (isNaN(nuevoPeso) || nuevoPeso <= 0) {
      showToast('El peso debe ser un número positivo', true)
      return false
    }

    try {
      const updateData = { peso_kg: nuevoPeso }
      if (nuevoProductoId !== undefined) {
        updateData.producto_id = nuevoProductoId
        if (nuevoCosto !== undefined) updateData.costo_kg_ingreso = nuevoCosto
      }
      if (nuevoLote !== undefined) {
        updateData.lote = nuevoLote || null
      }
      if (nuevaFechaIngreso !== undefined) {
        updateData.fecha_ingreso = nuevaFechaIngreso || null
      }

      const { error } = await supabase
        .from('flejes')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      showToast('Datos del fleje actualizados')
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
        .from('flejes')
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

  // Confirm Output / Consumption (Traslado - Registra en tabla despachos y vincula a historial)
  const handleConfirmarTraslado = async (trasladoData) => {
    const targetTorre = torres.find(t => t.id === torreActualId)
    const currentInventory = inventarioMap[torreActualId] || []
    const targetFleje = currentInventory.find(f => f.id === trasladoData.flejeId)

    if (!targetTorre || !targetFleje) {
      showToast('Error: Datos no encontrados', true)
      return false
    }

    try {
      // 1. Crear Despacho
      const { data: despData, error: eDesp } = await supabase
        .from('despachos')
        .insert([{
          destino: trasladoData.destino,
          num_solicitud: trasladoData.numSolicitud,
          motivo: trasladoData.motivo,
          usuario_despachador: trasladoData.despachador,
          observaciones: 'Salida directa desde torre',
          fotos: [],
          estado: 'ENTREGADO',
          hora_inicio: trasladoData.horaInicio,
          hora_fin: new Date().toISOString()
        }])
        .select()

      if (eDesp) throw eDesp
      const despachoId = despData[0].id

      // 2. Remove strap from active Inventory table
      const { error: eInventario } = await supabase
        .from('flejes')
        .delete()
        .eq('id', trasladoData.flejeId)

      if (eInventario) throw eInventario

      // 3. Insert record into History logs vinculando despacho_id
      const { error: eHistorial } = await supabase
        .from('historial_movimientos')
        .insert([{
          ubicacion_id: torreActualId,
          peso_kg: targetFleje.peso,
          producto_id: targetFleje.producto_id,
          motivo: trasladoData.motivo,
          usuario: trasladoData.despachador,
          despacho_id: despachoId,
          lote: targetFleje.lote || null
        }])

      if (eHistorial) throw eHistorial

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      showToast('Sesión cerrada correctamente')
    } catch (err) {
      console.error(err)
      showToast('Error al cerrar sesión', true)
    }
  }

  // Mobile Bottom Nav items list
  const bottomNavItems = [
    { id: 'panorama', label: 'Panorama', icon: LayoutDashboard },
    userProfile?.rol === 'Administrador' && { id: 'analisis', label: 'Análisis', icon: LineChart },
    userProfile?.rol === 'Administrador' && { id: 'torres', label: 'Torres', icon: Layers },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'transport', label: 'Transporte', icon: Truck }
  ].filter(Boolean)

  if (loadingAuth && !isPublicView) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider animate-pulse">Cargando Sistema...</span>
      </div>
    )
  }

  if (!isPublicView && (!session || !userProfile)) {
    return (
      <>
        <LoginScreen showToast={showToast} />
        {toast && (
          <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-2xl text-xs font-bold shadow-lg border transition-all animate-fadeIn ${
            toast.isError ? 'bg-danger/10 border-danger/20 text-danger animate-pulse' : 'bg-success/10 border-success/20 text-success'
          }`}>
            {toast.message}
          </div>
        )}
      </>
    )
  }

  if (!isPublicView && activeProfile && activeProfile.aprobado === false) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
        <div className="w-16 h-16 bg-warning/10 border border-warning/20 text-warning rounded-2xl flex items-center justify-center mb-6 shadow-md animate-pulse">
          <Clock className="w-8 h-8 text-warning" />
        </div>
        
        <div className="max-w-md bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4 animate-scaleUp">
          <h2 className="text-lg font-bold text-foreground">Cuenta en Proceso de Aprobación</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Hola <span className="font-bold text-foreground">{userProfile.name}</span>, tu cuenta se ha registrado correctamente bajo el correo <span className="font-semibold text-foreground font-mono">{userProfile.email}</span>.
          </p>
          <div className="bg-bg border border-border rounded-xl p-4 text-[11px] text-text-muted leading-relaxed text-left space-y-2">
            <p className="font-bold text-foreground">⚠️ Siguiente Paso:</p>
            <p>Por motivos de seguridad de planta, un administrador autorizado debe aprobar tu acceso y asignarte tu rol de trabajo antes de que puedas utilizar el sistema.</p>
            <p className="text-[10px] text-accent/80 font-semibold">Por favor contacta al encargado de la planta para que active tu cuenta.</p>
          </div>
          
          <div className="pt-2 flex gap-2">
            <button
              onClick={handleManualRefresh}
              className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              Comprobar Activación
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-foreground text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
        
        <div className="text-[10px] text-text-muted/60 font-semibold mt-8 tracking-wider">
          SISTEMA DE FLEJES v2.0 • PLANTA CHILCA
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text flex">
      
      {/* Sidebar Navigation (Desktop only) */}
      <Sidebar 
        seccionActual={seccionActual}
        setSeccionActual={handleNavChange}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        userProfile={activeProfile}
        onLogout={handleLogout}
        isPublicView={isPublicView}
        onShowPublicLink={() => setShowPublicLinkModal(true)}
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
          onLogout={handleLogout}
          isPublicView={isPublicView}
          onShowPublicLink={() => setShowPublicLinkModal(true)}
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
              receptionSession={receptionSession}
              dispatchSession={dispatchSession}
              onStartReception={() => setReceptionInitOpen(true)}
              onStartDispatch={() => setDispatchInitOpen(true)}
              onOpenBatchIngreso={handleOpenBatchIngreso}
              onToggleSelectFleje={handleToggleSelectFleje}
              onReorderFleje={handleReorderFleje}
              dispatchCart={dispatchSession?.items || []}
              showToast={showToast}
              userProfile={activeProfile}
              isPublicView={isPublicView}
            />
          )}

          {seccionActual === 'torres' && (
            <TorresView 
              torres={torres}
              inventario={inventarioMap}
              catalogoCostos={catalogoCostos}
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
              activeSessions={activeSessions}
              userProfile={activeProfile}
              isLoading={loadingHistorial}
            />
          )}

          {seccionActual === 'analisis' && (
            <AnalisisView 
              torres={torres}
              inventario={inventarioMap}
              historial={historial}
              catalogoCostos={catalogoCostos}
              userProfile={activeProfile}
              isPublicView={isPublicView}
            />
          )}

          {seccionActual === 'config' && (
            <ConfigView 
              userProfile={activeProfile}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
              showToast={showToast}
            />
          )}

          {seccionActual === 'transport' && (
            <TransportView 
              userProfile={activeProfile}
              showToast={showToast}
            />
          )}

          {seccionActual === 'users' && (
            <UsersView 
              userProfile={activeProfile}
              showToast={showToast}
            />
          )}

          {seccionActual === 'mantenedor' && (
            <MantenedorCostosView 
              catalogoProductos={catalogoProductos}
              catalogoCostos={catalogoCostos}
              showToast={showToast}
              setConfirmConfig={setConfirmConfig}
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
          onOpenBatchIngreso={handleOpenBatchIngreso}
          onEliminarFleje={handleEliminarFleje}
          onEditarFleje={handleEditarFleje}
          onEliminarVariosFlejes={handleEliminarVariosFlejes}
          onAbrirTraslado={() => setTrasladoOpen(true)}
          catalogoCostos={catalogoCostos}
          catalogoProductos={catalogoProductos}
          userProfile={activeProfile}
        />
      )}

      {/* ==================== MODAL: SALIDA / CONSUMO (Traslado) ==================== */}
      {trasladoOpen && (
        <TrasladoModal 
          torreId={torreActualId}
          torres={torres}
          inventario={inventarioMap}
          userProfile={activeProfile}
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
          catalogoCostos={catalogoCostos}
        />

      {/* ==================== TOAST NOTIFICATION POPUP ==================== */}
      {toast && (
        <div 
          className={`
            fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-semibold text-xs tracking-wide shadow-lg z-[9999] text-white flex items-center gap-2
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

      {/* ==================== SESIONES ACTIVAS: BANNERS Y MODALES ==================== */}

      {/* Banner de Sesión Activa Flotante (Recepción / Despacho) */}
      {receptionSession && (
        <SessionBanner
          type="reception"
          sessionData={receptionSession}
          torres={torres}
          onAddFloor={() => handleOpenBatchIngreso(null, 'Al Piso', 999, 0)}
          onFinish={() => setConfirmSessionConfig({ open: true, type: 'reception' })}
          onCancel={() => handleCancelActiveSession('reception')}
          onRemoveItem={(index) => {
            setReceptionSession(prev => ({
              ...prev,
              items: prev.items.filter((_, idx) => idx !== index)
            }))
          }}
        />
      )}

      {dispatchSession && (
        <SessionBanner
          type="dispatch"
          sessionData={dispatchSession}
          torres={torres}
          onFinish={() => setConfirmSessionConfig({ open: true, type: 'dispatch' })}
          onCancel={() => handleCancelActiveSession('dispatch')}
          onRemoveItem={handleToggleSelectFleje}
        />
      )}

      {/* Modal de Inicialización de Sesiones */}
      <SessionInitModal
        isOpen={receptionInitOpen}
        onClose={() => setReceptionInitOpen(false)}
        type="reception"
        onConfirm={handleStartReception}
        showToast={showToast}
      />

      <SessionInitModal
        isOpen={dispatchInitOpen}
        onClose={() => setDispatchInitOpen(false)}
        type="dispatch"
        onConfirm={handleStartDispatch}
        showToast={showToast}
      />

      {/* Modal de Ingreso en Lote (Táctil) */}
      {batchIngresoConfig && (
        <BatchIngresoModal
          isOpen={batchIngresoConfig.open}
          onClose={() => setBatchIngresoConfig(null)}
          torreId={batchIngresoConfig.torreId}
          torreName={batchIngresoConfig.torreName}
          torreProductoId={batchIngresoConfig.torreProductoId}
          catalogoProductos={catalogoProductos}
          catalogoCostos={catalogoCostos}
          capMax={batchIngresoConfig.capMax}
          currentCount={batchIngresoConfig.currentCount}
          onConfirm={handleConfirmBatchIngreso}
          showToast={showToast}
        />
      )}

      {/* Modal de Confirmación y Auditoría del Lote */}
      {confirmSessionConfig && (
        <ConfirmSessionModal
          isOpen={confirmSessionConfig.open}
          onClose={() => setConfirmSessionConfig(null)}
          type={confirmSessionConfig.type}
          sessionData={confirmSessionConfig.type === 'reception' ? receptionSession : dispatchSession}
          torres={torres}
          onConfirm={handleConfirmSaveSession}
        />
      )}

      {/* ──────────────── MODALES ADICIONALES ──────────────── */}
      
      {showPublicLinkModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-slideUp">
            <div className="flex justify-between items-center p-4 border-b border-border/60">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-accent" /> Enlace Público
              </h3>
              <button onClick={() => setShowPublicLinkModal(false)} className="text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-text-muted">Comparte este enlace para que cualquier persona pueda ver el estado del inventario en tiempo real, sin necesidad de iniciar sesión ni modificar datos.</p>
              <div className="flex bg-bg rounded-xl border border-border p-1">
                <input 
                  type="text" 
                  readOnly 
                  value={window.location.origin + window.location.pathname + '?public=true'} 
                  className="flex-1 bg-transparent px-3 text-sm font-mono text-foreground focus:outline-none min-w-0"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?public=true')
                    showToast('Enlace copiado al portapapeles', false)
                  }}
                  className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
