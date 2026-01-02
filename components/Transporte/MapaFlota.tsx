// components/Transporte/MapaFlota.tsx
import React, { useEffect, useRef, useState } from 'react';
// import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabaseClient';

interface Camion {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  ubicacion?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    velocidad?: number;
  };
  chofer?: {
    nombre: string;
  };
  viaje_actual?: {
    pedido_id: string;
    destino: string;
  };
}

interface MapaFlotaProps {
  empresaId: string;
}

const MapaFlota: React.FC<MapaFlotaProps> = ({ empresaId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [camiones, setCamiones] = useState<Camion[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inicializar mapa centrado en Argentina
    const map = L.map(mapContainerRef.current).setView([-34.6037, -58.3816], 5);
    mapRef.current = map;

    // Tile layer claro
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Cargar ubicaciones de camiones
  useEffect(() => {
    const loadCamionesUbicaciones = async () => {
      try {
        // Obtener todos los camiones de la empresa
        const { data: camionesData, error: camionesError } = await supabase
          .from('camiones')
          .select('id, patente, marca, modelo')
          .eq('empresa_id', empresaId);

        if (camionesError) throw camionesError;

        // Obtener últimas ubicaciones de cada camión
        const camionesConUbicacion: Camion[] = [];

        for (const camion of camionesData || []) {
          // Buscar último viaje activo del camión
          const { data: viajeActivo } = await supabase
            .from('viajes_despacho')
            .select(`
              id,
              chofer_id,
              despachos!inner(pedido_id, destino)
            `)
            .eq('camion_id', camion.id)
            .in('estado', ['transporte_asignado', 'cargando', 'en_camino', 'descargando'])
            .single();

          if (viajeActivo) {
            // Obtener última ubicación del viaje
            const { data: ubicacion } = await supabase
              .from('ubicaciones_choferes')
              .select('latitude, longitude, velocidad, timestamp')
              .eq('viaje_id', viajeActivo.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .single();

            // Obtener info del chofer
            const { data: chofer } = await supabase
              .from('choferes')
              .select('nombre')
              .eq('id', viajeActivo.id_chofer)
              .single();

            if (ubicacion) {
              const camionConUbicacion: Camion = {
                ...camion,
                ubicacion: {
                  latitude: parseFloat(ubicacion.latitude),
                  longitude: parseFloat(ubicacion.longitude),
                  velocidad: ubicacion.velocidad,
                  timestamp: ubicacion.timestamp
                },
                viaje_actual: {
                  pedido_id: Array.isArray(viajeActivo.despachos) && viajeActivo.despachos[0] ? viajeActivo.despachos[0].pedido_id : '',
                  destino: Array.isArray(viajeActivo.despachos) && viajeActivo.despachos[0] ? viajeActivo.despachos[0].destino : ''
                }
              };
              if (chofer) {
                camionConUbicacion.chofer = { nombre: chofer.nombre };
              }
              camionesConUbicacion.push(camionConUbicacion);
            }
          }
        }

        setCamiones(camionesConUbicacion);
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
      }
    };

    if (empresaId) {
      loadCamionesUbicaciones();
      // Actualizar cada 30 segundos
      const interval = setInterval(loadCamionesUbicaciones, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [empresaId]);

  // Actualizar marcadores en el mapa
  useEffect(() => {
    if (!mapRef.current || camiones.length === 0) return;

    const map = mapRef.current;

    // Limpiar marcadores antiguos
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds: [number, number][] = [];

    camiones.forEach(camion => {
      if (!camion.ubicacion) return;

      const { latitude, longitude } = camion.ubicacion;
      bounds.push([latitude, longitude]);

      // Icono del camión
      const truckIcon = L.divIcon({
        html: `
          <div style="
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(6, 182, 212, 0.6);
            border: 3px solid #fff;
            position: relative;
          ">
            <span style="font-size: 22px;">🚛</span>
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: #10b981;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              border: 2px solid #fff;
              animation: pulse 2s ease-in-out infinite;
            "></div>
          </div>
        `,
        className: 'truck-marker-fleet',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([latitude, longitude], { icon: truckIcon }).addTo(map);

      const velocidadText = camion.ubicacion.velocidad 
        ? `<br/><small>🚀 ${Math.round(camion.ubicacion.velocidad)} km/h</small>`
        : '';

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <b>🚛 ${camion.patente}</b><br/>
          <small>${camion.marca} ${camion.modelo}</small><br/>
          ${camion.chofer ? `<small>👤 ${camion.chofer.nombre}</small><br/>` : ''}
          ${camion.viaje_actual ? `<small>📦 ${camion.viaje_actual.pedido_id}</small><br/><small>📍 → ${camion.viaje_actual.destino}</small>` : ''}
          ${velocidadText}
        </div>
      `);

      markersRef.current[camion.id] = marker;
    });

    // Ajustar vista para mostrar todos los camiones
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 12 });
    }
  }, [camiones]);

  return (
    <div className="bg-[#1b273b] rounded-lg border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-bold text-cyan-400">🗺️ Ubicación de la Flota</h3>
        <span className="text-sm text-gray-400">
          {camiones.length} {camiones.length === 1 ? 'camión' : 'camiones'} en ruta
        </span>
      </div>
      <div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} />
    </div>
  );
};

export default MapaFlota;
