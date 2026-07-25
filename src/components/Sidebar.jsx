import React, { useState, useRef, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Layers, 
  History, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  User 
} from 'lucide-react'

export default function Sidebar({ 
  seccionActual, 
  setSeccionActual, 
  collapsed, 
  setCollapsed,
  userProfile,
  onLogout
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef(null)

  // Cerrar el popover al hacer clic fuera de él
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const menuItems = [
    { 
      category: 'Almacén',
      items: [
        { id: 'panorama', label: 'Panorama', icon: LayoutDashboard },
        userProfile?.rol === 'Administrador' && { id: 'torres', label: 'Torres', icon: Layers },
        { id: 'historial', label: 'Historial', icon: History }
      ].filter(Boolean)
    },
    {
      category: 'Sistema',
      items: [
        { id: 'config', label: 'Configuración', icon: Settings }
      ]
    }
  ]

  return (
    <aside 
      className={`
        hidden md:flex fixed top-0 left-0 h-full z-40 bg-surface border-r border-border flex-col transition-all duration-300
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Botón de contraer/expandir sobre la línea divisoria */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 -right-3 z-50 flex items-center justify-center w-6 h-6 rounded-md bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-foreground cursor-pointer shadow-xs transition-colors"
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Marca / Cabecera */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm tracking-wider text-foreground whitespace-nowrap animate-fadeIn">
              SISTEMA DE FLEJES
            </span>
          )}
        </div>
      </div>

      {/* Enlaces de Navegación */}
      <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        {menuItems.map((group) => (
          <div key={group.category} className="space-y-2">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold tracking-wider text-text-muted uppercase block animate-fadeIn">
                {group.category}
              </span>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = seccionActual === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSeccionActual(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer min-h-[48px]
                      ${isActive 
                        ? 'bg-accent/10 text-accent font-semibold shadow-xs' 
                        : 'text-text-muted hover:bg-surface-hover hover:text-foreground'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                    {!collapsed && (
                      <span className="truncate animate-fadeIn">{item.label}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Perfil del Usuario y Pie */}
      <div className="p-3 border-t border-border bg-surface-hover/30 shrink-0 relative" ref={popoverRef}>
        <div 
          onClick={collapsed ? () => setPopoverOpen(!popoverOpen) : undefined}
          className={`
            flex items-center gap-3 p-2 rounded-xl transition-all duration-200
            ${collapsed 
              ? 'cursor-pointer hover:bg-surface-hover/80 justify-center select-none active:scale-95' 
              : ''
            }
          `}
          title={collapsed ? "Opciones de usuario" : undefined}
        >
          <div className="w-9 h-9 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-accent" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 animate-fadeIn">
              <p className="text-xs font-semibold text-foreground truncate">{userProfile?.name || 'Administrador'}</p>
              <p className="text-[10px] text-text-muted truncate">{userProfile?.email || 'admin@flejes.com'}</p>
            </div>
          )}
        </div>

        {/* Popover flotante cuando el Sidebar está colapsado */}
        {collapsed && popoverOpen && (
          <div className="absolute bottom-16 left-3 w-56 bg-surface border border-border rounded-2xl shadow-xl z-50 p-2.5 animate-fadeIn flex flex-col gap-1 text-left">
            <div className="px-2 py-1.5 border-b border-border/60 mb-1">
              <p className="text-xs font-bold text-foreground truncate">{userProfile?.name || 'Administrador'}</p>
              <p className="text-[10px] text-text-muted truncate">{userProfile?.email || 'admin@flejes.com'}</p>
            </div>
            
            <button
              onClick={() => {
                setSeccionActual('config')
                setPopoverOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors text-left cursor-pointer min-h-[36px]"
            >
              <User className="w-3.5 h-3.5 text-text-muted" />
              <span>Mi Perfil</span>
            </button>
            
            <button
              onClick={() => {
                onLogout()
                setPopoverOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors text-left cursor-pointer min-h-[36px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {/* Botón de Logout cuando el Sidebar está expandido */}
        {!collapsed && (
          <button 
            onClick={onLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-colors border border-transparent hover:border-destructive/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>
    </aside>
  )
}
