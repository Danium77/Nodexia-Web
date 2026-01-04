// components/Planning/TrackingView.tsx
import React, { useState } from 'react';
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
          📦 Despachos Activos ({dispatches.length})
        </h3>

        {dispatches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <TruckIcon className="h-16 w-16 mx-auto mb-3 opacity-50" />
            <p>No hay despachos activos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dispatches.map(despacho => (
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
                    <p className="text-xs text-gray-400 ml-6">
                      📍 {despacho.origen} → {despacho.destino}
                    </p>
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

            {/* Mapa - Altura fija 280px */}
            <div className="h-[280px] bg-gray-900 rounded-lg overflow-hidden mb-3 relative flex-shrink-0">
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

            {/* Panel de Detalles - Sin scroll, compacto */}
            <div className="flex-1 bg-[#0a0e1a] rounded-lg p-2 border border-gray-800 overflow-hidden">
              <h4 className="text-xs font-bold text-cyan-400 mb-2">Деtalles del Viaje</h4>
              
              {/* Grid con todos los datos */}
              <div className="grid grid-cols-6 gap-2 text-xs mb-3 pb-2 border-b border-gray-800">
                {/* Origen y Destino */}
                <div>
                  <span className="text-gray-400 block text-[10px] mb-0.5">📍 Origen:</span>
                  <span className="text-white font-medium text-xs">{selectedViaje.despacho.origen}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] mb-0.5">🏭 Destino:</span>
                  <span className="text-white font-medium text-xs">{selectedViaje.despacho.destino}</span>
                </div>
                
                {/* Viaje y Estado */}
                <div>
                  <span className="text-gray-400 block text-[10px] mb-0.5">🔢 Viaje:</span>
                  <span className="text-white font-medium text-xs">#{selectedViaje.viaje.numero_viaje}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs mb-1">📊 Estado Carga:</span>
                  {selectedViaje.viaje.estado_carga_viaje ? (
                    <div className="space-y-2">
                      <EstadoDualBadge
                        tipo="carga"
                        estado={selectedViaje.viaje.estado_carga_viaje.estado_carga}
                        timestamp={selectedViaje.viaje.estado_carga_viaje.fecha_carga_completada || selectedViaje.viaje.estado_carga_viaje.fecha_cargando}
                        size="sm"
                      />
                      {selectedViaje.viaje.estado_carga_viaje.peso_real_kg && (
                        <p className="text-xs text-gray-400">
                          ⚖️ Peso: {selectedViaje.viaje.estado_carga_viaje.peso_real_kg} kg
                        </p>
                      )}
                      {selectedViaje.viaje.estado_carga_viaje.cantidad_bultos && (
                        <p className="text-xs text-gray-400">
                          📦 Bultos: {selectedViaje.viaje.estado_carga_viaje.cantidad_bultos}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs inline-block ${getStatusColor(selectedViaje.viaje.estado)} text-white`}>
                      {getStatusLabel(selectedViaje.viaje.estado)}
                    </span>
                  )}
                </div>

                {/* Transporte */}
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs mb-1">🚚 Transporte:</span>
                  <span className="text-white font-medium">
                    {selectedViaje.viaje.transporte?.nombre || 'Sin asignar'}
                  </span>
                </div>

                {/* Chofer */}
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs mb-1">👤 Chofer:</span>
                  {selectedViaje.viaje.chofer ? (
                    <div>
                      <p className="text-white font-medium">{selectedViaje.viaje.chofer.nombre}</p>
                      <p className="text-gray-400 text-xs">📞 {selectedViaje.viaje.chofer.telefono}</p>
                    </div>
                  ) : (
                    <span className="text-orange-400 text-xs">Sin asignar</span>
                  )}
                </div>

                {/* Camión */}
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs mb-1">🚛 Camión:</span>
                  {selectedViaje.viaje.camion ? (
                    <div>
                      <p className="text-white font-medium">{selectedViaje.viaje.camion.patente}</p>
                      <p className="text-gray-400 text-xs">{selectedViaje.viaje.camion.marca} {selectedViaje.viaje.camion.modelo}</p>
                    </div>
                  ) : (
                    <span className="text-orange-400 text-xs">Sin asignar</span>
                  )}
                </div>

                {/* Acoplado */}
                <div className="col-span-2">
                  <span className="text-gray-400 block text-xs mb-1">🔗 Acoplado:</span>
                  {selectedViaje.viaje.acoplado ? (
                    <p className="text-white font-medium">{selectedViaje.viaje.acoplado.patente}</p>
                  ) : (
                    <span className="text-gray-500 text-xs">Sin acoplado</span>
                  )}
                </div>
              </div>

              {/* Cadena de Estados tipo Timeline */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {ESTADOS_VIAJE.map((estado, index) => {
                    const estadoActualIndex = getEstadoIndex(selectedViaje.viaje.estado);
                    const isCompleted = index <= estadoActualIndex;
                    const isCurrent = index === estadoActualIndex;
                    
                    return (
                      <div key={estado.key} className="flex-1 relative">
                        {/* Línea conectora */}
                        {index < ESTADOS_VIAJE.length - 1 && (
                          <div className="absolute top-5 left-1/2 w-full h-1">
                            <div className={`h-full transition-all duration-500 ${
                              isCompleted ? 'bg-cyan-500' : 'bg-gray-700'
                            }`} />
                          </div>
                        )}
                        
                        {/* Círculo de estado */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500 border-2
                            ${isCurrent 
                              ? 'bg-cyan-500 border-cyan-300 shadow-lg shadow-cyan-500/50 scale-125 animate-pulse' 
                              : isCompleted 
                                ? 'bg-cyan-600 border-cyan-400' 
                                : 'bg-gray-700 border-gray-600'
                            }
                          `}>
                            {estado.icon}
                          </div>
                          <p className={`text-xs mt-2 text-center max-w-[80px] transition-colors ${
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

              {/* Observaciones si existen */}
              {selectedViaje.viaje.observaciones && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Observaciones:</p>
                  <p className="text-sm text-gray-300">{selectedViaje.viaje.observaciones}</p>
                </div>
              )}
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
