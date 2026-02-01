import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import AceptarDespachoModal from '../../components/Transporte/AceptarDespachoModal';
import RechazarViajeModal from '../../components/Transporte/RechazarViajeModal';
import AsignarUnidadModal from '../../components/Transporte/AsignarUnidadModal';

interface Despacho {
  id: string;
  viaje_numero?: number;
  despacho_id?: string;
  pedido_id: string;
  origen: string;
  origen_id?: string;
  origen_ciudad?: string;
  origen_provincia?: string;
  destino: string;
  destino_id?: string;
  destino_ciudad?: string;
  destino_provincia?: string;
  destino_latitud?: number;
  destino_longitud?: number;
  distancia_estimada_km?: number;
  scheduled_local_date: string;
  scheduled_local_time: string;
  producto?: string;
  cantidad?: number;
  unidad_carga?: string;
  distancia_km?: number;
  observaciones?: string;
  prioridad?: string;
  created_at: string;
  estado_viaje?: string;
  tiene_chofer?: boolean;
  tiene_camion?: boolean;
  chofer_nombre?: string;
  chofer_apellido?: string;
  chofer_telefono?: string;
  camion_patente?: string;
  camion_marca?: string;
  camion_modelo?: string;
  // Campos de cancelación
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  cancelado_por_nombre?: string;
  // 🌐 RED NODEXIA
  origen_asignacion?: 'directo' | 'red_nodexia';
}

const DespachosOfrecidos = () => {
  const { user, userEmpresas } = useUserRole();
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [filteredDespachos, setFilteredDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [origenFilter, setOrigenFilter] = useState('');
  const [destinoFilter, setDestinoFilter] = useState('');
  const [estadoTab, setEstadoTab] = useState<'pendientes' | 'asignados' | 'rechazados' | 'cancelados'>('pendientes');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [selectedDespacho, setSelectedDespacho] = useState<Despacho | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [viajeToReject, setViajeToReject] = useState<Despacho | null>(null);
  const [showAsignarUnidadModal, setShowAsignarUnidadModal] = useState(false);

  // Listas para filtros
  const [origenes, setOrigenes] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);

  useEffect(() => {
    if (user && userEmpresas) {
      loadDespachos();
    }
  }, [user, userEmpresas]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, fechaFilter, origenFilter, destinoFilter, estadoTab, despachos]);

  const loadDespachos = async () => {
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

      // 🔥 CORREGIDO: Cargar TODOS los VIAJES asignados a esta empresa de transporte
      // incluyendo pendientes, asignados, cancelados para poder filtrarlos por tab
      console.log('🔍 Buscando viajes para empresa:', empresaId);
      console.log('🔍 EmpresaId completo:', empresaId);
      
      // 🐛 DEBUG: Query sin JOIN para ver TODOS los viajes
      const { data: viajesDebug } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, despacho_id, id_transporte')
        .eq('id_transporte', empresaId)
        .limit(10);
      
      console.log('🐛 DEBUG - Viajes sin JOIN:', viajesDebug?.length || 0, viajesDebug);
      
      const { data: viajesData, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          estado,
          chofer_id,
          camion_id,
          despacho_id,
          id_transporte,
          observaciones,
          motivo_cancelacion,
          fecha_cancelacion,
          cancelado_por,
          origen_asignacion,
          despachos!inner (
            id,
            pedido_id,
            origen,
            origen_id,
            destino,
            destino_id,
            scheduled_local_date,
            scheduled_local_time,
            prioridad,
            created_at,
            origen_ubicacion:ubicaciones!despachos_origen_id_fkey(ciudad, provincia),
            destino_ubicacion:ubicaciones!despachos_destino_id_fkey(ciudad, provincia, latitud, longitud)
          ),
          estado_unidad_viaje (
            estado_unidad,
            fecha_confirmacion_chofer,
            fecha_inicio_transito_origen,
            fecha_arribo_origen,
            fecha_inicio_transito_destino,
            fecha_arribo_destino
          )
        `)
        .or(`id_transporte.eq.${empresaId},id_transporte_cancelado.eq.${empresaId}`)
        .in('estado', ['pendiente', 'asignado', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer', 'en_transito_origen', 'arribo_origen', 'en_transito_destino', 'arribo_destino', 'cancelado', 'cancelado_por_transporte'])
        .order('created_at', { ascending: true });

      console.log('📊 Query ejecutado con filtros:', {
        id_transporte: empresaId,
        estados: ['pendiente', 'transporte_asignado', 'camion_asignado', 'cancelado']
      });

      if (viajesError) {
        console.error('❌ Error al cargar viajes:', viajesError);
        throw viajesError;
      }

      console.log('📦 Viajes asignados cargados:', viajesData?.length || 0);
      console.log('📦 Primer viaje:', viajesData?.[0]);
      console.log('📦 Todos los viajes:', viajesData?.map(v => ({
        numero_viaje: v.numero_viaje,
        pedido_id: (v.despachos as any)?.pedido_id,
        estado: v.estado,
        id_transporte: v.id_transporte
      })));

      // Obtener IDs únicos de choferes, camiones y usuarios que cancelaron
      const choferIds = [...new Set(viajesData?.map((v: any) => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set(viajesData?.map((v: any) => v.camion_id).filter(Boolean))];
      const canceladoPorIds = [...new Set(viajesData?.map((v: any) => v.cancelado_por).filter(Boolean))];

      // Cargar datos de choferes, camiones y usuarios en paralelo
      const [choferesData, camionesData, usuariosData] = await Promise.all([
        choferIds.length > 0
          ? supabase.from('choferes').select('id, nombre, apellido, telefono').in('id', choferIds)
          : Promise.resolve({ data: [] }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente, marca, modelo').in('id', camionIds)
          : Promise.resolve({ data: [] }),
        canceladoPorIds.length > 0
          ? supabase.from('usuarios').select('id, nombre_completo').in('id', canceladoPorIds)
          : Promise.resolve({ data: [] })
      ]);

      // Crear mapas para acceso rápido
      const choferesMap = new Map((choferesData.data || []).map((ch: any) => [ch.id, ch]));
      const camionesMap = new Map((camionesData.data || []).map((ca: any) => [ca.id, ca]));
      const usuariosMap = new Map((usuariosData.data || []).map((u: any) => [u.id, u]));

      // Mapear viajes a formato de despacho para compatibilidad con el UI
      const despachosFormateados = (viajesData || []).map((viaje: any) => {
        const chofer = viaje.chofer_id ? choferesMap.get(viaje.chofer_id) : null;
        const camion = viaje.camion_id ? camionesMap.get(viaje.camion_id) : null;
        const canceladoPor = viaje.cancelado_por ? usuariosMap.get(viaje.cancelado_por) : null;
        
        // Extraer datos de ubicaciones
        const origenUbicacion = viaje.despachos?.origen_ubicacion;
        const destinoUbicacion = viaje.despachos?.destino_ubicacion;
        
        const despacho: Despacho = {
          id: viaje.id,
          viaje_numero: viaje.numero_viaje,
          despacho_id: viaje.despachos?.id,
          pedido_id: `${viaje.despachos?.pedido_id || 'N/A'} - Viaje #${viaje.numero_viaje}`,
          origen: viaje.despachos?.origen || 'N/A',
          origen_id: viaje.despachos?.origen_id,
          origen_ciudad: origenUbicacion?.ciudad,
          origen_provincia: origenUbicacion?.provincia,
          destino: viaje.despachos?.destino || 'N/A',
          destino_id: viaje.despachos?.destino_id,
          destino_ciudad: destinoUbicacion?.ciudad,
          destino_provincia: destinoUbicacion?.provincia,
          destino_latitud: destinoUbicacion?.latitud,
          destino_longitud: destinoUbicacion?.longitud,
          scheduled_local_date: viaje.despachos?.scheduled_local_date,
          scheduled_local_time: viaje.despachos?.scheduled_local_time,
          producto: viaje.observaciones || 'Carga general',
          observaciones: viaje.observaciones,
          prioridad: viaje.despachos?.prioridad,
          created_at: viaje.despachos?.created_at,
          estado_viaje: viaje.estado,
          tiene_chofer: !!viaje.chofer_id,
          tiene_camion: !!viaje.camion_id,
          chofer_nombre: chofer?.nombre,
          chofer_apellido: chofer?.apellido,
          chofer_telefono: chofer?.telefono,
          camion_patente: camion?.patente,
          camion_marca: camion?.marca,
          camion_modelo: camion?.modelo,
          motivo_cancelacion: viaje.motivo_cancelacion,
          fecha_cancelacion: viaje.fecha_cancelacion,
          cancelado_por_nombre: canceladoPor?.nombre_completo,
          origen_asignacion: viaje.origen_asignacion
        };
        return despacho;
      });

      console.log('📋 Despachos formateados:', despachosFormateados.length);
      console.log('📋 Primer despacho:', despachosFormateados[0]);

      setDespachos(despachosFormateados as Despacho[]);

      // Extraer origenes y destinos únicos para filtros
      const uniqueOrigenes = [...new Set(despachosFormateados.map(d => d.origen).filter(Boolean))];
      const uniqueDestinos = [...new Set(despachosFormateados.map(d => d.destino).filter(Boolean))];
      setOrigenes(uniqueOrigenes);
      setDestinos(uniqueDestinos);

    } catch (err: any) {
      console.error('Error cargando despachos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...despachos];

    // Filtro por estado/tab
    if (estadoTab === 'pendientes') {
      // Viajes sin recursos asignados completamente (falta chofer O camión)
      filtered = filtered.filter(d => 
        (!d.tiene_chofer || !d.tiene_camion) &&
        (d.estado_viaje as string) !== 'cancelado' &&
        (d.estado_viaje as string) !== 'cancelado_por_transporte'
      );
    } else if (estadoTab === 'asignados') {
      // ✅ FIX: Viajes con chofer Y camión asignados, independiente del estado específico
      filtered = filtered.filter(d => 
        d.tiene_chofer && 
        d.tiene_camion && 
        (d.estado_viaje as string) !== 'cancelado' &&
        (d.estado_viaje as string) !== 'cancelado_por_transporte'
      );
    } else if (estadoTab === 'rechazados') {
      // SOLO viajes rechazados/cancelados definitivamente
      filtered = filtered.filter(d => d.estado_viaje === 'cancelado');
    } else if (estadoTab === 'cancelados') {
      // SOLO viajes cancelados por nosotros (transporte)
      filtered = filtered.filter(d => d.estado_viaje === 'cancelado_por_transporte');
    }

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        d =>
          d.pedido_id.toLowerCase().includes(term) ||
          d.origen.toLowerCase().includes(term) ||
          d.destino.toLowerCase().includes(term) ||
          d.producto?.toLowerCase().includes(term)
      );
    }

    // Filtro por fecha
    if (fechaFilter) {
      filtered = filtered.filter(d => d.scheduled_local_date === fechaFilter);
    }

    // Filtro por origen
    if (origenFilter) {
      filtered = filtered.filter(d => d.origen === origenFilter);
    }

    // Filtro por destino
    if (destinoFilter) {
      filtered = filtered.filter(d => d.destino === destinoFilter);
    }

    setFilteredDespachos(filtered);
  };

  const handleAceptarDespacho = (despacho: Despacho) => {
    // Abrir modal de asignación inteligente de unidades
    setSelectedDespacho(despacho);
    setShowAsignarUnidadModal(true);
  };

  const handleRechazarDespacho = async (despacho: Despacho) => {
    setViajeToReject(despacho);
    setShowRechazarModal(true);
  };

  const handleCancelarViaje = async (despacho: Despacho) => {
    setViajeToReject(despacho);
    setShowRechazarModal(true);
  };

  const confirmRechazarViaje = async (motivo: string) => {
    if (!viajeToReject) return;

    try {
      console.log('🚫 Iniciando cancelación de viaje:', viajeToReject.id);
      
      // Obtener datos del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Usuario actual:', user?.id);
      
      // Obtener datos del viaje actual
      const { data: viajeActual, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('*, despachos(pedido_id)')
        .eq('id', viajeToReject.id)
        .single();

      if (viajeError) {
        console.error('❌ Error obteniendo viaje:', viajeError);
        throw viajeError;
      }

      console.log('📦 Viaje actual:', viajeActual);

      // Actualizar viaje a estado 'cancelado_por_transporte'
      const updateData = {
        estado: 'cancelado_por_transporte',
        id_transporte_cancelado: viajeActual.id_transporte,
        id_transporte: null,
        chofer_id: null,
        camion_id: null,
        fecha_cancelacion: new Date().toISOString(),
        cancelado_por: user?.id,
        motivo_cancelacion: motivo,
        observaciones: `CANCELADO POR TRANSPORTE: ${motivo} (${new Date().toLocaleString('es-AR')})`
      };

      console.log('📝 Datos de actualización:', updateData);

      const { error } = await supabase
        .from('viajes_despacho')
        .update(updateData)
        .eq('id', viajeToReject.id);

      if (error) {
        console.error('❌ Error actualizando viaje:', error);
        console.error('❌ Detalle completo:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Viaje cancelado por transporte, liberado para reasignación');

      // Cerrar modal primero
      setShowRechazarModal(false);
      setViajeToReject(null);

      // Esperar un momento antes de recargar
      await new Promise(resolve => setTimeout(resolve, 300));

      // Recargar despachos
      await loadDespachos();

    } catch (err: any) {
      console.error('💥 Error cancelando viaje:', err);
      throw new Error(err.message || 'Error al cancelar el viaje');
    }
  };

  const getPrioridadBadge = (prioridad?: string) => {
    if (!prioridad) return null;

    const colors = {
      alta: 'bg-red-500/20 text-red-400 border-red-500/30',
      media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      baja: 'bg-green-500/20 text-green-400 border-green-500/30'
    };

    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${colors[prioridad as keyof typeof colors] || ''}`}>
        {prioridad.toUpperCase()}
      </span>
    );
  };

  // Calcular métricas para badges de status
  const sinAsignar = despachos.filter(d => 
    (!d.tiene_chofer || !d.tiene_camion) && 
    !['cancelado', 'cancelado_por_transporte'].includes(d.estado_viaje as string)
  ).length;
  
  const enTransito = despachos.filter(d => 
    ['en_transito_origen', 'en_transito_destino', 'arribo_origen', 'arribo_destino'].includes(d.estado_viaje as string)
  ).length;
  
  const ahora = new Date();
  const en4Horas = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);
  const viajesUrgentes = despachos.filter(d => {
    if (!d.scheduled_local_date || !d.scheduled_local_time) return false;
    const fechaViaje = new Date(`${d.scheduled_local_date}T${d.scheduled_local_time}`);
    return fechaViaje >= ahora && fechaViaje <= en4Horas && (!d.tiene_chofer || !d.tiene_camion);
  }).length;

  return (
    <AdminLayout pageTitle="Despachos Ofrecidos">
      <div className="w-full px-4">
        {/* Título más grande */}
        <h1 className="text-3xl font-bold text-white mb-4">Despachos Ofrecidos</h1>
        
        {/* 🆕 Badges de Status de Flota - Inspirado en Uber Freight */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {/* Total Disponibles */}
          <div className="bg-[#1b273b] border border-cyan-800/50 rounded-lg p-3 hover:border-cyan-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs font-medium">📦 Total Viajes</span>
              <TruckIcon className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-white">{despachos.length}</p>
            <p className="text-[10px] text-gray-500 mt-1">disponibles</p>
          </div>

          {/* Sin Asignar - URGENTE */}
          <div className="bg-[#1b273b] border border-orange-800/50 rounded-lg p-3 hover:border-orange-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 text-xs font-medium">⚠️ Sin Asignar</span>
              <ClockIcon className="h-5 w-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-white">{sinAsignar}</p>
            <p className="text-[10px] text-orange-400 mt-1">necesitan recursos</p>
          </div>

          {/* Urgentes (próximas 4h) */}
          <div className="bg-[#1b273b] border border-red-800/50 rounded-lg p-3 hover:border-red-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-xs font-medium">🔥 Urgentes</span>
              <ClockIcon className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">{viajesUrgentes}</p>
            <p className="text-[10px] text-red-400 mt-1">próximas 4h</p>
          </div>

          {/* En Tránsito */}
          <div className="bg-[#1b273b] border border-blue-800/50 rounded-lg p-3 hover:border-blue-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-xs font-medium">🚛 En Tránsito</span>
              <TruckIcon className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{enTransito}</p>
            <p className="text-[10px] text-gray-500 mt-1">activos ahora</p>
          </div>

          {/* Alta Prioridad */}
          <div className="bg-[#1b273b] border border-purple-800/50 rounded-lg p-3 hover:border-purple-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-xs font-medium">⭐ Alta Prioridad</span>
              <CheckCircleIcon className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {despachos.filter(d => d.prioridad === 'alta').length}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">prioritarios</p>
          </div>
        </div>

        {/* 🆕 Tabs más grandes y legibles */}
        <div className="bg-[#1b273b] rounded-lg p-2 mb-4 border border-gray-800 flex gap-2">
          <button
            onClick={() => setEstadoTab('pendientes')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'pendientes'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClockIcon className="h-4 w-4" />
              <span>Pendientes</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                {despachos.filter(d => 
                  (!d.tiene_chofer || !d.tiene_camion) &&
                  !['cancelado', 'cancelado_por_transporte'].includes(d.estado_viaje as string)
                ).length}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setEstadoTab('asignados')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'asignados'
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="h-4 w-4" />
              <span>Asignados</span>
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                {despachos.filter(d => 
                  d.tiene_chofer && 
                  d.tiene_camion &&
                  !['cancelado', 'cancelado_por_transporte'].includes(d.estado_viaje as string)
                ).length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setEstadoTab('rechazados')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'rechazados'
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircleIcon className="h-4 w-4" />
              <span>Rechazados</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                {despachos.filter(d => d.estado_viaje === 'cancelado').length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setEstadoTab('cancelados')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              estadoTab === 'cancelados'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#0a0e1a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircleIcon className="h-4 w-4" />
              <span>Cancelados</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                {despachos.filter(d => d.estado_viaje === 'cancelado_por_transporte').length}
              </span>
            </div>
          </button>
        </div>

        {/* Filtros - ultra compactos */}
        <div className="bg-[#1b273b] rounded p-1.5 mb-2 border border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <FunnelIcon className="h-3 w-3 text-gray-400" />
              <span className="text-white font-semibold text-xs">Filtros</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-cyan-400 hover:text-cyan-300 text-[10px] font-medium"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Buscar</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pedido, origen..."
                    className="w-full pl-6 pr-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Fecha</label>
                <input
                  type="date"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Origen</label>
                <select
                  value={origenFilter}
                  onChange={(e) => setOrigenFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  {origenes.map(origen => (
                    <option key={origen} value={origen}>{origen}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-[9px] mb-1">Destino</label>
                <select
                  value={destinoFilter}
                  onChange={(e) => setDestinoFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#0a0e1a] border border-gray-700 rounded text-white text-[10px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Todos</option>
                  {destinos.map(destino => (
                    <option key={destino} value={destino}>{destino}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Métricas de Cancelación - Solo visible en tab Cancelados */}
        {estadoTab === 'cancelados' && (
          <div className="bg-[#1b273b] rounded-lg p-6 mb-6 border border-orange-800">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <XCircleIcon className="h-6 w-6 text-orange-400" />
              Métricas de Cancelaciones
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Total cancelados */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <p className="text-gray-400 text-sm mb-1">Total Cancelados</p>
                <p className="text-3xl font-bold text-orange-400">
                  {despachos.filter(d => d.estado_viaje === 'cancelado_por_transporte').length}
                </p>
              </div>

              {/* Cancelados este mes */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <p className="text-gray-400 text-sm mb-1">Este Mes</p>
                <p className="text-3xl font-bold text-orange-400">
                  {despachos.filter(d => {
                    if (d.estado_viaje !== 'cancelado_por_transporte' || !d.fecha_cancelacion) return false;
                    const fechaCancelacion = new Date(d.fecha_cancelacion);
                    const ahora = new Date();
                    return fechaCancelacion.getMonth() === ahora.getMonth() &&
                           fechaCancelacion.getFullYear() === ahora.getFullYear();
                  }).length}
                </p>
              </div>

              {/* Motivos más comunes */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800 col-span-2">
                <p className="text-gray-400 text-sm mb-2">Motivo Más Común</p>
                <p className="text-lg font-semibold text-white">
                  {(() => {
                    const cancelados = despachos.filter(d => d.estado_viaje === 'cancelado_por_transporte');
                    if (cancelados.length === 0) return 'N/A';
                    
                    const motivos = cancelados.reduce((acc: any, d) => {
                      const motivo = d.motivo_cancelacion || 'Sin motivo especificado';
                      acc[motivo] = (acc[motivo] || 0) + 1;
                      return acc;
                    }, {});
                    
                    const motivoMasComun = Object.entries(motivos).sort((a: any, b: any) => b[1] - a[1])[0];
                    return motivoMasComun ? `${motivoMasComun[0]} (${motivoMasComun[1]} veces)` : 'N/A';
                  })()}
                </p>
              </div>
            </div>

            {/* Tabla de motivos */}
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
              <h4 className="text-white font-semibold mb-3">Distribución de Motivos</h4>
              <div className="space-y-2">
                {(() => {
                  const cancelados = despachos.filter(d => d.estado_viaje === 'cancelado_por_transporte');
                  if (cancelados.length === 0) {
                    return <p className="text-gray-400 text-sm">No hay cancelaciones registradas</p>;
                  }
                  
                  const motivos = cancelados.reduce((acc: any, d) => {
                    const motivo = d.motivo_cancelacion || 'Sin motivo especificado';
                    acc[motivo] = (acc[motivo] || 0) + 1;
                    return acc;
                  }, {});
                  
                  return Object.entries(motivos)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([motivo, cantidad]: any) => {
                      const porcentaje = ((cantidad / cancelados.length) * 100).toFixed(1);
                      return (
                        <div key={motivo} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white text-sm">{motivo}</span>
                              <span className="text-gray-400 text-sm">{cantidad} ({porcentaje}%)</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full transition-all"
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Lista de despachos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Cargando despachos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : filteredDespachos.length === 0 ? (
          <div className="bg-[#1b273b] rounded-lg p-12 text-center border border-gray-800">
            <TruckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay despachos disponibles</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredDespachos.map((despacho) => (
              <div
                key={despacho.id}
                className="bg-[#1b273b] rounded border border-gray-800 hover:border-cyan-500/30 transition-colors p-2"
              >
                <div className="flex items-center gap-2">
                  {/* Pedido ID */}
                  <div className="min-w-[120px] flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{despacho.pedido_id}</span>
                    {despacho.origen_asignacion === 'red_nodexia' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-0.5">
                        🌐 Red
                      </span>
                    )}
                  </div>

                  {/* Recursos */}
                  <div className="flex items-center gap-1 min-w-[200px]">
                    {despacho.tiene_chofer ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {despacho.chofer_nombre}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Sin Chofer
                      </span>
                    )}
                    {despacho.tiene_camion ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <TruckIcon className="h-3 w-3" />
                        {despacho.camion_patente}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Sin Camión
                      </span>
                    )}
                  </div>

                  {/* Ruta */}
                  <div className="flex-1 flex items-center gap-2 text-xs text-gray-300 truncate">
                    <MapPinIcon className="h-3 w-3 text-green-400 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="truncate font-medium text-white">{despacho.origen}</span>
                      {(despacho.origen_ciudad || despacho.origen_provincia) && (
                        <span className="text-[10px] text-gray-500">
                          {despacho.origen_ciudad}{despacho.origen_ciudad && despacho.origen_provincia ? ', ' : ''}{despacho.origen_provincia}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-600 mx-1">→</span>
                    <MapPinIcon className="h-3 w-3 text-orange-400 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="truncate font-medium text-white">{despacho.destino}</span>
                      {(despacho.destino_ciudad || despacho.destino_provincia) && (
                        <span className="text-[10px] text-gray-500">
                          {despacho.destino_ciudad}{despacho.destino_ciudad && despacho.destino_provincia ? ', ' : ''}{despacho.destino_provincia}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fecha */}
                  <div className="flex items-center gap-2 min-w-[150px]">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <ClockIcon className="h-4 w-4 text-cyan-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-cyan-400">
                          {despacho.scheduled_local_date ? 
                            new Date(despacho.scheduled_local_date + 'T00:00:00').toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: '2-digit'}) :
                            'Sin fecha'
                          }
                        </span>
                        <span className="text-[10px] text-cyan-300/70">{despacho.scheduled_local_time || 'Sin hora'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prioridad */}
                  {getPrioridadBadge(despacho.prioridad)}

                  {/* Acciones - Botones mejorados */}
                  <div className="flex items-center gap-2">
                    {(!despacho.tiene_chofer || !despacho.tiene_camion) && 
                     despacho.estado_viaje !== 'cancelado' && 
                     despacho.estado_viaje !== 'cancelado_por_transporte' && (
                      <>
                        <button
                          onClick={() => handleAceptarDespacho(despacho)}
                          className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                          title={despacho.tiene_chofer || despacho.tiene_camion ? 'Completar recursos' : 'Asignar recursos'}
                        >
                          {despacho.tiene_chofer || despacho.tiene_camion ? '✅ Completar' : '🚛 Asignar'}
                        </button>
                        <button
                          onClick={() => handleRechazarDespacho(despacho)}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                          title="Rechazar este viaje"
                        >
                          ❌ Rechazar
                        </button>
                      </>
                    )}
                    
                    {despacho.tiene_chofer && despacho.tiene_camion && 
                     despacho.estado_viaje !== 'cancelado' && 
                     despacho.estado_viaje !== 'cancelado_por_transporte' && (
                      <>
                        <button
                          onClick={() => handleAceptarDespacho(despacho)}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                          title="Modificar recursos asignados"
                        >
                          ✏️ Modificar
                        </button>
                        <button
                          onClick={() => handleCancelarViaje(despacho)}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                          title="Cancelar viaje asignado"
                        >
                          🚫 Cancelar
                        </button>
                      </>
                    )}

                    {despacho.estado_viaje === 'cancelado' && (
                      <span className="px-3 py-1.5 bg-red-900/30 border border-red-700 text-red-400 rounded-lg text-xs font-semibold">
                        ❌ Rechazado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para aceptar despacho */}
      {showModal && selectedDespacho && (
        <AceptarDespachoModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedDespacho(null);
          }}
          despacho={selectedDespacho}
          onSuccess={() => {
            setShowModal(false);
            setSelectedDespacho(null);
            // Pequeño delay para que el modal se cierre antes de recargar
            setTimeout(() => {
              loadDespachos();
            }, 100);
          }}
        />
      )}

      {/* Modal de asignación inteligente de unidades */}
      {showAsignarUnidadModal && selectedDespacho && (
        <AsignarUnidadModal
          isOpen={showAsignarUnidadModal}
          onClose={() => {
            setShowAsignarUnidadModal(false);
            setSelectedDespacho(null);
          }}
          despacho={{
            id: selectedDespacho.despacho_id || selectedDespacho.id,
            viaje_id: selectedDespacho.id,
            pedido_id: selectedDespacho.pedido_id,
            origen: selectedDespacho.origen,
            origen_id: selectedDespacho.origen_id,
            origen_ciudad: selectedDespacho.origen_ciudad,
            origen_provincia: selectedDespacho.origen_provincia,
            destino: selectedDespacho.destino,
            destino_id: selectedDespacho.destino_id,
            destino_ciudad: selectedDespacho.destino_ciudad,
            destino_provincia: selectedDespacho.destino_provincia,
            scheduled_local_date: selectedDespacho.scheduled_local_date,
            scheduled_local_time: selectedDespacho.scheduled_local_time
          }}
          onSuccess={() => {
            setShowAsignarUnidadModal(false);
            setSelectedDespacho(null);
            setTimeout(() => {
              loadDespachos();
            }, 100);
          }}
        />
      )}

      {/* Modal para rechazar viaje */}
      {showRechazarModal && viajeToReject && (
        <RechazarViajeModal
          isOpen={showRechazarModal}
          onClose={() => {
            setShowRechazarModal(false);
            setViajeToReject(null);
          }}
          viaje={{
            id: viajeToReject.id,
            pedido_id: viajeToReject.pedido_id,
            ...(viajeToReject.viaje_numero && { viaje_numero: viajeToReject.viaje_numero }),
            origen: viajeToReject.origen,
            destino: viajeToReject.destino
          } as any}
          onConfirm={confirmRechazarViaje}
        />
      )}
    </AdminLayout>
  );
};

export default DespachosOfrecidos;
