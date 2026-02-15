// components/Planning/TrackingMap.tsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabaseClient';
import { geocodeLocation, type Coordinates } from '../../lib/services/geocoding';

// Función helper para obtener la última ubicación con múltiples fallbacks
async function fetchUltimaUbicacion(viajeId: string, choferId?: string): Promise<Coordinates | null> {
  // Intento 1: RPC get_ultima_ubicacion_viaje
  try {
    const { data: ubicacion, error: rpcError } = await supabase
      .rpc('get_ultima_ubicacion_viaje', { p_viaje_id: viajeId });
    
    if (!rpcError && ubicacion && ubicacion.length > 0) {
      return { lat: parseFloat(ubicacion[0].latitude), lng: parseFloat(ubicacion[0].longitude) };
    }
  } catch (e) {
    console.warn('RPC get_ultima_ubicacion_viaje no disponible, usando fallback');
  }

  // Intento 2: Query directa a ubicaciones_choferes
  try {
    const { data: ubicDirecta } = await supabase
      .from('ubicaciones_choferes')
      .select('latitude, longitude')
      .eq('viaje_id', viajeId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (ubicDirecta?.latitude && ubicDirecta?.longitude) {
      return { lat: parseFloat(ubicDirecta.latitude), lng: parseFloat(ubicDirecta.longitude) };
    }
  } catch (e) {
    console.warn('Query ubicaciones_choferes falló, intentando tracking_gps');
  }

  // Intento 3: Fallback a tracking_gps (usa chofer_id)
  if (choferId) {
    try {
      const { data: trackingData } = await supabase
        .from('tracking_gps')
        .select('latitud, longitud')
        .eq('chofer_id', choferId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (trackingData?.latitud && trackingData?.longitud) {
        return { lat: parseFloat(trackingData.latitud), lng: parseFloat(trackingData.longitud) };
      }
    } catch (e) {
      console.warn('Query tracking_gps falló');
    }
  }

  return null;
}

// Fix para iconos por defecto de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TrackingMapProps {
  origen: string;
  destino: string;
  transporteNombre?: string | undefined;
  viajeId?: string | undefined; // ID del viaje para suscribirse a ubicaciones en tiempo real
  choferId?: string | undefined; // ID del chofer
}

const TrackingMap: React.FC<TrackingMapProps> = ({ origen, destino, transporteNombre, viajeId, choferId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inicializar mapa
    const map = L.map(mapContainerRef.current).setView([-34.6037, -58.3816], 6);
    mapRef.current = map;

    // Tile layer oscuro pero más legible (Voyager Dark de CARTO)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Capa de etiquetas (labels) con mejor contraste
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 20,
      pane: 'shadowPane' // Poner labels arriba
    }).addTo(map);

    // Cargar coordenadas reales con geocoding
    const loadRealCoordinates = async () => {
      const [origenResult, destinoResult] = await Promise.all([
        geocodeLocation(`${origen}, Argentina`),
        geocodeLocation(`${destino}, Argentina`)
      ]);

      if (!origenResult.coordinates || !destinoResult.coordinates) {
        console.error('No se pudieron obtener las coordenadas');
        return;
      }

      const origenCoords = origenResult.coordinates;
      const destinoCoords = destinoResult.coordinates;

      // Iconos personalizados
      const origenIcon = L.divIcon({
        html: `<div style="background: #10b981; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5); border: 2px solid #fff;"><span style="font-size: 16px;">📦</span></div>`,
        className: 'origen-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const destinoIcon = L.divIcon({
        html: `<div style="background: #f59e0b; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5); border: 2px solid #fff;"><span style="font-size: 16px;">🏭</span></div>`,
        className: 'destino-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const truckIcon = L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.6); border: 3px solid #fff; position: relative;"><span style="font-size: 24px;">🚛</span><div style="position: absolute; top: -8px; right: -8px; background: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff; animation: pulse 2s ease-in-out infinite;"></div></div>`,
        className: 'truck-marker',
        iconSize: [45, 45],
        iconAnchor: [22, 22],
      });

      // Marcadores origen y destino
      L.marker([origenCoords.lat, origenCoords.lng], { icon: origenIcon })
        .addTo(map)
        .bindPopup(`<b>Origen</b><br/>${origen}`);

      L.marker([destinoCoords.lat, destinoCoords.lng], { icon: destinoIcon })
        .addTo(map)
        .bindPopup(`<b>Destino</b><br/>${destino}`);

      // Cargar última ubicación real del chofer con múltiples fallbacks
      let truckCoords: Coordinates;
      
      if (viajeId) {
        const ubicacionReal = await fetchUltimaUbicacion(viajeId, choferId);
        
        if (ubicacionReal) {
          truckCoords = ubicacionReal;
        } else {
          // Sin datos reales — posicionar en origen (no simular posición falsa)
          truckCoords = { lat: origenCoords.lat, lng: origenCoords.lng };
        }
      } else {
        // Sin viaje activo, posicionar en origen
        truckCoords = { lat: origenCoords.lat, lng: origenCoords.lng };
      }

      // Marcador camión
      const truckMarker = L.marker([truckCoords.lat, truckCoords.lng], { icon: truckIcon })
        .addTo(map)
        .bindPopup(`<div style="min-width: 150px;"><b>🚛 En Ruta</b><br/><small>${transporteNombre || 'Transporte'}</small><br/><span style="color: #06b6d4;">● En camino</span></div>`);
      
      truckMarkerRef.current = truckMarker;

      // Ruta con línea mejorada
      const routeLine = L.polyline(
        [[origenCoords.lat, origenCoords.lng], [truckCoords.lat, truckCoords.lng], [destinoCoords.lat, destinoCoords.lng]],
        { 
          color: '#06b6d4', 
          weight: 4, 
          opacity: 0.8, 
          dashArray: '12, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }
      ).addTo(map);
      
      routeLineRef.current = routeLine;

      // Ajustar vista
      map.fitBounds([
        [origenCoords.lat, origenCoords.lng],
        [destinoCoords.lat, destinoCoords.lng],
        [truckCoords.lat, truckCoords.lng]
      ], { padding: [50, 50] });
    };

    loadRealCoordinates();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [origen, destino, transporteNombre, viajeId]);

  // Helper para actualizar posición del camión en el mapa
  const actualizarPosicionCamion = (coords: Coordinates, velocidad?: number) => {
    if (truckMarkerRef.current) {
      truckMarkerRef.current.setLatLng([coords.lat, coords.lng]);
      
      const velocidadText = velocidad 
        ? `<br/><small>🚀 ${Math.round(velocidad)} km/h</small>` 
        : '';
      
      truckMarkerRef.current.setPopupContent(
        `<div style="min-width: 150px;"><b>🚛 En Ruta</b><br/><small>${transporteNombre || 'Transporte'}</small><br/><span style="color: #06b6d4;">● Ubicación en vivo</span>${velocidadText}</div>`
      );
    }
    
    if (routeLineRef.current) {
      const currentLatLngs = routeLineRef.current.getLatLngs() as L.LatLng[];
      if (currentLatLngs.length === 3 && currentLatLngs[0] && currentLatLngs[2]) {
        routeLineRef.current.setLatLngs([
          currentLatLngs[0],
          [coords.lat, coords.lng],
          currentLatLngs[2]
        ]);
      }
    }
  };

  // Suscripción en tiempo real a ubicaciones del chofer + polling de respaldo
  useEffect(() => {
    if (!viajeId || !choferId) return;

    // Suscripción realtime a ubicaciones_choferes
    const channel = supabase
      .channel(`ubicaciones_chofer_${choferId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ubicaciones_choferes',
          filter: `viaje_id=eq.${viajeId}`
        },
        (payload) => {
          console.log('📍 Nueva ubicación recibida (ubicaciones_choferes):', payload);
          const newLocation = payload.new as any;
          
          if (newLocation.latitude && newLocation.longitude) {
            actualizarPosicionCamion(
              { lat: parseFloat(newLocation.latitude), lng: parseFloat(newLocation.longitude) },
              newLocation.velocidad ? parseFloat(newLocation.velocidad) : undefined
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tracking_gps',
          filter: `chofer_id=eq.${choferId}`
        },
        (payload) => {
          console.log('📍 Nueva ubicación recibida (tracking_gps):', payload);
          const newLocation = payload.new as any;
          
          if (newLocation.latitud && newLocation.longitud) {
            actualizarPosicionCamion(
              { lat: parseFloat(newLocation.latitud), lng: parseFloat(newLocation.longitud) },
              newLocation.velocidad ? parseFloat(newLocation.velocidad) : undefined
            );
          }
        }
      )
      .subscribe();

    // Polling de respaldo cada 15 segundos (por si realtime no funciona)
    const pollInterval = setInterval(async () => {
      const ubicacion = await fetchUltimaUbicacion(viajeId, choferId);
      if (ubicacion) {
        actualizarPosicionCamion(ubicacion);
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [viajeId, choferId, transporteNombre]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
};

export default TrackingMap;
