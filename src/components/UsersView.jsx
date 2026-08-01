import React, { useState, useEffect } from 'react'
import { User, Shield, Check, RefreshCw, Trash2, Edit2, Save, X } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { supabase } from '../lib/supabase'

export default function UsersView({ userProfile, showToast }) {
  const [profilesList, setProfilesList] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, userId: null, userName: '' })

  const fetchProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (!error && data) {
        setProfilesList(data)
      }
    } catch (err) {
      console.error(err)
      showToast('Error al cargar usuarios', true)
    } finally {
      setLoadingProfiles(false)
    }
  }

  useEffect(() => {
    if (userProfile?.rol === 'Administrador') {
      fetchProfiles()
    }
  }, [userProfile])

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ rol: newRole })
        .eq('id', userId)
      if (error) throw error
      showToast('Rol de usuario actualizado con éxito')
      fetchProfiles()
    } catch (err) {
      console.error(err)
      showToast('Error al actualizar rol de usuario', true)
    }
  }

  const handleToggleUserApproval = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ aprobado: !currentStatus })
        .eq('id', userId)
      if (error) throw error
      showToast(`Usuario ${!currentStatus ? 'aprobado' : 'desactivado'} con éxito`)
      fetchProfiles()
    } catch (err) {
      console.error(err)
      showToast('Error al actualizar estado del usuario', true)
    }
  }

  const handleDeleteUser = (userId, userName) => {
    setConfirmConfig({ isOpen: true, userId, userName })
  }

  const confirmDelete = async () => {
    const { userId } = confirmConfig
    if (!userId) return
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
      if (error) throw error
      showToast('Usuario eliminado exitosamente')
      fetchProfiles()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al eliminar usuario', true)
    }
  }

  const handleSaveName = async (userId) => {
    if (!editName.trim()) {
      showToast('El nombre no puede estar vacío', true)
      return
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editName.trim().toUpperCase() })
        .eq('id', userId)
      if (error) throw error
      showToast('Nombre actualizado exitosamente')
      setEditingUserId(null)
      fetchProfiles()
    } catch (err) {
      console.error(err)
      showToast('Error al actualizar nombre', true)
    }
  }

  if (userProfile?.rol !== 'Administrador') {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-bg flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4 opacity-80" />
          <h2 className="text-lg font-bold text-foreground">Acceso Denegado</h2>
          <p className="text-text-muted mt-2">Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-bg">
      <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent" />
              Usuarios y Roles
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Administra los permisos, roles y acceso de los operadores de la planta.
            </p>
          </div>
          <button
            onClick={fetchProfiles}
            disabled={loadingProfiles}
            className="flex items-center gap-2 bg-surface-hover hover:bg-border/60 text-text-muted hover:text-foreground text-xs font-bold px-4 py-2.5 rounded-xl border border-border cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingProfiles ? 'animate-spin' : ''}`} />
            {loadingProfiles ? 'Actualizando...' : 'Refrescar Lista'}
          </button>
        </div>

        {/* Content */}
        <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-0 overflow-x-auto">
            {loadingProfiles && profilesList.length === 0 ? (
              <div className="p-12 text-center text-text-muted flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-accent mb-3" />
                <p className="text-sm">Cargando usuarios...</p>
              </div>
            ) : profilesList.length === 0 ? (
              <div className="p-12 text-center text-text-muted flex flex-col items-center justify-center">
                <User className="w-8 h-8 opacity-50 mb-3" />
                <p className="text-sm">No hay usuarios registrados</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-surface-hover text-text-muted uppercase font-bold border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rol actual</th>
                    <th className="px-4 py-3">Estado de acceso</th>
                    <th className="px-4 py-3">Fecha de registro</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {profilesList.map((user) => {
                    const isEditing = editingUserId === user.id
                    return (
                      <tr key={user.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0">
                              <User className="w-4 h-4 text-accent" />
                            </div>
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="bg-bg border border-accent rounded px-2 py-1 text-xs w-full max-w-[200px] outline-none text-foreground"
                                  autoFocus
                                />
                              ) : (
                                <p className="font-bold text-foreground truncate">{user.name || 'Sin nombre'}</p>
                              )}
                              
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleSaveName(user.id)} className="text-green-500 hover:text-green-400 p-1" title="Guardar">
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setEditingUserId(null)} className="text-text-muted hover:text-foreground p-1" title="Cancelar">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingUserId(user.id); setEditName(user.name || '') }} className="text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" title="Editar Nombre">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{user.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={user.rol || 'Operador'}
                            onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                            disabled={user.id === userProfile?.id}
                            className={`
                              bg-bg border border-border text-xs rounded-xl px-2 py-1.5 outline-none focus:border-accent
                              ${user.id === userProfile?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}
                              ${user.rol === 'Administrador' ? 'text-accent font-bold' : 'text-foreground'}
                            `}
                          >
                            <option value="Operador">Operador</option>
                            <option value="Administrador">Administrador</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleUserApproval(user.id, user.aprobado)}
                            disabled={user.id === userProfile?.id}
                            className={`
                              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors
                              ${user.id === userProfile?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
                              ${user.aprobado 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }
                            `}
                          >
                            {user.aprobado ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            {user.aprobado ? 'Aprobado' : 'Suspendido'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <button
                             onClick={() => handleDeleteUser(user.id, user.name)}
                             disabled={user.id === userProfile?.id}
                             className="p-1.5 text-text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Eliminar Usuario"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, userId: null, userName: '' })}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de eliminar PERMANENTEMENTE al usuario ${confirmConfig.userName || 'seleccionado'}? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
