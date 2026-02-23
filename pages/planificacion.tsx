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
import MonthView from '../components/Planning/MonthView';
import ViajesExpiradosModal from '../components/Modals/ViajesExpiradosModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { calcularEstadoOperativo } from '../lib/estados';

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
  const [weekOffset] = useState(0); // 0 = semana actual, 1 = próxima, -1 = anterior
  
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

        // 0. Obtener la empresa del usuario actual y su CUIT
        const { data: usuarioEmpresa, error: empresaError } = await supabase
          .from('usuarios_empresa')
          .select(`
            empresa_id,
            empresa:empresas!inner(
              id,
              nombre,
              cuit,
              tipo_empresa
            )
          `)
          .eq('user_id', user.id)
          .eq('activo', true)
          .single();

        if (empresaError) {
          console.error('❌ Error al obtener empresa del usuario:', empresaError);
        }

        const empresaActual = usuarioEmpresa?.empresa as any;
        const cuitEmpresa = empresaActual?.cuit as string;
        console.log('🏢 Empresa del usuario:', empresaActual?.nombre, '- CUIT:', cuitEmpresa);

        // 1. Cargar DESPACHOS de toda la empresa (no solo del usuario actual)
        // Obtener todos los usuarios de la misma empresa
        const { data: companyUsersData } = await supabase
          .from('usuarios_empresa')
          .select('user_id')
          .eq('empresa_id', empresaActual?.id)
          .eq('activo', true);

        const allCompanyUserIds = [...new Set((companyUsersData || []).map(u => u.user_id).filter(Boolean))];
        // Siempre incluir al usuario actual
        if (!allCompanyUserIds.includes(user.id)) {
          allCompanyUserIds.push(user.id);
        }

        const { data: despachosData, error: despachosError } = await supabase
          .from('despachos')
          .select(`
            *
          `)
          .in('created_by', allCompanyUserIds)
          .order('created_at', { ascending: true });

        if (despachosError) {
          console.error('❌ Error al cargar despachos:', despachosError);
        }

        console.log('📦 Despachos de la empresa:', despachosData?.length || 0);

        // 1.5. Cargar RECEPCIONES - despachos donde esta empresa es el destino
        //   Cadena: despachos.destino_id → ubicaciones.empresa_id = mi empresa
        //   Fallback: ubicaciones.cuit = mi empresa.cuit (por si empresa_id no está poblado)
        let recepcionesData: any[] = [];
        const miEmpresaId = empresaActual?.id;
        if (miEmpresaId) {
          // Buscar ubicaciones por empresa_id directo O por CUIT match
          const ubicacionFilters = cuitEmpresa
            ? `empresa_id.eq.${miEmpresaId},cuit.eq.${cuitEmpresa}`
            : `empresa_id.eq.${miEmpresaId}`;
          const { data: ubicaciones, error: ubicacionesError } = await supabase
            .from('ubicaciones')
            .select('id')
            .or(ubicacionFilters);

          if (ubicacionesError) {
            console.error('❌ Error al buscar ubicaciones por empresa_id:', ubicacionesError);
          } else if (ubicaciones && ubicaciones.length > 0) {
            const ubicacionIds = ubicaciones.map(u => u.id);
            console.log('📍 Ubicaciones de mi empresa:', ubicacionIds.length);

            // Buscar despachos cuyo destino_id apunte a una de mis ubicaciones
            // Excluir los creados por mi propia empresa (ya aparecen en Despachos)
            const { data: despachosRecepcion, error: recepcionError } = await supabase
              .from('despachos')
              .select('*')
              .in('destino_id', ubicacionIds)
              .not('created_by', 'in', `(${allCompanyUserIds.join(',')})`)
              .order('created_at', { ascending: true });

            console.log('📥 Recepciones encontradas:', despachosRecepcion?.length || 0);

            if (recepcionError) {
              console.error('❌ Error al cargar recepciones:', recepcionError);
            } else {
              recepcionesData = despachosRecepcion || [];
            }
          } else {
            console.warn('⚠️ No se encontraron ubicaciones para empresa:', miEmpresaId);
          }
        } else {
          console.warn('⚠️ No hay empresa_id para buscar recepciones');
        }

        // Combinar despachos propios + recepciones
        const todosLosDespachos = [
          ...(despachosData || []),
          ...(recepcionesData || [])
        ];

        console.log('📦 Total despachos (propios + recepciones):', todosLosDespachos.length);
        console.log('👤 User ID:', user.id);

        // 1.5. Cargar datos de transportes, choferes y camiones de los despachos
        const transporteIds = todosLosDespachos
          .filter(d => d.transport_id)
          .map(d => d.transport_id);
        const choferIds = todosLosDespachos
          .filter(d => d.driver_id)
          .map(d => d.driver_id);
        const camionIds = todosLosDespachos
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
        // Primero obtener IDs de todos los despachos (propios + recepciones)
        const despachoIds = todosLosDespachos.map(d => d.id);
        console.log('📋 IDs de despachos del usuario (propios + recepciones):', despachoIds);

        let viajesData: any[] = [];
        let viajesError = null;

        if (despachoIds.length > 0) {
          const { data, error } = await supabase
            .from('viajes_despacho')
            .select(`
              id,
              numero_viaje,
              estado,
              estado_carga,
              estado_unidad,
              id_transporte,
              camion_id,
              chofer_id,
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
          console.log('  - camion_id:', viajesData[0].camion_id);
          console.log('  - chofer_id:', viajesData[0].chofer_id);
        }

        // 2.5. Cargar datos de transportes, choferes y camiones de los VIAJES
        const viajeTransporteIds = (viajesData || [])
          .filter(v => v.id_transporte)
          .map(v => v.id_transporte);
        const viajeChoferIds = (viajesData || [])
          .filter(v => v.chofer_id)
          .map(v => v.chofer_id);
        const viajeCamionIds = (viajesData || [])
          .filter(v => v.camion_id)
          .map(v => v.camion_id);

        console.log('🔍 IDs de viajes:', {
          transportes: viajeTransporteIds,
          choferes: viajeChoferIds,
          camiones: viajeCamionIds
        });

        // Cargar datos adicionales para viajes (RLS corregido en migración 052)
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

        // 🔥 NUEVO: Cargar ubicaciones de origen y destino para obtener provincias
        const origenIds = todosLosDespachos
          .filter(d => d.origen_id)
          .map(d => d.origen_id);
        const destinoIds = todosLosDespachos
          .filter(d => d.destino_id)
          .map(d => d.destino_id);
        const todasUbicacionIds = [...new Set([...origenIds, ...destinoIds])];

        let ubicacionesMap: Record<string, any> = {};
        if (todasUbicacionIds.length > 0) {
          const { data: ubicacionesData, error: ubicacionesError } = await supabase
            .from('ubicaciones')
            .select('id, nombre, provincia, ciudad, direccion, latitud, longitud')
            .in('id', todasUbicacionIds);

          if (ubicacionesError) {
            console.error('❌ Error cargando ubicaciones:', ubicacionesError);
          } else {
            ubicacionesData?.forEach(u => { ubicacionesMap[u.id] = u; });
            console.log('📍 Ubicaciones cargadas:', Object.keys(ubicacionesMap).length);
          }
        }

        // 3. Mapear DESPACHOS directamente (para mostrar los que aún no tienen viajes)
        const companyUserIdsSet = new Set(allCompanyUserIds);
        const despachosMapeados = todosLosDespachos
          .filter(d => d.scheduled_local_date && d.scheduled_local_time) // Solo los que tienen fecha/hora
          .map((despacho: any) => {
            // Determinar si es una recepción (no fue creado por ningún usuario de mi empresa)
            const esRecepcion = !companyUserIdsSet.has(despacho.created_by);
            const ubicacionOrigen = despacho.origen_id ? ubicacionesMap[despacho.origen_id] : null;
            const ubicacionDestino = despacho.destino_id ? ubicacionesMap[despacho.destino_id] : null;
            
            return {
              id: `despacho-${despacho.id}`, // ID único para diferenciar de viajes
              viaje_numero: 0, // Sin número de viaje
              pedido_id: despacho.pedido_id,
              origen: despacho.origen,
              destino: despacho.destino,
              origen_provincia: ubicacionOrigen?.provincia || null,
              destino_provincia: ubicacionDestino?.provincia || null,
              estado: despacho.estado || 'pendiente',
              scheduled_local_date: despacho.scheduled_local_date,
              scheduled_local_time: despacho.scheduled_local_time,
              type: esRecepcion ? 'recepcion' : (despacho.type || 'despacho'),
              prioridad: despacho.prioridad || 'Media',
              transport_id: despacho.transport_id,
              despacho_id: despacho.id,
              observaciones: despacho.comentarios || '',
              transporte_data: despacho.transport_id ? transportesMap[despacho.transport_id] : null,
              camion_data: despacho.truck_id ? camionesMap[despacho.truck_id] : null,
              chofer_data: despacho.driver_id ? choferesMap[despacho.driver_id] : null,
              chofer: despacho.driver_id ? choferesMap[despacho.driver_id] : null
            };
          });

        console.log('📦 Despachos mapeados:', despachosMapeados.length);

        // 4. Mapear viajes a formato compatible con PlanningGrid
        const viajesMapeados = (viajesData || []).map((viaje: any) => {
          // Buscar el despacho padre
          const despachoPadre = todosLosDespachos.find((d: any) => d.id === viaje.despacho_id);
          // Determinar si es recepción (no creado por ningún usuario de mi empresa)
          const esRecepcion = despachoPadre && !companyUserIdsSet.has(despachoPadre.created_by);
          const tipo = esRecepcion ? 'recepcion' : (despachoPadre?.type || 'despacho');
          
          // Obtener ubicaciones de origen y destino
          const ubicacionOrigen = despachoPadre?.origen_id ? ubicacionesMap[despachoPadre.origen_id] : null;
          const ubicacionDestino = despachoPadre?.destino_id ? ubicacionesMap[despachoPadre.destino_id] : null;
          
          // Obtener datos del viaje (prioridad 1) desde los maps cargados al inicio
          const transporteViaje = viaje.id_transporte ? transportesMap[viaje.id_transporte] : null;
          const camionViaje = viaje.camion_id ? camionesMap[viaje.camion_id] : null;
          const choferViaje = viaje.chofer_id ? choferesMap[viaje.chofer_id] : null;
          
          // Obtener datos del despacho padre como fallback (prioridad 2)
          const transporteDespacho = despachoPadre?.transport_id ? transportesMap[despachoPadre.transport_id] : null;
          const camionDespacho = despachoPadre?.truck_id ? camionesMap[despachoPadre.truck_id] : null;
          const choferDespacho = despachoPadre?.driver_id ? choferesMap[despachoPadre.driver_id] : null;
          
          // Usar el que esté disponible
          const transporteFinal = transporteViaje || transporteDespacho;
          const camionFinal = camionViaje || camionDespacho;
          const choferFinal = choferViaje || choferDespacho;
          
          console.log('🔍 [Mapeo] Viaje:', viaje.id, viaje.numero_viaje);
          console.log('  - viaje: transport:', viaje.id_transporte, 'camion:', viaje.camion_id, 'chofer:', viaje.chofer_id);
          console.log('  - despacho: transport:', despachoPadre?.transport_id, 'truck:', despachoPadre?.truck_id, 'driver:', despachoPadre?.driver_id);
          console.log('  - FINAL: transport:', transporteFinal?.nombre, 'camion:', camionFinal?.patente, 'chofer:', choferFinal?.nombre_completo);
          
          // 🔥 NUEVO: Calcular estado operativo en tiempo real
          // Priorizar recursos del viaje, si no existen usar los del despacho padre
          const choferIdFinal = viaje.chofer_id || despachoPadre?.driver_id;
          const camionIdFinal = viaje.camion_id || despachoPadre?.truck_id;
          
          // 🔥 CRÍTICO: Construir scheduled_at si no existe (combinar date + time)
          let scheduledAtFinal = despachoPadre?.scheduled_at;
          if (!scheduledAtFinal && despachoPadre?.scheduled_local_date) {
            const timeStr = despachoPadre.scheduled_local_time || '00:00:00';
            scheduledAtFinal = `${despachoPadre.scheduled_local_date}T${timeStr}`;
          }
          
          // 🔥 IMPORTANTE: Usar 'estado' (más confiable) en lugar de 'estado_carga'
          // porque estado_carga puede quedar desactualizado
          const estadoParaCalculo = viaje.estado || viaje.estado_carga || 'pendiente';
          
          const estadoOperativoInfo = calcularEstadoOperativo({
            estado_carga: estadoParaCalculo,
            estado_unidad: viaje.estado_unidad,
            chofer_id: choferIdFinal,
            camion_id: camionIdFinal,
            scheduled_local_date: despachoPadre?.scheduled_local_date,
            scheduled_local_time: despachoPadre?.scheduled_local_time,
            scheduled_at: scheduledAtFinal
          });
          
          console.log(`📊 [VIAJE ${viaje.numero_viaje}] Estado operativo:`, {
            // Datos de entrada
            estado: viaje.estado,
            estado_carga: viaje.estado_carga,
            estado_usado_para_calculo: estadoParaCalculo,
            chofer_id_viaje: viaje.chofer_id,
            camion_id_viaje: viaje.camion_id,
            chofer_id_despacho: despachoPadre?.driver_id,
            camion_id_despacho: despachoPadre?.truck_id,
            chofer_id_final: choferIdFinal,
            camion_id_final: camionIdFinal,
            scheduled_at_original: despachoPadre?.scheduled_at,
            scheduled_at_construido: scheduledAtFinal,
            scheduled_local_date: despachoPadre?.scheduled_local_date,
            scheduled_local_time: despachoPadre?.scheduled_local_time,
            // Resultado
            estado_operativo: estadoOperativoInfo.estadoOperativo,
            razon: estadoOperativoInfo.razon,
            tiene_recursos: estadoOperativoInfo.tieneRecursos,
            esta_demorado: estadoOperativoInfo.estaDemorado,
            minutos_retraso: estadoOperativoInfo.minutosRetraso
          });

          return {
            id: viaje.id,
            viaje_numero: viaje.numero_viaje,
            pedido_id: `${despachoPadre?.pedido_id || 'N/A'} - Viaje ${viaje.numero_viaje}`,
            origen: despachoPadre?.origen || 'N/A',
            destino: despachoPadre?.destino || 'N/A',
            origen_provincia: ubicacionOrigen?.provincia || null,
            destino_provincia: ubicacionDestino?.provincia || null,
            estado: viaje.estado || 'pendiente',
            estado_unidad: viaje.estado_unidad,
            // 🔥 NUEVO: Estado operativo calculado
            estado_operativo: estadoOperativoInfo.estadoOperativo,
            estado_operativo_razon: estadoOperativoInfo.razon,
            tiene_recursos: estadoOperativoInfo.tieneRecursos,
            esta_demorado: estadoOperativoInfo.estaDemorado,
            minutos_retraso: estadoOperativoInfo.minutosRetraso,
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
            chofer_data: choferFinal,
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
        
        // 7. Guardar despachos originales para el TrackingView (con provincia)
        const despachosConProvincia = todosLosDespachos.map(d => {
          const uOrigen = ubicacionesMap[d.origen_id];
          const uDestino = ubicacionesMap[d.destino_id];
          return {
            ...d,
            origen_provincia: uOrigen?.provincia || null,
            destino_provincia: uDestino?.provincia || null,
            origen_direccion: uOrigen?.direccion || null,
            origen_ciudad: uOrigen?.ciudad || null,
            origen_latitud: uOrigen?.latitud || null,
            origen_longitud: uOrigen?.longitud || null,
            destino_direccion: uDestino?.direccion || null,
            destino_ciudad: uDestino?.ciudad || null,
            destino_latitud: uDestino?.latitud || null,
            destino_longitud: uDestino?.longitud || null,
          };
        });
        setDespachosOriginales(despachosConProvincia);

        // 8. Cargar lista de transportes para filtros
        const { data: transportesData } = await supabase
          .from('empresas')
          .select('id, nombre')
          .eq('tipo_empresa', 'Transporte')
          .order('nombre');
        
        if (transportesData) {
          setTransportes(transportesData);
        }

        // 🔥 NUEVO: Cargar métricas de expiración
        const { data: metricas, error: metricasError } = await supabase
          .rpc('get_metricas_expiracion');
        
        if (metricasError) {
          console.error('❌ Error al cargar métricas de expiración:', metricasError);
        } else {
          setMetricasExpiracion(metricas?.[0] || null);
          console.log('📊 Métricas de expiración:', metricas?.[0]);
        }

        console.log('📋 Despachos completos para tracking:', todosLosDespachos.length);

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

  // Estado para métricas de expiración
  const [metricasExpiracion, setMetricasExpiracion] = useState<any>(null);
  const [showExpiradosModal, setShowExpiradosModal] = useState(false);

  // Calcular métricas para resumen ejecutivo - FILTRADO POR VISTA (DÍA/SEMANA/MES)
  const getMetrics = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determinar rango de fechas según viewType
    let startDate: Date;
    let endDate: Date;
    
    if (viewType === 'day') {
      // Solo hoy
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (viewType === 'week') {
      // Esta semana (lunes a domingo)
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diffToMonday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Este mes
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Filtrar despachos por rango de fechas
    const dispatchesInRange = filteredDispatches.filter(v => {
      if (!v.scheduled_local_date) return false;
      const viajeDate = new Date(v.scheduled_local_date + 'T00:00:00');
      return viajeDate >= startDate && viajeDate <= endDate;
    });

    const viajesHoy = dispatchesInRange.filter(v => {
      const todayStr = today.toISOString().split('T')[0];
      return v.scheduled_local_date === todayStr;
    }).length;
    
    const viajesUrgentes = dispatchesInRange.filter(v => 
      v.prioridad === 'Urgente' || v.prioridad === 'Alta'
    ).length;
    
    const viajesSinAsignar = dispatchesInRange.filter(v => 
      !v.transport_id && (v.estado === 'pendiente' || v.estado === 'transporte_asignado')
    ).length;
    
    // 🔥 NUEVO: Filtrar por estado_operativo calculado
    const viajesExpirados = dispatchesInRange.filter(v => 
      (v as any).estado_operativo === 'expirado'
    ).length;
    
    const viajesDemorados = dispatchesInRange.filter(v => 
      (v as any).estado_operativo === 'demorado'
    ).length;
    
    // Mantener fuera_horario para compatibilidad (deprecated)
    const viajesFueraHorario = dispatchesInRange.filter(v => 
      (v as any).estado_unidad === 'fuera_de_horario'
    ).length;

    // Contar despachos/viajes por provincia EN EL RANGO
    const provinciaCount: Record<string, number> = {};
    dispatchesInRange.forEach(dispatch => {
      const provincia = (dispatch as any).destino_provincia || (dispatch as any).origen_provincia;
      if (provincia) {
        provinciaCount[provincia] = (provinciaCount[provincia] || 0) + 1;
      }
    });

    // Ordenar por cantidad descendente y tomar top 5
    const topProvincias = Object.entries(provinciaCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      hoy: viajesHoy,
      urgentes: viajesUrgentes,
      semana: dispatchesInRange.length, // Total en el rango
      sinAsignar: viajesSinAsignar,
      fuera_horario: viajesFueraHorario, // Deprecated
      demorados: viajesDemorados, // 🔥 NUEVO
      expirados: viajesExpirados,
      provincias: topProvincias
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

      {/* 🔥 Resumen Ejecutivo - BADGES PRIMERO */}
      {!loading && activeTab === 'planning' && (
        <div className="grid grid-cols-6 gap-2 mb-3">
          {/* Urgentes */}
          <div className="bg-gradient-to-br from-[#1b273b] to-[#0f1821] rounded-lg p-3 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Urgentes</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.urgentes}</p>
              </div>
              <div className="text-orange-400 text-2xl bg-orange-500/10 p-2 rounded-lg">⚠️</div>
            </div>
          </div>
          
          {/* Esta Semana/Mes */}
          <div className="bg-gradient-to-br from-[#1b273b] to-[#0f1821] rounded-lg p-3 border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wider truncate">
                  {viewType === 'day' ? 'Hoy' : viewType === 'week' ? 'Esta Semana' : 'Este Mes'}
                </p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.semana}</p>
              </div>
              <div className="text-emerald-400 text-2xl bg-emerald-500/10 p-2 rounded-lg">✅</div>
            </div>
          </div>
          
          {/* Sin Asignar */}
          <div className="bg-gradient-to-br from-[#1b273b] to-[#0f1821] rounded-lg p-3 border border-purple-500/20 hover:border-purple-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Sin Asignar</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.sinAsignar}</p>
              </div>
              <div className="text-purple-400 text-2xl bg-purple-500/10 p-2 rounded-lg">⏳</div>
            </div>
          </div>

          {/* 🔥 NUEVO: Viajes Demorados (en curso pero fuera de horario) */}
          <div 
            className="bg-gradient-to-br from-[#2d2a1a] to-[#1a180f] rounded-lg p-3 border border-orange-500/30 hover:border-orange-500/50 transition-all shadow-lg group"
            title="Viajes en curso pero demorados (fuera de ventana de 2h)"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Demorados</p>
                <p className="text-2xl font-bold text-orange-400 mt-1 group-hover:scale-110 transition-transform">
                  {metrics.demorados || 0}
                </p>
                <p className="text-[9px] text-gray-500 mt-0.5">Con recursos asignados</p>
              </div>
              <div className="text-orange-400 text-2xl bg-orange-500/10 p-2 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                ⏰
              </div>
            </div>
          </div>

          {/* 🔥 NUEVO: Viajes Expirados (sin recursos) */}
          <div 
            onClick={() => setShowExpiradosModal(true)}
            className="bg-gradient-to-br from-[#2d1a1a] to-[#1a0f0f] rounded-lg p-3 border border-red-500/30 hover:border-red-500/50 transition-all shadow-lg cursor-pointer group"
            title="Click para ver detalles de viajes expirados"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider">Expirados</p>
                <p className="text-2xl font-bold text-red-400 mt-1 group-hover:scale-110 transition-transform">
                  {metrics.expirados}
                </p>
                {metricasExpiracion && (
                  <p className="text-[9px] text-gray-500 mt-1">
                    Total: {metricasExpiracion.total_expirados || 0}
                  </p>
                )}
              </div>
              <div className="text-red-400 text-2xl bg-red-500/10 p-2 rounded-lg group-hover:bg-red-500/20 transition-colors">
                ⚠️
              </div>
            </div>
            
            {/* Detalles al hacer hover */}
            {metricasExpiracion && metricasExpiracion.total_expirados > 0 && (
              <div className="mt-2 pt-2 border-t border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-400">Sin chofer:</span>
                    <span className="text-red-300 font-semibold">{metricasExpiracion.por_falta_chofer}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-400">Sin camión:</span>
                    <span className="text-red-300 font-semibold">{metricasExpiracion.por_falta_camion}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-gray-400">Sin ambos:</span>
                    <span className="text-red-300 font-semibold">{metricasExpiracion.por_falta_ambos}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🌎 Provincias */}
          <div className="bg-gradient-to-br from-[#1b273b] to-[#0f1821] rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition-all shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">Por Provincia</p>
              <div className="text-blue-400 text-lg bg-blue-500/10 p-1.5 rounded-lg">🌎</div>
            </div>
            <div className="space-y-1 max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {metrics.provincias.length > 0 ? (
                metrics.provincias.map(([provincia, count]) => (
                  <div key={provincia} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 truncate flex-1 font-medium">{provincia}</span>
                    <span className="text-white font-bold bg-blue-500/20 px-1.5 py-0.5 rounded ml-1">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-[9px] text-gray-500 italic">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Tabs Planificación/Seguimiento - AGRANDADOS */}
      <div className="mb-3">
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'planning'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📅 Planificación {viewType === 'day' ? 'Diaria' : viewType === 'week' ? 'Semanal' : 'Mensual'}
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
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
          <LoadingSpinner size="lg" text="Cargando planificación..." variant="logo" color="primary" />
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
                  // Vista mensual
                  return (
                    <>
                      <MonthView 
                        title="Despachos" 
                        dispatches={sortedDespachos} 
                        type="despachos"
                      />
                      <MonthView 
                        title="Recepciones" 
                        dispatches={sortedRecepciones} 
                        type="recepciones"
                      />
                    </>
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

      {/* 🔥 NUEVO: Modal de Viajes Expirados */}
      <ViajesExpiradosModal 
        isOpen={showExpiradosModal}
        onClose={() => setShowExpiradosModal(false)}
      />
    </MainLayout>
  );
};

export default PlanificacionPage;
