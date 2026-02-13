// pages/notificaciones.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notificacion {
  id: string;
  // Tipos de notificación (NO son estados de viaje):
  // - Tipos legacy en DB: arribo_origen, arribo_destino
  // - Tipos actuales (lib/services/notificaciones.ts): viaje_asignado, llamado_carga, viaje_cancelado,
  //   viaje_completado, ingreso_confirmado, egreso_confirmado, cambio_estado, etc.
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  leida_at?: string;
  viaje_id?: string;
  despacho_id?: string;
  pedido_id?: string;
  unidad_id?: string;
  created_at: string;
}

const NotificacionesPage: React.FC = () => {
  const router = useRouter();
  const { user, primaryRole, userEmpresas } = useUserRole();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'no-leidas'>('todas');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  // Obtener nombre de la primera empresa del usuario
  const empresaNombre = userEmpresas?.[0]?.empresas?.nombre || '';

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadNotificaciones();
    subscribeToNotificaciones();
  }, [user, filter, tipoFilter]);

  const loadNotificaciones = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let query = supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filtro por leídas/no leídas
      if (filter === 'no-leidas') {
        query = query.eq('leida', false);
      }

      // Filtro por tipo
      if (tipoFilter !== 'todos') {
        query = query.eq('tipo', tipoFilter);
      }

      const { data, error } = await query;

      if (error) {
        // Si la tabla no existe, mostrar mensaje amigable
        if (error.code === '42P01') {
          console.log('Tabla notificaciones no existe aún. Ejecuta la migración 026.');
          setNotificaciones([]);
          return;
        }
        throw error;
      }

      setNotificaciones(data || []);
    } catch (err: any) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotificaciones = () => {
    if (!user) return;

    const subscription = supabase
      .channel('notificaciones_page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Cambio en notificaciones:', payload);
          loadNotificaciones();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleMarcarLeida = async (notifId: string) => {
    try {
      const response = await fetch('/api/notificaciones/marcar-leida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notificacion_id: notifId,
          user_id: user?.id 
        })
      });

      if (!response.ok) throw new Error('Error al marcar como leída');

      setNotificaciones(prev =>
        prev.map(n => (n.id === notifId ? { ...n, leida: true, leida_at: new Date().toISOString() } : n))
      );
    } catch (err: any) {
      console.error('Error marcando notificación:', err);
      alert('Error al marcar notificación como leída');
    }
  };

  const handleMarcarTodasLeidas = async () => {
    if (!confirm('¿Marcar todas las notificaciones como leídas?')) return;

    try {
      const response = await fetch('/api/notificaciones/marcar-leida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user?.id,
          marcar_todas: true
        })
      });

      if (!response.ok) throw new Error('Error al marcar todas como leídas');

      loadNotificaciones();
    } catch (err: any) {
      console.error('Error marcando todas:', err);
      alert('Error al marcar todas como leídas');
    }
  };

  const handleClickNotificacion = (notif: Notificacion) => {
    // Marcar como leída si no lo está
    if (!notif.leida) {
      handleMarcarLeida(notif.id);
    }

    // Navegar según el tipo
    if (notif.viaje_id) {
      router.push(`/transporte/tracking-flota?viaje=${notif.viaje_id}`);
    } else if (notif.despacho_id) {
      router.push(`/planificacion?despacho=${notif.despacho_id}`);
    } else if (notif.pedido_id) {
      router.push(`/pedidos?id=${notif.pedido_id}`);
    } else if (notif.unidad_id) {
      router.push(`/transporte/unidades?unidad=${notif.unidad_id}`);
    }
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'arribo_origen':     // legacy
      case 'arribo_destino':    // legacy
      case 'ingreso_confirmado':
      case 'egreso_confirmado':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'viaje_completado':
        return <CheckCircleIcon className="h-6 w-6 text-emerald-500" />;
      case 'demora':
      case 'demora_detectada':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'cambio_estado':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      case 'llamado_carga':
        return <TruckIcon className="h-6 w-6 text-orange-500" />;
      case 'viaje_asignado':
      case 'despacho_asignado':
        return <TruckIcon className="h-6 w-6 text-indigo-500" />;
      case 'viaje_cancelado':
        return <XMarkIcon className="h-6 w-6 text-red-500" />;
      case 'recepcion_nueva':
      case 'documentacion_rechazada':
        return <DocumentTextIcon className="h-6 w-6 text-purple-500" />;
      case 'unidad_modificada':
        return <TruckIcon className="h-6 w-6 text-cyan-500" />;
      case 'alerta_gps':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  if (!user) return null;

  return (
    <AdminLayout pageTitle="Notificaciones">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Notificaciones
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas ✓'}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarcarTodasLeidas}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <CheckIcon className="h-5 w-5" />
              Marcar todas leídas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('todas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'todas'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('no-leidas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'no-leidas'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              No leídas {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
          >
            <option value="todos">Todos los tipos</option>
            <option value="arribo_origen">Arribos a origen</option>
            <option value="arribo_destino">Arribos a destino</option>
            <option value="demora">Demoras</option>
            <option value="cambio_estado">Cambios de estado</option>
            <option value="recepcion_nueva">Recepciones nuevas</option>
            <option value="unidad_modificada">Unidades modificadas</option>
            <option value="alerta_gps">Alertas GPS</option>
            <option value="despacho_asignado">Despachos asignados</option>
          </select>
        </div>

        {/* Lista de notificaciones */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando notificaciones...</p>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {filter === 'no-leidas' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClickNotificacion(notif)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  notif.leida
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300 dark:border-cyan-700 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icono */}
                  <div className="flex-shrink-0 mt-1">
                    {getIconoTipo(notif.tipo)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold ${notif.leida ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {notif.titulo}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notif.mensaje}
                    </p>
                    {notif.leida && notif.leida_at && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Leída {formatDistanceToNow(new Date(notif.leida_at), { addSuffix: true, locale: es })}
                      </p>
                    )}
                  </div>

                  {/* Botón marcar como leída */}
                  {!notif.leida && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarcarLeida(notif.id);
                      }}
                      className="flex-shrink-0 p-2 text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
                      title="Marcar como leída"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mensaje si no existe la tabla */}
        {!loading && notificaciones.length === 0 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Nota:</strong> Si no ves notificaciones, asegúrate de haber ejecutado la migración SQL 026 (sistema de notificaciones).
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotificacionesPage;
