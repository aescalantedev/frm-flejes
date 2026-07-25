import React, { useState, useRef } from 'react'
import { X, Camera, Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

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

  const handleRemoveFoto = (indexToRemove) => {
    setFotos(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (type === 'reception' && !entregadoPor.trim()) {
      showToast('El nombre de la persona que entrega es requerido', true)
      return
    }
    if (type === 'dispatch' && (!destino.trim() || !numSolicitud.trim())) {
      showToast('Destino y Nro de solicitud son requeridos', true)
      return
    }

    onConfirm({
      entregado_por: entregadoPor,
      destino,
      num_solicitud: numSolicitud,
      motivo,
      observaciones,
      fotos,
      items: []
    })

    // Reset state
    setEntregadoPor('')
    setDestino('')
    setNumSolicitud('')
    setMotivo('Consumo')
    setObservaciones('')
    setFotos([])
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
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Entregado por (Nombre / Transportista) *
              </label>
              <input 
                type="text" 
                required
                placeholder="Ej. Juan Pérez - Camión 4"
                value={entregadoPor}
                onChange={(e) => setEntregadoPor(e.target.value)}
                className="w-full bg-bg border border-border text-foreground placeholder:text-text-muted/40 rounded-xl py-2 px-3 text-xs outline-none focus:border-accent"
              />
            </div>
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
