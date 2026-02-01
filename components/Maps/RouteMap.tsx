import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface RouteMapProps {
  origin: {
    lat: number;
    lng: number;
    label?: string;
  };
  destination: {
    lat: number;
    lng: number;
    label?: string;
  };
  height?: string;
  showRoute?: boolean;
  className?: string;
}

export default function RouteMap({
  origin,
  destination,
  height = '300px',
  showRoute = true,
  className = ''
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

        // Calcular centro entre origen y destino
        const centerLat = (origin.lat + destination.lat) / 2;
        const centerLng = (origin.lng + destination.lng) / 2;

        // Crear mapa usando el constructor global de google.maps
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 7,
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

        // Marcador de origen (verde)
        const originMarker = new google.maps.Marker({
          position: origin,
          map: mapInstance,
          title: origin.label || 'Origen',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        // Info window para origen
        const originInfo = new google.maps.InfoWindow({
          content: `<div style="color: #1f2937; font-weight: bold;">📍 ${origin.label || 'Origen'}</div>`
        });
        originMarker.addListener('click', () => {
          originInfo.open(mapInstance, originMarker);
        });

        // Marcador de destino (naranja)
        const destMarker = new google.maps.Marker({
          position: destination,
          map: mapInstance,
          title: destination.label || 'Destino',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#f97316',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        // Info window para destino
        const destInfo = new google.maps.InfoWindow({
          content: `<div style="color: #1f2937; font-weight: bold;">🎯 ${destination.label || 'Destino'}</div>`
        });
        destMarker.addListener('click', () => {
          destInfo.open(mapInstance, destMarker);
        });

        // Dibujar ruta si está habilitado
        if (showRoute) {
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map: mapInstance,
            suppressMarkers: true, // Ya tenemos marcadores custom
            polylineOptions: {
              strokeColor: '#6366f1',
              strokeWeight: 4,
              strokeOpacity: 0.8
            }
          });

          directionsService.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING
            },
            (result, status) => {
              if (status === 'OK' && result) {
                directionsRenderer.setDirections(result);
              } else {
                console.warn('No se pudo calcular la ruta:', status);
                // Dibujar línea recta como fallback
                const line = new google.maps.Polyline({
                  path: [origin, destination],
                  geodesic: true,
                  strokeColor: '#6366f1',
                  strokeOpacity: 0.6,
                  strokeWeight: 3,
                  map: mapInstance
                });
              }
            }
          );
        }

        // Ajustar bounds para mostrar ambos puntos
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(origin);
        bounds.extend(destination);
        mapInstance.fitBounds(bounds);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError('Error al cargar el mapa');
        setLoading(false);
      });

    // Cleanup
    return () => {
      if (map) {
        // Google Maps no tiene método de cleanup específico
        setMap(null);
      }
    };
  }, [origin, destination, showRoute]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700 ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-1">
            Verifica la configuración de Google Maps API
          </p>
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
      <div
        ref={mapRef}
        className="rounded-lg overflow-hidden border border-gray-700"
        style={{ height }}
      />
    </div>
  );
}
