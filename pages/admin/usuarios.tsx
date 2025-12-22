import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  ShieldCheckIcon,
  XMarkIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import WizardUsuario from '../../components/Admin/WizardUsuario';
import { TipoEmpresa, RolInterno, ROLES_BY_TIPO, ROL_INTERNO_LABELS } from '../../lib/types';

// Usuario agrupado con múltiples roles
interface UsuarioAgrupado {
  user_id: string;
  email: string;
  nombre_completo?: string;
  telefono_interno?: string;
  dni?: string;
  departamento?: string;
  created_at: string;
  last_sign_in_at?: string;
  // Roles agrupados por empresa
  empresas: {
    empresa_id: string;
    empresa_nombre: string;
    empresa_cuit: string;
    empresa_tipo: TipoEmpresa;
    roles: Array<{
      id: string; // ID del registro usuarios_empresa
      rol_interno: RolInterno;
      rol_empresa_id?: string;
      activo: boolean;
      fecha_vinculacion: string;
    }>;
  }[];
}

interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  tipo_empresa: TipoEmpresa;
  activa: boolean;
}

interface FilterState {
  empresa: string;
  rol: string;
  status: string;
  busqueda: string;
}



const UsuariosPage = () => {

  const [usuarios, setUsuarios] = useState<UsuarioAgrupado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [filters, setFilters] = useState<FilterState>({
    empresa: '',
    rol: '',
    status: '',
    busqueda: ''
  });
  
  // Estados para estadísticas
  const [stats, setStats] = useState({
    total: 0,
    totalRegistros: 0,
    activos: 0,
    inactivos: 0,
    multiRol: 0
  });

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [showAddRolModal, setShowAddRolModal] = useState(false);
  const [selectedUserForRol, setSelectedUserForRol] = useState<{user_id: string, empresa_id: string} | null>(null);
  const [newRol, setNewRol] = useState<RolInterno | ''>('');
  
  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    user_id: string;
    empresa_id: string;
    empresa_nombre: string;
    rol_id: string;
    rol_nombre: string;
    email: string;
    nombre_completo: string;
    telefono: string;
    dni: string;
    departamento: string;
  } | null>(null);
  
  // Eliminado formData/setFormData legacy modal usuario

  // Prevenir pérdida de datos si el usuario intenta salir/recargar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | void => {
      if (showModal) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requiere esto
        return '¿Estás seguro? Los datos del formulario se guardarán temporalmente.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showModal]);

  // Cargar datos al montar
  useEffect(() => {
    loadEmpresas();
    loadUsuarios();
  }, []);

  // Recalcular stats cuando cambian los usuarios
  useEffect(() => {
    calculateStats();
  }, [usuarios]);

  // Cargar empresas
  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, cuit, tipo_empresa, activa')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (err: any) {
      console.error('Error cargando empresas:', err);
    }
  };

  // Cargar usuarios y agrupar por user_id
  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todos los registros de usuarios_empresa con datos de empresa
      const { data: registros, error: errorRegistros } = await supabase
        .from('usuarios_empresa')
        .select(`
          id,
          user_id,
          empresa_id,
          rol_interno,
          rol_empresa_id,
          activo,
          fecha_vinculacion,
          nombre_completo,
          telefono_interno,
          dni,
          departamento,
          empresas (
            id,
            nombre,
            cuit,
            tipo_empresa
          )
        `)
        .order('fecha_vinculacion', { ascending: false });

      if (errorRegistros) throw errorRegistros;

      // Obtener datos de autenticación desde el API
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      let authUsersMap = new Map<string, any>();
      
      if (token) {
        try {
          const response = await fetch('/api/admin/usuarios-auth', {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const { usuarios: authUsers } = await response.json();
            authUsers?.forEach((authUser: any) => {
              authUsersMap.set(authUser.id, authUser);
            });
          } else {
            console.warn('No se pudieron cargar datos de autenticación');
          }
        } catch (err) {
          console.warn('Error obteniendo datos de autenticación:', err);
        }
      }

      // Agrupar por user_id
      const usuariosMap = new Map<string, UsuarioAgrupado>();

      registros?.forEach(registro => {
        if (!usuariosMap.has(registro.user_id)) {
          // Obtener datos de autenticación si existen
          const authData = authUsersMap.get(registro.user_id);
          
          // Crear nuevo usuario agrupado
          usuariosMap.set(registro.user_id, {
            user_id: registro.user_id,
            email: authData?.email || '',
            nombre_completo: registro.nombre_completo,
            telefono_interno: registro.telefono_interno,
            dni: registro.dni,
            departamento: registro.departamento,
            created_at: authData?.created_at || '',
            last_sign_in_at: authData?.last_sign_in_at || '',
            empresas: []
          });
        }

        const usuario = usuariosMap.get(registro.user_id)!;

        // Buscar si ya tiene esta empresa
        let empresaEntry = usuario.empresas.find(e => e.empresa_id === registro.empresa_id);
        
        // registro.empresas puede ser un objeto o un array, normalizar a objeto
        const empresaObj = Array.isArray(registro.empresas) ? registro.empresas[0] : registro.empresas;

        if (!empresaEntry && empresaObj) {
          // Agregar nueva empresa
          empresaEntry = {
            empresa_id: registro.empresa_id,
            empresa_nombre: empresaObj.nombre,
            empresa_cuit: empresaObj.cuit,
            empresa_tipo: empresaObj.tipo_empresa,
            roles: []
          };
          usuario.empresas.push(empresaEntry);
        }

        // Agregar rol a esta empresa
        if (empresaEntry) {
          empresaEntry.roles.push({
            id: registro.id,
            rol_interno: registro.rol_interno,
            rol_empresa_id: registro.rol_empresa_id,
            activo: registro.activo,
            fecha_vinculacion: registro.fecha_vinculacion
          });
        }
      });

      // Convertir Map a Array
      const usuariosArray = Array.from(usuariosMap.values());
      setUsuarios(usuariosArray);

    } catch (err: any) {
      console.error('Error cargando usuarios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calculateStats = () => {
    const totalUsuarios = usuarios.length;
    
    let totalRegistros = 0;
    let activos = 0;
    let inactivos = 0;
    let usuariosConMultiRol = 0;

    usuarios.forEach(usuario => {
      let tieneAlMenosUnRolActivo = false;
      let tieneMultiplesRoles = false;

      usuario.empresas.forEach(empresa => {
        totalRegistros += empresa.roles.length;
        
        if (empresa.roles.length > 1) {
          tieneMultiplesRoles = true;
        }

        empresa.roles.forEach(rol => {
          if (rol.activo) {
            tieneAlMenosUnRolActivo = true;
          }
        });
      });

      if (tieneAlMenosUnRolActivo) activos++;
      else inactivos++;

      if (tieneMultiplesRoles) usuariosConMultiRol++;
    });

    setStats({
      total: totalUsuarios,
      totalRegistros,
      activos,
      inactivos,
      multiRol: usuariosConMultiRol
    });
  };

  // Abrir modal para nuevo usuario (solo setShowModal)
  const handleNewUsuario = () => {
    setShowModal(true);
  };

  // Abrir modal para editar usuario existente
  const handleEditUsuario = async (usuario: UsuarioAgrupado) => {
    // Tomar la primera empresa/rol del usuario para pre-llenar
    const primeraEmpresa = usuario.empresas[0];
    const primerRol = primeraEmpresa?.roles[0];
    
    if (!primeraEmpresa || !primerRol) {
      alert('No se encontró información de empresa/rol para este usuario');
      return;
    }
    
    // Obtener nombre del rol desde roles_empresa
    let rolNombre = primerRol.rol_interno; // fallback
    if (primerRol.rol_empresa_id) {
      const { data: rolData } = await supabase
        .from('roles_empresa')
        .select('nombre_rol')
        .eq('id', primerRol.rol_empresa_id)
        .single();
      
      if (rolData) rolNombre = rolData.nombre_rol;
    }
    
    setEditingUser({
      user_id: usuario.user_id,
      empresa_id: primeraEmpresa.empresa_id,
      empresa_nombre: primeraEmpresa.empresa_nombre,
      rol_id: primerRol.rol_empresa_id || '',
      rol_nombre: rolNombre,
      email: usuario.email,
      nombre_completo: usuario.nombre_completo || '',
      telefono: usuario.telefono_interno || '',
      dni: usuario.dni || '',
      departamento: usuario.departamento || ''
    });
    setShowEditModal(true);
  };

  // Eliminadas funciones legacy de modal usuario (handleEmpresaChange, toggleRol, handleSubmit)

  // Abrir modal para agregar rol adicional
  const handleAddRol = (user_id: string, empresa_id: string) => {
    setSelectedUserForRol({ user_id, empresa_id });
    setNewRol('');
    setShowAddRolModal(true);
  };

  // Agregar rol adicional a usuario existente
  const handleSubmitNewRol = async () => {
    if (!selectedUserForRol || !newRol) {
      alert('Por favor selecciona un rol.');
      return;
    }

    try {
      setLoading(true);

      // Verificar que el rol no exista ya
      const { data: existing } = await supabase
        .from('usuarios_empresa')
        .select('id')
        .eq('user_id', selectedUserForRol.user_id)
        .eq('empresa_id', selectedUserForRol.empresa_id)
        .eq('rol_interno', newRol)
        .single();

      if (existing) {
        alert('Este usuario ya tiene ese rol en esta empresa.');
        return;
      }

      // Insertar nuevo rol
      const { error } = await supabase
        .from('usuarios_empresa')
        .insert({
          user_id: selectedUserForRol.user_id,
          empresa_id: selectedUserForRol.empresa_id,
          rol_interno: newRol,
          activo: true
        });

      if (error) throw error;

      alert(' Rol agregado exitosamente!');
      setShowAddRolModal(false);
      setSelectedUserForRol(null);
      setNewRol('');
      loadUsuarios();

    } catch (err: any) {
      console.error('Error agregando rol:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar un rol específico
  const handleDeleteRol = async (registroId: string, email: string, rol: string) => {
    if (!confirm(`¿Eliminar rol "${ROL_INTERNO_LABELS[rol as RolInterno] || rol}" de ${email}?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('usuarios_empresa')
        .delete()
        .eq('id', registroId);

      if (error) throw error;

      alert(' Rol eliminado exitosamente!');
      loadUsuarios();

    } catch (err: any) {
      console.error('Error eliminando rol:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle activo/inactivo de un rol
  const handleToggleRolActivo = async (registroId: string, currentValue: boolean) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('usuarios_empresa')
        .update({ activo: !currentValue })
        .eq('id', registroId);

      if (error) throw error;

      loadUsuarios();

    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter(usuario => {
    // Filtro por búsqueda
    if (filters.busqueda) {
      const busquedaLower = filters.busqueda.toLowerCase();
      const matchEmail = usuario.email.toLowerCase().includes(busquedaLower);
      const matchNombre = usuario.nombre_completo?.toLowerCase().includes(busquedaLower);
      if (!matchEmail && !matchNombre) return false;
    }

    // Filtro por empresa
    if (filters.empresa) {
      const tieneEmpresa = usuario.empresas.some(e => e.empresa_id === filters.empresa);
      if (!tieneEmpresa) return false;
    }

    // Filtro por rol
    if (filters.rol) {
      const tieneRol = usuario.empresas.some(e => 
        e.roles.some(r => r.rol_interno === filters.rol)
      );
      if (!tieneRol) return false;
    }

    // Filtro por status
    if (filters.status === 'activo') {
      const tieneAlgunActivo = usuario.empresas.some(e => 
        e.roles.some(r => r.activo)
      );
      if (!tieneAlgunActivo) return false;
    } else if (filters.status === 'inactivo') {
      const todosInactivos = usuario.empresas.every(e => 
        e.roles.every(r => !r.activo)
      );
      if (!todosInactivos) return false;
    }

    return true;
  });

  // Obtener roles disponibles para una empresa
  const getRolesDisponibles = (tipoEmpresa: TipoEmpresa): RolInterno[] => {
    return ROLES_BY_TIPO[tipoEmpresa] || [];
  };

  // Obtener roles disponibles para agregar (que no tenga ya)
  const getRolesDisponiblesParaAgregar = (user_id: string, empresa_id: string): RolInterno[] => {
    const usuario = usuarios.find(u => u.user_id === user_id);
    if (!usuario) return [];

    const empresaData = usuario.empresas.find(e => e.empresa_id === empresa_id);
    if (!empresaData) return [];

    const rolesActuales = empresaData.roles.map(r => r.rol_interno);
    const rolesDisponibles = getRolesDisponibles(empresaData.empresa_tipo);

    return rolesDisponibles.filter(rol => !rolesActuales.includes(rol));
  };

  return (
  <AdminLayout pageTitle="Gestión de Usuarios">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
            <p className="text-gray-300 mt-1">Administra usuarios y roles multi-empresa</p>
          </div>
          <button
            onClick={handleNewUsuario}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Usuario
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
          <div className="bg-gray-800 p-1.5 rounded shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Usuarios</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <UserIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Registros</p>
                <p className="text-2xl font-bold text-white">{stats.totalRegistros}</p>
              </div>
              <BuildingOfficeIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-white">{stats.activos}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inactivos</p>
                <p className="text-2xl font-bold text-white">{stats.inactivos}</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Multi-Rol</p>
                <p className="text-2xl font-bold text-white">{stats.multiRol}</p>
              </div>
              <ShieldCheckIcon className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 p-2 rounded shadow mb-2">
          <div className="flex items-center gap-2 mb-2">
            <FunnelIcon className="h-5 w-5 text-gray-300" />
            <span className="font-semibold text-white">Filtros</span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Buscar
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Email o nombre..."
                    value={filters.busqueda}
                    onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Empresa
                </label>
                <select
                  value={filters.empresa}
                  onChange={(e) => setFilters({ ...filters, empresa: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todas</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Rol
                </label>
                <select
                  value={filters.rol}
                  onChange={(e) => setFilters({ ...filters, rol: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todos</option>
                  {Object.entries(ROL_INTERNO_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de usuarios */}
        {loading && <p className="text-center py-8">Cargando usuarios...</p>}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Empresas y Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.user_id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-cyan-900 rounded-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {usuario.nombre_completo || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-300">{usuario.email}</div>
                          {usuario.telefono_interno && (
                            <div className="text-xs text-gray-400">{usuario.telefono_interno}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        {usuario.empresas.map((empresa) => (
                          <div key={empresa.empresa_id} className="border-l-2 border-cyan-600 pl-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium text-white">
                                {empresa.empresa_nombre}
                              </div>
                              <button
                                onClick={() => handleAddRol(usuario.user_id, empresa.empresa_id)}
                                className="text-cyan-400 hover:text-cyan-300"
                                title="Agregar rol"
                              >
                                <PlusCircleIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                              {empresa.empresa_cuit}  {empresa.empresa_tipo}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {empresa.roles.map((rol) => (
                                <div
                                  key={rol.id}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                    rol.activo
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span>{ROL_INTERNO_LABELS[rol.rol_interno] || rol.rol_interno}</span>
                                  <button
                                    onClick={() => handleToggleRolActivo(rol.id, rol.activo)}
                                    className="hover:opacity-70"
                                    title={rol.activo ? 'Desactivar' : 'Activar'}
                                  >
                                    {rol.activo ? (
                                      <CheckCircleIcon className="h-3 w-3" />
                                    ) : (
                                      <XCircleIcon className="h-3 w-3" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRol(rol.id, usuario.email, rol.rol_interno)}
                                    className="hover:text-red-600"
                                    title="Eliminar rol"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {usuario.last_sign_in_at 
                        ? new Date(usuario.last_sign_in_at).toLocaleDateString('es-AR')
                        : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditUsuario(usuario)}
                        className="text-cyan-400 hover:text-cyan-300 mr-3"
                        title="Editar usuario"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No se encontraron usuarios con los filtros aplicados.
              </div>
            )}
          </div>
        )}

        {/* Modal: Nuevo Usuario (Wizard Moderno) */}
        {showModal && (
          <WizardUsuario
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              loadUsuarios(); // Recargar usuarios tras crear uno nuevo
            }}
          />
        )}

        {/* Modal: Editar Usuario */}
        {showEditModal && editingUser && (
          <WizardUsuario
            isOpen={showEditModal}
            mode="edit"
            initialData={editingUser}
            onClose={() => {
              setShowEditModal(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingUser(null);
              loadUsuarios(); // Recargar usuarios tras editar
            }}
          />
        )}

        {/* Modal: Agregar Rol */}
        {showAddRolModal && selectedUserForRol && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Agregar Rol Adicional
                  </h2>
                  <button
                    onClick={() => setShowAddRolModal(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Selecciona un rol adicional para este usuario en esta empresa
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rol
                    </label>
                    <select
                      value={newRol}
                      onChange={(e) => setNewRol(e.target.value as RolInterno)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Seleccionar rol...</option>
                      {getRolesDisponiblesParaAgregar(selectedUserForRol.user_id, selectedUserForRol.empresa_id).map(rol => (
                        <option key={rol} value={rol}>
                          {ROL_INTERNO_LABELS[rol]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowAddRolModal(false)}
                      className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmitNewRol}
                      disabled={loading || !newRol}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Agregando...' : 'Agregar Rol'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

export default UsuariosPage;
