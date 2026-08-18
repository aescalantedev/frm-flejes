import React, { useState, useEffect, useRef } from 'react'
import { X, Camera, Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  disabled,
  emptyMessage = "No se encontraron resultados"
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) setSearch('')
  }, [isOpen])

  const filteredOptions = options.filter(opt => {
    const term = search.toLowerCase()
    const labelMatch = (opt.label || opt).toLowerCase().includes(term)
    const sublabelMatch = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false
    return labelMatch || sublabelMatch
  })

  const selectedOption = options.find(opt => (opt.value !== undefined ? opt.value : opt) === value)
  const displayLabel = selectedOption 
    ? (selectedOption.label || selectedOption) 
    : placeholder

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg border border-border text-left text-foreground rounded-xl py-2.5 px-3 text-xs outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors cursor-pointer"
      >
        <span className={selectedOption ? "font-semibold text-foreground" : "text-text-muted/40"}>
          {displayLabel}
        </span>
        <svg className={`w-4 h-4 text-text-muted/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-surface border border-border rounded-xl shadow-lg overflow-hidden flex flex-col max-h-56">
          <div className="p-2 border-b border-border bg-bg/50">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg border border-border text-foreground rounded-lg py-1.5 px-2.5 text-xs outline-none focus:border-accent font-semibold"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-4 text-xs text-text-muted text-center">{emptyMessage}</div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optValue = opt.value !== undefined ? opt.value : opt
                const optLabel = opt.label || opt
                const isSelected = optValue === value
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onChange(optValue)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left py-2 px-3 text-xs flex flex-col cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-accent/10 text-accent font-semibold' 
                        : 'text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span className="uppercase">{optLabel}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-text-muted font-mono font-normal mt-0.5 uppercase">{opt.sublabel}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Utilidad local para comprimir y convertir imágenes a WebP en el navegador
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new window.Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDimensions = 1024
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDimensions) {
            height = Math.round((height * maxDimensions) / width)
            width = maxDimensions
          }
        } else {
          if (height > maxDimensions) {
            width = Math.round((width * maxDimensions) / height)
            height = maxDimensions
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas image conversion failed'))
            return
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        }, 'image/webp', 0.7) // 70% calidad
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function SessionInitModal({ 
  isOpen, 
  onClose, 
  type, // 'reception' | 'dispatch'
  onConfirm,
  showToast 
}) {
  const [entregadoPor, setEntregadoPor] = useState('')
  const [destino, setDestino] = useState('')
  const [numSolicitud, setNumSolicitud] = useState('')
  const [motivo, setMotivo] = useState('Consumo')
  const [observaciones, setObservaciones] = useState('')
  const [fotos, setFotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // Catalog transport states
  const [manualMode, setManualMode] = useState(false)
  const [empresas, setEmpresas] = useState([])
  const [todosConductores, setTodosConductores] = useState([])
  const [todasPlacas, setTodasPlacas] = useState([])
  
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [selectedConductorId, setSelectedConductorId] = useState('')
  const [selectedRemolque, setSelectedRemolque] = useState('')
  const [selectedSemiremolque, setSelectedSemiremolque] = useState('')
  
  const [filteredConductores, setFilteredConductores] = useState([])
  const [loadingLists, setLoadingLists] = useState(false)

  // Manual transport input states
  const [manualEmpresa, setManualEmpresa] = useState('')
  const [manualConductor, setManualConductor] = useState('')
  const [manualDni, setManualDni] = useState('')
  const [manualRemolque, setManualRemolque] = useState('')
  const [manualSemiremolque, setManualSemiremolque] = useState('')

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  // Memoized unique lists for Remolques and Semiremolques based on selected company
  const uniqueRemolques = React.useMemo(() => {
    if (!selectedEmpresaId) return []
    const list = todasPlacas
      .filter(p => p.empresa_id === selectedEmpresaId)
      .map(p => p.placa_remolque)
      .filter(Boolean)
    return Array.from(new Set(list))
  }, [selectedEmpresaId, todasPlacas])

  const uniqueSemiremolques = React.useMemo(() => {
    if (!selectedEmpresaId) return []
    const list = todasPlacas
      .filter(p => p.empresa_id === selectedEmpresaId)
      .map(p => p.placa_semiremolque)
      .filter(Boolean)
    return Array.from(new Set(list))
  }, [selectedEmpresaId, todasPlacas])

  React.useEffect(() => {
    if (isOpen && type === 'reception') {
      const loadData = async () => {
        setLoadingLists(true)
        try {
          const { data: emp, error: empErr } = await supabase
            .from('empresas_transporte')
            .select('*')
            .order('nombre', { ascending: true })
          if (empErr) throw empErr
          setEmpresas(emp || [])

          const { data: cond, error: condErr } = await supabase
            .from('conductores')
            .select('*')
            .order('nombre', { ascending: true })
          if (condErr) throw condErr
          setTodosConductores(cond || [])

          const { data: plac, error: placErr } = await supabase
            .from('placas')
            .select('*')
            .order('placa_remolque', { ascending: true })
          if (placErr) throw placErr
          setTodasPlacas(plac || [])
        } catch (err) {
          console.error('Error al cargar datos de transporte:', err)
          showToast('Error al cargar lista de transportes', true)
        } finally {
          setLoadingLists(false)
        }
      }
      loadData()
    }
  }, [isOpen, type])

  React.useEffect(() => {
    if (selectedEmpresaId) {
      setFilteredConductores(todosConductores.filter(c => c.empresa_id === selectedEmpresaId))
    } else {
      setFilteredConductores([])
    }
    setSelectedConductorId('')
    setSelectedRemolque('')
    setSelectedSemiremolque('')
  }, [selectedEmpresaId, todosConductores])

  if (!isOpen) return null

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setCompressing(true)
    try {
      showToast('Comprimiendo imagen a WebP...')
      const compressedFile = await compressImage(file)
      setCompressing(false)
      
      showToast('Subiendo archivo...')
      const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webp`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from('fotos')
        .upload(filePath, compressedFile)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('fotos')
        .getPublicUrl(filePath)

      setFotos(prev => [...prev, publicUrl])
      showToast('Foto cargada correctamente')
    } catch (err) {
      console.error('Error al procesar foto:', err)
      showToast('Error al subir la imagen', true)
    } finally {
      setUploading(false)
      setCompressing(false)
    }
  }

  const handleRemoveFoto = async (indexToRemove) => {
    const url = fotos[indexToRemove]
    
    // Intentar borrar de Supabase Storage
    try {
      // Extraemos el nombre del archivo de la URL pública
      const parts = url.split('/fotos/')
      if (parts.length > 1) {
        const filePath = parts[1]
        const { error } = await supabase.storage.from('fotos').remove([filePath])
        if (error) throw error
      }
    } catch (err) {
      console.error('Error al borrar foto de storage:', err)
      // Aunque falle en backend, la quitamos del UI para no bloquear al usuario
    }

    setFotos(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    let finalEmpresa = ''
    let finalConductor = ''
    let finalDni = ''
    let finalRemolque = ''
    let finalSemiremolque = ''

    if (type === 'reception') {
      if (manualMode) {
        if (!manualConductor.trim()) {
          showToast('El nombre del conductor es requerido', true)
          return
        }
        finalEmpresa = manualEmpresa.trim().toUpperCase()
        finalConductor = manualConductor.trim().toUpperCase()
        finalDni = manualDni.trim().toUpperCase()
        finalRemolque = manualRemolque.trim().toUpperCase()
        finalSemiremolque = manualSemiremolque.trim().toUpperCase() || null
      } else {
        if (!selectedConductorId) {
          showToast('Selecciona un conductor o activa el modo manual', true)
          return
        }
        if (!selectedRemolque) {
          showToast('Selecciona la placa de remolque o activa el modo manual', true)
          return
        }
        const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId)
        const selectedConductor = todosConductores.find(c => c.id === selectedConductorId)

        finalEmpresa = selectedEmpresa ? selectedEmpresa.nombre : ''
        finalConductor = selectedConductor ? selectedConductor.nombre : ''
        finalDni = selectedConductor ? selectedConductor.dni : ''
        finalRemolque = selectedRemolque
        finalSemiremolque = selectedSemiremolque || null
      }
    }

    if (type === 'dispatch' && (!destino.trim() || !numSolicitud.trim())) {
      showToast('Destino y Nro de solicitud son requeridos', true)
      return
    }

    onConfirm({
      entregado_por: type === 'reception' ? finalConductor : entregadoPor,
      destino,
      num_solicitud: numSolicitud,
      motivo,
      observaciones,
      fotos,
      items: [],
      empresa_transporte: type === 'reception' ? finalEmpresa : null,
      placa_remolque: type === 'reception' ? finalRemolque : null,
      placa_semiremolque: type === 'reception' ? finalSemiremolque : null,
      conductor_dni: type === 'reception' ? finalDni : null
    })

    // Reset state
    setEntregadoPor('')
    setDestino('')
    setNumSolicitud('')
    setMotivo('Consumo')
    setObservaciones('')
    setFotos([])
    
    setSelectedEmpresaId('')
    setSelectedConductorId('')
    setSelectedRemolque('')
    setSelectedSemiremolque('')
    setManualEmpresa('')
    setManualConductor('')
    setManualDni('')
    setManualRemolque('')
    setManualSemiremolque('')
    setManualMode(false)
    
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {type === 'reception' ? 'Iniciar Recepción (Ingreso)' : 'Iniciar Despacho (Salida)'}
          </h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {type === 'reception' ? (
            manualMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Empresa de Transporte (Manual)
                  </label>
                  <input 
                    type="text"
                    placeholder="Escribe la empresa de transporte"
                    value={manualEmpresa}
                    onChange={(e) => setManualEmpresa(e.target.value)}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Conductor / Chofer (Manual) *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Escribe el nombre completo del conductor"
                    value={manualConductor}
                    onChange={(e) => setManualConductor(e.target.value)}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    DNI del Conductor (Manual)
                  </label>
                  <input 
                    type="text"
                    placeholder="Escribe el número de documento"
                    value={manualDni}
                    onChange={(e) => setManualDni(e.target.value)}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent font-mono font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Placa Remolque (Manual)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej: BCW838"
                    value={manualRemolque}
                    onChange={(e) => setManualRemolque(e.target.value)}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent font-mono font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Placa Semiremolque (Manual)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej: ARB976"
                    value={manualSemiremolque}
                    onChange={(e) => setManualSemiremolque(e.target.value)}
                    className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent font-mono font-semibold uppercase"
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setManualMode(false)}
                    className="text-[10px] text-accent hover:underline font-bold bg-transparent border-0 cursor-pointer outline-none"
                  >
                    Seleccionar desde catálogo de flota
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {loadingLists && empresas.length === 0 ? (
                  <div className="text-center py-4 text-xs text-text-muted">Cargando flota autorizada...</div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        Empresa de Transporte
                      </label>
                      <SearchableSelect
                        value={selectedEmpresaId}
                        onChange={setSelectedEmpresaId}
                        options={empresas.map(e => ({ value: e.id, label: e.nombre }))}
                        placeholder="-- Seleccionar Empresa --"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        Conductor / Chofer *
                      </label>
                      <SearchableSelect
                        value={selectedConductorId}
                        disabled={!selectedEmpresaId}
                        onChange={setSelectedConductorId}
                        options={filteredConductores.map(c => ({ value: c.id, label: c.nombre, sublabel: `DNI: ${c.dni}` }))}
                        placeholder="-- Seleccionar Conductor --"
                        emptyMessage="No hay conductores para esta empresa"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        Placa Remolque *
                      </label>
                      <SearchableSelect
                        value={selectedRemolque}
                        disabled={!selectedEmpresaId}
                        onChange={setSelectedRemolque}
                        options={uniqueRemolques.map(r => ({ value: r, label: r }))}
                        placeholder="-- Seleccionar Remolque --"
                        emptyMessage="No hay remolques para esta empresa"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                        Placa Semiremolque (Opcional)
                      </label>
                      <SearchableSelect
                        value={selectedSemiremolque}
                        disabled={!selectedEmpresaId}
                        onChange={setSelectedSemiremolque}
                        options={uniqueSemiremolques.map(s => ({ value: s, label: s }))}
                        placeholder="-- Sin Semiremolque (Ninguno) --"
                        emptyMessage="No hay semiremolques para esta empresa"
                      />
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setManualMode(true)}
                        className="text-[10px] text-accent hover:underline font-bold bg-transparent border-0 cursor-pointer outline-none"
                      >
                        ¿No está en la lista? Ingresar manualmente
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Destino *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Planta A - Sector 3"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Motivo *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full bg-bg border border-border text-foreground rounded-xl py-2.5 px-3 text-xs outline-none focus:border-accent"
                >
                  <option value="Consumo">Consumo</option>
                  <option value="Devolución">Devolución</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Número de Solicitud / Guía *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. SOL-4081"
                  value={numSolicitud}
                  onChange={(e) => setNumSolicitud(e.target.value)}
                  className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent font-mono"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Observaciones
            </label>
            <textarea 
              placeholder="Detalles adicionales, estado de la entrega, etc..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Fotos con Captura Nativa de Cámara o Galería */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Evidencia Fotográfica
            </label>
            
            {/* Input para Cámara Directa */}
            <input 
              ref={cameraInputRef}
              type="file" 
              accept="image/*"
              capture="environment" 
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Input para Galería de Archivos */}
            <input 
              ref={galleryInputRef}
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            
            <div className="flex flex-wrap gap-2 pt-1">
              
              {/* Botón de Cámara */}
              <button
                type="button"
                disabled={uploading}
                onClick={() => cameraInputRef.current?.click()}
                className="w-18 h-18 rounded-2xl border border-dashed border-border hover:border-accent flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-accent bg-bg cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Cámara</span>
              </button>

              {/* Botón de Galería */}
              <button
                type="button"
                disabled={uploading}
                onClick={() => galleryInputRef.current?.click()}
                className="w-18 h-18 rounded-2xl border border-dashed border-border hover:border-accent flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-accent bg-bg cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Galería</span>
              </button>

              {/* Vista previa de fotos */}
              {fotos.map((url, idx) => (
                <div key={idx} className="relative w-18 h-18 rounded-2xl overflow-hidden border border-border bg-black/20 group">
                  <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto(idx)}
                    className="absolute -top-1 -right-1 bg-danger/80 text-white rounded-full p-1 shadow-md hover:bg-danger cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            
            {uploading && (
              <p className="text-[10px] text-accent mt-2 animate-pulse font-semibold">
                {compressing ? '⚙️ Comprimiendo imagen...' : '📤 Subiendo foto a Supabase...'}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2.5 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg border border-border hover:bg-surface-hover text-foreground font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all active:scale-98"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all active:scale-98"
            >
              Iniciar Sesión
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
