import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { EstadoDualBadge, EstadosProgressBar } from '../../components/ui/EstadoDualBadge';
import { GoogleMapViajes } from '../../components/Maps/GoogleMapViajes';
import { TimelineEstados } from '../../components/Transporte/TimelineEstados';
import type { EstadoUnidadViaje } from '../../lib/types';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ViajeActivo {
  id: string;
  numero_viaje: number;
  estado: string;
  chofer_id?: string;
  camion_id?: string;
  acoplado_id?: string;
  observaciones?: string;
  despacho_id: string;
  // Datos del despacho
  pedido_id: string;
  origen: string;
  destino: string;
  fecha_despacho: string;
  hora_despacho: string;
  prioridad?: string;
  // Datos de recursos
  chofer_nombre?: string;
  chofer_apellido?: string;
  chofer_dni?: string;
  chofer_telefono?: string;
  camion_patente?: string;
  camion_marca?: string;
  camion_modelo?: string;
  camion_anio?: number;
  acoplado_patente?: string;
  acoplado_marca?: string;
  acoplado_modelo?: string;
  acoplado_anio?: number;
  // Estado dual - Unidad
  estado_unidad?: EstadoUnidadViaje;
  fecha_confirmacion_chofer?: string | null;
  fecha_inicio_transito_origen?: string | null;
  fecha_arribo_origen?: string | null;
  fecha_inicio_transito_destino?: string | null;
  fecha_arribo_destino?: string | null;
}

const ViajesActivos = () => {
  const { user, userEmpresas } = useUserRole();
  const [viajes, setViajes] = useState<ViajeActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [selectedViajes, setSelectedViajes] = useState<Set<string>>(new Set());
  const [viajeDetalle, setViajeDetalle] = useState<ViajeActivo | null>(null);

  useEffect(() => {
    if (user && userEmpresas) {
      loadViajes();
    }
  }, [user, userEmpresas]);

  const loadViajes = async () => {
    try {
      setLoading(true);
      setError('');

      // Obtener empresa de transporte del usuario
      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      const empresaId = empresaTransporte.empresa_id;

      // Cargar SOLO viajes activos (confirmados, en tránsito, en planta, etc.)
      // Incluye última ubicación GPS desde ubicaciones_choferes
      const { data: viajesData, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          estado,
          chofer_id,
          camion_id,
          acoplado_id,
          despacho_id,
          observaciones,
          created_at,
          estado_unidad_viaje (
            estado_unidad,
            fecha_confirmacion_chofer,
            fecha_inicio_transito_origen,
            fecha_arribo_origen,
            fecha_inicio_transito_destino,
            fecha_arribo_destino
          )
        `)
        .eq('id_transporte', empresaId)
        .in('estado', ['transporte_asignado', 'camion_asignado', 'confirmado_chofer', 'en_transito_origen', 'arribo_origen', 'en_transito_destino', 'arribo_destino', 'confirmado', 'en_transito', 'en_planta', 'esperando_carga', 'cargando', 'carga_completa', 'en_ruta'])
        .not('despacho_id', 'is', null)
        .order('created_at', { ascending: false });

      if (viajesError) throw viajesError;

      // Cargar despachos por separado para evitar problemas de alias
      const despachoIds = [...new Set(viajesData?.map((v: any) => v.despacho_id).filter(Boolean))];
      console.log('📦 Despacho IDs a cargar:', despachoIds);
      
      const { data: despachosData, error: despachosError } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino, scheduled_local_date, scheduled_local_time, prioridad')
        .in('id', despachoIds);

      console.log('📦 Despachos cargados:', despachosData);
      if (despachosError) console.error('❌ Error cargando despachos:', despachosError);

      const despachosMap = (despachosData || []).reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});
      
      console.log('📦 Despachos Map:', despachosMap);

      // Obtener IDs de recursos
      const choferIds = [...new Set(viajesData?.map((v: any) => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set(viajesData?.map((v: any) => v.camion_id).filter(Boolean))];
      const acopladoIds = [...new Set(viajesData?.map((v: any) => v.acoplado_id).filter(Boolean))];
      const viajeIds = viajesData?.map((v: any) => v.id).filter(Boolean) || [];

      // Cargar datos de recursos y ubicaciones GPS en paralelo
      const [choferesData, camionesData, acopladosData, ubicacionesData] = await Promise.all([
        choferIds.length > 0
          ? supabase.from('choferes').select('id, nombre, apellido, dni, telefono').in('id', choferIds)
          : Promise.resolve({ data: [] }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente, marca, modelo, anio').in('id', camionIds)
          : Promise.resolve({ data: [] }),
        acopladoIds.length > 0
          ? supabase.from('acoplados').select('id, patente, marca, modelo, anio').in('id', acopladoIds)
          : Promise.resolve({ data: [] }),
        // Obtener última ubicación GPS de cada viaje
        viajeIds.length > 0
          ? supabase
              .from('ubicaciones_choferes')
              .select('viaje_id, latitude, longitude, velocidad, heading, timestamp')
              .in('viaje_id', viajeIds)
              .order('timestamp', { ascending: false })
          : Promise.resolve({ data: [] })
      ]);

      // Crear mapas
      const choferesMap = new Map((choferesData.data || []).map((ch: any) => [ch.id, ch]));
      const camionesMap = new Map((camionesData.data || []).map((ca: any) => [ca.id, ca]));
      const acopladosMap = new Map((acopladosData.data || []).map((ac: any) => [ac.id, ac]));
      
      // Crear mapa de ubicaciones GPS (última por viaje)
      const ubicacionesMap = new Map();
      (ubicacionesData.data || []).forEach((ub: any) => {
        if (!ubicacionesMap.has(ub.viaje_id)) {
          ubicacionesMap.set(ub.viaje_id, ub);
        }
      });

      // Mapear viajes con datos completos incluyendo GPS
      const viajesCompletos = (viajesData || []).map((viaje: any) => {
        const chofer = viaje.chofer_id ? choferesMap.get(viaje.chofer_id) : null;
        const camion = viaje.camion_id ? camionesMap.get(viaje.camion_id) : null;
        const acoplado = viaje.acoplado_id ? acopladosMap.get(viaje.acoplado_id) : null;
        const ubicacion = ubicacionesMap.get(viaje.id);

        return {
          id: viaje.id,
          numero_viaje: viaje.numero_viaje,
          estado: viaje.estado,
          chofer_id: viaje.chofer_id,
          camion_id: viaje.camion_id,
          acoplado_id: viaje.acoplado_id,
          observaciones: viaje.observaciones,
          despacho_id: viaje.despacho_id,
          pedido_id: `${despachosMap[viaje.despacho_id]?.pedido_id || 'N/A'} - Viaje #${viaje.numero_viaje}`,
          origen: despachosMap[viaje.despacho_id]?.origen || 'N/A',
          destino: despachosMap[viaje.despacho_id]?.destino || 'N/A',
          fecha_despacho: despachosMap[viaje.despacho_id]?.scheduled_local_date,
          hora_despacho: despachosMap[viaje.despacho_id]?.scheduled_local_time,
          prioridad: despachosMap[viaje.despacho_id]?.prioridad,
          chofer_nombre: chofer?.nombre,
          chofer_apellido: chofer?.apellido,
          chofer_dni: chofer?.dni,
          chofer_telefono: chofer?.telefono,
          camion_patente: camion?.patente,
          camion_marca: camion?.marca,
          camion_modelo: camion?.modelo,
          camion_anio: camion?.anio,
          acoplado_patente: acoplado?.patente,
          acoplado_marca: acoplado?.marca,
          acoplado_modelo: acoplado?.modelo,
          acoplado_anio: acoplado?.anio,
          // Estados duales
          estado_unidad: viaje.estado_unidad_viaje?.estado_unidad,
          fecha_confirmacion_chofer: viaje.estado_unidad_viaje?.fecha_confirmacion_chofer,
          fecha_inicio_transito_origen: viaje.estado_unidad_viaje?.fecha_inicio_transito_origen,
          fecha_arribo_origen: viaje.estado_unidad_viaje?.fecha_arribo_origen,
          fecha_inicio_transito_destino: viaje.estado_unidad_viaje?.fecha_inicio_transito_destino,
          fecha_arribo_destino: viaje.estado_unidad_viaje?.fecha_arribo_destino,
          // GPS real desde ubicaciones_choferes
          gps_lat: ubicacion?.latitude,
          gps_lng: ubicacion?.longitude,
          gps_velocidad: ubicacion?.velocidad,
          gps_heading: ubicacion?.heading,
          gps_timestamp: ubicacion?.timestamp
        };
      });

      setViajes(viajesCompletos);

    } catch (err: any) {
      console.error('Error cargando viajes activos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { color: string; text: string; icon: any }> = {
      pendiente: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'Pendiente', icon: ClockIcon },
      camion_asignado: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', text: 'Camión Asignado', icon: TruckIcon },
      confirmado_chofer: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'Confirmado', icon: CheckCircleIcon },
      en_transito_origen: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', text: '→ Origen', icon: TruckIcon },
      arribo_origen: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', text: 'En Origen', icon: MapPinIcon },
      en_transito_destino: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', text: '→ Destino', icon: TruckIcon },
      arribo_destino: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', text: 'En Destino', icon: MapPinIcon },
      entregado: { color: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'Entregado', icon: CheckCircleIcon },
      cancelado: { color: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'Cancelado', icon: ExclamationTriangleIcon }
    };

    const config = estados[estado] || { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: estado, icon: ClockIcon };
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </span>
    );
  };

  const viajesFiltrados = selectedEstado === 'todos' 
    ? viajes 
    : viajes.filter(v => v.estado === selectedEstado);

  // Preparar viajes para el mapa (solo los seleccionados) con ubicaciones GPS reales
  const viajesParaMapa = useMemo(() => {
    return viajes
      .filter(v => selectedViajes.has(v.id))
      .map(v => ({
        id: parseInt(v.id),
        patente_camion: v.camion_patente || 'Sin patente',
        chofer_nombre: `${v.chofer_nombre || ''} ${v.chofer_apellido || ''}`.trim() || 'Sin asignar',
        origen: v.origen || 'Sin origen',
        destino: v.destino || 'Sin destino',
        estado_unidad_viaje: v.estado_unidad || 'pendiente',
        estado_carga_viaje: 'planificacion',
        // GPS real desde ubicaciones_choferes
        ubicacion_actual: (v as any).gps_lat && (v as any).gps_lng ? {
          lat: parseFloat((v as any).gps_lat),
          lng: parseFloat((v as any).gps_lng),
          timestamp: (v as any).gps_timestamp || new Date().toISOString(),
          velocidad: (v as any).gps_velocidad,
          heading: (v as any).gps_heading || null
        } : null, // null si no hay GPS
        ubicacion_origen: null, // TODO: Geocodificar desde dirección de origen
        ubicacion_destino: null // TODO: Geocodificar desde dirección de destino
      }));
  }, [viajes, selectedViajes]);

  const handleActualizarUbicaciones = () => {
    console.log('🔄 Actualizando ubicaciones GPS manualmente');
    loadViajes();
  };

  const handleToggleViaje = (viajeId: string) => {
    setSelectedViajes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(viajeId)) {
        newSet.delete(viajeId);
      } else {
        newSet.add(viajeId);
      }
      return newSet;
    });
  };

  const handleVerDetalle = (viaje: ViajeActivo) => {
    setViajeDetalle(viaje);
  };

  return (
    <AdminLayout pageTitle="Viajes Activos">
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* Stats ultra-compactos */}
        <div className="grid grid-cols-4 gap-1 mb-1">
          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Total</p>
              <p className="text-sm font-bold text-white">{viajes.length}</p>
            </div>
            <TruckIcon className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Tránsito</p>
              <p className="text-sm font-bold text-white">
                {viajes.filter(v => v.estado === 'en_transito' || v.estado === 'en_ruta').length}
              </p>
            </div>
            <TruckIcon className="h-4 w-4 text-purple-400" />
          </div>

          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Planta</p>
              <p className="text-sm font-bold text-white">
                {viajes.filter(v => v.estado === 'en_planta' || v.estado === 'esperando_carga' || v.estado === 'cargando').length}
              </p>
            </div>
            <MapPinIcon className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Confirm.</p>
              <p className="text-sm font-bold text-white">
                {viajes.filter(v => v.estado === 'confirmado' || v.estado === 'camion_asignado').length}
              </p>
            </div>
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
          </div>
        </div>

        {/* Filtro ultra-compacto */}
        <div className="mb-1">
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="px-2 py-0.5 bg-[#1b273b] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="camion_asignado">Asignado</option>
            <option value="confirmado_chofer">Confirmado</option>
            <option value="en_transito_origen">En Tránsito</option>
            <option value="arribo_origen">En Planta</option>
          </select>
        </div>

        {/* Layout: Lista Izquierda + Mapa Derecho */}
        <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
          {/* COLUMNA IZQUIERDA: Lista de Viajes (25%) */}
          <div className="col-span-3 bg-[#1b273b] rounded border border-gray-800 overflow-hidden flex flex-col">
            <div className="px-1.5 py-0.5 bg-[#0a0e1a]">
              <h3 className="text-white font-semibold text-[9px]">Activos ({viajesFiltrados.length})</h3>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-2">
                <p className="text-red-400 text-[10px]">{error}</p>
              </div>
            ) : viajesFiltrados.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-2">
                <p className="text-gray-400 text-[10px]">Sin viajes</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-gray-800">
                  {viajesFiltrados.map((viaje) => (
                    <div
                      key={viaje.id}
                      onClick={() => handleVerDetalle(viaje)}
                      className={`px-1 py-0.5 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                        selectedViajes.has(viaje.id) ? 'bg-cyan-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedViajes.has(viaje.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleViaje(viaje.id);
                          }}
                          className="w-3 h-3 rounded border-gray-600 text-cyan-600 focus:ring-0 focus:ring-offset-0 bg-gray-700 flex-shrink-0"
                        />

                        {/* Info Ultra-Compacta - una sola línea */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <TruckIcon className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                          <span className="text-white font-semibold text-[10px] truncate">
                            {viaje.camion_patente}
                          </span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-400 text-[9px] truncate flex-1">
                            {viaje.chofer_nombre} {viaje.chofer_apellido}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: Mapa (75%) */}
          <div className="col-span-9 bg-[#1b273b] rounded border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-1.5 border-b border-gray-800">
              <h3 className="text-white font-semibold text-xs">
                Seguimiento en Tiempo Real
                {selectedViajes.size > 0 && <span className="text-cyan-400 ml-1 text-[10px]">({selectedViajes.size})</span>}
              </h3>
            </div>

            <div className="flex-1 relative bg-gray-900">
              {selectedViajes.size === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPinIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Selecciona viajes de la lista para ver su ubicación en el mapa</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Se actualizará automáticamente cada 30 segundos
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Barra de controles */}
                  <div className="absolute top-2 right-2 z-[1000] flex gap-1">
                    <button
                      onClick={handleActualizarUbicaciones}
                      className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-medium transition-colors shadow-lg flex items-center gap-1"
                      title="Actualizar ubicaciones ahora"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Actualizar
                    </button>
                  </div>

                  <GoogleMapViajes
                    viajes={viajesParaMapa}
                    viajeSeleccionado={viajeDetalle?.id ? parseInt(viajeDetalle.id) : null}
                    onViajeClick={(viajeId) => {
                      const viaje = viajes.find(v => v.id === viajeId.toString());
                      if (viaje) handleVerDetalle(viaje);
                    }}
                    autoRefresh={true}
                    refreshInterval={30000}
                    showHistorico={true}
                    showEstadisticas={true}
                    onUbicacionesActualizadas={handleActualizarUbicaciones}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Detalle */}
        {viajeDetalle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1b273b] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
              <div className="p-2 border-b border-gray-800 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{viajeDetalle.pedido_id}</h2>
                  <p className="text-gray-400 text-sm mt-1">Detalles del viaje</p>
                </div>
                <button
                  onClick={() => setViajeDetalle(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-2 space-y-2">
                {/* Estado */}
                {viajeDetalle.estado_unidad && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Estado del Viaje</h3>
                    <EstadoDualBadge
                      tipo="unidad"
                      estado={viajeDetalle.estado_unidad}
                      timestamp={viajeDetalle.fecha_confirmacion_chofer || null}
                      size="md"
                    />
                    <div className="mt-3">
                      <EstadosProgressBar estadoUnidad={viajeDetalle.estado_unidad} />
                    </div>
                  </div>
                )}

                {/* Ruta */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Ruta</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-green-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Origen</p>
                        <p className="text-white">{viajeDetalle.origen}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-orange-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Destino</p>
                        <p className="text-white">{viajeDetalle.destino}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ClockIcon className="h-5 w-5 text-cyan-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Programado</p>
                        <p className="text-white">
                          {viajeDetalle.fecha_despacho ? new Date(viajeDetalle.fecha_despacho).toLocaleDateString('es-AR') : 'Sin fecha'} - {viajeDetalle.hora_despacho || 'Sin hora'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recursos */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Recursos Asignados</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <UserIcon className="h-5 w-5 text-cyan-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Chofer</p>
                        <p className="text-white font-medium">
                          {viajeDetalle.chofer_nombre} {viajeDetalle.chofer_apellido}
                        </p>
                        {viajeDetalle.chofer_telefono && (
                          <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                            <PhoneIcon className="h-4 w-4" />
                            {viajeDetalle.chofer_telefono}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TruckIcon className="h-5 w-5 text-blue-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Camión</p>
                        <p className="text-white font-medium">
                          {viajeDetalle.camion_patente}
                          {viajeDetalle.camion_marca && ` - ${viajeDetalle.camion_marca}`}
                        </p>
                      </div>
                    </div>
                    {viajeDetalle.acoplado_patente && (
                      <div className="flex items-start gap-3">
                        <TruckIcon className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-gray-400 text-sm">Acoplado</p>
                          <p className="text-white">{viajeDetalle.acoplado_patente}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                {viajeDetalle.observaciones && (
                  <div>
                    <h3 className="text-white font-semibold mb-2">Observaciones</h3>
                    <p className="text-gray-300">{viajeDetalle.observaciones}</p>
                  </div>
                )}

                {/* Timeline de Estados */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Historial de Cambios</h3>
                  <TimelineEstados viajeId={parseInt(viajeDetalle.id)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ViajesActivos;
