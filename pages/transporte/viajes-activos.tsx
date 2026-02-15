 import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { EstadoDualBadge, EstadosProgressBar } from '../../components/ui/EstadoDualBadge';
import { GoogleMapViajes } from '../../components/Maps/GoogleMapViajes';
import { TimelineEstados } from '../../components/Transporte/TimelineEstados';
import type { EstadoUnidadViaje } from '../../lib/types';
import { getEstadoDisplay } from '../../lib/helpers/estados-helpers';
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
        .in('estado', ['transporte_asignado', 'camion_asignado', 'confirmado_chofer', 'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado', 'egreso_origen', 'en_transito_destino', 'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino'])
        .not('despacho_id', 'is', null)
        .order('created_at', { ascending: false });

      if (viajesError) throw viajesError;

      // 🔥 DEBUG: Ver qué trae estado_unidad_viaje

      // Cargar despachos por separado para evitar problemas de alias
      const despachoIds = [...new Set(viajesData?.map((v: any) => v.despacho_id).filter(Boolean))];
      
      const { data: despachosData, error: despachosError } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino, scheduled_local_date, scheduled_local_time, prioridad')
        .in('id', despachoIds);

      if (despachosError) console.error('❌ Error cargando despachos:', despachosError);

      const despachosMap = (despachosData || []).reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});
      

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
      setError('Error al cargar viajes. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const display = getEstadoDisplay(estado);

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border border-white/10 ${display.bgClass} ${display.textClass} flex items-center gap-1`}>
        {display.label}
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
                {viajes.filter(v => ['en_transito_origen', 'en_transito_destino', 'egreso_origen'].includes(v.estado)).length}
              </p>
            </div>
            <TruckIcon className="h-4 w-4 text-purple-400" />
          </div>

          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Planta</p>
              <p className="text-sm font-bold text-white">
                {viajes.filter(v => ['ingresado_origen', 'llamado_carga', 'cargando', 'cargado', 'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado'].includes(v.estado)).length}
              </p>
            </div>
            <MapPinIcon className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Confirm.</p>
              <p className="text-sm font-bold text-white">
                {viajes.filter(v => ['confirmado_chofer', 'camion_asignado', 'transporte_asignado'].includes(v.estado)).length}
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
            <option value="en_transito_origen">→ Origen</option>
            <option value="ingresado_origen">En Planta Origen</option>
            <option value="llamado_carga">Llamado a Carga</option>
            <option value="cargando">Cargando</option>
            <option value="cargado">Cargado</option>
            <option value="egreso_origen">Egreso Origen</option>
            <option value="en_transito_destino">→ Destino</option>
            <option value="ingresado_destino">En Planta Destino</option>
            <option value="llamado_descarga">Llamado a Descarga</option>
            <option value="descargando">Descargando</option>
            <option value="descargado">Descargado</option>
          </select>
        </div>

        {/* Layout: Lista Izquierda + Mapa Centro + Indicadores Derecha */}
        <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
          {/* COLUMNA IZQUIERDA: Lista de viajes (20%) */}
          <div className="col-span-2 bg-[#1b273b] rounded border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-1.5 border-b border-gray-800">
              <h3 className="text-white font-semibold text-xs">
                {selectedEstado === 'todos' ? 'Todos' : selectedEstado.replace(/_/g, ' ')}
                <span className="text-cyan-400 ml-1 text-[10px]">({viajesFiltrados.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-2">
                <p className="text-red-400 text-[10px] text-center">{error}</p>
              </div>
            ) : viajesFiltrados.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-2">
                <p className="text-gray-500 text-[10px] text-center">No hay viajes activos</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="p-1 space-y-1">
                  {viajesFiltrados.map((viaje) => (
                    <div
                      key={viaje.id}
                      className={`p-1.5 rounded border transition-all cursor-pointer ${
                        selectedViajes.has(viaje.id)
                          ? 'bg-cyan-900/30 border-cyan-600'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                      }`}
                      onClick={() => handleToggleViaje(viaje.id)}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <input
                          type="checkbox"
                          checked={selectedViajes.has(viaje.id)}
                          onChange={() => {}}
                          className="w-3 h-3 text-cyan-600 rounded focus:ring-0"
                        />
                        <TruckIcon className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                        <span className="text-white font-medium text-[10px] truncate flex-1">
                          {viaje.camion_patente || 'S/P'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerDetalle(viaje);
                          }}
                          className="text-gray-400 hover:text-cyan-400 transition-colors"
                          title="Ver detalle"
                        >
                          <EyeIcon className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="ml-4 text-[9px]">
                        <div className="flex items-center gap-1 mb-0.5">
                          <MapPinIcon className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-400 truncate flex-1">{viaje.origen}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
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

          {/* COLUMNA CENTRO: Mapa (70%) */}
          <div className="col-span-8 bg-[#1b273b] rounded border border-gray-800 overflow-hidden flex flex-col">
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
                    showEstadisticas={false}
                    onUbicacionesActualizadas={handleActualizarUbicaciones}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: Indicadores de Estado (10%) */}
          <div className="col-span-2 bg-[#1b273b] rounded border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-800">
              <h3 className="font-semibold text-white text-sm">Estados</h3>
              <p className="text-gray-400 text-[9px] mt-0.5">En tiempo real</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {(() => {
                  // Mostrar estados SOLO de los viajes seleccionados en el panel izquierdo
                  const viajesParaEstados = selectedViajes.size > 0
                    ? viajes.filter(v => selectedViajes.has(v.id))
                    : [];
                  const estadosActivos = viajesParaEstados.map(v => v.estado).filter(Boolean);
                  const tieneEstado = (estados: string[]) => estadosActivos.some(e => estados.includes(e));
                  
                  const indicadores = [
                    { estados: ['camion_asignado', 'transporte_asignado'], label: 'Asignado', color: 'blue', pulso: false },
                    { estados: ['confirmado_chofer'], label: 'Confirmado', color: 'green', pulso: false },
                    { estados: ['en_transito_origen'], label: '→ Origen', color: 'purple', pulso: true },
                    { estados: ['ingresado_origen'], label: 'En Planta Origen', color: 'cyan', pulso: false },
                    { estados: ['llamado_carga'], label: 'Llamado a Carga', color: 'yellow', pulso: true },
                    { estados: ['cargando'], label: 'Cargando', color: 'orange', pulso: true },
                    { estados: ['cargado'], label: 'Cargado', color: 'lime', pulso: false },
                    { estados: ['egreso_origen'], label: 'Egreso Origen', color: 'gray', pulso: false },
                    { estados: ['en_transito_destino'], label: '→ Destino', color: 'purple', pulso: true },
                    { estados: ['ingresado_destino'], label: 'En Planta Destino', color: 'teal', pulso: false },
                    { estados: ['llamado_descarga'], label: 'Llamado Descarga', color: 'yellow', pulso: true },
                    { estados: ['descargando'], label: 'Descargando', color: 'orange', pulso: true },
                    { estados: ['descargado'], label: 'Descargado', color: 'lime', pulso: false },
                    { estados: ['egreso_destino', 'completado'], label: 'Completado', color: 'green', pulso: false, icon: 'check' },
                    { estados: ['cancelado', 'cancelado_por_transporte'], label: 'Cancelado', color: 'red', pulso: false, icon: 'x' }
                  ];

                  const colorConfig: Record<string, { bg: string, glow: string, border: string }> = {
                    blue: { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', glow: 'shadow-[0_0_16px_rgba(59,130,246,0.9)]', border: 'border-blue-300' },
                    green: { bg: 'bg-gradient-to-br from-green-400 to-green-600', glow: 'shadow-[0_0_16px_rgba(34,197,94,0.9)]', border: 'border-green-300' },
                    purple: { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', glow: 'shadow-[0_0_16px_rgba(168,85,247,0.9)]', border: 'border-purple-300' },
                    cyan: { bg: 'bg-gradient-to-br from-cyan-400 to-cyan-600', glow: 'shadow-[0_0_16px_rgba(6,182,212,0.9)]', border: 'border-cyan-300' },
                    orange: { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', glow: 'shadow-[0_0_16px_rgba(251,146,60,0.9)]', border: 'border-orange-300' },
                    yellow: { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', glow: 'shadow-[0_0_16px_rgba(250,204,21,0.9)]', border: 'border-yellow-300' },
                    lime: { bg: 'bg-gradient-to-br from-lime-400 to-lime-600', glow: 'shadow-[0_0_16px_rgba(163,230,53,0.9)]', border: 'border-lime-300' },
                    teal: { bg: 'bg-gradient-to-br from-teal-400 to-teal-600', glow: 'shadow-[0_0_16px_rgba(20,184,166,0.9)]', border: 'border-teal-300' },
                    red: { bg: 'bg-gradient-to-br from-red-400 to-red-600', glow: 'shadow-[0_0_16px_rgba(239,68,68,0.9)]', border: 'border-red-300' },
                    gray: { bg: 'bg-gradient-to-br from-gray-400 to-gray-600', glow: 'shadow-[0_0_16px_rgba(156,163,175,0.9)]', border: 'border-gray-300' }
                  };

                  return indicadores.map((ind, idx) => {
                    const activo = tieneEstado(ind.estados);
                    const colors = colorConfig[ind.color];

                    return (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all duration-300 ${
                          activo ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-800/30 border-gray-700/50'
                        }`}
                      >
                        {/* Bombita LED */}
                        <div className="relative flex items-center justify-center flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            activo 
                              ? `${colors.bg} ${colors.glow} border ${colors.border}` 
                              : 'bg-gray-600 border border-gray-700 shadow-inner'
                          } ${activo && ind.pulso ? 'animate-pulse' : ''}`}>
                            {ind.icon === 'check' && activo && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {ind.icon === 'x' && activo && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          {/* Halo de luz cuando está activo */}
                          {activo && (
                            <div className={`absolute inset-0 rounded-full ${colors.bg} opacity-30 blur-md`}></div>
                          )}
                        </div>
                        <span className={`text-xs font-medium transition-colors flex-1 ${activo ? 'text-white' : 'text-gray-500'}`}>
                          {ind.label}
                        </span>
                        {(() => {
                          const count = estadosActivos.filter(e => ind.estados.includes(e)).length;
                          return count > 0 ? (
                            <span className="text-[9px] font-bold text-white bg-gray-600 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {count}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Info adicional */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-400">Movimiento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-gray-400">Histórico</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-500">Auto-refresh</span>
                    <span className="text-cyan-400 font-medium">30s</span>
                  </div>
                </div>
              </div>
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
                <div>
                  <h3 className="text-white font-semibold mb-3">Estado del Viaje</h3>
                  {viajeDetalle.estado_unidad ? (
                    <>
                      <EstadoDualBadge
                        tipo="unidad"
                        estado={viajeDetalle.estado_unidad}
                        timestamp={viajeDetalle.fecha_confirmacion_chofer || null}
                        size="md"
                      />
                      <div className="mt-3">
                        <EstadosProgressBar estadoUnidad={viajeDetalle.estado_unidad} />
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-300 text-sm">
                        Estado actual: <span className="text-white font-semibold">{viajeDetalle.estado}</span>
                      </p>
                      <p className="text-yellow-400 text-xs mt-2">
                        ⚠️ No hay registro de estados detallados para este viaje
                      </p>
                    </div>
                  )}
                </div>

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
