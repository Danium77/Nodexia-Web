// components/Planning/TrackingView.tsx
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabaseClient';
import { ChevronRightIcon, ChevronDownIcon, TruckIcon } from '@heroicons/react/24/outline';
import { EstadoDualBadge } from '../ui/EstadoDualBadge';
import type { EstadoCargaViaje } from '../../lib/types';

// Importar TrackingMap de forma dinámica para evitar problemas con SSR
const TrackingMap = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-cyan-400">Cargando mapa...</div>
    </div>
  )
});

interface Viaje {
  id: string;
  numero_viaje: number;
  estado: string;
  id_transporte: string | null;
  chofer_id?: string | null;
  camion_id?: string | null;
  acoplado_id?: string | null;
  observaciones: string | null;
  transporte?: {
    nombre: string;
    cuit: string;
  };
  chofer?: {
    nombre: string;
    apellido?: string;
    telefono: string;
    email: string;
  } | undefined;
  camion?: {
    patente: string;
    modelo: string;
    marca: string;
  } | undefined;
  acoplado?: {
    patente: string;
  } | undefined;
  estado_carga_viaje?: {
    estado_carga: EstadoCargaViaje;
    fecha_planificacion: string | null;
    fecha_documentacion_preparada: string | null;
    fecha_cargando: string | null;
    fecha_carga_completada: string | null;
    fecha_descargando: string | null;
    fecha_descargado: string | null;
    peso_real_kg: number | null;
    cantidad_bultos: number | null;
  };
}

interface Dispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  type?: string;
  scheduled_local_date?: string;
  scheduled_local_time?: string;
  origen_provincia?: string;
  destino_provincia?: string;
}

// Estados del viaje en orden - Sistema Dual Actualizado
const ESTADOS_VIAJE = [
  { key: 'pendiente', label: 'Pendiente', icon: '⏳', color: 'bg-gray-600' },
  { key: 'camion_asignado', label: 'Recursos Asignados', icon: '🚛', color: 'bg-yellow-600' },
  { key: 'confirmado_chofer', label: 'Confirmado', icon: '✅', color: 'bg-blue-600' },
  { key: 'en_transito_origen', label: 'Hacia Origen', icon: '🚚', color: 'bg-purple-600' },
  { key: 'arribo_origen', label: 'En Origen', icon: '📍', color: 'bg-orange-600' },
  { key: 'en_transito_destino', label: 'Hacia Destino', icon: '🚛', color: 'bg-indigo-600' },
  { key: 'arribo_destino', label: 'En Destino', icon: '📍', color: 'bg-amber-600' },
  { key: 'entregado', label: 'Entregado', icon: '✅', color: 'bg-green-600' },
  { key: 'expirado', label: 'Expirado', icon: '⚠️', color: 'bg-red-700' },
  { key: 'cancelado', label: 'Cancelado', icon: '❌', color: 'bg-red-600' }
];

interface TrackingViewProps {
  dispatches: Dispatch[];
  userId?: string;
}

const TrackingView: React.FC<TrackingViewProps> = ({ dispatches }) => {
  const [expandedDespachos, setExpandedDespachos] = useState<Set<string>>(new Set());
  const [viajesData, setViajesData] = useState<Record<string, Viaje[]>>({});
  const [selectedViaje, setSelectedViaje] = useState<{ despacho: Dispatch; viaje: Viaje } | null>(null);
  const [loadingViajes, setLoadingViajes] = useState<Set<string>>(new Set());
  const [despachosConRecursos, setDespachosConRecursos] = useState<Set<string>>(new Set());

  // Cargar despachos que tengan al menos UN viaje con chofer Y camión
  useEffect(() => {
    const loadDespachosConRecursos = async () => {
      const despachosIds = dispatches.map(d => d.id);
      
      // Query para obtener despachos que tienen viajes con chofer Y camión
      const { data: viajes } = await supabase
        .from('viajes_despacho')
        .select('despacho_id')
        .in('despacho_id', despachosIds)
        .not('chofer_id', 'is', null)
        .not('camion_id', 'is', null);
      
      if (viajes) {
        const despachoIdsConRecursos = new Set(viajes.map(v => v.despacho_id));
        setDespachosConRecursos(despachoIdsConRecursos);
      }
    };
    
    if (dispatches.length > 0) {
      loadDespachosConRecursos();
    }
  }, [dispatches]);

  // Filtrar solo despachos en estados activos Y que tengan viajes con recursos
  const ESTADOS_INACTIVOS = ['expirado', 'viaje_completado', 'entregado', 'cancelado', 'descarga_completada'];
  
  const despachosActivos = dispatches.filter(d => {
    // 1. Verificar que tenga estado activo
    if (d.estado && ESTADOS_INACTIVOS.includes(d.estado.toLowerCase())) {
      return false;
    }
    
    // 2. ✅ Verificar que tenga al menos un viaje con recursos asignados
    if (!despachosConRecursos.has(d.id)) {
      return false;
    }
    
    return true;
  });

  const toggleDespacho = async (despachoId: string) => {
    const newExpanded = new Set(expandedDespachos);
    
    if (newExpanded.has(despachoId)) {
      newExpanded.delete(despachoId);
      setExpandedDespachos(newExpanded);
    } else {
      newExpanded.add(despachoId);
      setExpandedDespachos(newExpanded);
      
      // 🔥 SIEMPRE recargar viajes para obtener datos actualizados
      setLoadingViajes(new Set([...loadingViajes, despachoId]));
      await loadViajes(despachoId);
      setLoadingViajes(prev => {
        const newSet = new Set(prev);
        newSet.delete(despachoId);
        return newSet;
      });
    }
  };

  const loadViajes = async (despachoId: string) => {
    console.log('🎯 TrackingView - loadViajes llamado para despacho:', despachoId);
    try {
      // Primero cargar viajes básicos
      const { data: viajes, error } = await supabase
        .from('viajes_despacho')
        .select(`
          id, 
          numero_viaje, 
          estado, 
          id_transporte, 
          chofer_id, 
          camion_id, 
          acoplado_id, 
          observaciones,
          estado_carga_viaje (
            estado_carga,
            fecha_planificacion,
            fecha_documentacion_preparada,
            fecha_cargando,
            fecha_carga_completada,
            fecha_descargando,
            fecha_descargado,
            peso_real_kg,
            cantidad_bultos
          )
        `)
        .eq('despacho_id', despachoId)
        .order('numero_viaje', { ascending: true });

      console.log(`🔎 TrackingView - Query result:`, {
        error,
        'viajes count': viajes?.length || 0,
        'viajes': viajes
      });

      if (error) {
        console.error('Error cargando viajes:', error);
        throw error;
      }

      if (!viajes || viajes.length === 0) {
        console.warn(`⚠️ TrackingView - No se encontraron viajes para despacho ${despachoId}`);
        setViajesData(prev => ({
          ...prev,
          [despachoId]: []
        }));
        return;
      }

      // Obtener IDs únicos
      const transporteIds = viajes.filter(v => v.id_transporte).map(v => v.id_transporte).filter((id, index, self) => self.indexOf(id) === index);
      const choferIds = viajes.filter(v => v.chofer_id).map(v => v.chofer_id).filter((id, index, self) => self.indexOf(id) === index);
      const camionIds = viajes.filter(v => v.camion_id).map(v => v.camion_id).filter((id, index, self) => self.indexOf(id) === index);
      const acopadoIds = viajes.filter(v => v.acoplado_id).map(v => v.acoplado_id).filter((id, index, self) => self.indexOf(id) === index);

      // Cargar datos relacionados en paralelo
      const [transportesData, choferesData, camionesData, acopadosData] = await Promise.all([
        transporteIds.length > 0 
          ? supabase.from('empresas').select('id, nombre, cuit').in('id', transporteIds)
          : Promise.resolve({ data: [] }),
        choferIds.length > 0
          ? supabase.from('choferes').select('id, nombre, apellido, dni, telefono, email').in('id', choferIds)
          : Promise.resolve({ data: [] }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente, modelo, marca, anio').in('id', camionIds)
          : Promise.resolve({ data: [] }),
        acopadoIds.length > 0
          ? supabase.from('acoplados').select('id, patente, marca, modelo, anio').in('id', acopadoIds)
          : Promise.resolve({ data: [] })
      ]);

      // Crear mapas para búsqueda rápida
      const transportesMap = (transportesData.data || []).reduce((acc: any, t: any) => ({ ...acc, [t.id]: t }), {});
      const choferesMap = (choferesData.data || []).reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
      const camionesMap = (camionesData.data || []).reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
      const acopadosMap = (acopadosData.data || []).reduce((acc: any, a: any) => ({ ...acc, [a.id]: a }), {});

      // Combinar datos
      const viajesCompletos: Viaje[] = viajes.map(v => {
        // Extraer estado_carga_viaje del array si es necesario
        const estadoCarga = Array.isArray(v.estado_carga_viaje) 
          ? v.estado_carga_viaje[0] 
          : v.estado_carga_viaje;
        
        // Combinar nombre y apellido del chofer
        const choferData = v.chofer_id && choferesMap[v.chofer_id] ? {
          ...choferesMap[v.chofer_id],
          nombre: `${choferesMap[v.chofer_id].nombre || ''} ${choferesMap[v.chofer_id].apellido || ''}`.trim()
        } : undefined;
          
        return {
          ...v,
          transporte: v.id_transporte ? transportesMap[v.id_transporte] : undefined,
          chofer: choferData,
          camion: v.camion_id ? camionesMap[v.camion_id] : undefined,
          acoplado: v.acoplado_id ? acopadosMap[v.acoplado_id] : undefined,
          estado_carga_viaje: estadoCarga || undefined // 🔥 Preservar estado dual de carga
        };
      });

      console.log('✅ TrackingView - Viajes cargados:', viajesCompletos.length);
      console.log('📦 TrackingView - Viajes completos:', viajesCompletos);

      setViajesData(prev => {
        const newState = {
          ...prev,
          [despachoId]: viajesCompletos
        };
        console.log('🔄 TrackingView - NUEVO ESTADO viajesData:', newState);
        return newState;
      });
    } catch (error) {
      console.error('Error cargando viajes:', error);
      setViajesData(prev => ({
        ...prev,
        [despachoId]: []
      }));
    }
  };

  const handleSelectViaje = (despacho: Dispatch, viaje: Viaje) => {
    setSelectedViaje({ despacho, viaje });
  };

  const getStatusColor = (estado: string) => {
    const estadoInfo = ESTADOS_VIAJE.find(e => e.key === estado);
    return estadoInfo?.color || 'bg-slate-600';
  };

  const getStatusLabel = (estado: string) => {
    const estadoInfo = ESTADOS_VIAJE.find(e => e.key === estado);
    return estadoInfo ? `${estadoInfo.icon} ${estadoInfo.label}` : estado;
  };

  const getEstadoIndex = (estado: string) => {
    return ESTADOS_VIAJE.findIndex(e => e.key === estado);
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
      {/* Panel Izquierdo: Lista de Despachos */}
      <div className="col-span-3 bg-[#1b273b] rounded-lg p-4 overflow-y-auto">
        <h3 className="text-lg font-bold text-cyan-400 mb-4 sticky top-0 bg-[#1b273b] pb-2 border-b border-gray-700">
          📦 Despachos Activos ({despachosActivos.length})
        </h3>

        {despachosActivos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <TruckIcon className="h-16 w-16 mx-auto mb-3 opacity-50" />
            <p>No hay despachos activos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {despachosActivos.map((despacho) => (
              <div key={despacho.id} className="bg-[#0a0e1a] rounded-lg overflow-hidden border border-gray-800">
                {/* Header del Despacho */}
                <div
                  onClick={() => toggleDespacho(despacho.id)}
                  className="p-3 cursor-pointer hover:bg-gray-800/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {expandedDespachos.has(despacho.id) ? (
                        <ChevronDownIcon className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-bold text-white text-sm">{despacho.pedido_id}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded uppercase">
                        {despacho.type === 'recepcion' ? 'RX' : 'TX'}
                      </span>
                    </div>
                    <div className="ml-6">
                      {/* Origen con Provincia */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-gray-500">📍 Origen:</span>
                        <div className="flex flex-col gap-0.5">
                          {despacho.origen_provincia && (
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                              {despacho.origen_provincia}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-white">{despacho.origen}</span>
                        </div>
                      </div>
                      {/* Destino con Provincia */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">🎯 Destino:</span>
                        <div className="flex flex-col gap-0.5">
                          {despacho.destino_provincia && (
                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wide">
                              {despacho.destino_provincia}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-white">{despacho.destino}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Viajes Expandida */}
                {expandedDespachos.has(despacho.id) && (
                  <div className="bg-[#0a0e1a]/50 border-t border-gray-800">
                    {(() => {
                      const viajes = viajesData[despacho.id];
                      const loading = loadingViajes.has(despacho.id);
                      console.log(`🔍 TrackingView RENDER - Despacho ${despacho.id}:`, {
                        'loading': loading,
                        'existe viajesData[despacho.id]': !!viajes,
                        'length': viajes?.length || 0,
                        'viajes': viajes
                      });
                      return null;
                    })()}
                    {loadingViajes.has(despacho.id) ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        Cargando viajes...
                      </div>
                    ) : viajesData[despacho.id]?.length ? (
                      <div className="divide-y divide-gray-800">
                        {viajesData[despacho.id]?.map(viaje => (
                          <div
                            key={viaje.id}
                            onClick={() => handleSelectViaje(despacho, viaje)}
                            className={`p-3 cursor-pointer transition-all ${
                              selectedViaje?.viaje.id === viaje.id
                                ? 'bg-cyan-900/40 border-l-4 border-cyan-500'
                                : 'hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono px-2 py-1 bg-blue-900 text-blue-200 rounded">
                                Viaje #{viaje.numero_viaje}
                              </span>
                              {viaje.estado_carga_viaje ? (
                                <EstadoDualBadge
                                  tipo="carga"
                                  estado={viaje.estado_carga_viaje.estado_carga}
                                  timestamp={viaje.estado_carga_viaje.fecha_carga_completada || viaje.estado_carga_viaje.fecha_cargando}
                                  size="sm"
                                />
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(viaje.estado)} text-white`}>
                                  {getStatusLabel(viaje.estado)}
                                </span>
                              )}
                            </div>
                            {viaje.transporte ? (
                              <p className="text-xs text-gray-300">
                                🚛 {viaje.transporte.nombre}
                              </p>
                            ) : (
                              <p className="text-xs text-orange-400">
                                Sin transporte asignado
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-xs">
                        No hay viajes registrados
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel Derecho: Mapa y Detalles */}
      <div className="col-span-9 bg-[#1b273b] rounded-lg p-4 flex flex-col h-[calc(100vh-12rem)]">
        {selectedViaje ? (
          <>
            {/* Header - Altura fija */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-cyan-400">
                  📍 Seguimiento en Tiempo Real
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedViaje.despacho.pedido_id} - Viaje #{selectedViaje.viaje.numero_viaje}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Transporte:</p>
                <p className="text-sm font-semibold text-white">
                  {selectedViaje.viaje.transporte?.nombre || 'Sin asignar'}
                </p>
              </div>
            </div>

            {/* Layout horizontal: Mapa (50%) | Detalles (50%) */}
            <div className="flex-1 flex gap-3 overflow-hidden">
              {/* Columna Izquierda: Mapa */}
              <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
                <TrackingMap 
                  origen={selectedViaje.despacho.origen}
                  destino={selectedViaje.despacho.destino}
                  transporteNombre={selectedViaje.viaje.transporte?.nombre}
                  viajeId={selectedViaje.viaje.id}
                  choferId={selectedViaje.viaje.chofer_id || undefined}
                />
                <div className="absolute top-4 right-4 bg-[#1b273b] px-3 py-2 rounded-lg border border-cyan-500/30 shadow-lg">
                  <p className="text-xs text-gray-400">Ubicación en tiempo real</p>
                  <p className="text-sm font-semibold text-cyan-400">
                    {selectedViaje.viaje.chofer_id ? '🟢 GPS Activo' : '⚪ Simulado'}
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Detalles */}
              <div className="flex-1 bg-[#0a0e1a] rounded-lg p-2 border border-gray-800 overflow-hidden flex flex-col">
                <h4 className="text-xs font-bold text-cyan-400 mb-2">📄 Detalles del Viaje</h4>
              
                {/* Grid con todos los datos - 4 columnas */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2 pb-2 border-b border-gray-800">
                  {/* Origen con Provincia - Destacado */}
                  <div className="col-span-1 bg-emerald-500/5 p-2 rounded border border-emerald-500/20">
                    <span className="text-emerald-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">📍 ORIGEN</span>
                    {selectedViaje.despacho.origen_provincia && (
                      <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wide block mb-0.5">
                        {selectedViaje.despacho.origen_provincia}
                      </span>
                    )}
                    <span className="text-white font-semibold text-xs block truncate">{selectedViaje.despacho.origen}</span>
                  </div>
                  
                  {/* Destino con Provincia - Destacado */}
                  <div className="col-span-1 bg-cyan-500/5 p-2 rounded border border-cyan-500/20">
                    <span className="text-cyan-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">🎯 DESTINO</span>
                    {selectedViaje.despacho.destino_provincia && (
                      <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wide block mb-0.5">
                        {selectedViaje.despacho.destino_provincia}
                      </span>
                    )}
                    <span className="text-white font-semibold text-xs block truncate">{selectedViaje.despacho.destino}</span>
                  </div>
                  
                  {/* Viaje */}
                  <div className="col-span-1">
                    <span className="text-gray-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">🔢 Viaje</span>
                    <span className="text-white font-bold text-sm">#{selectedViaje.viaje.numero_viaje}</span>
                  </div>

                  {/* Estado Carga */}
                  <div className="col-span-1">
                    <span className="text-gray-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">📊 Estado</span>
                  {selectedViaje.viaje.estado_carga_viaje ? (
                      <EstadoDualBadge
                        tipo="carga"
                        estado={selectedViaje.viaje.estado_carga_viaje.estado_carga}
                        timestamp={selectedViaje.viaje.estado_carga_viaje.fecha_carga_completada || selectedViaje.viaje.estado_carga_viaje.fecha_cargando}
                        size="sm"
                      />
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] inline-block ${getStatusColor(selectedViaje.viaje.estado)} text-white`}>
                        {getStatusLabel(selectedViaje.viaje.estado)}
                      </span>
                    )}
                  </div>
                  {/* Transporte */}
                  <div className="col-span-1">
                    <span className="text-gray-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">🚚 Transporte</span>
                    <span className="text-white font-medium text-xs block truncate">
                      {selectedViaje.viaje.transporte?.nombre || 'Sin asignar'}
                    </span>
                  </div>

                  {/* Chofer */}
                  <div className="col-span-1">
                    <span className="text-gray-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">👤 Chofer</span>
                    {selectedViaje.viaje.chofer ? (
                      <p className="text-white font-medium text-xs truncate">{selectedViaje.viaje.chofer.nombre}</p>
                    ) : (
                      <span className="text-orange-400 text-[10px]">Sin asignar</span>
                    )}
                  </div>

                  {/* Camión */}
                  <div className="col-span-1">
                    <span className="text-gray-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">🚛 Camión</span>
                    {selectedViaje.viaje.camion ? (
                      <p className="text-white font-bold text-xs">{selectedViaje.viaje.camion.patente}</p>
                    ) : (
                      <span className="text-orange-400 text-[10px]">Sin asignar</span>
                    )}
                  </div>

                  {/* Acoplado */}
                  <div className="col-span-1">
                    <span className="text-gray-400 block text-[9px] mb-0.5 font-semibold uppercase tracking-wider">🔗 Acoplado</span>
                    {selectedViaje.viaje.acoplado ? (
                      <p className="text-white font-bold text-xs">{selectedViaje.viaje.acoplado.patente}</p>
                    ) : (
                      <span className="text-gray-500 text-[10px] italic">Sin acoplado</span>
                    )}
                  </div>
                </div>

                {/* Cadena de Estados tipo Timeline Horizontal */}
                <div className="mt-2 flex-1 flex flex-col">
                  <h5 className="text-[9px] font-bold text-gray-400 mb-2 uppercase tracking-wider">🛣️ Estado del Viaje</h5>
                  <div className="relative flex-1">
                    <div className="flex items-center justify-between gap-0.5">
                  {ESTADOS_VIAJE.map((estado, index) => {
                    const estadoActualIndex = getEstadoIndex(selectedViaje.viaje.estado);
                    const isCompleted = index <= estadoActualIndex;
                    const isCurrent = index === estadoActualIndex;
                    
                    return (
                      <div key={estado.key} className="flex-1 relative">
                        {/* Línea conectora */}
                        {index < ESTADOS_VIAJE.length - 1 && (
                          <div className="absolute top-3 left-1/2 w-full h-0.5">
                            <div className={`h-full transition-all duration-500 ${
                              isCompleted ? 'bg-cyan-500' : 'bg-gray-700'
                            }`} />
                          </div>
                        )}
                        
                        {/* Círculo de estado */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-500 border
                            ${isCurrent 
                              ? 'bg-cyan-500 border-cyan-300 shadow-lg shadow-cyan-500/50 scale-110' 
                              : isCompleted 
                                ? 'bg-cyan-600 border-cyan-400' 
                                : 'bg-gray-700 border-gray-600'
                            }
                          `}>
                            {estado.icon}
                          </div>
                          <p className={`text-[8px] mt-1 text-center max-w-[60px] transition-colors leading-tight ${
                            isCurrent ? 'text-cyan-400 font-bold' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {estado.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <TruckIcon className="h-32 w-32 opacity-20 mb-6" />
            <h4 className="text-2xl font-semibold mb-2">Selecciona un viaje</h4>
            <p className="text-center max-w-md">
              Haz clic en un viaje de la lista para ver su ubicación en tiempo real en el mapa
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingView;
