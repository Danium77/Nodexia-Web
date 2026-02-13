// pages/chofer/viajes.tsx
// Dashboard del Chofer - Vista Mobile-First con GPS Tracking
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { supabase } from '../../lib/supabaseClient';
import { useGPSTracking } from '../../lib/hooks/useGPSTracking';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SignalIcon,
  SignalSlashIcon,
  MapIcon
} from '@heroicons/react/24/outline';

interface Viaje {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado_unidad: string;
  estado_carga: string;
  scheduled_local_date: string;
  scheduled_local_time: string;
  tipo_carga?: string;
  peso_estimado?: number;
  observaciones_unidad?: string;
  empresa_data?: {
    nombre: string;
  };
}

const ChoferViajesPage = () => {
  const router = useRouter();
  const { user, primaryRole, loading: userLoading } = useUserRole();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingViaje, setUpdatingViaje] = useState<string | null>(null);

  // GPS tracking solo para viaje activo en tránsito
  const shouldTrackGPS = 
    viajeActivo && 
    (viajeActivo.estado_unidad === 'en_transito_origen' || 
     viajeActivo.estado_unidad === 'en_transito_destino');

  const { isTracking, lastPosition, error: gpsError, clearError } = useGPSTracking({
    viajeId: viajeActivo?.id || '',
    enabled: !!shouldTrackGPS,
    intervalMs: 30000, // 30 segundos
    onError: (err) => console.error('GPS Error:', err),
    onSuccess: () => {}
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    if (!userLoading && primaryRole !== 'chofer') {
      router.push('/dashboard');
      return;
    }

    if (user) {
      cargarViajes();
    }
  }, [user, userLoading, primaryRole, router]);

  const cargarViajes = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ No hay sesión activa');
        return;
      }

      // Llamar a la API route que bypasea RLS
      const response = await fetch('/api/chofer/viajes', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('❌ Error API viajes:', errData);
        return;
      }

      const { viajes: viajesData, choferId } = await response.json();
      
      const viajesFormateados: Viaje[] = (viajesData || []).map(v => {
        const despacho = Array.isArray(v.despachos) ? v.despachos[0] : v.despachos;
        const camion = Array.isArray(v.camiones) ? v.camiones[0] : v.camiones;
        
        return {
          id: v.id,
          pedido_id: despacho?.pedido_id || 'N/A',
          origen: despacho?.origen || 'No especificado',
          destino: despacho?.destino || 'No especificado',
          estado_unidad: v.estado || 'pendiente',
          estado_carga: 'pendiente', // TODO: Obtener del estado_carga_viaje
          scheduled_local_date: despacho?.scheduled_local_date || '',
          scheduled_local_time: despacho?.scheduled_local_time || '',
          tipo_carga: undefined,
          peso_estimado: undefined,
          observaciones_unidad: undefined,
          empresa_data: {
            nombre: despacho?.origen || 'Sin empresa'
          }
        };
      });

      setViajes(viajesFormateados);

      // Detectar viaje activo (primer viaje no completado)
      const activo = viajesFormateados.find(v => 
        v.estado_unidad !== 'completado' && 
        v.estado_unidad !== 'cancelado'
      );
      setViajeActivo(activo || null);

    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (viajeId: string, nuevoEstado: string) => {
    if (!user?.id) return;

    try {
      setUpdatingViaje(viajeId);

      // Llamar a la API que valida permisos y actualiza
      const response = await fetch(`/api/viajes/${viajeId}/estado-unidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevo_estado: nuevoEstado,
          user_id: user.id,
          observaciones: null
        })
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.exitoso) {
        alert(resultado.mensaje || 'Error al actualizar el estado');
        return;
      }

      await cargarViajes();

    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error de conexión');
    } finally {
      setUpdatingViaje(null);
    }
  };

  const getEstadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      'pendiente': 'bg-slate-500',
      'transporte_asignado': 'bg-blue-400',
      'camion_asignado': 'bg-blue-500',
      'confirmado_chofer': 'bg-blue-600',
      'en_transito_origen': 'bg-yellow-500',
      'ingresado_origen': 'bg-orange-500',
      'llamado_carga': 'bg-yellow-600',
      'cargando': 'bg-purple-500',
      'cargado': 'bg-purple-600',
      'egreso_origen': 'bg-green-500',
      'en_transito_destino': 'bg-yellow-600',
      'ingresado_destino': 'bg-cyan-600',
      'llamado_descarga': 'bg-teal-500',
      'descargando': 'bg-purple-600',
      'descargado': 'bg-emerald-500',
      'egreso_destino': 'bg-emerald-600',
      'completado': 'bg-green-700',
      'cancelado': 'bg-red-500',
    };
    return colores[estado] || 'bg-slate-500';
  };

  const getEstadoLabel = (estado: string): string => {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'transporte_asignado': 'Transporte Asignado',
      'camion_asignado': 'Asignado',
      'confirmado_chofer': 'Confirmado',
      'en_transito_origen': '🚗 En camino a origen',
      'ingresado_origen': '✅ En planta',
      'llamado_carga': '🔔 Llamado a carga',
      'cargando': '⬆️ Cargando',
      'cargado': '📦 Cargado',
      'egreso_origen': '🚚 Listo para salir',
      'en_transito_destino': '🛣️ En camino a destino',
      'ingresado_destino': '✅ En destino',
      'llamado_descarga': '🔔 Llamado a descarga',
      'descargando': '⬇️ Descargando',
      'descargado': '✅ Descargado',
      'egreso_destino': '🚚 Egresando de destino',
      'completado': '✅ Completado',
      'cancelado': '❌ Cancelado',
    };
    return labels[estado] || estado;
  };

  const getProximasAcciones = (estadoUnidad: string) => {
    // El chofer solo puede actualizar ciertos estados
    // Control de Acceso maneja: ingreso y egreso de planta
    // Supervisor de Carga maneja: llamado, carga, finalizar carga
    const accionesPorEstado: Record<string, Array<{ label: string; valor: string }>> = {
      'camion_asignado': [
        { label: '✅ Confirmar viaje', valor: 'confirmado_chofer' }
      ],
      'confirmado_chofer': [
        { label: '🚗 Salir hacia origen', valor: 'en_transito_origen' }
      ],
      // en_transito_origen: Chofer viaja con GPS, Control Acceso registra ingreso al llegar
      // ingresado_origen, llamado_carga, cargando, cargado: Supervisor + CA manejan
      // egreso_origen: Chofer inicia viaje a destino
      'egreso_origen': [
        { label: '🚚 Salir hacia destino', valor: 'en_transito_destino' }
      ],
      // en_transito_destino: Si destino NO usa Nodexia, chofer puede registrar llegada
      'en_transito_destino': [
        { label: '📍 Llegé a destino', valor: 'ingresado_destino' }
      ],
    };

    return accionesPorEstado[estadoUnidad] || [];
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Cargando viajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header fijo */}
      <header className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <TruckIcon className="h-6 w-6 text-cyan-400" />
                Mis Viajes
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {viajes.length} {viajes.length === 1 ? 'viaje' : 'viajes'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Botón Tracking GPS */}
              <button
                onClick={() => router.push('/chofer/tracking-gps')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg"
                title="Activar Tracking GPS"
              >
                <MapIcon className="h-5 w-5 text-white" />
                <span className="text-sm font-semibold text-white">GPS</span>
              </button>

              {/* Indicador GPS */}
              {isTracking ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                  <SignalIcon className="h-4 w-4 text-green-400 animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">Activo</span>
                </div>
              ) : shouldTrackGPS && gpsError ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30">
                  <SignalSlashIcon className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Error</span>
                </div>
              ) : null}
              
              <button
                onClick={cargarViajes}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                title="Actualizar"
              >
                <ArrowPathIcon className="h-6 w-6 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Alerta de error GPS */}
          {gpsError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium">Error GPS</p>
                  <p className="text-xs text-red-400 mt-1">{gpsError}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="p-2 pb-20">
        {viajes.length === 0 ? (
          <div className="mt-8 text-center">
            <div className="bg-slate-800/50 rounded p-2 border border-slate-700">
              <TruckIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                No hay viajes asignados
              </h3>
              <p className="text-slate-400 text-sm">
                Contacta con tu coordinador para recibir asignaciones
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {viajes.map((viaje) => {
              const proximasAcciones = getProximasAcciones(viaje.estado_unidad);
              const esViajeActivo = proximasAcciones.length > 0;
              const esViajeConGPS = viaje.id === viajeActivo?.id;

              return (
                <div
                  key={viaje.id}
                  className={`bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl shadow-xl border-2 overflow-hidden transition-all ${
                    esViajeActivo
                      ? 'border-cyan-500/50 shadow-cyan-500/20'
                      : 'border-slate-700'
                  }`}
                >
                  {/* Header del viaje */}
                  <div className="p-2 bg-slate-700/30 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-white">
                        {viaje.pedido_id}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getEstadoColor(
                          viaje.estado_unidad
                        )}`}
                      >
                        {getEstadoLabel(viaje.estado_unidad)}
                      </span>
                    </div>
                    {viaje.empresa_data && (
                      <p className="text-sm text-slate-400">
                        {viaje.empresa_data.nombre}
                      </p>
                    )}

                    {/* GPS Info para viaje activo */}
                    {esViajeConGPS && isTracking && lastPosition && (
                      <div className="mt-3 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2">
                          <SignalIcon className="h-4 w-4 text-green-400" />
                          <div className="text-xs text-green-300">
                            <span className="font-medium">GPS Activo</span>
                            {lastPosition.velocidad_kmh && (
                              <span className="ml-2">• {Math.round(lastPosition.velocidad_kmh)} km/h</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Información del viaje */}
                  <div className="p-2 space-y-2">
                    {/* Origen */}
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Origen</p>
                        <p className="text-sm font-medium text-white">
                          {viaje.origen}
                        </p>
                      </div>
                    </div>

                    {/* Destino */}
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Destino</p>
                        <p className="text-sm font-medium text-white">
                          {viaje.destino}
                        </p>
                      </div>
                    </div>

                    {/* Fecha y hora */}
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Programado</p>
                        <p className="text-sm font-medium text-white">
                          {viaje.scheduled_local_date} - {viaje.scheduled_local_time}
                        </p>
                      </div>
                    </div>

                    {/* Detalles adicionales */}
                    {(viaje.tipo_carga || viaje.peso_estimado) && (
                      <div className="pt-2 border-t border-slate-700">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {viaje.tipo_carga && (
                            <div>
                              <p className="text-xs text-slate-400">Tipo</p>
                              <p className="text-white font-medium">{viaje.tipo_carga}</p>
                            </div>
                          )}
                          {viaje.peso_estimado && (
                            <div>
                              <p className="text-xs text-slate-400">Peso</p>
                              <p className="text-white font-medium">
                                {(viaje.peso_estimado / 1000).toFixed(1)} ton
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Observaciones */}
                    {viaje.observaciones_unidad && (
                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Observaciones</p>
                        <p className="text-sm text-slate-300">{viaje.observaciones_unidad}</p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  {proximasAcciones.length > 0 && (
                    <div className="p-4 bg-slate-700/20 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">
                        Próxima acción:
                      </p>
                      <div className="space-y-2">
                        {proximasAcciones.map((accion, idx) => (
                          <button
                            key={idx}
                            onClick={() => actualizarEstado(viaje.id, accion.valor)}
                            disabled={updatingViaje === viaje.id}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                          >
                            {updatingViaje === viaje.id ? (
                              <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                Actualizando...
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="h-6 w-6" />
                                {accion.label}
                              </>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Mensaje de info para estados intermedios */}
                      {viaje.estado_unidad === 'en_playa_espera' && (
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-xs text-yellow-300">
                            ⏳ <strong>Esperando llamado a carga</strong><br />
                            El supervisor de carga te indicará cuando posicionarte.
                          </p>
                        </div>
                      )}

                      {viaje.estado_unidad === 'en_proceso_carga' && (
                        <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <p className="text-xs text-purple-300">
                            ⬆️ <strong>Carga en proceso</strong><br />
                            El supervisor te notificará cuando esté completa.
                          </p>
                        </div>
                      )}

                      {viaje.estado_unidad === 'en_descarga' && (
                        <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <p className="text-xs text-purple-300">
                            ⬇️ <strong>Descarga en proceso</strong><br />
                            Espera confirmación para egresar.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Viaje completado */}
                  {!esViajeActivo && (
                    <div className="p-4 bg-slate-700/20 border-t border-slate-700">
                      <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm">Viaje completado</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-2xl">
        <div className="flex items-center justify-around py-3 px-4">
          <button className="flex flex-col items-center gap-1 text-cyan-400">
            <TruckIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Viajes</span>
          </button>
          <button
            onClick={() => alert('Función de incidencias próximamente')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ExclamationTriangleIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Incidencias</span>
          </button>
          <button
            onClick={() => router.push('/login')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ChoferViajesPage;
