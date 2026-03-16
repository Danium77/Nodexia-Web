import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/contexts/UserRoleContext';

export interface DespachoOfrecido {
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
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  cancelado_por_nombre?: string;
  origen_asignacion?: 'directo' | 'red_nodexia';
}

export type EstadoTab = 'pendientes' | 'asignados' | 'rechazados' | 'cancelados';

const ESTADOS_AVANZADOS = [
  'cancelado', 'cancelado_por_transporte', 'pausado', 'confirmado_chofer',
  'en_transito_origen', 'en_transito_destino', 'ingresado_origen', 'llamado_carga',
  'cargando', 'cargado', 'egreso_origen', 'ingresado_destino', 'llamado_descarga',
  'descargando', 'descargado', 'egreso_destino'
];

const TODOS_ESTADOS = [
  'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
  'en_transito_origen', 'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
  'egreso_origen', 'en_transito_destino', 'ingresado_destino', 'llamado_descarga',
  'descargando', 'descargado', 'egreso_destino', 'completado',
  'cancelado', 'cancelado_por_transporte'
];

export default function useDespachosOfrecidos() {
  const { user, userEmpresas } = useUserRole();
  const [despachos, setDespachos] = useState<DespachoOfrecido[]>([]);
  const [filteredDespachos, setFilteredDespachos] = useState<DespachoOfrecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [origenFilter, setOrigenFilter] = useState('');
  const [destinoFilter, setDestinoFilter] = useState('');
  const [estadoTab, setEstadoTab] = useState<EstadoTab>('pendientes');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [selectedDespacho, setSelectedDespacho] = useState<DespachoOfrecido | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [viajeToReject, setViajeToReject] = useState<DespachoOfrecido | null>(null);
  const [showAsignarUnidadModal, setShowAsignarUnidadModal] = useState(false);

  // Listas para filtros
  const [origenes, setOrigenes] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);

  useEffect(() => {
    if (user && userEmpresas) {
      loadDespachos();
    }
  }, [user, userEmpresas]);

  // Realtime: Escuchar cambios en viajes_despacho
  useEffect(() => {
    if (!user || !userEmpresas) return;

    const empresaTransporte = userEmpresas.find(e => e.tipo === 'transporte');
    if (!empresaTransporte) return;

    const empresaId = empresaTransporte.empresa_id;

    const channel = supabase
      .channel('viajes-despacho-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viajes_despacho',
          filter: `id_transporte=eq.${empresaId}`
        },
        () => {
          loadDespachos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userEmpresas]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, fechaFilter, origenFilter, destinoFilter, estadoTab, despachos]);

  const loadDespachos = async () => {
    try {
      setLoading(true);
      setError('');

      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      const empresaId = empresaTransporte.empresa_id;

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
            origen_ubicacion:ubicaciones!fk_despachos_origen_ubicacion(ciudad, provincia),
            destino_ubicacion:ubicaciones!fk_despachos_destino_ubicacion(ciudad, provincia, latitud, longitud)
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
        .in('estado', TODOS_ESTADOS)
        .order('created_at', { ascending: true });

      if (viajesError) throw viajesError;

      // Obtener IDs únicos de choferes, camiones y usuarios que cancelaron
      const choferIds = [...new Set(viajesData?.map((v: any) => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set(viajesData?.map((v: any) => v.camion_id).filter(Boolean))];
      const canceladoPorIds = [...new Set(viajesData?.map((v: any) => v.cancelado_por).filter(Boolean))];

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

      const choferesMap = new Map((choferesData.data || []).map((ch: any) => [ch.id, ch]));
      const camionesMap = new Map((camionesData.data || []).map((ca: any) => [ca.id, ca]));
      const usuariosMap = new Map((usuariosData.data || []).map((u: any) => [u.id, u]));

      const despachosFormateados = (viajesData || []).map((viaje: any) => {
        const chofer = viaje.chofer_id ? choferesMap.get(viaje.chofer_id) : null;
        const camion = viaje.camion_id ? camionesMap.get(viaje.camion_id) : null;
        const canceladoPor = viaje.cancelado_por ? usuariosMap.get(viaje.cancelado_por) : null;
        const origenUbicacion = viaje.despachos?.origen_ubicacion;
        const destinoUbicacion = viaje.despachos?.destino_ubicacion;

        const despacho: DespachoOfrecido = {
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

      setDespachos(despachosFormateados as DespachoOfrecido[]);

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

    if (estadoTab === 'pendientes') {
      filtered = filtered.filter(d =>
        (!d.tiene_chofer || !d.tiene_camion) &&
        !ESTADOS_AVANZADOS.includes(d.estado_viaje as string)
      );
    } else if (estadoTab === 'asignados') {
      filtered = filtered.filter(d =>
        (d.tiene_chofer && d.tiene_camion) &&
        d.estado_viaje !== 'cancelado' &&
        d.estado_viaje !== 'cancelado_por_transporte'
      );
    } else if (estadoTab === 'rechazados') {
      filtered = filtered.filter(d => d.estado_viaje === 'cancelado');
    } else if (estadoTab === 'cancelados') {
      filtered = filtered.filter(d => d.estado_viaje === 'cancelado_por_transporte');
    }

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

    if (fechaFilter) {
      filtered = filtered.filter(d => d.scheduled_local_date === fechaFilter);
    }
    if (origenFilter) {
      filtered = filtered.filter(d => d.origen === origenFilter);
    }
    if (destinoFilter) {
      filtered = filtered.filter(d => d.destino === destinoFilter);
    }

    setFilteredDespachos(filtered);
  };

  const handleAceptarDespacho = (despacho: DespachoOfrecido) => {
    setSelectedDespacho(despacho);
    setShowAsignarUnidadModal(true);
  };

  const handleRechazarDespacho = (despacho: DespachoOfrecido) => {
    setViajeToReject(despacho);
    setShowRechazarModal(true);
  };

  const handleCancelarViaje = (despacho: DespachoOfrecido) => {
    setViajeToReject(despacho);
    setShowRechazarModal(true);
  };

  const confirmRechazarViaje = async (motivo: string) => {
    if (!viajeToReject) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: viajeActual, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('*, despachos(pedido_id)')
        .eq('id', viajeToReject.id)
        .maybeSingle();

      if (viajeError) throw viajeError;

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

      const { error } = await supabase
        .from('viajes_despacho')
        .update(updateData)
        .eq('id', viajeToReject.id);

      if (error) throw error;

      setShowRechazarModal(false);
      setViajeToReject(null);

      await new Promise(resolve => setTimeout(resolve, 300));
      await loadDespachos();

    } catch (err: any) {
      console.error('Error cancelando viaje:', err);
      throw new Error(err.message || 'Error al cancelar el viaje');
    }
  };

  const getPrioridadBadge = (prioridad?: string) => {
    if (!prioridad) return null;
    const colors: Record<string, string> = {
      alta: 'bg-red-500/20 text-red-400 border-red-500/30',
      media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      baja: 'bg-green-500/20 text-green-400 border-green-500/30'
    };
    return { className: colors[prioridad] || '', label: prioridad.toUpperCase() };
  };

  // Métricas computadas
  const sinAsignar = despachos.filter(d =>
    (!d.tiene_chofer || !d.tiene_camion) &&
    !['cancelado', 'cancelado_por_transporte'].includes(d.estado_viaje as string)
  ).length;

  const enTransito = despachos.filter(d =>
    ['en_transito_origen', 'en_transito_destino', 'ingresado_origen', 'ingresado_destino'].includes(d.estado_viaje as string)
  ).length;

  const ahora = new Date();
  const en4Horas = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);
  const viajesUrgentes = despachos.filter(d => {
    if (!d.scheduled_local_date || !d.scheduled_local_time) return false;
    const fechaViaje = new Date(`${d.scheduled_local_date}T${d.scheduled_local_time}`);
    return fechaViaje >= ahora && fechaViaje <= en4Horas && (!d.tiene_chofer || !d.tiene_camion);
  }).length;

  const altaPrioridad = despachos.filter(d => d.prioridad === 'alta').length;

  const pendientesCount = despachos.filter(d =>
    (!d.tiene_chofer || !d.tiene_camion) &&
    !['cancelado', 'cancelado_por_transporte'].includes(d.estado_viaje as string)
  ).length;

  const asignadosCount = despachos.filter(d =>
    d.tiene_chofer && d.tiene_camion &&
    !['cancelado', 'cancelado_por_transporte'].includes(d.estado_viaje as string)
  ).length;

  const rechazadosCount = despachos.filter(d => d.estado_viaje === 'cancelado').length;
  const canceladosCount = despachos.filter(d => d.estado_viaje === 'cancelado_por_transporte').length;

  return {
    // Data
    despachos,
    filteredDespachos,
    loading,
    error,
    // Filtros
    searchTerm, setSearchTerm,
    fechaFilter, setFechaFilter,
    origenFilter, setOrigenFilter,
    destinoFilter, setDestinoFilter,
    estadoTab, setEstadoTab,
    showFilters, setShowFilters,
    origenes,
    destinos,
    // Modal
    selectedDespacho,
    showModal, setShowModal,
    showRechazarModal, setShowRechazarModal,
    viajeToReject, setViajeToReject,
    showAsignarUnidadModal, setShowAsignarUnidadModal,
    // Handlers
    handleAceptarDespacho,
    handleRechazarDespacho,
    handleCancelarViaje,
    confirmRechazarViaje,
    loadDespachos,
    getPrioridadBadge,
    // Métricas
    sinAsignar,
    enTransito,
    viajesUrgentes,
    altaPrioridad,
    pendientesCount,
    asignadosCount,
    rechazadosCount,
    canceladosCount,
  };
}
