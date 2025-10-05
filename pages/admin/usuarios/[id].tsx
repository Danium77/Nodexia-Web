import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/layout/AdminLayout';
import { supabase } from '../../../lib/supabaseClient';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface UsuarioDetalle {
  id: string;
  email: string;
  full_name: string;
  telefono?: string;
  dni?: string;
  created_at: string;
  status: 'active' | 'invited' | 'inactive';
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  empresa: {
    id: string;
    nombre: string;
    cuit: string;
    tipo_empresa: string;
    contacto_principal: string;
  };
  rol: {
    id: number;
    nombre: string;
    tipo: string;
    descripcion?: string;
  };
  perfil_empresa: {
    plan_actual?: string;
    fecha_vencimiento?: string;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ip_address?: string;
}

const UsuarioDetallePage = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [usuario, setUsuario] = useState<UsuarioDetalle | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadUsuarioDetalle();
      loadActivityLog();
    }
  }, [id]);

  const loadUsuarioDetalle = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('usuarios_empresa')
        .select(`
          *,
          empresas (
            id,
            nombre,
            cuit,
            tipo_empresa,
            contacto_principal
          ),
          roles (
            id,
            nombre,
            tipo,
            descripcion
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Usuario no encontrado');

      setUsuario(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLog = async () => {
    // TODO: Implementar log de actividad real
    // Por ahora simulamos algunos datos
    const mockActivity: ActivityLog[] = [
      {
        id: '1',
        action: 'login',
        description: 'Inicio de sesión exitoso',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ip_address: '192.168.1.100'
      },
      {
        id: '2',
        action: 'profile_update',
        description: 'Actualizó información del perfil',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        ip_address: '192.168.1.100'
      },
      {
        id: '3',
        action: 'password_change',
        description: 'Cambió la contraseña',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: '192.168.1.105'
      }
    ];
    
    setActivityLog(mockActivity);
  };

  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    if (!usuario) return;
    
    try {
      const { error } = await supabase
        .from('usuarios_empresa')
        .update({ status: newStatus })
        .eq('id', usuario.id);

      if (error) throw error;

      setUsuario(prev => prev ? { ...prev, status: newStatus } : null);
      
      // TODO: Mostrar notificación de éxito
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      // TODO: Mostrar notificación de error
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon, label: 'Activo' },
      invited: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon, label: 'Invitado' },
      inactive: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon, label: 'Inactivo' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <IconComponent className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  const getRoleBadge = (tipo: string) => {
    const roleConfig = {
      coordinador: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Coordinador' },
      transporte: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Transporte' },
      admin: { bg: 'bg-red-100', text: 'text-red-800', label: 'Administrador' }
    };

    const config = roleConfig[tipo as keyof typeof roleConfig] || { bg: 'bg-gray-100', text: 'text-gray-800', label: tipo };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="Cargando usuario...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !usuario) {
    return (
      <AdminLayout pageTitle="Error">
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error || 'Usuario no encontrado'}</span>
          <button
            onClick={() => router.push('/admin/usuarios')}
            className="mt-2 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded"
          >
            Volver a usuarios
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={`Usuario: ${usuario.full_name}`}>
      <div className="space-y-6">
        {/* Header con navegación */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/usuarios')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{usuario.full_name}</h1>
              <p className="text-gray-400">{usuario.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {getStatusBadge(usuario.status)}
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>

        {/* Información principal del usuario */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información personal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-cyan-400" />
                Información Personal
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Nombre completo</label>
                    <p className="text-white">{usuario.full_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-white">{usuario.email}</p>
                      {usuario.email_confirmed_at && (
                        <CheckCircleIcon className="h-4 w-4 text-green-400" title="Email confirmado" />
                      )}
                    </div>
                  </div>
                  
                  {usuario.telefono && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Teléfono</label>
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-white">{usuario.telefono}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {usuario.dni && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">DNI</label>
                      <div className="flex items-center gap-2">
                        <IdentificationIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-white">{usuario.dni}</p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Fecha de registro</label>
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-white">{formatDateOnly(usuario.created_at)}</p>
                    </div>
                  </div>
                  
                  {usuario.last_sign_in_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Último acceso</label>
                      <p className="text-white">{formatDate(usuario.last_sign_in_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información de la empresa */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="h-5 w-5 text-cyan-400" />
                Empresa Asociada
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Nombre de la empresa</label>
                  <p className="text-white font-medium">{usuario.empresa.nombre}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">CUIT</label>
                  <p className="text-white">{usuario.empresa.cuit}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">Tipo de empresa</label>
                  <p className="text-white capitalize">{usuario.empresa.tipo_empresa}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">Contacto principal</label>
                  <p className="text-white">{usuario.empresa.contacto_principal}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => router.push(`/admin/clientes/${usuario.empresa.id}`)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                >
                  Ver detalles completos de la empresa →
                </button>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Rol y permisos */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-cyan-400" />
                Rol y Permisos
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Rol asignado</label>
                  <div className="mt-1">
                    <p className="text-white font-medium">{usuario.rol.nombre}</p>
                    <div className="mt-2">
                      {getRoleBadge(usuario.rol.tipo)}
                    </div>
                  </div>
                </div>
                
                {usuario.rol.descripcion && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Descripción</label>
                    <p className="text-gray-300 text-sm">{usuario.rol.descripcion}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Acciones Rápidas</h2>
              
              <div className="space-y-3">
                {usuario.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange('inactive')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Desactivar Usuario
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Activar Usuario
                  </button>
                )}
                
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Reenviar Invitación
                </button>
                
                <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Restablecer Contraseña
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Log de actividad */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">Actividad Reciente</h2>
          
          <div className="space-y-3">
            {activityLog.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="h-2 w-2 bg-cyan-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(activity.timestamp)}</span>
                    {activity.ip_address && (
                      <>
                        <span>•</span>
                        <span>IP: {activity.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de edición (placeholder) */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-white mb-4">Editar Usuario</h3>
              <p className="text-gray-400 mb-6">
                Funcionalidad de edición en desarrollo...
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-white mb-4">Eliminar Usuario</h3>
              <p className="text-gray-400 mb-6">
                ¿Estás seguro de que deseas eliminar a {usuario.full_name}? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UsuarioDetallePage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};