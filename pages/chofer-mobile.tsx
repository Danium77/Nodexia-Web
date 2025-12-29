// pages/chofer-mobile.tsx
// Dashboard móvil para choferes - Optimizado para smartphones

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { 
  TruckIcon, 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface ViajeChofer {
  id: string;
  numero_viaje: string;
  despacho_id: string;
  estado: string;
  observaciones: string;
  despachos: {
    pedido_id: string;
    origen: string;
    destino: string;
    scheduled_local_date: string;
    scheduled_local_time: string;
    type: string;
  };
  camiones: {
    patente: string;
    marca: string;
    modelo: string;
  } | null;
}

interface UbicacionGPS {
  lat: number;
  lon: number;
  precision?: number;
  velocidad?: number;
}

export default function ChoferMobile() {
  const router = useRouter();
  const { user, primaryRole } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [viajes, setViajes] = useState<ViajeChofer[]>([]);
  const [viajeActivo, setViajeActivo] = useState<ViajeChofer | null>(null);
  const [choferData, setChoferData] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'viajes' | 'incidencias' | 'perfil'>('viajes');

  // Verificar rol de chofer
  useEffect(() => {
    if (user && primaryRole !== 'chofer') {
      router.push('/dashboard');
    }
  }, [user, primaryRole, router]);

  // Cargar datos del chofer
  useEffect(() => {
    if (user) {
      fetchChoferData();
      fetchViajes();
    }
  }, [user]);

  // Limpiar mensajes automáticamente después de 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  // Recargar viajes solo cuando volvemos al tab de viajes desde otro tab
  useEffect(() => {
    if (activeTab === 'viajes' && user) {
      // Solo recargar si han pasado más de 5 segundos desde la última carga
      const ahora = Date.now();
      const ultimaCarga = localStorage.getItem('ultima_carga_viajes');
      if (!ultimaCarga || ahora - parseInt(ultimaCarga) > 5000) {
        fetchViajes();
        localStorage.setItem('ultima_carga_viajes', ahora.toString());
      }
    }
  }, [activeTab]);

  // Detectar estado online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Obtener ubicación GPS cada 30 segundos si hay viaje activo
  useEffect(() => {
    if (!viajeActivo || (viajeActivo.estado !== 'en_transito_origen' && viajeActivo.estado !== 'en_transito_destino')) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: UbicacionGPS = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          precision: position.coords.accuracy
        };
        if (position.coords.speed !== null) {
          newLocation.velocidad = position.coords.speed;
        }
        setLocation({ lat: newLocation.lat, lon: newLocation.lon });
        // TODO: Enviar ubicación al servidor
        console.log('📍 Ubicación actualizada:', position.coords);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [viajeActivo]);

  const fetchChoferData = async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('choferes')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) throw error;
      setChoferData(data);
    } catch (error) {
      console.error('Error cargando datos del chofer:', error);
    }
  };

  const fetchViajes = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      console.log('👤 Buscando chofer con email:', user.email);
      const { data: chofer, error: choferError } = await supabase
        .from('choferes')
        .select('id')
        .eq('email', user.email)
        .single();

      if (choferError || !chofer) {
        console.error('❌ Chofer no encontrado:', choferError);
        setError('No se encontró el perfil de chofer');
        return;
      }

      console.log('✅ Chofer encontrado:', chofer.id);

      const { data, error} = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          despacho_id,
          estado,
          observaciones,
          despachos!inner (
            pedido_id,
            origen,
            destino,
            scheduled_local_date,
            scheduled_local_time,
            type
          ),
          camiones:id_camion (
            patente,
            marca,
            modelo
          )
        `)
        .eq('id_chofer', chofer.id)
        .in('estado', ['camion_asignado', 'confirmado_chofer', 'en_transito_origen', 'arribo_origen', 'en_transito_destino', 'arribo_destino', 'entregado'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map(item => ({
        ...item,
        despachos: Array.isArray(item.despachos) ? item.despachos[0] : item.despachos,
        camiones: Array.isArray(item.camiones) ? item.camiones[0] : item.camiones
      })) as ViajeChofer[];

      setViajes(transformedData);
      
      // Establecer el primer viaje como activo si existe
      if (transformedData.length > 0 && !viajeActivo) {
        setViajeActivo(transformedData[0] || null);
      }
    } catch (error: any) {
      console.error('Error cargando viajes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarViaje = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      // Llamar a la API - actualizar a confirmado_chofer (sistema dual)
      const response = await fetch('/api/viajes/actualizar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'confirmado_chofer',
          user_id: user.id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al confirmar viaje');
      }
      
      setMessage('✅ Viaje confirmado exitosamente');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'confirmado_chofer' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al confirmar viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarViaje = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      // El chofer inicia el viaje hacia origen
      const response = await fetch('/api/viajes/actualizar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'en_transito_origen',
          user_id: user.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Viaje iniciado - GPS activado');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'en_transito_origen' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al iniciar viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLlegarOrigen = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      // El chofer marca que llegó al origen
      const response = await fetch('/api/viajes/actualizar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'arribo_origen',
          user_id: user.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Llegada a origen registrada');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'arribo_origen' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al registrar llegada: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarTransitoDestino = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/viajes/actualizar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'en_transito_destino',
          user_id: user.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Viaje iniciado hacia destino');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'en_transito_destino' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al iniciar tránsito: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLlegarDestino = async () => {
    if (!viajeActivo || !user?.id) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/viajes/actualizar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: viajeActivo.id,
          nuevo_estado: 'arribo_destino',
          user_id: user.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('✅ Llegada a destino registrada');
      
      // Actualizar el viaje activo Y la lista de viajes localmente
      if (viajeActivo) {
        const viajeActualizado = { ...viajeActivo, estado: 'arribo_destino' };
        setViajeActivo(viajeActualizado);
        
        // Actualizar también en la lista de viajes
        setViajes(viajes.map(v => 
          v.id === viajeActivo.id ? viajeActualizado : v
        ));
      }
    } catch (error: any) {
      setError('Error al registrar llegada: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportarIncidencia = () => {
    // TODO: Abrir modal de incidencia
    alert('Funcionalidad de reporte de incidencias próximamente');
  };

  const handleLlamarCoordinador = () => {
    // TODO: Obtener teléfono del coordinador
    window.location.href = 'tel:+541121608941';
  };

  if (loading && viajes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando viajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-2xl sticky top-0 z-10 border-b border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                {choferData?.nombre?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  {activeTab === 'viajes' && '🚚 Mis Viajes'}
                  {activeTab === 'incidencias' && '🚨 Incidencias'}
                  {activeTab === 'perfil' && '👤 Mi Perfil'}
                </h1>
                <p className="text-xs text-slate-400">
                  {activeTab === 'viajes' && `${viajes.length} ${viajes.length === 1 ? 'viaje' : 'viajes'}`}
                  {activeTab === 'incidencias' && 'Reportar problemas'}
                  {activeTab === 'perfil' && `${choferData?.nombre} ${choferData?.apellido}`}
                </p>
              </div>
            </div>
            
            {/* Indicador de conexión */}
            <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-xs font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Selector de viajes eliminado - Chofer solo puede tener 1 viaje activo */}
        </div>
      </div>

      {/* Mensajes con animación */}
      {message && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm backdrop-blur-sm shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm backdrop-blur-sm shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Sin viajes */}
      {viajes.length === 0 && activeTab === 'viajes' && (
        <div className="text-center py-20 px-6">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-full border border-slate-700">
              <TruckIcon className="h-20 w-20 text-slate-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Sin viajes asignados</h2>
          <p className="text-slate-400 max-w-xs mx-auto">
            Cuando el coordinador te asigne un nuevo viaje, recibirás una notificación y aparecerá aquí
          </p>
        </div>
      )}

      {/* Contenido principal del viaje activo */}
      {viajeActivo && (
        <div className="p-4 space-y-4">
          {/* Tarjeta de estado actual */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded p-2 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-cyan-100 text-sm font-medium">Estado Actual</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                viajeActivo.estado === 'camion_asignado' ? 'bg-yellow-600' :
                viajeActivo.estado === 'confirmado' ? 'bg-blue-600' :
                viajeActivo.estado === 'en_curso' ? 'bg-green-600' :
                'bg-slate-600'
              } text-white`}>
                {viajeActivo.estado.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">
              Viaje #{viajeActivo.numero_viaje}
            </h2>
            <p className="text-cyan-100 text-sm">{viajeActivo.despachos.pedido_id}</p>
          </div>

          {/* Información del viaje */}
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <h3 className="text-lg font-bold text-white mb-3">Detalles del Viaje</h3>
            
            {/* Origen */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <MapPinIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">Origen</p>
                <p className="text-white font-medium">{viajeActivo.despachos.origen}</p>
              </div>
            </div>

            {/* Línea conectora */}
            <div className="ml-4 border-l-2 border-dashed border-slate-600 h-8"></div>

            {/* Destino */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <MapPinIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">Destino</p>
                <p className="text-white font-medium">{viajeActivo.despachos.destino}</p>
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-700">
              <ClockIcon className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400">Fecha programada</p>
                <p className="text-white font-medium">
                  {new Date(viajeActivo.despachos.scheduled_local_date).toLocaleDateString('es-AR')} - {viajeActivo.despachos.scheduled_local_time}
                </p>
              </div>
            </div>

            {/* Vehículo */}
            {viajeActivo.camiones && (
              <div className="flex items-center space-x-3 pt-3 border-t border-slate-700">
                <TruckIcon className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Vehículo asignado</p>
                  <p className="text-white font-medium">
                    {viajeActivo.camiones.marca} {viajeActivo.camiones.modelo} - {viajeActivo.camiones.patente}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Acciones según estado - Botones modernos */}
          <div className="space-y-3">
            {(viajeActivo.estado === 'asignado' || viajeActivo.estado === 'camion_asignado') && (
              <button
                onClick={handleConfirmarViaje}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <CheckCircleIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">✓ Confirmar Viaje</span>
              </button>
            )}

            {viajeActivo.estado === 'confirmado_chofer' && (
              <button
                onClick={handleIniciarViaje}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <TruckIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">🚚 Iniciar Viaje a Origen</span>
              </button>
            )}

            {viajeActivo.estado === 'en_transito_origen' && (
              <>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <p className="text-blue-400 font-bold text-lg">🚛 En tránsito hacia origen</p>
                  </div>
                  <p className="text-sm text-slate-300">GPS activo - Tu ubicación se está compartiendo</p>
                  {location && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      📍 {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  )}
                </div>
                
                {/* Botón deshabilitado - El arribo a origen lo registra Control de Acceso */}
                <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-xl p-4 text-center">
                  <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Esperando registro en porteria</p>
                  <p className="text-slate-400 text-xs">Control de Acceso registrará tu llegada al escanear el QR</p>
                </div>
              </>
            )}

            {viajeActivo.estado === 'arribo_origen' && (
              <button
                onClick={handleIniciarTransitoDestino}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <TruckIcon className="h-7 w-7 relative z-10" />
                <span className="relative z-10">🚛 Partir hacia Destino</span>
              </button>
            )}

            {viajeActivo.estado === 'en_transito_destino' && (
              <>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/40 rounded-xl p-5 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                    <p className="text-purple-400 font-bold text-lg">🚛 En tránsito hacia destino</p>
                  </div>
                  <p className="text-sm text-slate-300">GPS activo - Tu ubicación se está compartiendo</p>
                  {location && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      📍 {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  )}
                </div>
                
                {/* NOTA: Este botón solo debe habilitarse si el cliente destino NO usa Nodexia */}
                {/* Si el cliente destino usa Nodexia, Control de Acceso registrará el arribo */}
                {/* TODO: Agregar lógica condicional para verificar si el destino usa Nodexia */}
                <button
                  onClick={handleLlegarDestino}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  <CheckCircleIcon className="h-7 w-7 relative z-10" />
                  <span className="relative z-10">📍 Llegar a Destino</span>
                </button>
              </>
            )}

            {viajeActivo.estado === 'arribo_destino' && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/50 rounded-2xl p-8 text-center backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <span className="text-4xl">🎉</span>
                  </div>
                  <p className="text-green-400 font-bold text-2xl mb-3">Viaje completado</p>
                  <p className="text-base text-slate-200 mb-2">Has llegado al destino</p>
                  <p className="text-sm text-slate-400">El supervisor de carga registrará la descarga</p>
                </div>
              </div>
            )}

            {viajeActivo.estado === 'entregado' && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/50 rounded p-2 text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                  <span className="text-3xl">✅</span>
                </div>
                <p className="text-green-400 font-bold text-xl mb-2">¡Entrega exitosa!</p>
                <p className="text-sm text-slate-300">Excelente trabajo completado</p>
              </div>
            )}
          </div>

          {/* Botones de utilidad */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReportarIncidencia}
              className="bg-slate-700 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Incidencia</span>
            </button>

            <button
              onClick={handleLlamarCoordinador}
              className="bg-slate-700 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center space-x-2"
            >
              <PhoneIcon className="h-5 w-5" />
              <span>Llamar</span>
            </button>
          </div>

          {/* Observaciones */}
          {viajeActivo.observaciones && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-2">📝 Observaciones</h4>
              <p className="text-white text-sm">{viajeActivo.observaciones}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Incidencias */}
      {activeTab === 'incidencias' && (
        <div className="p-4 space-y-6">
          {/* Header con ícono animado */}
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-full border border-slate-700">
                <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Reportar Incidencia</h3>
            <p className="text-slate-400">¿Tienes algún problema durante el viaje?</p>
          </div>

          {/* Botones de incidencias en grid */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => alert('Funcionalidad próximamente')}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">🚨</span>
              <span className="relative z-10">Emergencia</span>
            </button>

            <button
              onClick={() => alert('Funcionalidad próximamente')}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">⚠️</span>
              <span className="relative z-10">Avería del Vehículo</span>
            </button>

            <button
              onClick={() => alert('Funcionalidad próximamente')}
              className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">⏰</span>
              <span className="relative z-10">Retraso</span>
            </button>

            <button
              onClick={() => alert('Funcionalidad próximamente')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="text-3xl relative z-10">📝</span>
              <span className="relative z-10">Otro</span>
            </button>
          </div>

          {/* Separador visual */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            <span className="text-slate-500 text-sm font-medium">o</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          </div>

          {/* Botón de llamada destacado */}
          <button
            onClick={handleLlamarCoordinador}
            className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white py-6 rounded-xl font-bold text-xl shadow-xl shadow-green-500/40 hover:shadow-2xl hover:shadow-green-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            <PhoneIcon className="h-7 w-7 relative z-10 animate-pulse" />
            <span className="relative z-10">Llamar a Coordinador</span>
          </button>
        </div>
      )}

      {/* Tab: Perfil */}
      {activeTab === 'perfil' && (
        <div className="p-4 space-y-6">
          {/* Card de perfil principal */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded p-2 border border-slate-700 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center space-x-4 mb-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-cyan-500/30">
                {choferData?.nombre?.charAt(0) || 'C'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {choferData?.nombre} {choferData?.apellido}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30">
                    Chofer Profesional
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                  <span>📧</span>
                  <span>{user?.email}</span>
                </p>
              </div>
            </div>

            {/* Información del chofer */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">🪪 DNI</span>
                </div>
                <span className="text-white font-semibold">{choferData?.dni || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">📱 Teléfono</span>
                </div>
                <span className="text-white font-semibold">{choferData?.telefono || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">🚗 Licencia</span>
                </div>
                <span className="text-white font-semibold">{choferData?.licencia_numero || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 text-sm font-semibold">🚚 Viajes Activos</span>
                </div>
                <span className="text-cyan-400 font-bold text-lg">{viajes.length}</span>
              </div>
            </div>
          </div>

          {/* Botón GPS destacado */}
          <button
            onClick={() => router.push('/chofer/tracking-gps')}
            className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            <MapPinIcon className="h-6 w-6 relative z-10" />
            <span className="relative z-10">🛰️ Activar Tracking GPS</span>
          </button>

          {/* Botón cerrar sesión */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* Navegación Inferior - Glassmorphism Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 shadow-2xl z-50">
        <div className="grid grid-cols-3 h-20 relative">
          {/* Indicador de tab activo animado */}
          <div
            className={`absolute top-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out ${
              activeTab === 'viajes' ? 'left-0 w-1/3' :
              activeTab === 'incidencias' ? 'left-1/3 w-1/3' :
              'left-2/3 w-1/3'
            }`}
          />
          
          {/* Tab Viajes */}
          <button
            onClick={() => setActiveTab('viajes')}
            className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
              activeTab === 'viajes'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-300 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'viajes' 
                ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
                : 'group-hover:bg-slate-700/30'
            }`}>
              <TruckIcon className={`h-6 w-6 ${activeTab === 'viajes' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-semibold ${activeTab === 'viajes' ? 'text-cyan-400' : 'text-slate-400'}`}>
              Viajes
            </span>
            {viajes.length > 0 && (
              <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                {viajes.length}
              </span>
            )}
          </button>

          {/* Tab Incidencias */}
          <button
            onClick={() => setActiveTab('incidencias')}
            className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
              activeTab === 'incidencias'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-300 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'incidencias' 
                ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
                : 'group-hover:bg-slate-700/30'
            }`}>
              <BellIcon className={`h-6 w-6 ${activeTab === 'incidencias' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-semibold ${activeTab === 'incidencias' ? 'text-cyan-400' : 'text-slate-400'}`}>
              Incidencias
            </span>
          </button>

          {/* Tab Perfil */}
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 relative group ${
              activeTab === 'perfil'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-300 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'perfil' 
                ? 'bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
                : 'group-hover:bg-slate-700/30'
            }`}>
              <UserCircleIcon className={`h-6 w-6 ${activeTab === 'perfil' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-semibold ${activeTab === 'perfil' ? 'text-cyan-400' : 'text-slate-400'}`}>
              Perfil
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
