// pages/chofer/tracking-gps.tsx
// Página móvil para que el chofer active el tracking GPS en tiempo real

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { supabase } from '../../lib/supabaseClient';
import {
  MapPinIcon,
  TruckIcon,
  PlayIcon,
  StopIcon,
  SignalIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ViajeActivo {
  id: string;
  numero_viaje: number;
  despacho: {
    origen: string;
    destino: string;
    pedido_id: string;
  };
  camion: {
    patente: string;
  };
}

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  velocidad: number;
  heading: number | null;
}

export default function TrackingGPS() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserRole();
  const [choferId, setChoferId] = useState<string | null>(null); // 🔥 NUEVO
  const [viajesActivos, setViajesActivos] = useState<ViajeActivo[]>([]);
  const [viajeSeleccionado, setViajeSeleccionado] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bateria, setBateria] = useState<number | null>(null);
  const [enviandoDatos, setEnviandoDatos] = useState(false);
  const [totalEnvios, setTotalEnvios] = useState(0);
  const [estadisticasViaje, setEstadisticasViaje] = useState<any>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gpsDataRef = useRef<GPSData | null>(null);
  const estadisticasIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar viajes activos del chofer
  useEffect(() => {
    if (user) {
      loadViajesActivos();
    }
  }, [user]);

  // Obtener nivel de batería
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBateria(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBateria(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Redireccionar si no es chofer
  useEffect(() => {
    if (!userLoading && user) {
      // Verificar si el usuario tiene rol de chofer (simplificado)
      // En producción esto ya está validado por el layout/rutas
      // Este componente solo es accesible para choferes
    }
  }, [user, userLoading, router]);

  const loadViajesActivos = async () => {
    try {
      if (!user?.id) {
        console.warn('⚠️ No hay ID de usuario');
        return;
      }

      console.log('👤 Buscando chofer con usuario_id:', user.id);

      // Buscar chofer por usuario_id
      const { data: choferData, error: choferError } = await supabase
        .from('choferes')
        .select('id, nombre, email')
        .eq('usuario_id', user.id)
        .single();

      if (choferError || !choferData) {
        console.error('❌ Chofer no encontrado en BD:', {
          error: choferError,
          user_id: user.id
        });
        setError(`No se encontró registro de chofer vinculado a tu usuario`);
        return;
      }

      console.log('✅ Chofer encontrado:', choferData);

      // 🔥 NUEVO: Guardar chofer_id en estado
      setChoferId(choferData.id);

      // Buscar viajes activos asignados al chofer
      console.log('🔍 Buscando viajes activos para chofer:', choferData.id);
      const { data: viajesData, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          estado,
          despacho_id,
          camion_id,
          chofer_id
        `)
        .eq('chofer_id', choferData.id)
        .in('estado', ['camion_asignado', 'confirmado_chofer', 'en_transito_origen', 'en_transito_destino', 'arribo_origen', 'arribo_destino'])
        .order('created_at', { ascending: false });

      console.log('📦 Viajes encontrados:', viajesData?.length || 0, viajesData);

      if (viajesError) {
        console.error('❌ Error buscando viajes:', viajesError);
        throw viajesError;
      }

      // Cargar despachos y camiones por separado para evitar problemas con joins
      const despachoIds = [...new Set(viajesData?.map(v => v.despacho_id).filter(Boolean))];
      const camionIds = [...new Set(viajesData?.map(v => v.camion_id).filter(Boolean))];

      const [despachosData, camionesData] = await Promise.all([
        despachoIds.length > 0
          ? supabase.from('despachos').select('id, origen, destino, pedido_id').in('id', despachoIds)
          : Promise.resolve({ data: [], error: null }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente').in('id', camionIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const despachosMap = new Map((despachosData.data || []).map((d: any) => [d.id, d]));
      const camionesMap = new Map((camionesData.data || []).map((c: any) => [c.id, c]));

      const viajesFormateados = (viajesData || []).map((v: any) => {
        const despacho = despachosMap.get(v.despacho_id);
        const camion = camionesMap.get(v.camion_id);
        
        return {
          id: v.id,
          numero_viaje: v.numero_viaje,
          despacho: {
            origen: despacho?.origen || 'N/A',
            destino: despacho?.destino || 'N/A',
            pedido_id: despacho?.pedido_id || 'N/A'
          },
          camion: {
            patente: camion?.patente || 'N/A'
          }
        };
      });

      setViajesActivos(viajesFormateados);

      // Auto-seleccionar el primer viaje si hay uno solo
      if (viajesFormateados.length === 1 && viajesFormateados[0]) {
        console.log('✅ Auto-seleccionando viaje:', viajesFormateados[0].id);
        setViajeSeleccionado(viajesFormateados[0].id);
      } else {
        console.log(`📋 ${viajesFormateados.length} viajes disponibles, usuario debe seleccionar uno`);
      }
    } catch (err: any) {
      console.error('Error cargando viajes:', err);
      setError('Error al cargar viajes activos');
    }
  };

  const iniciarTracking = () => {
    if (!viajeSeleccionado) {
      setError('Debes seleccionar un viaje primero');
      return;
    }

    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta GPS');
      return;
    }

    setError(null);
    setTracking(true);
    let primeraUbicacion = true;

    // Configuración de alta precisión para GPS
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // Función para enviar ubicación
    const enviarUbicacionNow = async (gpsData: GPSData) => {
      if (!viajeSeleccionado || enviandoDatos) return;

      try {
        setEnviandoDatos(true);

        console.log('📍 Enviando ubicación:', {
          viaje_id: viajeSeleccionado,
          chofer_id: choferId,
          lat: gpsData.latitude,
          lng: gpsData.longitude,
          velocidad: gpsData.velocidad,
          user_email: user?.email
        });

        const response = await fetch('/api/gps/registrar-ubicacion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            viaje_id: viajeSeleccionado,
            chofer_id: choferId, // 🔥 NUEVO: Enviar chofer_id
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            accuracy: gpsData.accuracy,
            altitude: gpsData.altitude,
            velocidad: gpsData.velocidad,
            heading: gpsData.heading,
            bateria: bateria
          })
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          console.error('❌ Error del servidor:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            user: user?.email,
            viaje: viajeSeleccionado
          });
          
          // Si es error 401, mostrar mensaje específico
          if (response.status === 401) {
            setError('Sesión expirada. Por favor, cierra sesión y vuelve a iniciar.');
            setTracking(false);
            return;
          }
          
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setTotalEnvios(prev => prev + 1);
        console.log('✅ Ubicación enviada correctamente:', result);
      } catch (err: any) {
        console.error('❌ Error enviando ubicación:', err);
        setError(`Error: ${err.message}`);
      } finally {
        setEnviandoDatos(false);
      }
    };

    // Watchear posición en tiempo real
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const velocidadMS = position.coords.speed || 0;
        const velocidadKMH = velocidadMS * 3.6; // Convertir m/s a km/h

        const newGpsData: GPSData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          velocidad: Math.round(velocidadKMH * 10) / 10,
          heading: position.coords.heading
        };

        setGpsData(newGpsData);
        gpsDataRef.current = newGpsData; // Actualizar ref para el intervalo
        setLastUpdate(new Date());

        // Enviar inmediatamente la primera ubicación
        if (primeraUbicacion) {
          primeraUbicacion = false;
          await enviarUbicacionNow(newGpsData);
        }
      },
      (err) => {
        console.error('Error GPS:', err);
        setError(`Error GPS: ${err.message}`);
        setTracking(false);
      },
      options
    );

    watchIdRef.current = watchId;

    // Enviar ubicación cada 30 segundos
    const interval = setInterval(async () => {
      if (gpsDataRef.current && viajeSeleccionado) {
        console.log('⏰ Intervalo de 30s - Enviando ubicación automática');
        await enviarUbicacionNow(gpsDataRef.current);
      }
    }, 30000);

    intervalRef.current = interval;
  };

  const detenerTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTracking(false);
  };



  // Cargar estadísticas cuando el tracking está activo
  useEffect(() => {
    if (tracking && viajeSeleccionado) {
      // Cargar estadísticas inmediatamente
      cargarEstadisticas();
      
      // Actualizar cada 60 segundos
      estadisticasIntervalRef.current = setInterval(() => {
        cargarEstadisticas();
      }, 60000);
    } else {
      if (estadisticasIntervalRef.current) {
        clearInterval(estadisticasIntervalRef.current);
        estadisticasIntervalRef.current = null;
      }
    }

    return () => {
      if (estadisticasIntervalRef.current) {
        clearInterval(estadisticasIntervalRef.current);
      }
    };
  }, [tracking, viajeSeleccionado]);

  const cargarEstadisticas = async () => {
    if (!viajeSeleccionado) return;
    
    try {
      const response = await fetch(`/api/gps/estadisticas-viaje?viaje_id=${viajeSeleccionado}`);
      if (response.ok) {
        const data = await response.json();
        if (data.tiene_datos) {
          setEstadisticasViaje(data);
        }
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      detenerTracking();
    };
  }, []);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPinIcon className="h-7 w-7" />
              Tracking GPS
            </h1>
            <p className="text-cyan-100 text-sm mt-1">Compartir ubicación en tiempo real</p>
          </div>
          <SignalIcon className={`h-8 w-8 ${tracking ? 'text-green-300 animate-pulse' : 'text-gray-300'}`} />
        </div>
      </div>

      <div className="p-2 space-y-2">
        {/* Selección de Viaje */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-cyan-400" />
            Seleccionar Viaje Activo
          </h2>

          {viajesActivos.length === 0 ? (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <p className="text-gray-400">No tienes viajes activos asignados</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {viajesActivos.map(viaje => (
                <button
                  key={viaje.id}
                  data-testid="viaje-item"
                  onClick={() => !tracking && setViajeSeleccionado(viaje.id)}
                  disabled={tracking}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    viajeSeleccionado === viaje.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                  } ${tracking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-bold">Viaje #{viaje.numero_viaje}</span>
                        <span className="text-xs bg-cyan-600 text-white px-2 py-1 rounded">
                          {viaje.camion.patente}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        <span className="text-green-400">📍 {viaje.despacho.origen}</span>
                      </p>
                      <p className="text-sm text-gray-400">
                        <span className="text-orange-400">📍 {viaje.despacho.destino}</span>
                      </p>
                    </div>
                    {viajeSeleccionado === viaje.id && (
                      <CheckCircleIcon className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel de Control */}
        {viajeSeleccionado && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-white font-semibold mb-4">Control de Tracking</h2>

            {/* Botón Principal */}
            <button
              data-testid="tracking-button"
              onClick={tracking ? detenerTracking : iniciarTracking}
              className={`w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                tracking
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {tracking ? (
                <>
                  <StopIcon className="h-6 w-6" />
                  Detener Tracking
                </>
              ) : (
                <>
                  <PlayIcon className="h-6 w-6" />
                  Iniciar Tracking
                </>
              )}
            </button>

            {/* Indicador GPS Activo */}
            {tracking && (
              <div className="mt-3 bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-center">
                <p className="text-green-400 font-bold text-sm">🛰️ GPS ACTIVO</p>
                <p className="text-gray-400 text-xs mt-1">Transmitiendo ubicación en tiempo real</p>
              </div>
            )}

            {/* Información GPS */}
            {gpsData && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-1.5" data-testid="gps-coordinates">
                  <div className="bg-gray-900 p-1.5 rounded">
                    <p className="text-gray-400 text-[9px]">Latitud</p>
                    <p className="text-white font-mono text-[10px]">{gpsData.latitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-gray-900 p-1.5 rounded">
                    <p className="text-gray-400 text-[9px]">Longitud</p>
                    <p className="text-white font-mono text-[10px]">{gpsData.longitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Velocidad</p>
                    <p className="text-white font-bold" data-testid="velocidad-actual">{gpsData.velocidad} km/h</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Precisión</p>
                    <p className="text-white">{Math.round(gpsData.accuracy)} m</p>
                  </div>
                </div>

                {/* Estado */}
                <div className="bg-gray-900 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      Última actualización
                    </span>
                    <span className="text-white text-sm">
                      {lastUpdate?.toLocaleTimeString('es-AR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <BoltIcon className="h-4 w-4" />
                      Batería
                    </span>
                    <span className={`text-sm font-bold ${
                      bateria && bateria > 20 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {bateria !== null ? `${bateria}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Ubicaciones enviadas</span>
                    <span className="text-cyan-400 font-bold" data-testid="total-envios">{totalEnvios}</span>
                  </div>
                </div>

                {/* Indicador de envío */}
                {enviandoDatos && (
                  <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                    Enviando ubicación...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Estadísticas del Viaje */}
        {estadisticasViaje && estadisticasViaje.tiene_datos && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Estadísticas del Viaje
            </h2>
            
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 p-1.5 rounded border border-blue-700">
                <p className="text-blue-400 text-xs mb-1">Distancia Recorrida</p>
                <p className="text-white text-2xl font-bold">
                  {estadisticasViaje.distancia_total_km.toFixed(1)}
                  <span className="text-sm ml-1">km</span>
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 p-1.5 rounded border border-purple-700">
                <p className="text-purple-400 text-xs mb-1">Tiempo en Ruta</p>
                <p className="text-white text-2xl font-bold">
                  {estadisticasViaje.tiempo_total_horas.toFixed(1)}
                  <span className="text-sm ml-1">hs</span>
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 p-1.5 rounded border border-orange-700">
                <p className="text-orange-400 text-xs mb-1">Velocidad Promedio</p>
                <p className="text-white text-2xl font-bold">
                  {estadisticasViaje.velocidad_promedio_kmh.toFixed(0)}
                  <span className="text-sm ml-1">km/h</span>
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 p-1.5 rounded border border-red-700">
                <p className="text-red-400 text-xs mb-1">Velocidad Máxima</p>
                <p className="text-white text-2xl font-bold">
                  {estadisticasViaje.velocidad_maxima_kmh.toFixed(0)}
                  <span className="text-sm ml-1">km/h</span>
                </p>
              </div>
            </div>

            <div className="mt-3 bg-gray-900 p-3 rounded-lg">
              <p className="text-gray-400 text-xs">
                Registros GPS: <span className="text-white font-semibold">{estadisticasViaje.total_puntos}</span>
              </p>
            </div>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-semibold">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Información */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">ℹ️ Información</h3>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Tu ubicación se envía cada 30 segundos</li>
            <li>• El tracking continúa aunque cambies de app</li>
            <li>• Mantén el GPS activado para mejor precisión</li>
            <li>• El coordinador puede ver tu ubicación en tiempo real</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
