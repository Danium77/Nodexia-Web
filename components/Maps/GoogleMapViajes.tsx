// components/Maps/GoogleMapViajes.tsx
// Componente de mapa con Leaflet para tracking de viajes en tiempo real

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Navigation, Activity, Clock, Gauge } from 'lucide-react';
import { EstadoDualBadge } from '@/components/ui/EstadoDualBadge';

// Importar Leaflet dinámicamente para evitar problemas con SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Crear icono personalizado de camión con rotación
const createTruckIcon = (estado: string, heading?: number | null, velocidad?: number) => {
  if (typeof window === 'undefined') return undefined;
  
  const L = require('leaflet');
  
  // Colores según estado - más vibrantes y contrastantes
  const colorMap: Record<string, string> = {
    'pendiente': '#9ca3af',
    'camion_asignado': '#3b82f6',
    'confirmado_chofer': '#10b981',
    'en_transito_origen': '#a855f7',
    'arribo_origen': '#06b6d4',
    'en_transito_destino': '#f59e0b',
    'arribo_destino': '#14b8a6',
    'completado': '#22c55e',
    'cancelado': '#ef4444'
  };
  
  const color = colorMap[estado] || '#3b82f6';
  
  // Calcular rotación: heading (0° = Norte, 90° = Este)
  const rotation = heading !== null && heading !== undefined ? heading : 0;
  
  // Indicador de movimiento (pulso si hay velocidad > 5 km/h)
  const isMoving = velocidad && velocidad > 5;

  return L.divIcon({
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 4px 16px ${color}99;
          }
          50% { 
            box-shadow: 0 4px 20px ${color}cc;
          }
        }
      </style>
      <div style="position: relative; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
        <!-- Círculo con gradiente y borde blanco -->
        <div style="
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          border-radius: 50%;
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px ${color}99;
          border: 3px solid #fff;
          position: relative;
          ${isMoving ? 'animation: glow 2s ease-in-out infinite;' : ''}
        ">
          <!-- Emoji de camión -->
          <span style="
            font-size: 24px;
            transform: rotate(${rotation}deg);
            display: inline-block;
            transition: transform 0.5s ease-out;
          ">🚛</span>
          
          ${isMoving ? `
          <!-- Indicador de movimiento (punto verde pulsante) -->
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #10b981;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #fff;
            animation: pulse 2s ease-in-out infinite;
          "></div>
          ` : ''}
        </div>
      </div>
    `,
    className: 'custom-truck-icon',
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
};

interface Ubicacion {
  lat: number;
  lng: number;
  timestamp?: string;
  velocidad?: number;
  heading?: number | null;
}

interface UbicacionHistorica {
  latitude: number;
  longitude: number;
  velocidad: number;
  heading: number | null;
  timestamp: string;
}

interface EstadisticasViaje {
  distancia_total_km: number;
  velocidad_promedio_kmh: number;
  velocidad_maxima_kmh: number;
  tiempo_total_horas: number;
  total_puntos: number;
}

interface ViajeEnMapa {
  id: number;
  patente_camion: string;
  chofer_nombre: string;
  origen: string;
  destino: string;
  estado_unidad_viaje: string;
  estado_carga_viaje: string;
  ubicacion_actual?: Ubicacion;
  ubicacion_origen?: Ubicacion;
  ubicacion_destino?: Ubicacion;
}

interface GoogleMapViajesProps {
  viajes: ViajeEnMapa[];
  viajeSeleccionado?: number | null;
  onViajeClick?: (viajeId: number) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // en milisegundos
  showHistorico?: boolean; // Mostrar ruta histórica
  showEstadisticas?: boolean; // Mostrar estadísticas de viaje
  className?: string;
  onUbicacionesActualizadas?: () => void;
}

export function GoogleMapViajes({
  viajes,
  viajeSeleccionado: _viajeSeleccionado,
  onViajeClick,
  autoRefresh = true,
  refreshInterval = 30000,
  showHistorico = true,
  showEstadisticas = true,
  className = '',
  onUbicacionesActualizadas
}: GoogleMapViajesProps) {
  const [center, setCenter] = useState<[number, number]>([-34.6037, -58.3816]);
  const [mounted, setMounted] = useState(false);
  const [ubicacionesHistoricas, setUbicacionesHistoricas] = useState<Record<number, UbicacionHistorica[]>>({});
  const [estadisticas, setEstadisticas] = useState<Record<number, EstadisticasViaje>>({});
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcular centro del mapa basado en viajes
  useEffect(() => {
    if (viajes.length > 0) {
      const ubicaciones = viajes
        .map(v => v.ubicacion_actual)
        .filter((u): u is Ubicacion => u !== undefined && u !== null && typeof u.lat === 'number' && typeof u.lng === 'number');

      if (ubicaciones.length > 0) {
        const avgLat = ubicaciones.reduce((sum, u) => sum + u.lat, 0) / ubicaciones.length;
        const avgLng = ubicaciones.reduce((sum, u) => sum + u.lng, 0) / ubicaciones.length;
        setCenter([avgLat, avgLng]);
      }
    }
  }, [viajes]);

  // Cargar historial de ubicaciones cuando hay viajes seleccionados
  useEffect(() => {
    if (showHistorico && viajes.length > 0) {
      cargarHistoricoUbicaciones();
    }
  }, [viajes.map(v => v.id).join(','), showHistorico]); // Solo recargar si cambian los IDs

  // Cargar estadísticas cuando hay viajes
  useEffect(() => {
    if (showEstadisticas && viajes.length > 0) {
      cargarEstadisticas();
    }
  }, [viajes.map(v => v.id).join(','), showEstadisticas]); // Solo recargar si cambian los IDs

  const cargarHistoricoUbicaciones = async () => {
    try {
      const historico: Record<number, UbicacionHistorica[]> = {};
      
      for (const viaje of viajes) {
        const response = await fetch(`/api/gps/ubicaciones-historicas?viaje_id=${viaje.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ubicaciones && data.ubicaciones.length > 0) {
            historico[viaje.id] = data.ubicaciones;
          }
        }
      }
      
      setUbicacionesHistoricas(historico);
    } catch (error) {
      console.error('Error cargando histórico de ubicaciones:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const stats: Record<number, EstadisticasViaje> = {};
      
      for (const viaje of viajes) {
        const response = await fetch(`/api/gps/estadisticas-viaje?viaje_id=${viaje.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.tiene_datos) {
            stats[viaje.id] = {
              distancia_total_km: data.distancia_total_km,
              velocidad_promedio_kmh: data.velocidad_promedio_kmh,
              velocidad_maxima_kmh: data.velocidad_maxima_kmh,
              tiempo_total_horas: data.tiempo_total_horas,
              total_puntos: data.total_puntos
            };
          }
        }
      }
      
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // Auto-refresh de ubicaciones
  useEffect(() => {
    if (!autoRefresh) {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      return;
    }

    autoRefreshIntervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refresh de ubicaciones GPS');
      if (onUbicacionesActualizadas) {
        onUbicacionesActualizadas();
      }
      // Recargar histórico y estadísticas también
      if (showHistorico && viajes.length > 0) {
        cargarHistoricoUbicaciones();
      }
      if (showEstadisticas && viajes.length > 0) {
        cargarEstadisticas();
      }
    }, refreshInterval);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]); // Reducir dependencias para evitar reinicios constantes

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} style={{ height: '100%' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col`}>
      <div style={{ height: '100%', width: '100%', position: 'relative', flex: 1 }}>
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Polylines (rutas históricas) */}
          {showHistorico && Object.entries(ubicacionesHistoricas).map(([viajeId, ubicaciones]) => {
            if (ubicaciones.length < 2) return null;
            
            const positions: [number, number][] = ubicaciones.map(u => [u.latitude, u.longitude]);
            
            return (
              <Polyline
                key={`polyline-${viajeId}`}
                positions={positions}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 3,
                  opacity: 0.6,
                  dashArray: '10, 10'
                }}
              />
            );
          })}

          {/* Markers de camiones */}
          {viajes.map((viaje) => {
            if (!viaje.ubicacion_actual) return null;

            const icon = createTruckIcon(
              viaje.estado_unidad_viaje,
              viaje.ubicacion_actual.heading,
              viaje.ubicacion_actual.velocidad
            );

            const stats = estadisticas[viaje.id];

            return (
              <Marker
                key={`viaje-${viaje.id}`}
                position={[viaje.ubicacion_actual.lat, viaje.ubicacion_actual.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (onViajeClick) {
                      onViajeClick(viaje.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[280px]">
                    <div className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      {viaje.patente_camion}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Navigation className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-semibold">Chofer:</p>
                          <p className="text-gray-700">{viaje.chofer_nombre}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Origen:</p>
                          <p className="text-gray-700">{viaje.origen}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Destino:</p>
                          <p className="text-gray-700">{viaje.destino}</p>
                        </div>
                      </div>

                      {/* Datos GPS en tiempo real */}
                      {viaje.ubicacion_actual && (
                        <div className="pt-2 border-t space-y-1">
                          <p className="font-semibold text-xs text-gray-500">GPS en tiempo real:</p>
                          <div className="flex items-center gap-2">
                            <Gauge className="w-3 h-3 text-purple-600" />
                            <span className="text-xs">
                              {viaje.ubicacion_actual.velocidad?.toFixed(0) || 0} km/h
                            </span>
                          </div>
                          {viaje.ubicacion_actual.heading !== null && viaje.ubicacion_actual.heading !== undefined && (
                            <div className="flex items-center gap-2">
                              <Navigation className="w-3 h-3 text-blue-600" />
                              <span className="text-xs">
                                Dirección: {viaje.ubicacion_actual.heading.toFixed(0)}°
                              </span>
                            </div>
                          )}
                          {viaje.ubicacion_actual.timestamp && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-gray-600" />
                              <span className="text-xs">
                                {new Date(viaje.ubicacion_actual.timestamp).toLocaleTimeString('es-AR')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Estadísticas del viaje */}
                      {stats && (
                        <div className="pt-2 border-t space-y-1">
                          <p className="font-semibold text-xs text-gray-500 mb-1">Estadísticas del viaje:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3 text-green-600" />
                              <span>{stats.distancia_total_km.toFixed(1)} km</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span>{stats.tiempo_total_horas.toFixed(1)} hs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-orange-600" />
                              <span>Prom: {stats.velocidad_promedio_kmh.toFixed(0)} km/h</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-red-600" />
                              <span>Máx: {stats.velocidad_maxima_kmh.toFixed(0)} km/h</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <p className="font-semibold mb-1 text-xs">Estado:</p>
                        <div className="space-y-1">
                          <EstadoDualBadge
                            tipo="unidad"
                            estado={viaje.estado_unidad_viaje as any}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
