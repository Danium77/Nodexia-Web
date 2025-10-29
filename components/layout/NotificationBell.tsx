import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  viaje_id?: string;
  despacho_id?: string;
  pedido_id?: string;
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const { user } = useUserRole();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotificaciones();
      subscribeToNotificaciones();
    }

    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const loadNotificaciones = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Si la tabla no existe aún, simplemente no mostrar error
        if (error.code === '42P01') {
          console.log('Tabla notificaciones aún no creada');
          return;
        }
        throw error;
      }

      setNotificaciones(data || []);
      setUnreadCount(data?.filter(n => !n.leida).length || 0);
    } catch (err: any) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotificaciones = () => {
    if (!user) return;

    const subscription = supabase
      .channel('notificaciones_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Nueva notificación:', payload);
          setNotificaciones(prev => [payload.new as Notificacion, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar notificación nativa del navegador si está permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = payload.new as Notificacion;
            new Notification(notif.titulo, {
              body: notif.mensaje,
              icon: '/favicon.ico',
              badge: '/favicon.ico'
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleMarcarComoLeida = async (notifId: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('id', notifId);

      if (error) throw error;

      setNotificaciones(prev =>
        prev.map(n => (n.id === notifId ? { ...n, leida: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marcando notificación:', err);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .eq('leida', false);

      if (error) throw error;

      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marcando todas como leídas:', err);
    }
  };

  const handleEliminarNotificacion = async (notifId: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .delete()
        .eq('id', notifId);

      if (error) throw error;

      setNotificaciones(prev => prev.filter(n => n.id !== notifId));
      setUnreadCount(prev => {
        const notif = notificaciones.find(n => n.id === notifId);
        return notif && !notif.leida ? Math.max(0, prev - 1) : prev;
      });
    } catch (err: any) {
      console.error('Error eliminando notificación:', err);
    }
  };

  const getIconByTipo = (tipo: string) => {
    switch (tipo) {
      case 'nuevo_despacho':
      case 'asignacion_viaje':
        return <TruckIcon className="h-5 w-5 text-blue-400" />;
      case 'cambio_estado':
      case 'viaje_completado':
        return <CheckIcon className="h-5 w-5 text-green-400" />;
      case 'documento_subido':
        return <DocumentTextIcon className="h-5 w-5 text-yellow-400" />;
      case 'alerta':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      case 'recordatorio':
        return <ClockIcon className="h-5 w-5 text-orange-400" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)}d`;
    return new Date(date).toLocaleDateString('es-AR');
  };

  const handleNotificationClick = (notif: Notificacion) => {
    // Marcar como leída
    if (!notif.leida) {
      handleMarcarComoLeida(notif.id);
    }
    
    // Cerrar dropdown
    setIsOpen(false);
    
    // Navegar si tiene viaje_id
    if (notif.viaje_id) {
      // TODO: Navegar a detalle del viaje
      console.log('Navegar a viaje:', notif.viaje_id);
    }
  };

  // Solicitar permiso para notificaciones del navegador
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notificaciones"
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-6 w-6 text-cyan-400" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Badge de conteo */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[#1b273b] rounded-lg shadow-xl border border-gray-800 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-white font-bold text-lg">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarcarTodasLeidas}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                Cargando notificaciones...
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {notificaciones.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-[#0a0e1a] transition-colors cursor-pointer ${
                      !notif.leida ? 'bg-cyan-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className="flex-shrink-0 mt-1">
                        {getIconByTipo(notif.tipo)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${
                            !notif.leida ? 'text-white' : 'text-gray-300'
                          }`}>
                            {notif.titulo}
                          </p>
                          {!notif.leida && (
                            <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {notif.mensaje}
                        </p>
                        {notif.pedido_id && (
                          <p className="text-xs text-cyan-400 mt-1">
                            Pedido: {notif.pedido_id}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(notif.created_at)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarNotificacion(notif.id);
                            }}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Eliminar notificación"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="p-3 border-t border-gray-800 text-center">
              <Link
                href="/notificaciones"
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
