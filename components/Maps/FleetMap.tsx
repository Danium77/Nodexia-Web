import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Unidad {
  id: string;
  nombre: string;
  codigo: string;
  chofer_nombre: string;
  chofer_apellido: string;
  camion_patente: string;
  ubicacion?: {
    lat: number;
    lng: number;
    timestamp?: string;
  };
  estado?: string;
  horas_conducidas_hoy?: number;
}

interface FleetMapProps {
  unidades: Unidad[];
  height?: string;
  centerLocation?: { lat: number; lng: number };
  onUnidadClick?: (unidadId: string) => void;
  className?: string;
}

export default function FleetMap({
  unidades,
  height = '600px',
  centerLocation,
  onUnidadClick,
  className = ''
}: FleetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<Map<string, google.maps.Marker>>(new Map());
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Inicializar mapa
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key no configurada');
      setLoading(false);
      return;
    }

    if (!mapRef.current) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    (loader as any)
      .importLibrary('maps')
      .then(() => {
        if (!mapRef.current) return;

        // Centro por defecto: Argentina (Buenos Aires)
        const defaultCenter = centerLocation || { lat: -34.6037, lng: -58.3816 };

        // Crear mapa usando el constructor global de google.maps
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 6,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ color: '#1f2937' }]
            },
            {
              featureType: 'all',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#9ca3af' }]
            },
            {
              featureType: 'all',
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#111827' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#1e3a8a' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#374151' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ color: '#4b5563' }]
            }
          ]
        });

        setMap(mapInstance);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError('Error al cargar el mapa');
        setLoading(false);
      });

    // Cleanup
    return () => {
      markers.forEach((marker) => marker.setMap(null));
      setMarkers(new Map());
      setMap(null);
    };
  }, [centerLocation]);

  // Actualizar marcadores cuando cambien las unidades
  useEffect(() => {
    if (!map) return;

    // Obtener las unidades con ubicación
    const unidadesConUbicacion = unidades.filter((u) => u.ubicacion);

    // Limpiar marcadores que ya no existen
    const currentIds = new Set(unidadesConUbicacion.map((u) => u.id));
    markers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markers.delete(id);
      }
    });

    // Crear/actualizar marcadores
    unidadesConUbicacion.forEach((unidad) => {
      if (!unidad.ubicacion) return;

      const position = {
        lat: unidad.ubicacion.lat,
        lng: unidad.ubicacion.lng
      };

      // Determinar color según estado
      let color = '#6366f1'; // Indigo por defecto
      if (unidad.estado === 'en_transito_origen' || unidad.estado === 'en_transito_destino') {
        color = '#10b981'; // Verde - en tránsito
      } else if (unidad.estado === 'arribo_origen' || unidad.estado === 'arribo_destino') {
        color = '#f59e0b'; // Amarillo - arribado
      } else if (unidad.estado === 'carga_completada' || unidad.estado === 'descarga_completada') {
        color = '#3b82f6'; // Azul - completado
      }

      // Verificar si ya existe el marcador
      let marker = markers.get(unidad.id);

      if (marker) {
        // Actualizar posición del marcador existente
        marker.setPosition(position);
      } else {
        // Crear nuevo marcador
        marker = new google.maps.Marker({
          position,
          map,
          title: `${unidad.nombre} (${unidad.camion_patente})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          },
          animation: google.maps.Animation.DROP
        });

        // Info window
        const infoContent = `
          <div style="color: #1f2937; min-width: 200px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
              🚛 ${unidad.nombre}
            </h3>
            <div style="font-size: 14px; line-height: 1.6;">
              <p><strong>Código:</strong> ${unidad.codigo || 'N/A'}</p>
              <p><strong>Chofer:</strong> ${unidad.chofer_nombre} ${unidad.chofer_apellido}</p>
              <p><strong>Patente:</strong> ${unidad.camion_patente}</p>
              ${unidad.estado ? `<p><strong>Estado:</strong> ${unidad.estado}</p>` : ''}
              ${
                unidad.horas_conducidas_hoy !== undefined
                  ? `<p><strong>Horas hoy:</strong> ${unidad.horas_conducidas_hoy.toFixed(1)}h / 9h</p>`
                  : ''
              }
              ${
                unidad.ubicacion?.timestamp
                  ? `<p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                       Última actualización: ${new Date(unidad.ubicacion.timestamp).toLocaleString('es-AR')}
                     </p>`
                  : ''
              }
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (onUnidadClick) {
            onUnidadClick(unidad.id);
          }
        });

        markers.set(unidad.id, marker);
      }
    });

    setMarkers(new Map(markers));

    // Ajustar zoom para mostrar todas las unidades
    if (unidadesConUbicacion.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      unidadesConUbicacion.forEach((unidad) => {
        if (unidad.ubicacion) {
          bounds.extend({
            lat: unidad.ubicacion.lat,
            lng: unidad.ubicacion.lng
          });
        }
      });
      map.fitBounds(bounds);

      // Si solo hay una unidad, hacer zoom más cercano
      if (unidadesConUbicacion.length === 1) {
        map.setZoom(12);
      }
    }
  }, [map, unidades, onUnidadClick]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700 ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-1">Verifica la configuración de Google Maps API</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700 z-10"
          style={{ height }}
        >
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-2 text-gray-400 text-sm">Cargando mapa...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="rounded-lg overflow-hidden border border-gray-700" style={{ height }} />

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
        <h4 className="text-xs font-bold text-white mb-2 uppercase">Leyenda</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
            <span className="text-gray-300">En tránsito</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white"></div>
            <span className="text-gray-300">Arribado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            <span className="text-gray-300">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white"></div>
            <span className="text-gray-300">Otro estado</span>
          </div>
        </div>
      </div>

      {/* Contador de unidades */}
      <div className="absolute top-4 right-4 bg-gray-900/95 border border-gray-700 rounded-lg px-4 py-2 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-white font-bold text-sm">
            {unidades.filter((u) => u.ubicacion).length} / {unidades.length}
          </span>
          <span className="text-gray-400 text-xs">unidades activas</span>
        </div>
      </div>
    </div>
  );
}
