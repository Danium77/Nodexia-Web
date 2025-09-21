import React, { useState } from 'react';
import { useUsuariosEmpresa, useRolesEmpresa } from '../../lib/hooks/useUsuariosEmpresa';
import type { CreateUsuarioEmpresaData, UsuarioEmpresa, UpdateUsuarioEmpresaData } from '../../types/network';

interface UsuariosEmpresaManagerProps {
  onClose?: () => void;
}

export default function UsuariosEmpresaManager({ onClose }: UsuariosEmpresaManagerProps) {
  const { usuarios, loading, error, agregarUsuario, actualizarUsuario, desactivarUsuario, reactivarUsuario } = useUsuariosEmpresa();
  const { roles, loading: rolesLoading } = useRolesEmpresa();
  
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioEmpresa | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const [newUserData, setNewUserData] = useState<CreateUsuarioEmpresaData>({
    email_usuario: '',
    rol_interno: '',
    nombre_completo: '',
    email_interno: '',
    telefono_interno: '',
    departamento: ''
  });

  const [editUserData, setEditUserData] = useState<UpdateUsuarioEmpresaData>({});

  const handleAddUser = async () => {
    if (!newUserData.email_usuario || !newUserData.rol_interno || !newUserData.nombre_completo) {
      alert('Email, rol y nombre completo son obligatorios');
      return;
    }

    try {
      setProcessing(true);
      await agregarUsuario(newUserData);
      setShowAddUser(false);
      setNewUserData({
        email_usuario: '',
        rol_interno: '',
        nombre_completo: '',
        email_interno: '',
        telefono_interno: '',
        departamento: ''
      });
      alert('Usuario agregado exitosamente');
    } catch (error) {
      console.error('Error adding user:', error);
      alert(error instanceof Error ? error.message : 'Error al agregar usuario');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      setProcessing(true);
      await actualizarUsuario(editingUser.id, editUserData);
      setEditingUser(null);
      setEditUserData({});
      alert('Usuario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleUserStatus = async (usuario: UsuarioEmpresa) => {
    if (!confirm(`¿Está seguro de ${usuario.activo ? 'desactivar' : 'reactivar'} este usuario?`)) return;

    try {
      if (usuario.activo) {
        await desactivarUsuario(usuario.id);
      } else {
        await reactivarUsuario(usuario.id);
      }
      alert(`Usuario ${usuario.activo ? 'desactivado' : 'reactivado'} exitosamente`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error al cambiar estado del usuario');
    }
  };

  const startEditUser = (usuario: UsuarioEmpresa) => {
    setEditingUser(usuario);
    setEditUserData({
      rol_interno: usuario.rol_interno,
      nombre_completo: usuario.nombre_completo || '',
      email_interno: usuario.email_interno || '',
      telefono_interno: usuario.telefono_interno || '',
      departamento: usuario.departamento || '',
      fecha_ingreso: usuario.fecha_ingreso || '',
      notas: usuario.notas || ''
    });
  };

  const getRolDisplayName = (rol: string) => {
    const roleInfo = roles.find(r => r.nombre_rol === rol);
    return roleInfo ? `${roleInfo.nombre_rol} - ${roleInfo.descripcion}` : rol;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Gestión de Usuarios</h2>
            <p className="text-sm text-gray-600 mt-1">
              Administra los usuarios de tu empresa
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              Agregar Usuario
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {usuarios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className={usuario.activo ? '' : 'opacity-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {usuario.nombre_completo || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {usuario.email_interno}
                        </div>
                        {usuario.telefono_interno && (
                          <div className="text-sm text-gray-500">
                            {usuario.telefono_interno}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {usuario.rol_interno}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.departamento || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        usuario.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditUser(usuario)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(usuario)}
                          className={usuario.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        >
                          {usuario.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay usuarios registrados en la empresa
          </div>
        )}
      </div>

      {/* Modal Agregar Usuario */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Agregar Usuario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email del Usuario *
                </label>
                <input
                  type="email"
                  value={newUserData.email_usuario}
                  onChange={(e) => setNewUserData({...newUserData, email_usuario: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={newUserData.rol_interno}
                  onChange={(e) => setNewUserData({...newUserData, rol_interno: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Seleccione un rol...</option>
                  {roles.map((rol) => (
                    <option key={rol.nombre_rol} value={rol.nombre_rol}>
                      {rol.nombre_rol} - {rol.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={newUserData.nombre_completo}
                  onChange={(e) => setNewUserData({...newUserData, nombre_completo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Interno
                </label>
                <input
                  type="email"
                  value={newUserData.email_interno}
                  onChange={(e) => setNewUserData({...newUserData, email_interno: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="juan.perez@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={newUserData.telefono_interno}
                  onChange={(e) => setNewUserData({...newUserData, telefono_interno: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="+54 11 1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={newUserData.departamento}
                  onChange={(e) => setNewUserData({...newUserData, departamento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Operaciones"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddUser}
                disabled={processing}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Editar Usuario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={editUserData.rol_interno || editingUser.rol_interno}
                  onChange={(e) => setEditUserData({...editUserData, rol_interno: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {roles.map((rol) => (
                    <option key={rol.nombre_rol} value={rol.nombre_rol}>
                      {rol.nombre_rol} - {rol.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editUserData.nombre_completo ?? editingUser.nombre_completo}
                  onChange={(e) => setEditUserData({...editUserData, nombre_completo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Interno
                </label>
                <input
                  type="email"
                  value={editUserData.email_interno ?? editingUser.email_interno}
                  onChange={(e) => setEditUserData({...editUserData, email_interno: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editUserData.telefono_interno ?? editingUser.telefono_interno}
                  onChange={(e) => setEditUserData({...editUserData, telefono_interno: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={editUserData.departamento ?? editingUser.departamento}
                  onChange={(e) => setEditUserData({...editUserData, departamento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={editUserData.notas ?? editingUser.notas}
                  onChange={(e) => setEditUserData({...editUserData, notas: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditUser}
                disabled={processing}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}