import React, { useState, useRef, useEffect } from 'react'
import { Search, RefreshCw, Plus, Calendar, X, LogOut, User, ArrowLeft, Shield, Database } from 'lucide-react'
import { useUnitSystem } from '../hooks/useUnitSystem'

export default function AppBar({ 
  seccionActual, 
  setSeccionActual,
  onNuevaTorre, 
  onRefresh, 
  searchQuery,
  setSearchQuery,
  filtroFecha,
  setFiltroFecha,
  userProfile,
  onLogout,
  isPublicView,
  onShowPublicLink
}) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileSearchActive, setMobileSearchActive] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const inputRef = useRef(null)
  
  const { unitSystem, toggleUnitSystem } = useUnitSystem()

  // Cerrar el popover del usuario al hacer clic fuera del menú
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-enfocar el input cuando se activa la búsqueda en móvil
  useEffect(() => {
    if (mobileSearchActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mobileSearchActive])

  const titles = { 
    panorama: 'Panorama General', 
    torres: 'Gestión de Torres', 
    historial: 'Historial de Movimientos', 
    config: 'Configuración de Sistema' 
  }

  const handleMobileSearchClose = () => {
    setMobileSearchActive(false)
    setSearchQuery('')
  }

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
      
      {/* 1. MODO DE BÚSQUEDA MÓVIL ACTIVO (Expansión completa de ancho) */}
      {mobileSearchActive ? (
        <div className="md:hidden flex items-center w-full gap-3 animate-fadeIn">
          {/* Botón de retroceso / cerrar */}
          <button 
            onClick={handleMobileSearchClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-text-muted hover:text-foreground cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {/* Input de búsqueda full-width */}
          <div className="relative flex-1">
            <input 
              ref={inputRef}
              type="text"
              placeholder="Filtrar torres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg border border-accent/40 text-foreground placeholder:text-text-muted/50 rounded-xl py-2 pl-4 pr-9 text-xs outline-none focus:border-accent"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 2. MODO ESTÁNDAR (Título de Sección + Acciones) */
        <>
          {/* Izquierda: Título de Sección */}
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-sm md:text-base lg:text-lg text-foreground tracking-tight">
              {titles[seccionActual] || seccionActual}
            </h1>
          </div>

          {/* Derecha: Acciones de Sección */}
          <div className="flex items-center gap-2">
            
            {/* Buscador de Escritorio (Siempre Visible en PC) */}
            {(seccionActual === 'panorama' || seccionActual === 'torres') && (
              <div className="hidden md:relative md:block">
                <div className="flex items-center">
                  <input 
                    type="text"
                    placeholder="Filtrar torres..."
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`
                      bg-bg border border-border text-foreground placeholder:text-text-muted/50 rounded-xl py-2 pl-9 pr-8 text-xs outline-none transition-all duration-300
                      ${searchFocused || searchQuery ? 'w-64 border-accent/60' : 'w-36'}
                    `}
                  />
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button 
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSearchQuery('')
                      }}
                      className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                      title="Limpiar filtro"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Icono de Lupa Móvil (Solo visible en Android/móvil para expandirse) */}
            {(seccionActual === 'panorama' || seccionActual === 'torres') && (
              <button 
                onClick={() => setMobileSearchActive(true)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl hover:bg-surface-hover border border-border text-text-muted hover:text-foreground cursor-pointer transition-colors"
                title="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Actualizar / Reload (Ocultado en Android/móvil) */}
            {seccionActual === 'panorama' && (
              <button 
                onClick={onRefresh}
                className="hidden md:flex items-center justify-center w-8 h-8 rounded-xl hover:bg-surface-hover border border-border text-text-muted hover:text-foreground cursor-pointer transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

              {/* Toggle de Unidad (Kg / Tn) */}
              <div className="flex items-center bg-surface border border-border rounded-xl p-0.5 shrink-0">
                <button
                  onClick={() => toggleUnitSystem('kg')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    unitSystem === 'kg' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-foreground'
                  }`}
                  title="Mostrar en Kilogramos"
                >
                  KG
                </button>
                <button
                  onClick={() => toggleUnitSystem('t')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    unitSystem === 't' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-foreground'
                  }`}
                  title="Mostrar en Toneladas"
                >
                  TN
                </button>
              </div>

            {/* Crear Torre */}
            {seccionActual === 'torres' && (
              <button 
                onClick={onNuevaTorre}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva Torre</span>
              </button>
            )}

            {/* Avatar de Perfil de Usuario con Menú Popover (Solo Móvil / Android) */}
            {seccionActual !== 'config' && (
              <div className="md:hidden relative" ref={userMenuRef}>
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 border-2 border-accent text-accent cursor-pointer active:scale-95 transition-all overflow-hidden"
                  title="Opciones de perfil"
                >
                  <User className="w-4 h-4 text-accent" />
                </button>

                {userMenuOpen && (
                  <div className="absolute top-10 right-0 w-52 bg-surface border border-border rounded-2xl shadow-xl z-50 p-2 text-left animate-fadeIn flex flex-col gap-1">
                    <div className="px-2 py-1.5 border-b border-border/60 mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{userProfile?.name || 'Administrador'}</p>
                      <p className="text-[10px] text-text-muted truncate">{userProfile?.email || 'admin@flejes.com'}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSeccionActual('config')
                        setUserMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors text-left cursor-pointer min-h-[36px]"
                    >
                      <User className="w-3.5 h-3.5 text-text-muted" />
                      <span>Mi Perfil</span>
                    </button>
                    
                    {userProfile?.rol === 'Administrador' && (
                      <>
                        <button
                          onClick={() => {
                            setSeccionActual('users')
                            setUserMenuOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface-hover hover:text-foreground rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-text-muted" />
                          <span>Gestión de Accesos</span>
                        </button>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false)
                            onShowPublicLink()
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-info hover:bg-info/10 hover:text-info rounded-lg transition-colors flex items-center gap-2 cursor-pointer border border-transparent hover:border-info/20 mt-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                          <span>Copiar Link Público</span>
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => {
                        onLogout()
                        setUserMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors text-left cursor-pointer min-h-[36px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      )}
    </header>
  )
}
