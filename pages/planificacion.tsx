import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import MainLayout from '../components/layout/MainLayout';
import PlanningGrid from '../components/Planning/PlanningGrid';
import TrackingView from '../components/Planning/TrackingView';
import PlanningFilters, { FilterState } from '../components/Planning/PlanningFilters';
import ViewSelector, { ViewType } from '../components/Planning/ViewSelector';
import ExportButton from '../components/Planning/ExportButton';
import PlanningAlerts from '../components/Planning/PlanningAlerts';
import DayView from '../components/Planning/DayView';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type TabType = 'planning' | 'tracking';

const PlanificacionPage = () => {
  const { user, loading: userLoading } = useUserRole();
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [despachosOriginales, setDespachosOriginales] = useState<any[]>([]); // Para TrackingView
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('planning');
  const [viewType, setViewType] = useState<ViewType>('week');
  const [transportes, setTransportes] = useState<Array<{ id: string; nombre: string }>>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana actual, 1 = próxima, -1 = anterior
  
  // Estados de filtros
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    estado: '',
    prioridad: '',
    transporte: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // 🔥 NUEVO: Función para recargar datos después de reprogramar
  const reloadData = async () => {
    if (!user) return;
    
    setLoading(true);
    await loadData();
    setLoading(false);
  };

  // Función para aplicar filtros
  const applyFilters = (items: any[]) => {
    return items.filter(item => {
      // Búsqueda de texto
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          item.pedido_id?.toLowerCase().includes(searchLower) ||
          item.origen?.toLowerCase().includes(searchLower) ||
          item.destino?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtro de estado
      if (filters.estado && item.estado?.toLowerCase() !== filters.estado.toLowerCase()) {
        return false;
      }

      // Filtro de prioridad
      if (filters.prioridad && item.prioridad !== filters.prioridad) {
        return false;
      }

      // Filtro de transporte
      if (filters.transporte) {
        if (filters.transporte === '_sin_asignar') {
          if (item.transport_id) return false;
        } else {
          if (item.transport_id !== filters.transporte) return false;
        }
      }

      // Filtro de fecha desde
      if (filters.fechaDesde && item.scheduled_local_date) {
        if (item.scheduled_local_date < filters.fechaDesde) return false;
      }

      // Filtro de fecha hasta
      if (filters.fechaHasta && item.scheduled_local_date) {
        if (item.scheduled_local_date > filters.fechaHasta) return false;
      }

      return true;
    });
  };

  const handleClearFilters = () => {
    setFilters({
      searchText: '',
      estado: '',
      prioridad: '',
      transporte: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  };

  const loadData = async () => {
      if (!user) return; // Guard clause
      
      try {
        setLoading(true);
        console.log('📊 Cargando datos de planificación para usuario:', user.id);

        // 1. Cargar DESPACHOS creados por el usuario CON sus relaciones
        const { data: despachosData, error: despachosError } = await supabase
          .from('despachos')
          .select(`
            *
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: true });

        if (despachosError) {
          console.error('❌ Error al cargar despachos:', despachosError);
        }

        console.log('📦 Despachos cargados:', despachosData?.length || 0);
        console.log('👤 User ID:', user.id);

        // 1.5. Cargar datos de transportes, choferes y camiones de los despachos
        const transporteIds = (despachosData || [])
          .filter(d => d.transport_id)
          .map(d => d.transport_id);
        const choferIds = (despachosData || [])
          .filter(d => d.driver_id)
          .map(d => d.driver_id);
        const camionIds = (despachosData || [])
          .filter(d => d.truck_id)
          .map(d => d.truck_id);
        // Cargar datos relacionados en paralelo
        const [transportesResult, choferesResult, camionesResult] = await Promise.all([
          transporteIds.length > 0
            ? supabase.from('empresas').select('id, nombre, tipo_empresa').in('id', transporteIds)
            : Promise.resolve({ data: [], error: null }),
          choferIds.length > 0
            ? supabase.from('choferes').select('id, nombre, apellido, telefono').in('id', choferIds)
            : Promise.resolve({ data: [], error: null }),
          camionIds.length > 0
            ? supabase.from('camiones').select('id, patente, marca, modelo').in('id', camionIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        // 🔍 DEBUG: Ver errores en las queries
        if (transportesResult.error) console.error('❌ Error cargando transportes:', transportesResult.error);
        if (choferesResult.error) console.error('❌ Error cargando choferes:', choferesResult.error);
        if (camionesResult.error) console.error('❌ Error cargando camiones:', camionesResult.error);

        // Crear mapas para acceso rápido
        const transportesMap: Record<string, any> = {};
        const choferesMap: Record<string, any> = {};
        const camionesMap: Record<string, any> = {};

        transportesResult.data?.forEach(t => { transportesMap[t.id] = t; });
        choferesResult.data?.forEach(c => { 
          choferesMap[c.id] = {
            ...c,
            nombre_completo: `${c.nombre || ''} ${c.apellido || ''}`.trim()
          };
        });
        camionesResult.data?.forEach(c => { camionesMap[c.id] = c; });

        console.log('🚛 Transportes cargados:', Object.keys(transportesMap).length);
        console.log('👤 Choferes cargados:', Object.keys(choferesMap).length);
        console.log('🚗 Camiones cargados:', Object.keys(camionesMap).length);

        // 2. Cargar VIAJES para mapear en la grilla
        // Primero obtener IDs de despachos del usuario
        const despachoIds = (despachosData || []).map(d => d.id);
        console.log('📋 IDs de despachos del usuario:', despachoIds);

        let viajesData: any[] = [];
        let viajesError = null;

        if (despachoIds.length > 0) {
          const { data, error } = await supabase
            .from('viajes_despacho')
            .select(`
              id,
              numero_viaje,
              estado,
              id_transporte,
              id_camion,
              id_chofer,
              observaciones,
              created_at,
              despacho_id
            `)
            .in('despacho_id', despachoIds)
            .order('created_at', { ascending: true });
          
          viajesData = data || [];
          viajesError = error;
        }

        if (viajesError) {
          console.error('❌ Error al cargar viajes:', viajesError);
        }

        console.log('🚚 Viajes cargados:', viajesData?.length || 0);
        // console.log('📦 Datos de viajes completos:', JSON.stringify(viajesData, null, 2));
        
        // 🔍 DEBUG: Ver datos crudos de viajes
        if (viajesData && viajesData.length > 0) {
          console.log('🔍 Primer viaje crudo:', viajesData[0]);
          console.log('  - id_transporte:', viajesData[0].id_transporte);
          console.log('  - id_camion:', viajesData[0].id_camion);
          console.log('  - id_chofer:', viajesData[0].id_chofer);
        }

        // 2.5. Cargar datos de transportes, choferes y camiones de los VIAJES
        const viajeTransporteIds = (viajesData || [])
          .filter(v => v.id_transporte)
          .map(v => v.id_transporte);
        const viajeChoferIds = (viajesData || [])
          .filter(v => v.id_chofer)
          .map(v => v.id_chofer);
        const viajeCamionIds = (viajesData || [])
          .filter(v => v.id_camion)
          .map(v => v.id_camion);

        console.log('🔍 IDs de viajes:', {
          transportes: viajeTransporteIds,
          choferes: viajeChoferIds,
          camiones: viajeCamionIds
        });

        // Cargar datos adicionales para viajes
        const [moreTransportesResult, moreChoferesResult, moreCamionesResult] = await Promise.all([
          viajeTransporteIds.length > 0
            ? supabase.from('empresas').select('id, nombre, tipo_empresa').in('id', viajeTransporteIds)
            : Promise.resolve({ data: [], error: null }),
          viajeChoferIds.length > 0
            ? supabase.from('choferes').select('id, nombre, apellido, telefono').in('id', viajeChoferIds)
            : Promise.resolve({ data: [], error: null }),
          viajeCamionIds.length > 0
            ? supabase.from('camiones').select('id, patente, marca, modelo').in('id', viajeCamionIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        // 🔍 DEBUG: Ver errores en las queries de viajes
        if (moreTransportesResult.error) console.error('❌ Error cargando transportes de viajes:', moreTransportesResult.error);
        if (moreChoferesResult.error) console.error('❌ Error cargando choferes de viajes:', moreChoferesResult.error);
        if (moreCamionesResult.error) console.error('❌ Error cargando camiones de viajes:', moreCamionesResult.error);

        // Actualizar mapas con todos los datos
        moreTransportesResult.data?.forEach(t => { transportesMap[t.id] = t; });
        moreChoferesResult.data?.forEach(c => { 
          choferesMap[c.id] = {
            ...c,
            nombre_completo: `${c.nombre || ''} ${c.apellido || ''}`.trim()
          };
        });
        moreCamionesResult.data?.forEach(c => { camionesMap[c.id] = c; });

        console.log('🚛 Total transportes en mapa:', Object.keys(transportesMap).length);
        console.log('👤 Total choferes en mapa:', Object.keys(choferesMap).length);
        console.log('🚗 Total camiones en mapa:', Object.keys(camionesMap).length);

        // 3. Mapear DESPACHOS directamente (para mostrar los que aún no tienen viajes)
        const despachosMapeados = (despachosData || [])
          .filter(d => d.scheduled_local_date && d.scheduled_local_time) // Solo los que tienen fecha/hora
          .map((despacho: any) => {
            return {
              id: `despacho-${despacho.id}`, // ID único para diferenciar de viajes
              viaje_numero: 0, // Sin número de viaje
              pedido_id: despacho.pedido_id,
              origen: despacho.origen,
              destino: despacho.destino,
              estado: despacho.estado || 'pendiente',
              scheduled_local_date: despacho.scheduled_local_date,
              scheduled_local_time: despacho.scheduled_local_time,
              type: despacho.type || 'despacho',
              prioridad: despacho.prioridad || 'Media',
              transport_id: despacho.transport_id,
              despacho_id: despacho.id,
              observaciones: despacho.comentarios || '',
              transporte_data: despacho.transport_id ? transportesMap[despacho.transport_id] : null,
              camion_data: despacho.truck_id ? camionesMap[despacho.truck_id] : null,
              chofer: despacho.driver_id ? choferesMap[despacho.driver_id] : null
            };
          });

        console.log('📦 Despachos mapeados:', despachosMapeados.length);

        // 4. Mapear viajes a formato compatible con PlanningGrid
        const viajesMapeados = (viajesData || []).map((viaje: any) => {
          // Buscar el despacho padre
          const despachoPadre = (despachosData || []).find((d: any) => d.id === viaje.despacho_id);
          const tipo = despachoPadre?.type || 'despacho';
          
          // Obtener datos del viaje (prioridad 1)
          const transporteViaje = viaje.id_transporte ? transportesMap[viaje.id_transporte] : null;
          const camionViaje = viaje.id_camion ? camionesMap[viaje.id_camion] : null;
          const choferViaje = viaje.id_chofer ? choferesMap[viaje.id_chofer] : null;
          
          // Obtener datos del despacho padre como fallback (prioridad 2)
          const transporteDespacho = despachoPadre?.transport_id ? transportesMap[despachoPadre.transport_id] : null;
          const camionDespacho = despachoPadre?.truck_id ? camionesMap[despachoPadre.truck_id] : null;
          const choferDespacho = despachoPadre?.driver_id ? choferesMap[despachoPadre.driver_id] : null;
          
          // Usar el que esté disponible
          const transporteFinal = transporteViaje || transporteDespacho;
          const camionFinal = camionViaje || camionDespacho;
          const choferFinal = choferViaje || choferDespacho;
          
          console.log('🔍 [Mapeo] Viaje:', viaje.id, viaje.numero_viaje);
          console.log('  - viaje: transport:', viaje.id_transporte, 'camion:', viaje.id_camion, 'chofer:', viaje.id_chofer);
          console.log('  - despacho: transport:', despachoPadre?.transport_id, 'truck:', despachoPadre?.truck_id, 'driver:', despachoPadre?.driver_id);
          console.log('  - FINAL: transport:', transporteFinal?.nombre, 'camion:', camionFinal?.patente, 'chofer:', choferFinal?.nombre_completo);
          
          return {
            id: viaje.id,
            viaje_numero: viaje.numero_viaje,
            pedido_id: `${despachoPadre?.pedido_id || 'N/A'} - Viaje ${viaje.numero_viaje}`,
            origen: despachoPadre?.origen || 'N/A',
            destino: despachoPadre?.destino || 'N/A',
            estado: viaje.estado || 'pendiente',
            scheduled_local_date: despachoPadre?.scheduled_local_date,
            scheduled_local_time: despachoPadre?.scheduled_local_time,
            type: tipo,
            prioridad: despachoPadre?.prioridad || 'Media',
            transport_id: viaje.id_transporte || despachoPadre?.transport_id,
            despacho_id: viaje.despacho_id,
            observaciones: viaje.observaciones,
            // 🔥 Datos con prioridad: viaje > despacho padre
            transporte_data: transporteFinal,
            camion_data: camionFinal,
            chofer: choferFinal
          };
        });

        console.log('📋 Viajes mapeados para grilla:', viajesMapeados.length);

        // 5. Combinar despachos + viajes (evitar duplicados si un despacho ya tiene viajes)
        const idsDespachosConViajes = new Set(viajesMapeados.map(v => v.despacho_id));
        const despachosSinViajes = despachosMapeados.filter(d => !idsDespachosConViajes.has(d.despacho_id));
        const todosLosItems = [...viajesMapeados, ...despachosSinViajes];

        console.log('🔄 Total items (viajes + despachos sin viajes):', todosLosItems.length);

        // 6. Separar por tipo para las diferentes vistas
        setDispatches(todosLosItems.filter(v => v.type !== 'recepcion'));
        setRecepciones(todosLosItems.filter(v => v.type === 'recepcion'));
        
        // 7. Guardar despachos originales para el TrackingView
        setDespachosOriginales(despachosData || []);

        // 8. Cargar lista de transportes para filtros
        const { data: transportesData } = await supabase
          .from('empresas')
          .select('id, nombre')
          .eq('tipo_empresa', 'Transporte')
          .order('nombre');
        
        if (transportesData) {
          setTransportes(transportesData);
        }

        console.log('📋 Despachos completos para tracking:', despachosData?.length || 0);

      } catch (error) {
        console.error('💥 Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (userLoading || !user) return;
    loadData();
  }, [user, userLoading]);

  // Aplicar filtros globalmente
  const filteredDispatches = applyFilters(dispatches);
  const filteredRecepciones = applyFilters(recepciones);

  // Calcular métricas para resumen ejecutivo
  const getMetrics = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const viajesHoy = filteredDispatches.filter(v => v.scheduled_local_date === todayStr).length;
    const viajesUrgentes = filteredDispatches.filter(v => v.prioridad === 'Urgente' || v.prioridad === 'Alta').length;
    const viajesSinAsignar = filteredDispatches.filter(v => !v.transport_id && (v.estado === 'pendiente' || v.estado === 'transporte_asignado')).length;

    return {
      hoy: viajesHoy,
      urgentes: viajesUrgentes,
      semana: filteredDispatches.length,
      sinAsignar: viajesSinAsignar
    };
  };

  const metrics = getMetrics();

  return (
    <MainLayout pageTitle="Planificación">
      {/* Barra de herramientas superior */}
      {!loading && (
        <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
          <ViewSelector currentView={viewType} onViewChange={setViewType} />
          <ExportButton 
            dispatches={applyFilters(dispatches)} 
            title="Planificación" 
          />
        </div>
      )}

      {/* Filtros */}
      {!loading && (
        <PlanningFilters
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={handleClearFilters}
          transportes={transportes}
          totalResults={applyFilters([...dispatches, ...recepciones]).length}
        />
      )}

      {/* Alertas */}
      {!loading && (
        <PlanningAlerts
          dispatches={applyFilters(dispatches)}
          onDismiss={(alertId) => {
            const newDismissed = new Set(dismissedAlerts);
            newDismissed.add(alertId);
            setDismissedAlerts(newDismissed);
          }}
        />
      )}

      {/* 🔥 NUEVO: Resumen Ejecutivo */}
      {!loading && activeTab === 'planning' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          {/* Hoy */}
          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Hoy</p>
              <p className="text-sm font-bold text-white">{metrics.hoy}</p>
            </div>
            <div className="text-cyan-400 text-xl">📅</div>
          </div>
          
          {/* Urgentes */}
          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Urgentes</p>
              <p className="text-sm font-bold text-white">{metrics.urgentes}</p>
            </div>
            <div className="text-orange-400 text-xl">⚠️</div>
          </div>
          
          {/* Esta Semana */}
          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">
                {viewType === 'day' ? 'Hoy' : viewType === 'week' ? 'Esta Semana' : 'Este Mes'}
              </p>
              <p className="text-sm font-bold text-white">{metrics.semana}</p>
            </div>
            <div className="text-green-400 text-xl">✅</div>
          </div>
          
          {/* Sin Asignar */}
          <div className="bg-[#1b273b] rounded p-1.5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[9px]">Sin Asignar</p>
              <p className="text-sm font-bold text-white">{metrics.sinAsignar}</p>
            </div>
            <div className="text-purple-400 text-xl">⏳</div>
          </div>
        </div>
      )}

      {/* 🔥 NUEVO: Tabs */}
      <div className="mb-2">
        <div className="flex gap-1 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-2 py-1 text-[10px] font-semibold transition-all ${
              activeTab === 'planning'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📅 Planificación Semanal
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-2 py-1 text-[10px] font-semibold transition-all ${
              activeTab === 'tracking'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📍 Seguimiento en Tiempo Real
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Cargando planificación..." />
        </div>
      ) : (
        <>
          {/* Vista de Planificación */}
          {activeTab === 'planning' && (
            <>
              {(() => {
                const toTimestamp = (item: any) => {
                  try {
                    if (item?.scheduled_local_date) {
                      const time = item?.scheduled_local_time || '00:00:00';
                      return new Date(`${item.scheduled_local_date}T${time}`).getTime();
                    }
                    if (item?.scheduled_at) return new Date(item.scheduled_at).getTime();
                  } catch (e) { /* ignore */ }
                  return 0;
                };

                // Ordenar despachos y recepciones filtradas
                const sortedDespachos = (filteredDispatches || []).slice().sort((a, b) => toTimestamp(a) - toTimestamp(b));
                const sortedRecepciones = (filteredRecepciones || []).slice().sort((a, b) => toTimestamp(a) - toTimestamp(b));

                // Renderizar según la vista seleccionada
                if (viewType === 'day') {
                  return (
                    <>
                      <DayView 
                        title="Despachos" 
                        dispatches={sortedDespachos} 
                        type="despachos"
                        onReschedule={reloadData}
                      />
                      <DayView 
                        title="Recepciones" 
                        dispatches={sortedRecepciones} 
                        type="recepciones"
                        onReschedule={reloadData}
                      />
                    </>
                  );
                } else if (viewType === 'week') {
                  return (
                    <>
                      <PlanningGrid 
                        title="Planificación Semanal - Despachos" 
                        dispatches={filteredDispatches} 
                        type="despachos"
                        onReschedule={reloadData}
                        weekOffset={weekOffset}
                      />
                      <PlanningGrid 
                        title="Planificación Semanal - Recepciones" 
                        dispatches={filteredRecepciones} 
                        type="recepciones"
                        onReschedule={reloadData}
                        weekOffset={weekOffset}
                      />
                    </>
                  );
                } else {
                  // Vista mensual (pendiente)
                  return (
                    <div className="bg-[#1b273b] rounded p-2 text-center">
                      <div className="text-6xl mb-4">📅</div>
                      <h3 className="text-xl font-bold text-cyan-400 mb-2">Vista Mensual</h3>
                      <p className="text-gray-400">Próximamente disponible</p>
                    </div>
                  );
                }

                return (
                  <>
                    <PlanningGrid 
                      title="Planificación Semanal - Despachos" 
                      dispatches={sortedDespachos} 
                      type="despachos"
                      onReschedule={reloadData}
                    />
                    <PlanningGrid 
                      title="Planificación Semanal - Recepciones" 
                      dispatches={sortedRecepciones} 
                      type="recepciones"
                      onReschedule={reloadData}
                    />
                  </>
                );
              })()}
            </>
          )}

          {/* 🔥 NUEVO: Vista de Seguimiento */}
          {activeTab === 'tracking' && user && (
            <TrackingView dispatches={despachosOriginales} userId={user.id} />
          )}
        </>
      )}
    </MainLayout>
  );
};

export default PlanificacionPage;
