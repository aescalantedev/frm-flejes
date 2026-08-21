import React, { useState, useRef, useEffect } from 'react'
import { 
  Calendar, 
  User, 
  Clock, 
  Search,
  FileSpreadsheet, 
  ArrowDown, 
  ArrowUp, 
  ArrowRightLeft, 
  Settings, 
  SlidersHorizontal,
  X,
  TrendingDown,
  TrendingUp,
  Activity,
  ChevronDown,
  ExternalLink,
  ImageIcon
} from 'lucide-react'
import { useUnitSystem } from '../hooks/useUnitSystem'

// =========================================================================
// COMPONENTE: Selector de Torres con Filtro de Búsqueda Integrado (Tailwind)
// =========================================================================
function SearchableSelect({ options, value, onChange, placeholder, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = value === 'todos' ? placeholder : value

  return (
    <div className="relative w-full md:w-48" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          setSearch('')
        }}
        className="w-full bg-bg border border-border hover:border-accent/60 text-foreground rounded-xl py-2 pl-8 pr-10 text-xs text-left outline-none cursor-pointer flex items-center justify-between transition-all font-semibold h-[34px] shadow-xs active:scale-99"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        {Icon && <Icon className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />}
      </button>

      {isOpen && (
        <div className="absolute top-10 left-0 w-full bg-surface border border-border rounded-xl shadow-xl z-30 p-2 mt-1 animate-fadeIn flex flex-col gap-1.5 max-h-60">
          {/* Input de filtro buscador interno */}
          <div className="relative shrink-0">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-lg py-1.5 pl-7 pr-3 text-xs outline-none focus:border-accent font-medium"
              autoFocus
            />
            <Search className="w-3 h-3 text-text-muted/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Listado de Opciones */}
          <div className="overflow-y-auto flex-1 divide-y divide-border/20 max-h-40 scrollbar-thin">
            <button
              type="button"
              onClick={() => {
                onChange('todos')
                setIsOpen(false)
              }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-hover transition-colors
                ${value === 'todos' ? 'text-accent bg-accent/5' : 'text-foreground'}`}
            >
              Todos
            </button>
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-hover transition-colors
                  ${value === opt ? 'text-accent bg-accent/5' : 'text-foreground'}`}
              >
                {opt}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="text-center text-[10px] text-text-muted italic py-3">
                No hay coincidencias
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// COMPONENTE: Datepicker Personalizado en Tailwind (Independiente del Navegador)
// =========================================================================
function CustomDatePicker({ value, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const weekDays = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
  
  const daysGrid = []
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day)
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDateSelect = (day) => {
    if (!day) return
    const selectedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(selectedDate)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  const handleToday = () => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    onChange(todayStr)
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setIsOpen(false)
  }

  const formattedValue = value ? value.split('-').reverse().join('/') : 'dd/mm/aaaa'

  return (
    <div className="relative w-full md:w-48" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg border border-border hover:border-accent/60 text-foreground rounded-xl py-2 pl-8 pr-10 text-xs text-left outline-none cursor-pointer flex items-center justify-between transition-all font-mono h-[34px] shadow-xs active:scale-99"
      >
        <span>{formattedValue}</span>
        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        {Icon && <Icon className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />}
      </button>

      {isOpen && (
        <div className="absolute top-10 left-0 md:right-0 md:left-auto w-64 bg-surface border border-border rounded-xl shadow-xl z-30 p-4 mt-1 animate-fadeIn flex flex-col gap-3">
          
          {/* Navegación del Calendario */}
          <div className="flex items-center justify-between">
            <button 
              type="button" 
              onClick={handlePrevMonth}
              className="p-1 w-6 h-6 flex items-center justify-center rounded-lg border border-border hover:bg-surface-hover text-foreground cursor-pointer text-xs font-bold"
            >
              &larr;
            </button>
            <span className="text-xs font-bold text-foreground font-sans">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button 
              type="button" 
              onClick={handleNextMonth}
              className="p-1 w-6 h-6 flex items-center justify-center rounded-lg border border-border hover:bg-surface-hover text-foreground cursor-pointer text-xs font-bold"
            >
              &rarr;
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-border/40 pb-1.5">
            {weekDays.map(d => (
              <span key={d} className="text-[9px] font-bold text-text-muted tracking-wider">
                {d}
              </span>
            ))}
          </div>

          {/* Grilla de Días */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((day, idx) => {
              const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
              const isSelected = value === dateStr
              const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
              
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!day}
                  onClick={() => handleDateSelect(day)}
                  className={`
                    w-7 h-7 flex items-center justify-center text-[10px] rounded-lg transition-colors cursor-pointer font-mono
                    ${!day ? 'opacity-0 pointer-events-none' : ''}
                    ${isSelected 
                      ? 'bg-accent text-white font-bold' 
                      : isToday 
                        ? 'bg-accent/15 text-accent border border-accent/30 font-bold' 
                        : 'text-foreground hover:bg-surface-hover hover:text-foreground font-semibold'
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Acciones del pie */}
          <div className="flex justify-between items-center pt-2 border-t border-border/40 text-[10px] font-bold">
            <button 
              type="button" 
              onClick={handleClear}
              className="text-danger hover:text-danger-hover cursor-pointer"
            >
              Borrar
            </button>
            <button 
              type="button" 
              onClick={handleToday}
              className="text-accent hover:text-accent-hover cursor-pointer"
            >
              Hoy
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

// =========================================================================
// COMPONENTE PRINCIPAL: HISTORIAL VIEW
// =========================================================================
const groupHistory = (items) => {
  const groups = {}
  
  items.forEach(m => {
    // IMPORTANTE: Primero comprobar despacho_id, porque un despacho mantiene el recepcion_id para la trazabilidad
    if (m.despacho_id) {
      const key = `desp_${m.despacho_id}`
      if (!groups[key]) {
        groups[key] = {
          id: m.despacho_id,
          type: 'dispatch',
          title: 'Despacho de Material',
          destino: m.despachos?.destino || 'Planta',
          motivo: m.despachos?.motivo || m.motivo || 'Despacho',
          despachador: m.despachos?.usuario_despachador || m.usuario || 'Desconocido',
          num_solicitud: m.despachos?.num_solicitud || m.num_solicitud,
          hora_inicio: m.despachos?.hora_inicio || m.created_at,
          hora_fin: m.despachos?.hora_fin || m.created_at,
          created_at: m.created_at,
          observaciones: m.despachos?.observaciones || '',
          fotos: m.despachos?.fotos || [],
          items: []
        }
      }
      groups[key].items.push(m)
    } else if (m.recepcion_id) {
      const key = `rec_${m.recepcion_id}`
      if (!groups[key]) {
        groups[key] = {
          id: m.recepcion_id,
          type: 'reception',
          title: 'Recepción de Camión',
          entregado_por: m.recepciones?.entregado_por || 'Transportista',
          despachador: m.recepciones?.usuario_receptor || m.usuario || 'Desconocido',
          num_solicitud: m.num_solicitud || m.recepciones?.num_solicitud,
          hora_inicio: m.recepciones?.hora_inicio || m.created_at,
          hora_fin: m.recepciones?.hora_fin || m.created_at,
          created_at: m.created_at,
          observaciones: m.recepciones?.observaciones || '',
          fotos: m.recepciones?.fotos || [],
          empresa_transporte: m.recepciones?.empresa_transporte || '',
          placa_remolque: m.recepciones?.placa_remolque || '',
          placa_semiremolque: m.recepciones?.placa_semiremolque || '',
          conductor_dni: m.recepciones?.conductor_dni || '',
          items: []
        }
      }
      groups[key].items.push(m)
    } else {
      const key = `adj_${m.id}`
      const motivoLower = m.motivo?.toLowerCase() || ''
      const isTransfer = motivoLower.includes('traslado')
      const isSalida = motivoLower.includes('salida') || motivoLower.includes('consumo') || motivoLower.includes('devolución')
      
      let type = 'adjustment'
      let title = m.motivo || 'Ajuste Manual'
      
      if (isTransfer) {
        type = 'transfer'
        title = 'Traslado Interno'
      } else if (isSalida) {
        type = 'dispatch'
        title = m.motivo || 'Despacho / Consumo'
      }

      groups[key] = {
        id: m.id,
        type,
        title,
        despachador: m.usuario || 'Desconocido',
        num_solicitud: m.num_solicitud,
        destino: m.destino || null,
        hora_inicio: m.hora_inicio || m.created_at,
        created_at: m.created_at,
        observaciones: m.observaciones || '',
        fotos: [],
        items: [m]
      }
    }
  })
  
  return Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// Formatear duración transcurrida entre fecha de inicio y fin
const formatDuration = (start, end) => {
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate - startDate
  if (diffMs <= 0) return 'Menos de 1 min'

  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''}`
  }
  const diffHours = Math.floor(diffMins / 60)
  const remMins = diffMins % 60
  if (remMins === 0) {
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  }
  return `${diffHours} hora${diffHours !== 1 ? 's' : ''} y ${remMins} min${remMins !== 1 ? 's' : ''}`
}

// =========================================================================
// COMPONENTE: Modal de Corrección
// =========================================================================
function CorrectionModal({ isOpen, onClose, onConfirm, items, catalogoProductos }) {
  const [nuevoProductoId, setNuevoProductoId] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (isOpen) {
      setNuevoProductoId('')
      setMotivo('')
    }
  }, [isOpen])

  if (!isOpen || !items || items.length === 0) return null

  const isBulk = items.length > 1
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nuevoProductoId || !motivo.trim()) return
    onConfirm(items, nuevoProductoId, motivo.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-bg/40">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            {isBulk ? 'Corregir Todo el Lote' : 'Corregir Registro de Fleje'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs text-warning font-medium">
            Estás a punto de alterar el historial de auditoría de {isBulk ? `${items.length} registros` : '1 registro'}. Esta acción quedará grabada.
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nueva Medida Correcta</label>
            <select
              value={nuevoProductoId}
              onChange={(e) => setNuevoProductoId(e.target.value)}
              className="w-full bg-bg border border-border text-foreground rounded-xl px-3 py-2.5 text-xs outline-none focus:border-accent"
              required
            >
              <option value="">-- Seleccionar --</option>
              {catalogoProductos?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.medida_corta || p.medida} {p.codigo ? `(${p.codigo})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-danger uppercase tracking-wider">Motivo de la corrección (Requerido)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              rows={3}
              placeholder="Ej: Se registró erróneamente como 284x2 por falta de actualización de la torre..."
              className="w-full bg-bg border border-border focus:border-danger text-foreground rounded-xl p-3 text-xs outline-none resize-none"
            />
          </div>
          
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-bg border border-border hover:bg-surface-hover text-foreground font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!nuevoProductoId || !motivo.trim()} className="flex-1 bg-warning hover:bg-warning-hover text-warning-foreground font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-colors disabled:opacity-50 text-white">
              Aplicar Corrección
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function HistorialView({ historial = [], activeSessions = [], userProfile, isLoading, catalogoProductos, onCorregir }) {
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroTorre, setFiltroTorre] = useState('todos')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [activeTx, setActiveTx] = useState(null)
  const [correctionItems, setCorrectionItems] = useState(null)
  const { isTN } = useUnitSystem()

  const handleConfirmCorrection = async (items, nuevoProdId, motivo) => {
    if (onCorregir) {
      const success = await onCorregir(items, nuevoProdId, motivo)
      if (success) {
        // Optimistically hide drawer or refresh it, we'll just close the active Tx to force a refresh UX
        setActiveTx(null)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 h-[90px]" />
          ))}
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4 h-[70px] animate-pulse" />
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 h-[120px]" />
          ))}
        </div>
      </div>
    )
  }

  const groupedTransactions = groupHistory(historial)

  const uniqueTowers = Array.from(new Set(historial.map(m => m.posicion).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

  const filteredTransactions = groupedTransactions.filter(group => {
    // Seguridad: Si es Operador, solo ver sus propias transacciones
    if (userProfile && userProfile.rol !== 'Administrador') {
      if (group.despachador !== userProfile.name) return false
    }

    if (fechaFiltro) {
      const txDate = group.created_at.split('T')[0]
      if (txDate !== fechaFiltro) return false
    }
    
    if (filtroTipo !== 'todos') {
      if (filtroTipo === 'ingresos' && group.type !== 'reception') return false
      if (filtroTipo === 'despachos' && group.type !== 'dispatch') return false
      if (filtroTipo === 'traslados' && group.type !== 'transfer') return false
      if (filtroTipo === 'ajustes' && group.type !== 'adjustment') return false
    }
    
    if (filtroTorre !== 'todos') {
      const hasTower = group.items.some(item => item.posicion === filtroTorre)
      if (!hasTower) return false
    }
    
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase()
      const matchesMeta = 
        (group.num_solicitud?.toLowerCase() || '').includes(q) ||
        (group.despachador?.toLowerCase() || '').includes(q) ||
        (group.entregado_por?.toLowerCase() || '').includes(q) ||
        (group.destino?.toLowerCase() || '').includes(q) ||
        (group.title?.toLowerCase() || '').includes(q)
      
      const matchesItems = group.items.some(item => 
        (item.posicion?.toLowerCase() || '').includes(q) ||
        (item.medida?.toLowerCase() || '').includes(q)
      )
      
      if (!matchesMeta && !matchesItems) return false
    }
    
    return true
  })

  const totalTransacciones = filteredTransactions.length

  const pesoIngresadoKg = filteredTransactions
    .filter(g => g.type === 'reception' || (g.type === 'adjustment' && g.title.toLowerCase().includes('ingreso')))
    .reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.peso_fleje, 0), 0)

  const pesoDespachadoKg = filteredTransactions
    .filter(g => g.type === 'dispatch')
    .reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.peso_fleje, 0), 0)

  return (
    <div className="space-y-6">
      
      {/* 1. INDICADORES KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Ingreso de Material</span>
            <span className="text-xl font-bold font-mono text-accent mt-1 block">
              {(pesoIngresadoKg / 1000).toFixed(3)} t
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Despacho / Consumos</span>
            <span className="text-xl font-bold font-mono text-warning mt-1 block">
              {(pesoDespachadoKg / 1000).toFixed(3)} t
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center text-warning">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Transacciones</span>
            <span className="text-xl font-bold font-mono text-info mt-1 block">
              {totalTransacciones} lotes
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center text-info">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. PANEL DE FILTROS AVANZADOS */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search bar & Export */}
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Buscar fleje, guía, empresa, chofer..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-bg border border-border focus:border-accent focus:ring-1 focus:ring-accent text-foreground rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none transition-all shadow-xs"
              />
            </div>
            <button
              onClick={() => {
                import('../lib/reportUtils').then(({ exportarHistorialExcel }) => {
                  exportarHistorialExcel(historial, isTN)
                })
              }}
              title="Exportar a Excel"
              className="bg-accent hover:bg-accent-hover text-white p-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex shrink-0 items-center justify-center"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>
          </div>

          <SearchableSelect 
            options={uniqueTowers}
            value={filtroTorre}
            onChange={setFiltroTorre}
            placeholder="Seleccionar torre"
            icon={SlidersHorizontal}
          />

          <CustomDatePicker 
            value={fechaFiltro}
            onChange={setFechaFiltro}
            icon={Calendar}
          />
        </div>

        {/* Chips de Categorías */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          {[
            { id: 'todos', label: 'Todas las Transacciones' },
            { id: 'ingresos', label: 'Ingresos (Camiones)' },
            { id: 'despachos', label: 'Despachos (Salidas)' },
            { id: 'traslados', label: 'Traslados Internos' },
            { id: 'ajustes', label: 'Ajustes de Inventario' }
          ].map(chip => {
            const isSelected = filtroTipo === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setFiltroTipo(chip.id)}
                className={`
                  px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer
                  ${isSelected 
                    ? 'bg-accent/15 border-accent/40 text-accent font-bold shadow-xs' 
                    : 'bg-bg border-border text-text-muted hover:bg-surface-hover hover:text-foreground'
                  }
                `}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2.5 OPERACIONES EN CURSO */}
      {(() => {
        const visibleActiveSessions = userProfile?.rol === 'Administrador'
          ? activeSessions
          : activeSessions.filter(s => s.operador === userProfile?.name)
          
        if (!visibleActiveSessions || visibleActiveSessions.length === 0) return null

        return (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
              </span>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Operaciones en Curso (Tiempo Real)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleActiveSessions.map((session) => {
                const type = session.tipo
                const isRec = type === 'reception'
                const opName = session.operador
                const datos = session.datos || {}
                const totalItems = datos.items?.length || 0
                const elapsed = formatDuration(datos.hora_inicio, new Date().toISOString())
                
                const accentColor = isRec 
                  ? 'text-accent border-accent/25 bg-accent/2 shadow-accent/5' 
                  : 'text-warning border-warning/25 bg-warning/2 shadow-warning/5'
                const iconBg = isRec ? 'bg-accent/15' : 'bg-warning/15'
                const Icon = isRec ? ArrowDown : ArrowUp

                return (
                  <div 
                    key={session.id} 
                    className={`border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs animate-pulse ${accentColor}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 text-xs">
                        <p className="font-bold text-foreground">
                          {isRec ? 'Ingreso / Recepción de Camión' : 'Despacho de Material'}
                        </p>
                        <p className="text-text-muted text-[10px] mt-0.5 font-medium truncate">
                          Operador: <span className="font-semibold text-foreground">{opName}</span>
                          {datos.entregado_por && ` • Chofer: ${datos.entregado_por}`}
                          {datos.destino && ` • Destino: ${datos.destino}`}
                        </p>
                        <p className="text-text-muted text-[10px] font-mono mt-1">
                          Carga actual: <span className="font-bold text-foreground">{totalItems} uds</span> • Activo hace: <span className="font-bold text-foreground">{elapsed}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest shrink-0 opacity-80 px-2 py-0.5 rounded-md border border-current font-mono bg-bg/50">
                      Borrador
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* 3. LISTADO DE TRANSACCIONES */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Historial de Auditoría por Lote</h3>
        <span className="text-xs text-text-muted font-medium font-mono">{filteredTransactions.length} lotes encontrados</span>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-16 text-center text-text-muted italic shadow-xs">
          No se encontraron transacciones agrupadas con los filtros aplicados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((group) => {
            const dateObj = new Date(group.created_at)
            const formattedDate = dateObj.toLocaleDateString()
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            
            const totalPesoTx = group.items.reduce((s, i) => s + i.peso_fleje, 0)
            const countItems = group.items.length

            let borderStyle = 'border-l-text-muted'
            let accentColorClass = 'text-text-muted'
            let badgeClass = 'bg-text-muted/10 text-text-muted border border-text-muted/20'
            let Icon = Settings

            if (group.type === 'reception') {
              borderStyle = 'border-l-accent'
              accentColorClass = 'text-accent'
              badgeClass = 'bg-accent/10 text-accent border border-accent/20 font-semibold'
              Icon = ArrowDown
            } else if (group.type === 'dispatch') {
              borderStyle = 'border-l-warning'
              accentColorClass = 'text-warning'
              badgeClass = 'bg-warning/10 text-warning border border-warning/20 font-semibold'
              Icon = ArrowUp
            } else if (group.type === 'transfer') {
              borderStyle = 'border-l-info'
              accentColorClass = 'text-info'
              badgeClass = 'bg-info/10 text-info border border-info/20 font-semibold'
              Icon = ArrowRightLeft
            } else if (group.type === 'adjustment') {
              borderStyle = 'border-l-danger/70'
              accentColorClass = 'text-danger'
              badgeClass = 'bg-danger/10 text-danger border border-danger/20 font-semibold'
              Icon = Settings
            }

            return (
              <div 
                key={group.id}
                onClick={() => setActiveTx(group)}
                className={`bg-surface border border-border border-l-4 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${borderStyle}`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-2xl bg-bg border border-border flex items-center justify-center shrink-0 ${accentColorClass} shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <h4 className="font-bold text-foreground text-sm tracking-tight">{group.title}</h4>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${badgeClass}`}>
                        {group.type === 'reception' ? 'Ingreso' : group.type === 'dispatch' ? group.motivo : 'Individual'}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted mt-1 truncate">
                      {group.type === 'reception' && `Entregado por: ${group.entregado_por}`}
                      {group.type === 'dispatch' && `Destino: ${group.destino}`}
                      {group.type === 'transfer' && `Reordenamiento o traslado de fleje`}
                      {group.type === 'adjustment' && `Ajuste manual directo en inventario`}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-text-muted font-semibold">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-text-muted/40" />
                        {formattedDate} {formattedTime}
                      </span>
                      {group.num_solicitud && (
                        <span className="flex items-center gap-1 font-mono">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-text-muted/40" />
                          <span>Guía:</span>
                          <span className="text-foreground">{group.num_solicitud}</span>
                        </span>
                      )}
                      {group.despachador && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-text-muted/40" />
                          <span className="text-foreground">{group.despachador}</span>
                        </span>
                      )}
                      {group.fotos && group.fotos.length > 0 && (
                        <span className="flex items-center gap-1 text-accent">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>{group.fotos.length} fotos</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0 shrink-0 gap-1.5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">Carga total</span>
                    <span className="text-xs text-text-muted/70 font-mono mt-0.5">{countItems} {countItems === 1 ? 'fleje' : 'flejes'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-bg border border-border px-3.5 py-1.5 rounded-xl font-mono shadow-xs">
                      <span className={`text-base font-bold ${accentColorClass}`}>
                        {totalPesoTx.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-text-muted font-sans font-semibold ml-0.5">kg</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-text-muted/40 hidden sm:block" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. DETAIL DRAWER */}
      {activeTx && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setActiveTx(null)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] z-50 bg-surface border-l border-border shadow-2xl flex flex-col transition-transform duration-300 translate-x-0 animate-slideLeft">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-bg/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                <h3 className="font-bold text-sm text-foreground tracking-tight">Detalle de Operación</h3>
              </div>
              <button
                onClick={() => setActiveTx(null)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg border border-border text-text-muted hover:text-foreground cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-bg/40 border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">
                    {activeTx.title}
                  </span>
                  <span className="text-[10px] text-text-muted font-semibold font-mono">
                    ID: #{activeTx.id.slice(0, 8)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3.5">
                  {activeTx.type === 'reception' && (
                    <>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-text-muted text-[10px] block mb-0.5">Empresa de Transporte:</span>
                        <p className="font-semibold text-foreground truncate uppercase">{activeTx.empresa_transporte || 'Manual / Ajuste'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-text-muted text-[10px] block mb-0.5">Chofer / Conductor:</span>
                        <p className="font-semibold text-foreground truncate uppercase">{activeTx.entregado_por}</p>
                      </div>
                      {activeTx.conductor_dni && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-text-muted text-[10px] block mb-0.5">DNI del Conductor:</span>
                          <p className="font-semibold text-foreground font-mono uppercase">{activeTx.conductor_dni}</p>
                        </div>
                      )}
                      {activeTx.placa_remolque && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-text-muted text-[10px] block mb-0.5">Placas Vehículo:</span>
                          <p className="font-semibold text-foreground font-mono uppercase">
                            {activeTx.placa_remolque} {activeTx.placa_semiremolque ? `/ ${activeTx.placa_semiremolque}` : ''}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {activeTx.type === 'dispatch' && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-text-muted text-[10px] block mb-0.5">Destino de Salida:</span>
                      <p className="font-semibold text-foreground truncate">{activeTx.destino}</p>
                    </div>
                  )}
                  {activeTx.type !== 'reception' && activeTx.type !== 'dispatch' && activeTx.destino && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-text-muted text-[10px] block mb-0.5">Destino de Salida:</span>
                      <p className="font-semibold text-foreground truncate">{activeTx.destino}</p>
                    </div>
                  )}
                  {activeTx.type !== 'reception' && (
                    <div>
                      <span className="text-text-muted text-[10px] block mb-0.5">Motivo / Operación:</span>
                      <p className="font-semibold text-foreground">{activeTx.motivo || activeTx.title}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-text-muted text-[10px] block mb-0.5">Guía / Solicitud:</span>
                    <p className="font-semibold text-foreground font-mono truncate">{activeTx.num_solicitud || '-'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] block mb-0.5">Registrado por:</span>
                    <p className="font-semibold text-foreground">{activeTx.despachador || '-'}</p>
                  </div>
                  {activeTx.hora_inicio && activeTx.hora_fin && (activeTx.type === 'reception' || activeTx.type === 'dispatch') ? (
                    <>
                      <div className="col-span-2 pt-3.5 border-t border-border/40 grid grid-cols-3 gap-2.5">
                        <div>
                          <span className="text-text-muted text-[10px] block mb-0.5">Hora Inicio:</span>
                          <p className="font-semibold text-foreground font-mono">
                            {new Date(activeTx.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-muted text-[10px] block mb-0.5">Hora Fin:</span>
                          <p className="font-semibold text-foreground font-mono">
                            {new Date(activeTx.hora_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-muted text-[10px] block mb-0.5">Duración:</span>
                          <p className="font-bold text-accent font-mono">
                            {formatDuration(activeTx.hora_inicio, activeTx.hora_fin)}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2 pt-2.5 text-[10px] text-text-muted border-t border-border/20">
                        <span className="font-semibold">Fecha de Operación:</span> {new Date(activeTx.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 pt-3.5 border-t border-border/40">
                      <span className="text-text-muted text-[10px] block mb-0.5">Fecha y Hora de Registro:</span>
                      <p className="font-semibold text-foreground font-mono">
                        {new Date(activeTx.created_at).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Desglose de Flejes en Lote</h4>
                <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-bg/25 shadow-xs">
                  {activeTx.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 text-xs hover:bg-bg/40 transition-colors">
                      <div>
                        <span className="font-bold text-foreground block">
                          {item.posicion || 'Al Piso'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-text-muted font-mono block">
                            {item.medida || 'Suelto'}
                          </span>
                          {userProfile?.rol === 'Administrador' && (
                            <button
                              onClick={() => setCorrectionItems([item])}
                              className="text-text-muted hover:text-warning transition-colors bg-surface border border-border rounded-md px-1.5 py-0.5 text-[9px] cursor-pointer"
                              title="Corregir medida de este fleje"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {item.glosa && (
                            <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[9px] font-medium bg-surface border border-border text-text-muted/90 truncate max-w-[150px]" title={item.glosa}>
                              {item.glosa}
                            </span>
                          )}
                          {item.lote && (
                            <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[9px] font-bold bg-accent/10 border border-accent/20 text-accent truncate max-w-[150px]" title={`Lote: ${item.lote}`}>
                              Lote: {item.lote}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground text-sm">
                          {item.peso_fleje.toFixed(2)}
                        </span>
                        <span className="text-text-muted text-[10px] font-sans">kg</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center p-4 bg-accent/5 font-bold text-xs">
                    <span className="text-foreground">Total Carga ({activeTx.items.length} uds)</span>
                    <span className="text-accent text-sm font-mono">
                      {activeTx.items.reduce((sum, x) => sum + x.peso_fleje, 0).toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>

              {activeTx.fotos && activeTx.fotos.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Evidencia Fotográfica</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {activeTx.fotos.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="relative aspect-video rounded-2xl overflow-hidden border border-border bg-black/10 group cursor-pointer hover:border-accent transition-colors shadow-xs"
                      >
                        <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold uppercase tracking-wider gap-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Grande</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {activeTx.observaciones && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Observaciones / Anotaciones</h4>
                  <div className="bg-bg/40 border border-border border-dashed rounded-2xl p-4 text-xs text-text-muted leading-relaxed italic shadow-inner">
                    {activeTx.observaciones}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border bg-bg/20 shrink-0 flex gap-3">
              <button 
                onClick={() => setActiveTx(null)}
                className="flex-1 bg-surface border border-border hover:bg-surface-hover text-foreground font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-colors text-center active:scale-98"
              >
                Cerrar Detalle
              </button>
              {userProfile?.rol === 'Administrador' && activeTx.items.length > 1 && (
                <button 
                  onClick={() => setCorrectionItems(activeTx.items)}
                  className="flex-1 bg-warning/10 border border-warning/30 hover:bg-warning/20 text-warning font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-colors text-center active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <span>✏️</span> Corregir Lote Completo
                </button>
              )}
            </div>
          </div>
        </>
      )}
      
      <CorrectionModal 
        isOpen={!!correctionItems}
        items={correctionItems}
        onClose={() => setCorrectionItems(null)}
        onConfirm={handleConfirmCorrection}
        catalogoProductos={catalogoProductos}
      />
    </div>
  )
}
