import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';
import FormularioRol from '../../components/Admin/FormularioRol';
import {
  ShieldCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  CogIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface Rol {
  id: string;
  nombre_rol: string;
  tipo_empresa: 'coordinador' | 'transporte' | 'ambos' | 'general' | 'admin' | 'custom' | null;
  descripcion?: string;
  permisos?: any;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const RolesPagina: React.FC = () => {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    coordinador: 0,
    transporte: 0,
    ambos: 0
  });

  // Función para verificar la estructura de la base de datos
  const verificarEstructuraDB = async () => {
    try {
      console.log('🔍 Verificando estructura de la base de datos...');
      
      const { data, error } = await supabase
        .from('roles_empresa')
        .select('*')
        .limit(1);

      if (error) {
        console.error('❌ Error con tabla roles_empresa:', error);
        alert(`Error con la base de datos: ${error.message}`);
        return;
      }

      console.log('✅ Tabla roles_empresa existe y es accesible');
      alert('✅ La tabla roles_empresa está configurada correctamente');
      
    } catch (error: any) {
      console.error('❌ Error verificando BD:', error);
      alert(`Error verificando base de datos: ${error.message}`);
    }
  };

  // Función para verificar permisos de eliminación
  const verificarPermisos = async () => {
    try {
      console.log('🔍 Verificando permisos de eliminación...');
      
      const { data: testRol, error: insertError } = await supabase
        .from('roles_empresa')
        .insert({
          nombre_rol: 'TEST_ROL_TEMPORAL',
          descripcion: 'Rol de prueba para verificar permisos',
          activo: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ No se puede insertar:', insertError);
        alert('No tienes permisos de inserción en roles_empresa');
        return;
      }

      console.log('✅ Rol de prueba creado:', testRol);

      const { error: deleteError } = await supabase
        .from('roles_empresa')
        .delete()
        .eq('id', testRol.id);

      if (deleteError) {
        console.error('❌ No se puede eliminar:', deleteError);
        alert(`Error: No tienes permisos de eliminación - ${deleteError.message}`);
      } else {
        console.log('✅ Permisos de eliminación confirmados');
        alert('✅ Tienes permisos correctos para eliminar roles');
      }

    } catch (error: any) {
      console.error('❌ Error verificando permisos:', error);
      alert(`Error verificando permisos: ${error.message}`);
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('roles_empresa')
          .select('*')
          .order('nombre_rol');

        if (error) throw error;

        setRoles(data || []);
      } catch (error: any) {
        console.error('Error cargando roles:', error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    const statsData = {
      total: roles.length,
      activos: roles.filter(r => r.activo).length,
      coordinador: roles.filter(r => r.tipo_empresa === 'coordinador').length,
      transporte: roles.filter(r => r.tipo_empresa === 'transporte').length,
      ambos: roles.filter(r => r.tipo_empresa === 'ambos').length
    };
    setStats(statsData);
  }, [roles]);

  const rolesFiltrados = roles.filter(rol => {
    const matchSearch = rol.nombre_rol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (rol.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchTipo = !filtroTipo || rol.tipo_empresa === filtroTipo;
    const matchEstado = !filtroEstado || 
                       (filtroEstado === 'activo' && rol.activo) ||
                       (filtroEstado === 'inactivo' && !rol.activo);

    return matchSearch && matchTipo && matchEstado;
  });

  const handleEliminar = async (rol: Rol) => {
    try {
      console.log('🗑️ Intentando eliminar rol:', { id: rol.id, nombre: rol.nombre_rol });
      
      const { data, error } = await supabase
        .from('roles_empresa')
        .delete()
        .eq('id', rol.id)
        .select();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        alert(`Error al eliminar: ${error.message}`);
        return;
      }

      console.log('✅ Rol eliminado en DB:', data);

      // Verificar eliminación
      const { data: checkData, error: checkError } = await supabase
        .from('roles_empresa')
        .select('id')
        .eq('id', rol.id);

      if (checkError) {
        console.error('❌ Error verificando eliminación:', checkError);
      } else {
        console.log('🔍 Verificación post-eliminación:', checkData?.length === 0 ? 'Eliminado correctamente' : 'Aún existe en DB');
      }

      // Actualizar estado local
      setRoles(prevRoles => prevRoles.filter(r => r.id !== rol.id));
      setModalEliminar(false);
      setRolSeleccionado(null);
      
      alert('Rol eliminado correctamente');
    } catch (error: any) {
      console.error('❌ Error eliminando rol:', error);
      alert(`Error al eliminar el rol: ${error.message}`);
    }
  };

  const toggleActivo = async (rol: Rol) => {
    try {
      const nuevoEstado = !rol.activo;
      const { error } = await supabase
        .from('roles_empresa')
        .update({ activo: nuevoEstado })
        .eq('id', rol.id);

      if (error) throw error;

      setRoles(prevRoles => 
        prevRoles.map(r => 
          r.id === rol.id ? { ...r, activo: nuevoEstado } : r
        )
      );
    } catch (error: any) {
      console.error('Error actualizando estado del rol:', error.message);
      alert('Error al actualizar el estado del rol');
    }
  };

  const getIconoTipo = (tipo: string | null) => {
    switch (tipo) {
      case 'coordinador':
        return <CogIcon className="h-4 w-4" />;
      case 'transporte':
        return <UserGroupIcon className="h-4 w-4" />;
      case 'ambos':
        return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4" />;
      default:
        return <ShieldCheckIcon className="h-4 w-4" />;
    }
  };

  const getBadgeTipo = (tipo: string | null) => {
    if (!tipo) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-gray-900 text-gray-300 border border-gray-700">
          <ShieldCheckIcon className="h-4 w-4" />
          General
        </span>
      );
    }

    const styles = {
      coordinador: 'bg-blue-900 text-blue-300 border border-blue-700',
      transporte: 'bg-green-900 text-green-300 border border-green-700',
      ambos: 'bg-purple-900 text-purple-300 border border-purple-700',
      general: 'bg-gray-900 text-gray-300 border border-gray-700',
      admin: 'bg-red-900 text-red-300 border border-red-700',
      custom: 'bg-indigo-900 text-indigo-300 border border-indigo-700'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${styles[tipo as keyof typeof styles] || styles.general}`}>
        {getIconoTipo(tipo)}
        {tipo === 'ambos' ? 'Universal' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </span>
    );
  };

  // Convertir rol para el formulario (solo tipos compatibles)
  const convertirRolParaFormulario = (rol: Rol) => {
    if (!rol.tipo_empresa || !['coordinador', 'transporte', 'ambos'].includes(rol.tipo_empresa)) {
      return null;
    }
    return {
      id: rol.id,
      nombre_rol: rol.nombre_rol,
      tipo_empresa: rol.tipo_empresa as 'coordinador' | 'transporte' | 'ambos',
      descripcion: rol.descripcion,
      permisos: rol.permisos,
      activo: rol.activo
    };
  };

  return (
    <AdminLayout pageTitle="Roles">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Roles</h1>
            <p className="mt-2 text-gray-400">Administra los roles y permisos del sistema</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={verificarEstructuraDB}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔍 Verificar BD
            </button>
            <button
              onClick={verificarPermisos}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔑 Verificar Permisos
            </button>
            <button
              onClick={() => setModalCrear(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Crear Nuevo Rol
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Roles</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <ShieldCheckIcon className="h-8 w-8 text-gray-600" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-green-400">{stats.activos}</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Coordinador</p>
                <p className="text-2xl font-bold text-blue-400">{stats.coordinador}</p>
              </div>
              <CogIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Transporte</p>
                <p className="text-2xl font-bold text-green-400">{stats.transporte}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Universal</p>
                <p className="text-2xl font-bold text-purple-400">{stats.ambos}</p>
              </div>
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar roles por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Todos los tipos</option>
                <option value="coordinador">Coordinador</option>
                <option value="transporte">Transporte</option>
                <option value="ambos">Universal</option>
                <option value="general">General</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Roles */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ROL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      TIPO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      DESCRIPCIÓN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ESTADO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      CREADO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {rolesFiltrados.map((rol) => (
                    <tr key={rol.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                              {getIconoTipo(rol.tipo_empresa)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {rol.nombre_rol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadgeTipo(rol.tipo_empresa)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300 max-w-xs truncate">
                          {rol.descripcion || 'Sin descripción'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActivo(rol)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            rol.activo 
                              ? 'bg-green-900 text-green-300 border border-green-700 hover:bg-green-800'
                              : 'bg-red-900 text-red-300 border border-red-700 hover:bg-red-800'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-1.5 ${
                            rol.activo ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          {rol.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(rol.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRolSeleccionado(rol);
                              setModalEditar(true);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Editar rol"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setRolSeleccionado(rol);
                              setModalEliminar(true);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Eliminar rol"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rolesFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-600" />
                  <h3 className="mt-2 text-sm font-medium text-gray-300">No hay roles</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || filtroTipo || filtroEstado 
                      ? 'No se encontraron roles que coincidan con los filtros.' 
                      : 'Comienza creando un nuevo rol.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar Rol */}
      <FormularioRol
        isOpen={modalCrear || modalEditar}
        onClose={() => {
          setModalCrear(false);
          setModalEditar(false);
          setRolSeleccionado(null);
        }}
        onSuccess={async () => {
          try {
            const { data, error } = await supabase
              .from('roles_empresa')
              .select('*')
              .order('nombre_rol');

            if (error) throw error;
            setRoles(data || []);
          } catch (error: any) {
            console.error('Error recargando roles:', error.message);
          }
          
          setModalCrear(false);
          setModalEditar(false);
          setRolSeleccionado(null);
        }}
        rol={modalEditar && rolSeleccionado ? convertirRolParaFormulario(rolSeleccionado) : undefined}
      />

      {/* Modal Eliminar */}
      {modalEliminar && rolSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <TrashIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">
                  Eliminar Rol
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-300">
                ¿Estás seguro de que quieres eliminar el rol "{rolSeleccionado.nombre_rol}"? 
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalEliminar(false);
                  setRolSeleccionado(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(rolSeleccionado)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RolesPagina;

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
