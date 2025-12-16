import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  viaje_id: string | null;
  despacho_id: string | null;
  pedido_id: string | null;
  metadata: any;
  created_at: string;
  leida_at: string | null;
}

const NotificacionesDropdown: React.FC = () => {
  const { user } = useUserRole();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificaciones();
      
      // Suscribirse a cambios en tiempo real
      const subscription = supabase
        .channel('notificaciones-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificaciones',
            filter: `usuario_id=eq.${user.id}`
          },
          () => {
            loadNotificaciones();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
    return undefined;
  }, [user]);

  const loadNotificaciones = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotificaciones(data || []);
      setNoLeidas((data || []).filter(n => !n.leida).length);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  };

  const marcarComoLeida = async (notificacionId: string) => {
    try {
      const { error } = await supabase.rpc('marcar_notificacion_leida', {
        p_notificacion_id: notificacionId
      });

      if (error) throw error;

      // Actualizar estado local
      setNotificaciones(prev =>
        prev.map(n =>
          n.id === notificacionId
            ? { ...n, leida: true, leida_at: new Date().toISOString() }
            : n
        )
      );
      setNoLeidas(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marcando como leída:', err);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('marcar_todas_notificaciones_leidas');

      if (error) throw error;

      // Actualizar estado local
      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true, leida_at: new Date().toISOString() }))
      );
      setNoLeidas(0);
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      viaje_cancelado: '⚠️',
      viaje_asignado: '✅',
      viaje_reasignado: '🔄',
      recursos_asignados: '🚚',
      cambio_estado: '📊',
      mensaje_sistema: '📬'
    };
    return icons[tipo] || '📌';
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      viaje_cancelado: 'bg-red-900/20 border-red-700 text-red-400',
      viaje_asignado: 'bg-green-900/20 border-green-700 text-green-400',
      viaje_reasignado: 'bg-orange-900/20 border-orange-700 text-orange-400',
      recursos_asignados: 'bg-blue-900/20 border-blue-700 text-blue-400',
      cambio_estado: 'bg-purple-900/20 border-purple-700 text-purple-400',
      mensaje_sistema: 'bg-gray-900/20 border-gray-700 text-gray-400'
    };
    return colors[tipo] || 'bg-gray-900/20 border-gray-700 text-gray-400';
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        {noLeidas > 0 ? (
          <>
            <BellSolidIcon className="h-6 w-6 text-cyan-400" />
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {noLeidas}
            </span>
          </>
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel de notificaciones */}
          <div className="absolute right-0 mt-2 w-96 bg-[#1b273b] border border-gray-800 rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0a0e1a]">
              <div>
                <h3 className="text-white font-semibold">Notificaciones</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {noLeidas} no leída{noLeidas !== 1 ? 's' : ''}
                </p>
              </div>
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  disabled={loading}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  Marcar todas
                </button>
              )}
            </div>

            {/* Lista de notificaciones */}
            <div className="overflow-y-auto flex-1">
              {notificaciones.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {notificaciones.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-[#0a0e1a] transition-colors ${
                        !notif.leida ? 'bg-cyan-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icono */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getTipoColor(notif.tipo)}`}>
                          <span className="text-lg">{getTipoIcon(notif.tipo)}</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold ${notif.leida ? 'text-gray-400' : 'text-white'}`}>
                              {notif.titulo}
                            </h4>
                            {!notif.leida && (
                              <button
                                onClick={() => marcarComoLeida(notif.id)}
                                className="flex-shrink-0 text-cyan-400 hover:text-cyan-300"
                                title="Marcar como leída"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${notif.leida ? 'text-gray-500' : 'text-gray-300'}`}>
                            {notif.mensaje}
                          </p>
                          {notif.pedido_id && (
                            <p className="text-xs text-cyan-400 mt-2">
                              Pedido: {notif.pedido_id}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notif.created_at).toLocaleString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notificaciones.length > 0 && (
              <div className="p-3 border-t border-gray-800 bg-[#0a0e1a]">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/notificaciones';
                  }}
                  className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificacionesDropdown;
