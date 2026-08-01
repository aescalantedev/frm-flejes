import React, { useState, useEffect } from 'react'
import { Truck, Plus, Trash2, Edit2, Save, X, RefreshCw, Briefcase, Hash, Users, ShieldAlert } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { supabase } from '../lib/supabase'

export default function TransportView({ userProfile, showToast }) {
  const isAdmin = userProfile?.rol === 'Administrador'
  
  const [activeTab, setActiveTab] = useState('empresas')
  const [loading, setLoading] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, id: null, type: '', message: '' })

  // Data states
  const [empresas, setEmpresas] = useState([])
  const [placas, setPlacas] = useState([])
  const [conductores, setConductores] = useState([])

  // Form states - Create
  const [newEmpresaNombre, setNewEmpresaNombre] = useState('')
  const [newPlacaEmpresaId, setNewPlacaEmpresaId] = useState('')
  const [newPlacaRemolque, setNewPlacaRemolque] = useState('')
  const [newPlacaSemiremolque, setNewPlacaSemiremolque] = useState('')
  const [newConductorEmpresaId, setNewConductorEmpresaId] = useState('')
  const [newConductorDni, setNewConductorDni] = useState('')
  const [newConductorNombre, setNewConductorNombre] = useState('')

  // Edit states
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Empresas
      const { data: empData, error: empErr } = await supabase
        .from('empresas_transporte')
        .select('*')
        .order('nombre', { ascending: true })
      if (empErr) throw empErr
      setEmpresas(empData || [])

      // Fetch Placas
      const { data: placData, error: placErr } = await supabase
        .from('placas')
        .select(`
          id, empresa_id, placa_remolque, placa_semiremolque, created_at,
          empresas_transporte (nombre)
        `)
        .order('placa_remolque', { ascending: true })
      if (placErr) throw placErr
      setPlacas(placData || [])

      // Fetch Conductores
      const { data: condData, error: condErr } = await supabase
        .from('conductores')
        .select(`
          id, empresa_id, dni, nombre, created_at,
          empresas_transporte (nombre)
        `)
        .order('nombre', { ascending: true })
      if (condErr) throw condErr
      setConductores(condData || [])

    } catch (err) {
      console.error(err)
      showToast('Error al cargar datos de transporte', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ================= EMPRESAS CRUD =================
  const handleCreateEmpresa = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    if (!newEmpresaNombre.trim()) {
      showToast('Ingresa el nombre de la empresa', true)
      return
    }
    try {
      const { error } = await supabase
        .from('empresas_transporte')
        .insert([{ nombre: newEmpresaNombre.trim().toUpperCase() }])
      if (error) throw error
      showToast('Empresa registrada')
      setNewEmpresaNombre('')
      fetchData()
    } catch (err) {
      showToast(err.message || 'Error', true)
    }
  }

  const handleUpdateEmpresa = async () => {
    if (!editFormData.nombre?.trim()) return showToast('Nombre vacío', true)
    try {
      const { error } = await supabase
        .from('empresas_transporte')
        .update({ nombre: editFormData.nombre.trim().toUpperCase() })
        .eq('id', editingId)
      if (error) throw error
      showToast('Empresa actualizada')
      setEditingId(null)
      fetchData()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleDeleteEmpresa = (id) => {
    if (!isAdmin) return
    setConfirmConfig({
      isOpen: true,
      id,
      type: 'empresa',
      message: '¿Eliminar esta empresa? Se borrarán sus conductores y vehículos asociados en cascada.'
    })
  }

  // ================= PLACAS CRUD =================
  const handleCreatePlaca = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    if (!newPlacaEmpresaId) return showToast('Selecciona empresa', true)
    if (!newPlacaRemolque.trim()) return showToast('Ingresa placa remolque', true)
    try {
      const { error } = await supabase.from('placas').insert([{
        empresa_id: newPlacaEmpresaId,
        placa_remolque: newPlacaRemolque.trim().toUpperCase(),
        placa_semiremolque: newPlacaSemiremolque.trim().toUpperCase() || null
      }])
      if (error) throw error
      showToast('Vehículo registrado')
      setNewPlacaRemolque(''); setNewPlacaSemiremolque('')
      fetchData()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleUpdatePlaca = async () => {
    if (!editFormData.empresa_id) return showToast('Selecciona empresa', true)
    if (!editFormData.placa_remolque?.trim()) return showToast('Placa vacía', true)
    try {
      const { error } = await supabase.from('placas').update({
        empresa_id: editFormData.empresa_id,
        placa_remolque: editFormData.placa_remolque.trim().toUpperCase(),
        placa_semiremolque: editFormData.placa_semiremolque?.trim().toUpperCase() || null
      }).eq('id', editingId)
      if (error) throw error
      showToast('Vehículo actualizado')
      setEditingId(null)
      fetchData()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleDeletePlaca = (id) => {
    if (!isAdmin) return
    setConfirmConfig({
      isOpen: true,
      id,
      type: 'placa',
      message: '¿Eliminar este vehículo de forma permanente?'
    })
  }

  // ================= CONDUCTORES CRUD =================
  const handleCreateConductor = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    if (!newConductorEmpresaId) return showToast('Selecciona empresa', true)
    if (!newConductorDni.trim() || !newConductorNombre.trim()) return showToast('Faltan datos', true)
    try {
      const { error } = await supabase.from('conductores').insert([{
        empresa_id: newConductorEmpresaId,
        dni: newConductorDni.trim().toUpperCase(),
        nombre: newConductorNombre.trim().toUpperCase()
      }])
      if (error) throw error
      showToast('Conductor registrado')
      setNewConductorDni(''); setNewConductorNombre('')
      fetchData()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleUpdateConductor = async () => {
    if (!editFormData.empresa_id) return showToast('Selecciona empresa', true)
    if (!editFormData.dni?.trim() || !editFormData.nombre?.trim()) return showToast('Faltan datos', true)
    try {
      const { error } = await supabase.from('conductores').update({
        empresa_id: editFormData.empresa_id,
        dni: editFormData.dni.trim().toUpperCase(),
        nombre: editFormData.nombre.trim().toUpperCase()
      }).eq('id', editingId)
      if (error) throw error
      showToast('Conductor actualizado')
      setEditingId(null)
      fetchData()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleDeleteConductor = (id) => {
    if (!isAdmin) return
    setConfirmConfig({
      isOpen: true,
      id,
      type: 'conductor',
      message: '¿Eliminar este conductor de forma permanente?'
    })
  }

  const confirmDelete = async () => {
    const { id, type } = confirmConfig
    if (!id) return
    
    try {
      let table = ''
      if (type === 'empresa') table = 'empresas_transporte'
      if (type === 'placa') table = 'placas'
      if (type === 'conductor') table = 'conductores'
      
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      
      showToast('Registro eliminado exitosamente')
      fetchData()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  // Helper for starting edit
  const startEdit = (id, data) => {
    setEditingId(id)
    setEditFormData({ ...data })
  }

  const renderTabs = () => (
    <div className="flex border-b border-border mb-6 overflow-x-auto hide-scrollbar">
      {[
        { id: 'empresas', label: 'Empresas', icon: Briefcase },
        { id: 'placas', label: 'Vehículos / Placas', icon: Hash },
        { id: 'conductores', label: 'Conductores', icon: Users }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => { setActiveTab(tab.id); setEditingId(null) }}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors
            ${activeTab === tab.id 
              ? 'border-accent text-accent bg-accent/5' 
              : 'border-transparent text-text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-bg">
      <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-accent" />
              Gestión de Transporte
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Catálogo maestro de empresas, vehículos y conductores.
            </p>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-surface-hover hover:bg-border/60 text-text-muted hover:text-foreground text-xs font-bold px-4 py-2.5 rounded-xl border border-border cursor-pointer transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {!isAdmin && (
          <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Modo de solo lectura. No tienes permisos para modificar el catálogo.
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl shadow-xs p-2 md:p-6">
          {renderTabs()}

          {/* ================= TAB EMPRESAS ================= */}
          {activeTab === 'empresas' && (
            <div className="space-y-6 animate-fadeIn">
              {isAdmin && (
                <form onSubmit={handleCreateEmpresa} className="bg-bg/50 border border-border/60 p-4 rounded-xl flex flex-col md:flex-row gap-3">
                  <input type="text" placeholder="Nombre de la nueva empresa..." value={newEmpresaNombre} onChange={e => setNewEmpresaNombre(e.target.value)} className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground" />
                  <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0">
                    <Plus className="w-4 h-4" /> Registrar Empresa
                  </button>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-text-muted uppercase font-bold border-b border-border/60">
                    <tr><th className="px-4 py-3">ID / Creado</th><th className="px-4 py-3">Nombre de Empresa</th>{isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {empresas.map(emp => (
                      <tr key={emp.id} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3 text-text-muted">
                          <span className="font-mono text-[10px]">{emp.id.substring(0,8)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === emp.id ? (
                            <input type="text" value={editFormData.nombre || ''} onChange={e => setEditFormData({...editFormData, nombre: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground w-full" autoFocus />
                          ) : (
                            <span className="font-bold text-foreground">{emp.nombre}</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right space-x-2">
                            {editingId === emp.id ? (
                              <>
                                <button onClick={handleUpdateEmpresa} className="text-green-500 hover:text-green-400 p-1" title="Guardar"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-foreground p-1" title="Cancelar"><X className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(emp.id, emp)} className="text-text-muted hover:text-accent p-1" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteEmpresa(emp.id)} className="text-text-muted hover:text-destructive p-1" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB PLACAS ================= */}
          {activeTab === 'placas' && (
            <div className="space-y-6 animate-fadeIn">
              {isAdmin && (
                <form onSubmit={handleCreatePlaca} className="bg-bg/50 border border-border/60 p-4 rounded-xl flex flex-col md:flex-row gap-3">
                  <select value={newPlacaEmpresaId} onChange={e => setNewPlacaEmpresaId(e.target.value)} className="bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground cursor-pointer">
                    <option value="">Seleccione Empresa...</option>
                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                  </select>
                  <input type="text" placeholder="Placa Remolque" value={newPlacaRemolque} onChange={e => setNewPlacaRemolque(e.target.value)} className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground uppercase" />
                  <input type="text" placeholder="Semiremolque (Opcional)" value={newPlacaSemiremolque} onChange={e => setNewPlacaSemiremolque(e.target.value)} className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground uppercase" />
                  <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0">
                    <Plus className="w-4 h-4" /> Registrar Vehículo
                  </button>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-text-muted uppercase font-bold border-b border-border/60">
                    <tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Remolque</th><th className="px-4 py-3">Semiremolque</th>{isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {placas.map(placa => (
                      <tr key={placa.id} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3">
                          {editingId === placa.id ? (
                            <select value={editFormData.empresa_id || ''} onChange={e => setEditFormData({...editFormData, empresa_id: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground">
                              {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                            </select>
                          ) : (
                            <span className="text-foreground">{placa.empresas_transporte?.nombre}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-accent">
                          {editingId === placa.id ? (
                            <input type="text" value={editFormData.placa_remolque || ''} onChange={e => setEditFormData({...editFormData, placa_remolque: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground uppercase w-28" />
                          ) : (
                            placa.placa_remolque
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-muted">
                           {editingId === placa.id ? (
                            <input type="text" value={editFormData.placa_semiremolque || ''} onChange={e => setEditFormData({...editFormData, placa_semiremolque: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground uppercase w-28" />
                          ) : (
                            placa.placa_semiremolque || '-'
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right space-x-2">
                            {editingId === placa.id ? (
                              <>
                                <button onClick={handleUpdatePlaca} className="text-green-500 hover:text-green-400 p-1" title="Guardar"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-foreground p-1" title="Cancelar"><X className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(placa.id, placa)} className="text-text-muted hover:text-accent p-1" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeletePlaca(placa.id)} className="text-text-muted hover:text-destructive p-1" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB CONDUCTORES ================= */}
          {activeTab === 'conductores' && (
            <div className="space-y-6 animate-fadeIn">
              {isAdmin && (
                <form onSubmit={handleCreateConductor} className="bg-bg/50 border border-border/60 p-4 rounded-xl flex flex-col md:flex-row gap-3">
                  <select value={newConductorEmpresaId} onChange={e => setNewConductorEmpresaId(e.target.value)} className="bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground cursor-pointer">
                    <option value="">Seleccione Empresa...</option>
                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                  </select>
                  <input type="text" placeholder="DNI" value={newConductorDni} onChange={e => setNewConductorDni(e.target.value)} className="w-full md:w-32 bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground" />
                  <input type="text" placeholder="Nombre completo" value={newConductorNombre} onChange={e => setNewConductorNombre(e.target.value)} className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-foreground uppercase" />
                  <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0">
                    <Plus className="w-4 h-4" /> Registrar Conductor
                  </button>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-text-muted uppercase font-bold border-b border-border/60">
                    <tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">DNI</th><th className="px-4 py-3">Nombre</th>{isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {conductores.map(cond => (
                      <tr key={cond.id} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3">
                          {editingId === cond.id ? (
                            <select value={editFormData.empresa_id || ''} onChange={e => setEditFormData({...editFormData, empresa_id: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground">
                              {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                            </select>
                          ) : (
                            <span className="text-foreground">{cond.empresas_transporte?.nombre}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {editingId === cond.id ? (
                            <input type="text" value={editFormData.dni || ''} onChange={e => setEditFormData({...editFormData, dni: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground w-28" />
                          ) : (
                            cond.dni
                          )}
                        </td>
                        <td className="px-4 py-3">
                           {editingId === cond.id ? (
                            <input type="text" value={editFormData.nombre || ''} onChange={e => setEditFormData({...editFormData, nombre: e.target.value})} className="bg-bg border border-accent rounded px-2 py-1 outline-none text-foreground uppercase w-full max-w-[200px]" />
                          ) : (
                            <span className="font-bold text-foreground">{cond.nombre}</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right space-x-2">
                            {editingId === cond.id ? (
                              <>
                                <button onClick={handleUpdateConductor} className="text-green-500 hover:text-green-400 p-1" title="Guardar"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-foreground p-1" title="Cancelar"><X className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(cond.id, cond)} className="text-text-muted hover:text-accent p-1" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteConductor(cond.id)} className="text-text-muted hover:text-destructive p-1" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, id: null, type: '', message: '' })}
        onConfirm={confirmDelete}
        title="Eliminar Registro"
        message={confirmConfig.message}
      />
    </div>
  )
}
