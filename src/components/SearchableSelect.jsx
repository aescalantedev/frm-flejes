import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export default function SearchableSelect({ options, value, onChange, placeholder = "Seleccionar...", fallbackLabel }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const found = options.find(o => o.value === value)
  const selectedOption = found || (fallbackLabel ? { label: fallbackLabel, value } : null)

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar opciones
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative w-full h-full text-foreground" ref={containerRef}>
      {/* Botón Principal */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full bg-bg border border-border rounded-xl py-3 px-3 flex items-center justify-between cursor-pointer focus-within:border-accent group transition-colors"
      >
        <div className="flex flex-col overflow-hidden text-left">
          {selectedOption ? (
            <>
              <span className="text-xs font-bold text-foreground truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[9px] font-mono text-text-muted truncate">{selectedOption.sublabel}</span>
              )}
            </>
          ) : (
            <span className="text-xs font-semibold text-text-muted/60">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-text-muted group-hover:text-foreground ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl z-[60] flex flex-col max-h-60 overflow-hidden animate-fadeIn">
          {/* Buscador */}
          <div className="p-2 border-b border-border shrink-0 sticky top-0 bg-surface z-10">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar medida o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg py-1.5 pl-7 pr-3 text-[11px] font-medium outline-none focus:border-accent text-foreground"
              />
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-text-muted italic">
                No se encontraron coincidencias
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg cursor-pointer flex flex-col mb-0.5 last:mb-0
                    ${opt.value === value ? 'bg-accent/15 text-accent' : 'hover:bg-surface-hover text-foreground'}`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  {opt.sublabel && (
                    <span className={`text-[9px] font-mono mt-0.5 ${opt.value === value ? 'text-accent/80' : 'text-text-muted'}`}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
