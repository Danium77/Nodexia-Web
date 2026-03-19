import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { filterDespachosByTab } from '@/components/Despachos/DespachoTabs';
import type { FormDispatchRow } from '@/components/Despachos/DespachoForm';
import type { DespachoTab } from '@/components/Despachos/DespachoTabs';
import { calcularEstadoOperativo, esEstadoEnMovimiento as estaEnMovimiento, esEstadoFinal as esFinal } from '@/lib/estados';

// ─── Types ──────────────────────────────────────────────────────────────

export interface EmpresaOption {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
}

export interface GeneratedDispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  fecha_despacho: string;
  hora_despacho?: string;
  tipo_carga: string;
  prioridad: string;
  unidad_type: string;
  observaciones: string;
  referencia_cliente?: string;
  cantidad_viajes_solicitados?: number;
  viajes_generados?: number;
  viajes_asignados?: number;
  viajes_sin_asignar?: number;
  viajes_cancelados_por_transporte?: number;
  tiene_viajes_en_proceso?: boolean;
  todos_viajes_completados?: boolean;
  origen_asignacion?: 'directo' | 'red_nodexia';
  transporte_data?: {
    nombre: string;
    cuit?: string;
    tipo?: string;
    contacto?: any;
    esMultiple?: boolean;
  } | undefined;
}

// ─── Default form row ───────────────────────────────────────────────────

const EMPTY_FORM_ROW: FormDispatchRow = {
  tempId: 1,
  pedido_id: '',
  origen: '',
  destino: '',
  turno_requerido: false,
  turno_empresa_planta_id: undefined,
  turno_id: undefined,
  turno_fecha: undefined,
  turno_hora: undefined,
  fecha_carga_sugerida: undefined,
  distancia_km: undefined,
  horas_transito_estimadas: undefined,
  fecha_despacho: '',
  hora_despacho: '',
  tipo_carga: '',
  prioridad: 'Media' as const,
  cantidad_viajes_solicitados: 1,
  unidad_type: '',
  observaciones: '',
  referencia_cliente: '',
};

// ─── Hook ───────────────────────────────────────────────────────────────

export default function useCrearDespacho() {
  const router = useRouter();

  // Auth / User
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmpresas, setUserEmpresas] = useState<any[]>([]);

  // Derived
  const empresaPlanta = userEmpresas?.find(
    (rel: any) => rel.empresas?.tipo_empresa !== 'transporte'
  );

  // UI feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Empresa options
  const [_plantas, setPlantas] = useState<EmpresaOption[]>([]);
  const [_clientes, setClientes] = useState<EmpresaOption[]>([]);
  const [_transportes, setTransportes] = useState<EmpresaOption[]>([]);
  const [_loadingOptions, setLoadingOptions] = useState(true);

  // Form
  const [formRows, setFormRows] = useState<FormDispatchRow[]>([{ ...EMPTY_FORM_ROW }]);

  // Dispatches list
  const [generatedDispatches, setGeneratedDispatches] = useState<GeneratedDispatch[]>([]);
  const [loadingGenerated, setLoadingGenerated] = useState(true);

  // Assign modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDispatchForAssign, setSelectedDispatchForAssign] = useState<GeneratedDispatch | null>(null);

  // Red Nodexia modal
  const [isRedNodexiaModalOpen, setIsRedNodexiaModalOpen] = useState(false);
  const [selectedDispatchForRed, setSelectedDispatchForRed] = useState<GeneratedDispatch | null>(null);
  const [selectedViajeForRed, setSelectedViajeForRed] = useState<any>(null);

  // Ver Estado Red Nodexia modal
  const [isVerEstadoModalOpen, setIsVerEstadoModalOpen] = useState(false);
  const [selectedViajeRedId, setSelectedViajeRedId] = useState<string>('');
  const [selectedViajeNumero, setSelectedViajeNumero] = useState<string>('');

  // Tabs
  const [activeTab, setActiveTab] = useState<DespachoTab>('pendientes');

  // Reprogramar modal
  const [isReprogramarModalOpen, setIsReprogramarModalOpen] = useState(false);
  const [selectedDispatchForReprogram, setSelectedDispatchForReprogram] = useState<GeneratedDispatch | null>(null);

  // Editar modal
  const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);
  const [selectedDispatchForEdit, setSelectedDispatchForEdit] = useState<GeneratedDispatch | null>(null);

  // Cancelar modal
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
  const [selectedDispatchForCancel, setSelectedDispatchForCancel] = useState<GeneratedDispatch | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Bulk selection
  const [selectedDespachos, setSelectedDespachos] = useState<Set<string>>(new Set());
  const [expandedDespachos, setExpandedDespachos] = useState<Set<string>>(new Set());
  const [viajesDespacho, setViajesDespacho] = useState<Record<string, any[]>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [deletingDespachos, setDeletingDespachos] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [despachosPendingDelete, setDespachosPendingDelete] = useState<Set<string>>(new Set());
  const [forceRefresh, setForceRefresh] = useState(0);

  // Timeline modal
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineDespachoId, setTimelineDespachoId] = useState('');
  const [timelinePedidoId, setTimelinePedidoId] = useState('');
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  // Turnos en flujo de creacion
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [turnoRowTempId, setTurnoRowTempId] = useState<number | null>(null);
  const [turnoFecha, setTurnoFecha] = useState<string>('');
  const [turnoSlots, setTurnoSlots] = useState<any[]>([]);
  const [turnoSelectedSlot, setTurnoSelectedSlot] = useState<any>(null);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [savingTurno, setSavingTurno] = useState(false);

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calcularSugerenciaCarga = async (row: FormDispatchRow, turnoFechaArg: string, turnoHoraArg: string) => {
    if (!row.origen_id || !row.destino_id || !turnoFechaArg || !turnoHoraArg) return null;

    const { data: ubicaciones, error } = await supabase
      .from('ubicaciones')
      .select('id, latitud, longitud')
      .in('id', [row.origen_id, row.destino_id]);

    if (error || !ubicaciones || ubicaciones.length < 2) return null;

    const origen = ubicaciones.find((u: any) => u.id === row.origen_id);
    const destino = ubicaciones.find((u: any) => u.id === row.destino_id);

    if (!origen?.latitud || !origen?.longitud || !destino?.latitud || !destino?.longitud) return null;

    const dRecta = haversineKm(origen.latitud, origen.longitud, destino.latitud, destino.longitud);
    const factorRuta = 1.25;
    const dRuta = dRecta * factorRuta;
    const velocidadPromedio = 60;
    const bufferOperativoHoras = 2;
    const horasTransito = dRuta / velocidadPromedio + bufferOperativoHoras;

    const turnoDateTime = new Date(`${turnoFechaArg}T${turnoHoraArg}:00`);
    const cargaSugerida = new Date(turnoDateTime.getTime() - horasTransito * 60 * 60 * 1000);

    return {
      fechaISO: cargaSugerida.toISOString(),
      fecha: cargaSugerida.toISOString().slice(0, 10),
      hora: `${String(cargaSugerida.getHours()).padStart(2, '0')}:${String(cargaSugerida.getMinutes()).padStart(2, '0')}`,
      distanciaKm: dRuta,
      horasTransito,
    };
  };

  // ─── Effects ────────────────────────────────────────────────────────────

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      cargarEmpresasAsociadas();
    }
  }, [user]);

  // ─── Data Loading ─────────────────────────────────────────────────────

  const checkUser = async () => {
    const { data: { user: currentUserData }, error } = await supabase.auth.getUser();

    if (error || !currentUserData || !currentUserData.id) {
      router.push('/login');
    } else {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nombre_completo')
        .eq('id', currentUserData.id)
        .maybeSingle();

      if (userError || !userData || !userData.nombre_completo) {
        setUserName(currentUserData.email?.split('@')[0] || 'Usuario');
      } else {
        setUserName(userData.nombre_completo);
      }
      setUser(currentUserData);

      fetchGeneratedDispatches(currentUserData.id, true);
    }
  };

  const fetchGeneratedDispatches = useCallback(async (userId: string, forceLoading = false) => {
    if (!userId) {
      console.error('❌ No userId proporcionado para fetchGeneratedDispatches');
      return;
    }

    if (forceLoading) {
      setLoadingGenerated(true);
    }

    try {
      const { data: allData } = await supabase
        .from('despachos')
        .select('id, pedido_id, estado, transport_id')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = await supabase
        .from('despachos')
        .select(`
          id,
          pedido_id,
          origen,
          destino,
          estado,
          scheduled_local_date,
          scheduled_local_time,
          type,
          prioridad,
          unidad_type,
          comentarios,
          transport_id,
          cantidad_viajes_solicitados,
          referencia_cliente,
          origen_asignacion,
          created_by
        `)
        .eq('created_by', userId)
        .order('scheduled_local_date', { ascending: false })
        .order('scheduled_local_time', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar despachos generados:', error.message);
        console.error('❌ Error completo:', error);
        throw error;
      }

      const mappedData: GeneratedDispatch[] = await Promise.all((data || []).map(async (d) => {
        let viajesGenerados = 0;
        let viajesAsignados = 0;
        let viajesSinAsignar = 0;
        let viajesCanceladosPorTransporte = 0;
        let hasViajesExpirados = false;
        let transportesUnicos: string[] = [];
        let viajesConEstadoOperativo: any[] = [];

        const scheduledAtFinal = d.scheduled_local_date
          ? `${d.scheduled_local_date}T${d.scheduled_local_time || '00:00:00'}`
          : null;

        const { data: viajesData, error: viajesError } = await supabase
          .from('viajes_despacho')
          .select('id, estado, estado_carga, id_transporte, chofer_id, camion_id')
          .eq('despacho_id', d.id);

        if (!viajesError && viajesData) {
          viajesGenerados = viajesData.length;

          viajesAsignados = viajesData.filter(v =>
            v.estado !== 'pendiente' && v.estado !== 'cancelado'
          ).length;

          viajesSinAsignar = viajesData.filter(v =>
            v.estado === 'pendiente' || v.estado === 'cancelado_por_transporte'
          ).length;
          viajesCanceladosPorTransporte = viajesData.filter(v =>
            v.estado === 'cancelado_por_transporte'
          ).length;

          hasViajesExpirados = viajesData.some(v => v.estado_carga === 'expirado');

          const esRedNodexia = d.origen_asignacion === 'red_nodexia';
          viajesConEstadoOperativo = viajesData
            .filter(v => v.estado !== 'cancelado')
            .map(v => {
              const enRedPendiente = esRedNodexia && !v.chofer_id && !estaEnMovimiento(v.estado) && !esFinal(v.estado);
              const estadoOp = calcularEstadoOperativo({
                estado_carga: enRedPendiente ? 'pendiente' : (v.estado || 'pendiente'),
                estado_unidad: v.estado,
                chofer_id: enRedPendiente ? null : v.chofer_id,
                camion_id: enRedPendiente ? null : v.camion_id,
                scheduled_local_date: d.scheduled_local_date,
                scheduled_local_time: d.scheduled_local_time,
                scheduled_at: scheduledAtFinal
              });
              return { ...v, estado_operativo: estadoOp };
            });

          hasViajesExpirados = viajesConEstadoOperativo.some(v =>
            v.estado_operativo.estadoOperativo === 'expirado'
          );

          transportesUnicos = [...new Set(
            viajesData
              .filter(v => v.id_transporte)
              .map(v => v.id_transporte)
          )];
        }

        // Transporte info
        let transporteAsignado: { nombre: string; contacto?: any; cuit?: string; tipo?: string; esMultiple?: boolean; } | undefined = undefined;

        if (transportesUnicos.length > 1) {
          transporteAsignado = {
            nombre: 'Múltiples',
            cuit: `${transportesUnicos.length} transportes`,
            tipo: 'multiple',
            contacto: 'Ver viajes expandidos',
            esMultiple: true
          };
        } else if (transportesUnicos.length === 1 || d.transport_id) {
          const transportId = transportesUnicos[0] || d.transport_id;
          try {
            const { data: transporteList, error: transporteError } = await supabase
              .from('empresas')
              .select('nombre, cuit, telefono, tipo_empresa')
              .eq('id', transportId);

            if (transporteError) {
              // skip
            } else if (transporteList && transporteList.length > 0 && transporteList[0]) {
              const transporteData = transporteList[0];
              transporteAsignado = {
                nombre: transporteData.nombre || 'Transporte sin nombre',
                cuit: transporteData.cuit || '',
                tipo: transporteData.tipo_empresa || 'transporte',
                contacto: transporteData.telefono || transporteData.cuit || 'Sin contacto',
                esMultiple: false
              };
            } else {
              transporteAsignado = {
                nombre: 'Transporte Asignado',
                cuit: transportId.substring(0, 8),
                tipo: 'transporte',
                contacto: 'Ver detalles',
                esMultiple: false
              };
            }
          } catch (error) {
            console.error(`❌ Error consultando transporte para ${d.pedido_id}:`, error);
          }
        }

        // Estado operativo del despacho
        const now = new Date();
        const scheduledDate = scheduledAtFinal ? new Date(scheduledAtFinal) : null;
        const despachoEstaExpirado = scheduledDate && scheduledDate < now;

        const ESTADOS_EN_PROCESO = [
          'confirmado_chofer', 'en_transito_origen',
          'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
          'egreso_origen', 'en_transito_destino',
          'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino'
        ];
        const tieneViajesEnProceso = (viajesData || []).some(v => ESTADOS_EN_PROCESO.includes(v.estado));
        const todosViajesCompletados = (viajesData || []).length > 0 &&
          (viajesData || []).every(v => ['completado', 'cancelado'].includes(v.estado));

        let estadoOperativoDespacho: 'activo' | 'demorado' | 'expirado' = 'activo';
        let tieneViajesDemorados = false;
        let tieneViajesExpirados = false;

        if (viajesConEstadoOperativo && viajesConEstadoOperativo.length > 0) {
          tieneViajesDemorados = viajesConEstadoOperativo.some(v => v.estado_operativo.estadoOperativo === 'demorado');
          tieneViajesExpirados = viajesConEstadoOperativo.some(v => v.estado_operativo.estadoOperativo === 'expirado');

          if (tieneViajesExpirados) {
            estadoOperativoDespacho = 'expirado';
          } else if (tieneViajesDemorados) {
            estadoOperativoDespacho = 'demorado';
          }
        }

        if (despachoEstaExpirado && viajesConEstadoOperativo.length === 0) {
          estadoOperativoDespacho = 'expirado';
        }

        return {
          id: d.id,
          pedido_id: d.pedido_id,
          origen: d.origen,
          destino: d.destino,
          estado: tieneViajesEnProceso
            ? 'en_proceso'
            : todosViajesCompletados
              ? 'completado'
              : (despachoEstaExpirado && !['completado', 'cancelado', 'expirado', 'cancelado_por_transporte', 'finalizado', 'entregado'].includes(d.estado))
                ? 'expirado'
                : d.estado,
          estado_operativo: estadoOperativoDespacho,
          tiene_viajes_demorados: tieneViajesDemorados,
          tiene_viajes_expirados: tieneViajesExpirados,
          tiene_viajes_en_proceso: tieneViajesEnProceso,
          todos_viajes_completados: todosViajesCompletados,
          fecha_despacho: d.scheduled_local_date || 'Sin fecha',
          hora_despacho: d.scheduled_local_time || '',
          scheduled_at: scheduledAtFinal,
          tipo_carga: d.type || 'N/A',
          prioridad: (['Baja', 'Media', 'Alta', 'Urgente'].includes(d.prioridad)) ? d.prioridad : 'Media',
          unidad_type: d.unidad_type || 'N/A',
          observaciones: d.comentarios || '',
          referencia_cliente: (d as any).referencia_cliente || '',
          cantidad_viajes_solicitados: d.cantidad_viajes_solicitados,
          viajes_generados: viajesGenerados,
          viajes_asignados: viajesAsignados,
          viajes_sin_asignar: viajesSinAsignar,
          viajes_cancelados_por_transporte: viajesCanceladosPorTransporte,
          origen_asignacion: d.origen_asignacion,
          transporte_data: transporteAsignado,
        };
      }));

      setGeneratedDispatches(mappedData);
    } catch (error) {
      console.error('💥 Error en fetchGeneratedDispatches:', error);
    } finally {
      setLoadingGenerated(false);
    }
  }, []);

  const cargarEmpresasAsociadas = async () => {
    try {
      setLoadingOptions(true);
      if (!user?.id) return;

      const { data: userEmpresasData, error: userEmpresasError } = await supabase
        .from('usuarios_empresa')
        .select(`
          empresa_id,
          rol_interno,
          empresas(id, nombre, tipo_empresa, configuracion_empresa)
        `)
        .eq('user_id', user.id)
        .eq('activo', true);

      if (userEmpresasError) {
        console.error('❌ [cargarEmpresas] Error query usuarios_empresa:', userEmpresasError);
        setLoadingOptions(false);
        return;
      }

      if (!userEmpresasData || userEmpresasData.length === 0) {
        console.warn('⚠️ [cargarEmpresas] No se encontraron empresas para user:', user.id);
        setLoadingOptions(false);
        return;
      }

      console.log('✅ [cargarEmpresas] Empresas cargadas:', userEmpresasData.length);
      setUserEmpresas(userEmpresasData);
      await cargarEmpresasConDatos(userEmpresasData);
    } catch (error) {
      console.error('Error cargando empresas asociadas:', error);
      setErrorMsg('Error cargando empresas asociadas');
    } finally {
      setLoadingOptions(false);
    }
  };

  const cargarEmpresasConDatos = async (userEmpresas: any[]) => {
    try {
      const empresaIds = userEmpresas.map(rel => rel.empresa_id);
      const tiposEmpresa = userEmpresas.map(rel => (rel.empresas as any)?.tipo_empresa);
      const rolesInternos = userEmpresas.map(rel => rel.rol_interno?.toLowerCase() || '');

      const esCoordinador = tiposEmpresa.some((t: string) => t === 'coordinador' || t === 'planta') ||
        rolesInternos.some((rol: string) => rol.includes('coordinador'));

      let plantasFiltradas: any[] = [];
      let clientesFiltrados: any[] = [];

      if (esCoordinador) {
        const plantaPropia = userEmpresas.filter((rel: any) =>
          rel.empresas?.configuracion_empresa?.tipo_instalacion === 'planta'
        ).map((rel: any) => rel.empresas);

        plantasFiltradas = plantaPropia || [];

        const { data: todosClientes } = await supabase
          .from('empresas')
          .select('id, nombre, cuit, configuracion_empresa')
          .eq('configuracion_empresa->>tipo_instalacion', 'cliente');

        clientesFiltrados = todosClientes || [];
      } else {
        const { data: plantasData } = await supabase
          .from('relaciones_empresas')
          .select(`
            empresa_cliente:empresas!relaciones_empresas_empresa_cliente_id_fkey(
              id, nombre, cuit, configuracion_empresa
            )
          `)
          .eq('estado', 'activa')
          .in('empresa_transporte_id', empresaIds);

        plantasFiltradas = plantasData?.filter((rel: any) =>
          rel.empresa_cliente?.configuracion_empresa?.tipo_instalacion === 'planta'
        ).map((rel: any) => rel.empresa_cliente) || [];

        clientesFiltrados = plantasData?.filter((rel: any) =>
          rel.empresa_cliente?.configuracion_empresa?.tipo_instalacion === 'cliente'
        ).map((rel: any) => rel.empresa_cliente) || [];
      }

      setPlantas(plantasFiltradas);
      setClientes(clientesFiltrados);

      // Transportes
      let transportesFiltrados: any[] = [];

      if (esCoordinador) {
        const { data: transportesVinculados } = await supabase
          .from('relaciones_empresas')
          .select(`
            empresa_transporte:empresas!relaciones_empresas_empresa_transporte_id_fkey(
              id, nombre, cuit, tipo_empresa
            )
          `)
          .eq('estado', 'activa')
          .in('empresa_cliente_id', empresaIds);

        const transportesDirectos = transportesVinculados?.filter((rel: any) =>
          rel.empresa_transporte?.tipo_empresa === 'transporte'
        ).map((rel: any) => ({
          ...rel.empresa_transporte,
          categoria: 'vinculado'
        })) || [];

        const { data: redCompleta } = await supabase
          .from('empresas')
          .select('id, nombre, cuit, tipo_empresa')
          .eq('tipo_empresa', 'transporte');

        const transportesRed = redCompleta?.filter(t =>
          !transportesDirectos.some(td => td.id === t.id)
        ).map(t => ({
          ...t,
          categoria: 'red_nodexia'
        })) || [];

        transportesFiltrados = [...transportesDirectos, ...transportesRed];
      } else {
        const { data: transportesData } = await supabase
          .from('relaciones_empresas')
          .select(`
            empresa_transporte:empresas!relaciones_empresas_empresa_transporte_id_fkey(
              id, nombre, cuit
            )
          `)
          .eq('estado', 'activa')
          .in('empresa_cliente_id', empresaIds);

        transportesFiltrados = transportesData?.filter((rel: any) =>
          rel.empresa_transporte?.tipo_empresa === 'transporte'
        ).map((rel: any) => rel.empresa_transporte) || [];
      }

      setTransportes(transportesFiltrados);
    } catch (error) {
      console.error('Error cargando empresas con datos:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────

  const generateDespachoCode = async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `DSP-${dateStr}`;

    const { data: lastDespacho } = await supabase
      .from('despachos')
      .select('pedido_id')
      .ilike('pedido_id', `${prefix}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastDespacho && lastDespacho.length > 0) {
      const lastCode = lastDespacho[0]?.pedido_id;
      const lastNumber = lastCode ? parseInt(lastCode.split('-')[2]) || 0 : 0;
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleRowChange = (tempId: number, field: keyof FormDispatchRow, value: string | number) => {
    setFormRows(formRows.map(row =>
      row.tempId === tempId
        ? {
            ...row,
            [field]: field === 'prioridad' && typeof value === 'string' && !['Baja', 'Media', 'Alta', 'Urgente'].includes(value)
              ? 'Media'
              : value
          }
        : row
    ));
  };

  const refreshVentanasTurno = async (empresaPlantaId: string, fecha: string) => {
    if (!empresaPlantaId || !fecha) return;
    setLoadingTurnos(true);
    try {
      const response = await fetchWithAuth(`/api/turnos/ventanas?empresa_planta_id=${empresaPlantaId}&fecha=${fecha}&slots=true`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Error al cargar slots de turno');
      setTurnoSlots(json.data || []);
      setTurnoSelectedSlot(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudieron cargar slots de turno');
      setTurnoSlots([]);
    } finally {
      setLoadingTurnos(false);
    }
  };

  const handleOrigenSelect = async (tempId: number, ubicacion: any) => {
    setFormRows(prevRows =>
      prevRows.map(r =>
        r.tempId === tempId
          ? {
              ...r,
              origen: ubicacion.alias || ubicacion.nombre,
              origen_id: ubicacion.id,
            }
          : r
      )
    );

    const row = formRows.find(r => r.tempId === tempId);
    if (!row?.turno_id || !row.turno_fecha || !row.turno_hora) return;

    const suggestion = await calcularSugerenciaCarga(
      { ...row, origen_id: ubicacion.id },
      row.turno_fecha,
      row.turno_hora
    );

    if (suggestion) {
      setFormRows(prevRows =>
        prevRows.map(r =>
          r.tempId === tempId
            ? {
                ...r,
                fecha_despacho: suggestion.fecha,
                hora_despacho: suggestion.hora,
                fecha_carga_sugerida: suggestion.fechaISO,
                distancia_km: suggestion.distanciaKm,
                horas_transito_estimadas: suggestion.horasTransito,
              }
            : r
        )
      );
    }
  };

  const handleDestinoSelect = async (tempId: number, ubicacion: any) => {
    setErrorMsg('');
    setFormRows(prevRows =>
      prevRows.map(r =>
        r.tempId === tempId
          ? {
              ...r,
              destino: ubicacion.alias || ubicacion.nombre,
              destino_id: ubicacion.id,
              turno_requerido: false,
              turno_empresa_planta_id: undefined,
              turno_id: undefined,
              turno_fecha: undefined,
              turno_hora: undefined,
            }
          : r
      )
    );

    try {
      const response = await fetchWithAuth(`/api/turnos/destino-requiere?destino_id=${ubicacion.id}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'No se pudo validar el destino');
      }

      if (json.requiere_turno) {
        const fechaBase = new Date();
        fechaBase.setDate(fechaBase.getDate() + 1);
        const fechaDefault = fechaBase.toISOString().slice(0, 10);

        setFormRows(prevRows =>
          prevRows.map(r =>
            r.tempId === tempId
              ? {
                  ...r,
                  turno_requerido: true,
                  turno_empresa_planta_id: json.empresa_planta_id,
                }
              : r
          )
        );

        setTurnoRowTempId(tempId);
        setTurnoFecha(fechaDefault);
        setTurnoSelectedSlot(null);
        setIsTurnoModalOpen(true);
        await refreshVentanasTurno(json.empresa_planta_id, fechaDefault);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error validando turno para destino');
    }
  };

  const handleOpenTurnoModal = async (tempId: number) => {
    const row = formRows.find(r => r.tempId === tempId);
    if (!row?.turno_empresa_planta_id) {
      setErrorMsg('Este destino no requiere turno o no tiene planta asociada');
      return;
    }

    const fechaBase = row.turno_fecha || new Date().toISOString().slice(0, 10);
    setTurnoRowTempId(tempId);
    setTurnoFecha(fechaBase);
    setTurnoSelectedSlot(null);
    setIsTurnoModalOpen(true);
    await refreshVentanasTurno(row.turno_empresa_planta_id, fechaBase);
  };

  const handleConfirmarReservaTurno = async () => {
    if (!turnoRowTempId || !turnoSelectedSlot || !turnoFecha) {
      setErrorMsg('Debe seleccionar fecha y horario para reservar turno');
      return;
    }

    const row = formRows.find(r => r.tempId === turnoRowTempId);
    if (!row) return;

    setSavingTurno(true);
    try {
      const reserveResponse = await fetchWithAuth('/api/turnos/reservas', {
        method: 'POST',
        body: JSON.stringify({
          ventana_id: turnoSelectedSlot.ventana_id,
          fecha: turnoFecha,
          slot_hora_inicio: turnoSelectedSlot.hora_inicio,
          slot_hora_fin: turnoSelectedSlot.hora_fin,
          observaciones: `Reserva desde Crear Despacho (${row.pedido_id || 'sin-codigo'})`,
        }),
      });
      const reserveJson = await reserveResponse.json();
      if (!reserveResponse.ok) {
        throw new Error(reserveJson.error || 'No se pudo reservar el turno');
      }

      const turno = reserveJson.data;
      const suggestion = await calcularSugerenciaCarga(row, turno.fecha, (turno.hora_inicio || '').slice(0, 5));

      setFormRows(prevRows =>
        prevRows.map(r =>
          r.tempId === turnoRowTempId
            ? {
                ...r,
                turno_id: turno.id,
                turno_numero: turno.numero_turno || '',
                turno_fecha: turno.fecha,
                turno_hora: (turno.hora_inicio || '').slice(0, 5),
                fecha_despacho: suggestion?.fecha || r.fecha_despacho,
                hora_despacho: suggestion?.hora || r.hora_despacho,
                fecha_carga_sugerida: suggestion?.fechaISO || r.fecha_carga_sugerida,
                distancia_km: suggestion?.distanciaKm || r.distancia_km,
                horas_transito_estimadas: suggestion?.horasTransito || r.horas_transito_estimadas,
              }
            : r
        )
      );

      setIsTurnoModalOpen(false);
      setTurnoRowTempId(null);
      setTurnoSelectedSlot(null);
      setSuccessMsg('✅ Turno reservado y fecha/hora de carga sugerida aplicada.');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo reservar turno');
    } finally {
      setSavingTurno(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleAssignTransport = (dispatch: GeneratedDispatch) => {
    setSelectedDispatchForAssign(null);
    setIsAssignModalOpen(false);

    setTimeout(() => {
      setSelectedDispatchForAssign(dispatch);
      setIsAssignModalOpen(true);
    }, 100);
  };

  const handleOpenRedNodexia = async (dispatch: GeneratedDispatch) => {
    console.log('🌐 [RED] handleOpenRedNodexia llamado para:', dispatch.pedido_id, 'id:', dispatch.id);

    if (!user) {
      console.error('🌐 [RED] user es null/undefined');
      alert('Error: Sesión de usuario no disponible. Recargá la página.');
      return;
    }
    if (!empresaPlanta) {
      console.error('🌐 [RED] empresaPlanta es null/undefined. userEmpresas:', userEmpresas);
      alert('Error: No se encontró la empresa asociada al usuario. Recargá la página.');
      return;
    }

    try {
      let viajes = viajesDespacho[dispatch.id];

      if (!viajes || viajes.length === 0) {
        console.log('🌐 [RED] Cache vacío, consultando viajes_despacho...');
        const { data, error } = await supabase
          .from('viajes_despacho')
          .select('id, numero_viaje, estado, despacho_id')
          .eq('despacho_id', dispatch.id)
          .order('numero_viaje', { ascending: true });

        if (error) {
          console.error('🌐 [RED] Error cargando viajes:', error);
          alert('Error al cargar los viajes. Intente nuevamente.');
          return;
        }
        viajes = data;
      } else {
        console.log('🌐 [RED] Usando viajes cacheados:', viajes.length);
      }

      if (!viajes || viajes.length === 0) {
        alert(`Este despacho no tiene viajes generados aún.\n\nDespacho ID: ${dispatch.id}\nPedido: ${dispatch.pedido_id}\n\nIntenta expandir el despacho primero para ver si existen viajes.`);
        return;
      }

      const primerViaje = viajes.find((v: any) => !v.estado || v.estado === 'pendiente') || viajes[0];

      console.log('🌐 [RED] Abriendo modal con viaje:', primerViaje.id, 'numero:', primerViaje.numero_viaje);
      setSelectedDispatchForRed(dispatch);
      setSelectedViajeForRed(primerViaje);
      setIsRedNodexiaModalOpen(true);
    } catch (err) {
      console.error('🌐 [RED] Error:', err);
      alert('Error al abrir Red Nodexia');
    }
  };

  const handleCloseRedNodexia = () => {
    setIsRedNodexiaModalOpen(false);
    setSelectedDispatchForRed(null);
    setSelectedViajeForRed(null);
  };

  const handleVerEstadoRed = async (viaje: any) => {
    console.log('🌐 [VER ESTADO] handleVerEstadoRed llamado. viaje_id:', viaje.id, 'estado_red:', viaje.estado_red);

    try {
      const { data: viajeRed, error } = await supabase
        .from('viajes_red_nodexia')
        .select('id, estado_red, viaje_id')
        .eq('viaje_id', viaje.id)
        .maybeSingle();

      console.log('🌐 [VER ESTADO] Query result:', { viajeRed, error });

      if (error) {
        console.error('❌ [VER ESTADO] Error buscando viaje en red:', error);
        alert(`Error al buscar viaje en Red Nodexia: ${error.message}`);
        return;
      }

      if (!viajeRed) {
        console.error('❌ [VER ESTADO] No se encontró viaje en red para viaje_id:', viaje.id);
        alert('No se encontró el viaje en la Red Nodexia. Es posible que haya sido eliminado.');
        return;
      }

      console.log('🌐 [VER ESTADO] Abriendo modal con viajeRedId:', viajeRed.id);
      setSelectedViajeRedId(viajeRed.id);
      setSelectedViajeNumero(viaje.numero_viaje?.toString() || 'N/A');
      setIsVerEstadoModalOpen(true);
    } catch (err) {
      console.error('❌ [VER ESTADO] Error:', err);
      alert('Error al abrir estado de Red Nodexia');
    }
  };

  const handleCloseVerEstado = () => {
    setIsVerEstadoModalOpen(false);
    setSelectedViajeRedId('');
    setSelectedViajeNumero('');
  };

  const handleAceptarOfertaDesdeModal = async (ofertaId: string, transporteId: string) => {
    try {
      if (!selectedViajeRedId) {
        console.error('❌ selectedViajeRedId está vacío!');
        alert('Error: No se pudo identificar el viaje en Red Nodexia');
        return;
      }

      console.log('🎯 [crear-despacho] Llamando API aceptar-oferta:', { ofertaId, transporteId, viajeRedId: selectedViajeRedId });

      const response = await fetchWithAuth('/api/red-nodexia/aceptar-oferta', {
        method: 'POST',
        body: JSON.stringify({
          ofertaId,
          viajeRedId: selectedViajeRedId,
          transporteId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al aceptar oferta');
      }

      console.log('✅ [crear-despacho] API aceptar-oferta OK:', result);

      const despachoId = result.despachoId;

      handleCloseVerEstado();

      setSuccessMsg(`✅ ${result.transporteNombre} asignado correctamente desde Red Nodexia. Actualizando vista...`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (user?.id) {
        await fetchGeneratedDispatches(user.id);

        const despachoActualizado = generatedDispatches.find(d => d.id === despachoId);
        if (despachoActualizado) {
          const cantidadTotal = despachoActualizado.cantidad_viajes_solicitados || 1;
          const cantidadAsignados = despachoActualizado.viajes_asignados || 0;
          if (cantidadAsignados >= cantidadTotal) {
            setActiveTab('asignados');
          } else {
            setActiveTab('en_proceso');
          }
        }

        if (despachoId && expandedDespachos.has(despachoId)) {
          setViajesDespacho(prev => {
            const newCache = { ...prev };
            delete newCache[despachoId];
            return newCache;
          });
          await handleToggleExpandDespacho(despachoId);
          await handleToggleExpandDespacho(despachoId);
        }
      }

      setSuccessMsg('✅ Transporte asignado correctamente. El despacho ahora muestra el transporte de Red Nodexia 🌐');
      setTimeout(() => setSuccessMsg(''), 8000);
    } catch (err: any) {
      console.error('❌ Error al aceptar oferta:', err);
      setErrorMsg('Error al aceptar oferta. Intente nuevamente.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleAssignSuccess = async () => {
    const despachoAsignado = selectedDispatchForAssign?.pedido_id;
    const despachoId = selectedDispatchForAssign?.id;

    try {
      setIsAssignModalOpen(false);

      setSuccessMsg(`✅ Transporte asignado exitosamente al despacho ${despachoAsignado}`);

      if (despachoId) {
        setViajesDespacho(prev => {
          const newCache = { ...prev };
          delete newCache[despachoId];
          return newCache;
        });
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
        setTimelineRefreshTrigger(prev => prev + 1);

        if (despachoId && expandedDespachos.has(despachoId)) {
          try {
            const { data: viajes, error } = await supabase
              .from('viajes_despacho')
              .select(`
                id,
                numero_viaje,
                estado,
                id_transporte,
                camion_id,
                chofer_id,
                observaciones,
                created_at,
                camiones (
                  patente,
                  marca,
                  modelo
                ),
                choferes (
                  nombre,
                  apellido,
                  dni
                ),
                estado_carga_viaje (
                  estado_carga,
                  fecha_planificacion,
                  fecha_documentacion_preparada,
                  fecha_cargando,
                  fecha_carga_completada,
                  peso_real_kg,
                  cantidad_bultos
                )
              `)
              .eq('despacho_id', despachoId)
              .order('numero_viaje', { ascending: true });

            if (!error && viajes) {
              const transporteIds = viajes
                .filter(v => v.id_transporte)
                .map(v => v.id_transporte)
                .filter((id, index, self) => self.indexOf(id) === index);

              let transportesData: Record<string, any> = {};

              if (transporteIds.length > 0) {
                const { data: transportes } = await supabase
                  .from('empresas')
                  .select('id, nombre, cuit')
                  .in('id', transporteIds);

                if (transportes) {
                  transportesData = transportes.reduce((acc, t) => {
                    acc[t.id] = t;
                    return acc;
                  }, {} as Record<string, any>);
                }
              }

              const viajesConTransporte = viajes.map(v => ({
                ...v,
                transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
                camion: v.camiones || null,
                chofer: v.choferes || null,
                estado_carga_viaje: v.estado_carga_viaje || null
              }));

              setViajesDespacho(prev => ({
                ...prev,
                [despachoId]: viajesConTransporte
              }));
            }
          } catch (error) {
            console.error('⚠️ Error recargando viajes:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en handleAssignSuccess:', error);
      setErrorMsg('Error al actualizar la lista de despachos');
    } finally {
      setSelectedDispatchForAssign(null);
    }
  };

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedDispatchForAssign(null);
  };

  const handleOpenCancelarModal = (dispatch: GeneratedDispatch) => {
    setSelectedDispatchForCancel(dispatch);
    setMotivoCancelacion('');
    setIsCancelarModalOpen(true);
  };

  const handleConfirmarCancelacion = async () => {
    if (!selectedDispatchForCancel) return;

    if (!motivoCancelacion.trim()) {
      setErrorMsg('Debe ingresar un motivo para la cancelación');
      return;
    }

    try {
      setDeletingDespachos(true);

      const { data: viajesData } = await supabase
        .from('viajes_despacho')
        .select('chofer_id, camion_id, acoplado_id, cantidad_reprogramaciones')
        .eq('despacho_id', selectedDispatchForCancel.id);

      const tieneChofer = viajesData?.some(v => v.chofer_id) || false;
      const tieneCamion = viajesData?.some(v => v.camion_id) || false;
      const tieneAcoplado = viajesData?.some(v => v.acoplado_id) || false;
      const cantidadReprog = viajesData?.[0]?.cantidad_reprogramaciones || 0;

      const { error: auditError } = await supabase
        .from('cancelaciones_despachos')
        .insert({
          despacho_id: selectedDispatchForCancel.id,
          empresa_id: empresaPlanta?.empresa_id,
          cancelado_por_user_id: user.id,
          pedido_id: selectedDispatchForCancel.pedido_id,
          origen_nombre: selectedDispatchForCancel.origen,
          destino_nombre: selectedDispatchForCancel.destino,
          scheduled_date: selectedDispatchForCancel.fecha_despacho,
          scheduled_time: selectedDispatchForCancel.hora_despacho,
          estado_al_cancelar: selectedDispatchForCancel.estado,
          motivo_cancelacion: motivoCancelacion.trim(),
          tenia_chofer_asignado: tieneChofer,
          tenia_camion_asignado: tieneCamion,
          tenia_acoplado_asignado: tieneAcoplado,
          fue_reprogramado_previamente: cantidadReprog > 0,
          cantidad_reprogramaciones_previas: cantidadReprog
        });

      if (auditError) {
        console.error('⚠️ Error guardando auditoría:', auditError);
      }

      const { error } = await supabase
        .from('despachos')
        .delete()
        .eq('id', selectedDispatchForCancel.id);

      if (error) throw error;

      setSuccessMsg(`✅ Despacho ${selectedDispatchForCancel.pedido_id} cancelado. Motivo registrado: "${motivoCancelacion}"`);

      setIsCancelarModalOpen(false);
      setSelectedDispatchForCancel(null);
      setMotivoCancelacion('');

      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
      }
    } catch (error: any) {
      console.error('Error cancelando despacho:', error);
      setErrorMsg('Error al cancelar despacho. Intente nuevamente.');
    } finally {
      setDeletingDespachos(false);
    }
  };

  const handleSelectDespacho = (despachoId: string) => {
    const newSelected = new Set(selectedDespachos);
    if (newSelected.has(despachoId)) {
      newSelected.delete(despachoId);
    } else {
      newSelected.add(despachoId);
    }
    setSelectedDespachos(newSelected);
    setSelectAll(newSelected.size === generatedDispatches.length && generatedDispatches.length > 0);
  };

  const handleToggleExpandDespacho = async (despachoId: string) => {
    const newExpanded = new Set(expandedDespachos);

    if (newExpanded.has(despachoId)) {
      newExpanded.delete(despachoId);
      setExpandedDespachos(newExpanded);
    } else {
      newExpanded.add(despachoId);
      setExpandedDespachos(newExpanded);

      try {
        const { data: despachoData, error: despachoError } = await supabase
          .from('despachos')
          .select('origen_asignacion')
          .eq('id', despachoId)
          .maybeSingle();

        if (despachoError) {
          console.error('❌ Error obteniendo despacho:', despachoError);
        }

        const origenAsignacion = despachoData?.origen_asignacion;

        const { data: viajes, error } = await supabase
          .from('viajes_despacho')
          .select('*')
          .eq('despacho_id', despachoId)
          .order('numero_viaje', { ascending: true });

        if (error) {
          console.error('Error cargando viajes:', error);
          setViajesDespacho(prev => ({ ...prev, [despachoId]: [] }));
          return;
        }

        if (!viajes || viajes.length === 0) {
          setViajesDespacho(prev => ({ ...prev, [despachoId]: [] }));
          return;
        }

        // Red Nodexia status
        const viajesIds = viajes.map(v => v.id);

        const { data: viajesEnRed, error: redError } = await supabase
          .from('viajes_red_nodexia')
          .select('viaje_id, estado_red')
          .in('viaje_id', viajesIds);

        if (redError) {
          console.error('❌ [crear-despacho] Error consultando viajes_red_nodexia:', redError);
        }

        const viajesEnRedMap = new Map(
          viajesEnRed?.map(v => [v.viaje_id, v.estado_red]) || []
        );

        viajes.forEach(viaje => {
          const estadoRed = viajesEnRedMap.get(viaje.id);
          (viaje as any).en_red_nodexia = !!estadoRed || origenAsignacion === 'red_nodexia';
          (viaje as any).estado_red = estadoRed || (origenAsignacion === 'red_nodexia' ? 'asignado' : null);
          (viaje as any).origen_asignacion = origenAsignacion;
        });

        // Fetch related entities in parallel
        const transporteIds = viajes
          ?.filter(v => v.id_transporte || v.id_transporte_cancelado)
          .map(v => v.id_transporte || v.id_transporte_cancelado)
          .filter((id, index, self) => id && self.indexOf(id) === index) || [];

        const choferIds = viajes
          ?.filter(v => v.chofer_id)
          .map(v => v.chofer_id)
          .filter((id, index, self) => id && self.indexOf(id) === index) || [];

        const camionIds = viajes
          ?.filter(v => v.camion_id)
          .map(v => v.camion_id)
          .filter((id, index, self) => id && self.indexOf(id) === index) || [];

        const acopladoIds = viajes
          ?.filter(v => v.acoplado_id)
          .map(v => v.acoplado_id)
          .filter((id, index, self) => id && self.indexOf(id) === index) || [];

        const [transportesResult, choferesResult, camionesResult, acopladosResult] = await Promise.all([
          transporteIds.length > 0
            ? supabase.from('empresas').select('id, nombre, cuit').in('id', transporteIds)
            : Promise.resolve({ data: [], error: null }),
          choferIds.length > 0
            ? supabase.from('choferes').select('id, nombre, apellido, telefono, dni').in('id', choferIds)
            : Promise.resolve({ data: [], error: null }),
          camionIds.length > 0
            ? supabase.from('camiones').select('id, patente, marca, modelo, anio').in('id', camionIds)
            : Promise.resolve({ data: [], error: null }),
          acopladoIds.length > 0
            ? supabase.from('acoplados').select('id, patente, marca, modelo, anio').in('id', acopladoIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        const transportesData: Record<string, any> = {};
        const choferesData: Record<string, any> = {};
        const camionesData: Record<string, any> = {};
        const acopladosData: Record<string, any> = {};

        transportesResult.data?.forEach(t => { transportesData[t.id] = t; });
        choferesResult.data?.forEach(c => { choferesData[c.id] = c; });
        camionesResult.data?.forEach(c => { camionesData[c.id] = c; });
        acopladosResult.data?.forEach(a => { acopladosData[a.id] = a; });

        const viajesConDatos = viajes?.map(v => ({
          ...v,
          transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
          transporte_cancelado: v.id_transporte_cancelado ? transportesData[v.id_transporte_cancelado] : null,
          chofer: v.chofer_id ? choferesData[v.chofer_id] : null,
          camion: v.camion_id ? camionesData[v.camion_id] : null,
          acoplado: v.acoplado_id ? acopladosData[v.acoplado_id] : null,
        })) || [];

        setViajesDespacho(prev => ({
          ...prev,
          [despachoId]: viajesConDatos
        }));
      } catch (error) {
        console.error('💥 Error cargando viajes:', error);
      }
    }
  };

  const handleCancelarViajeCoordinador = async (viajeId: string, despachoId: string, motivo: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: viajeActual, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('*, despachos(pedido_id)')
        .eq('id', viajeId)
        .maybeSingle();

      if (viajeError) throw viajeError;

      const horasHastaViaje = viajeActual.despachos?.scheduled_local_date
        ? (new Date(viajeActual.despachos.scheduled_local_date).getTime() - Date.now()) / (1000 * 60 * 60)
        : 999;

      if (['en_transito_origen', 'en_transito_destino'].includes(viajeActual.estado)) {
        throw new Error('No se puede cancelar un viaje en tránsito');
      }

      if (viajeActual.estado === 'completado') {
        throw new Error('No se puede cancelar un viaje ya completado');
      }

      let advertencia = '';
      if (viajeActual.estado === 'camion_asignado' && horasHastaViaje < 24) {
        advertencia = ' ⚠️ CANCELACIÓN TARDÍA';
      }

      const { error } = await supabase
        .from('viajes_despacho')
        .update({
          estado: 'cancelado',
          id_transporte: null,
          chofer_id: null,
          camion_id: null,
          fecha_cancelacion: new Date().toISOString(),
          cancelado_por: user?.id,
          motivo_cancelacion: motivo,
          observaciones: `CANCELADO POR COORDINADOR: ${motivo}${advertencia} (${new Date().toLocaleString('es-AR')})`
        })
        .eq('id', viajeId);

      if (error) throw error;

      await supabase
        .from('historial_despachos')
        .insert({
          despacho_id: despachoId,
          viaje_id: viajeId,
          accion: 'viaje_cancelado',
          descripcion: `Viaje #${viajeActual.numero_viaje} cancelado por coordinador${advertencia}`,
          usuario_id: user?.id || null,
          metadata: {
            numero_viaje: viajeActual.numero_viaje,
            estado_anterior: viajeActual.estado,
            motivo: motivo,
            cancelacion_tardia: horasHastaViaje < 24,
            pedido_id: viajeActual.despachos?.pedido_id
          }
        });

      setViajesDespacho(prev => {
        const newCache = { ...prev };
        delete newCache[despachoId];
        return newCache;
      });

      if (user?.id) {
        await fetchGeneratedDispatches(user.id);
      }

      if (expandedDespachos.has(despachoId)) {
        const newExpanded = new Set(expandedDespachos);
        newExpanded.delete(despachoId);
        setExpandedDespachos(newExpanded);
        setTimeout(() => {
          handleToggleExpandDespacho(despachoId);
        }, 500);
      }

      setSuccessMsg(`✅ Viaje cancelado exitosamente`);
    } catch (err: any) {
      console.error('Error cancelando viaje:', err);
      setErrorMsg('Error al cancelar el viaje. Intente nuevamente.');
    }
  };

  const handleReasignarViaje = async (despacho: any, viaje: any) => {
    try {
      if (viaje.estado !== 'cancelado_por_transporte') {
        throw new Error('Solo se pueden reasignar viajes cancelados por el transporte');
      }

      handleAssignTransport(despacho);
      setSuccessMsg(`💡 Reasignando viaje cancelado por ${viaje.transporte_cancelado?.nombre || 'transporte'}. Seleccione el nuevo transporte.`);
    } catch (err: any) {
      console.error('Error preparando reasignación:', err);
      setErrorMsg('Error al preparar la reasignación. Intente nuevamente.');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDespachos(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(generatedDispatches.map(d => d.id));
      setSelectedDespachos(allIds);
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDespachos.size === 0) return;
    setDespachosPendingDelete(new Set(selectedDespachos));
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    setDeletingDespachos(true);
    setErrorMsg('');

    const idsToDelete = Array.from(despachosPendingDelete);

    try {
      const res = await fetchWithAuth('/api/despachos/eliminar', {
        method: 'POST',
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Error al eliminar despachos');
      }

      const deletedCount = json.deleted || 0;

      if (deletedCount === 0) {
        setErrorMsg('No se pudieron eliminar los despachos. Verifique permisos.');
        return;
      }

      setSelectedDespachos(new Set());
      setSelectAll(false);
      setShowDeleteConfirm(false);
      setDespachosPendingDelete(new Set());

      if (user?.id) {
        try {
          await fetchGeneratedDispatches(user.id);
        } catch (fetchError) {
          console.error('❌ Error en recarga:', fetchError);
        }
      }

      setForceRefresh(prev => prev + 1);
      setSuccessMsg(`✅ ${deletedCount} despacho(s) eliminado(s) exitosamente`);
    } catch (error: any) {
      console.error('💥 Error eliminando despachos:', error);
      setErrorMsg(error.message || 'Error al eliminar despachos. Intente nuevamente.');
    } finally {
      setDeletingDespachos(false);
    }
  };

  const handleSaveRow = async (rowToSave: FormDispatchRow, _originalIndex: number) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      setErrorMsg('Usuario no autenticado.');
      setLoading(false);
      return;
    }

    if (rowToSave.turno_requerido && !rowToSave.turno_id) {
      setErrorMsg('El destino seleccionado requiere turno. Debe reservar turno antes de guardar el despacho.');
      setLoading(false);
      return;
    }

    if (!rowToSave.origen || !rowToSave.destino || !rowToSave.fecha_despacho || !rowToSave.hora_despacho) {
      const camposFaltantes = [];
      if (!rowToSave.origen) camposFaltantes.push('Origen');
      if (!rowToSave.destino) camposFaltantes.push('Destino');
      if (!rowToSave.fecha_despacho) camposFaltantes.push('Fecha');
      if (!rowToSave.hora_despacho) camposFaltantes.push('Hora');

      setErrorMsg(`Por favor, completa los campos obligatorios: ${camposFaltantes.join(', ')}.`);
      setLoading(false);
      return;
    }

    try {
      let finalPedidoId = rowToSave.pedido_id;
      if (!finalPedidoId || finalPedidoId.trim() === '') {
        finalPedidoId = await generateDespachoCode();
      }

      const despachoData = {
        pedido_id: finalPedidoId,
        origen: rowToSave.origen,
        origen_id: rowToSave.origen_id || null,
        destino: rowToSave.destino,
        destino_id: rowToSave.destino_id || null,
        estado: 'pendiente_transporte',
        scheduled_local_date: rowToSave.fecha_despacho,
        scheduled_local_time: `${rowToSave.hora_despacho}:00`,
        empresa_id: empresaPlanta?.empresa_id || null,
        created_by: user.id,
        transport_id: null,
        driver_id: null,
        type: rowToSave.tipo_carga || 'despacho',
        comentarios: rowToSave.observaciones || '',
        prioridad: (['Baja', 'Media', 'Alta', 'Urgente'].includes(rowToSave.prioridad)) ? rowToSave.prioridad : 'Media',
        unidad_type: rowToSave.unidad_type || 'semi',
        cantidad_viajes_solicitados: rowToSave.cantidad_viajes_solicitados || 1,
        referencia_cliente: rowToSave.referencia_cliente || null,
      };

      const { data, error } = await supabase
        .from('despachos')
        .insert([despachoData])
        .select(`
          id,
          pedido_id,
          origen,
          destino,
          estado,
          scheduled_local_date,
          scheduled_local_time,
          type,
          comentarios,
          prioridad,
          unidad_type,
          created_at
        `);

      if (error) {
        console.error('Error al guardar despacho:', error);
        setErrorMsg('Error al guardar despacho. Intente nuevamente.');
      } else {
        const despachoCreado = data[0];

        if (!despachoCreado) {
          console.error('❌ Error: despachoCreado es undefined');
          setErrorMsg('Error al crear despacho');
          setLoading(false);
          return;
        }

        const cantidadViajes = rowToSave.cantidad_viajes_solicitados || 1;

        let viajesCreados = 0;
        if (cantidadViajes > 0) {
          let scheduledAt = null;
          if (despachoCreado.scheduled_local_date && despachoCreado.scheduled_local_time) {
            const fechaHora = `${despachoCreado.scheduled_local_date}T${despachoCreado.scheduled_local_time}`;
            scheduledAt = new Date(fechaHora).toISOString();
          }

          const viajesData = [];
          for (let i = 0; i < cantidadViajes; i++) {
            viajesData.push({
              despacho_id: despachoCreado.id,
              numero_viaje: i + 1,
              estado: 'pendiente',
              estado_carga: 'pendiente_asignacion',
              estado_unidad: null,
              scheduled_at: scheduledAt,
              fecha_creacion: new Date().toISOString()
            });
          }

          const { data: viajesInsertados, error: viajesError } = await supabase
            .from('viajes_despacho')
            .insert(viajesData)
            .select('id, numero_viaje, despacho_id');

          if (viajesError) {
            console.error('❌ Error al crear viajes:', viajesError);
            setErrorMsg('Despacho creado pero hubo un error al generar viajes. Revise el despacho.');
          } else {
            viajesCreados = viajesInsertados?.length || 0;

            await supabase
              .from('historial_despachos')
              .insert({
                despacho_id: despachoCreado.id,
                accion: 'despacho_creado',
                descripcion: `Despacho ${despachoCreado.pedido_id} creado con ${viajesCreados} viaje(s) - ${rowToSave.origen} → ${rowToSave.destino}`,
                usuario_id: user.id,
                metadata: {
                  pedido_id: despachoCreado.pedido_id,
                  origen: rowToSave.origen,
                  destino: rowToSave.destino,
                  fecha: rowToSave.fecha_despacho,
                  hora: rowToSave.hora_despacho,
                  cantidad_viajes: viajesCreados,
                  tipo_carga: rowToSave.tipo_carga,
                  prioridad: rowToSave.prioridad
                }
              });
          }
        }

        if (viajesCreados > 0) {
          setSuccessMsg(`Despacho "${despachoCreado?.pedido_id || finalPedidoId}" generado exitosamente con ${viajesCreados} viaje(s).`);
        } else {
          setSuccessMsg(`Despacho "${despachoCreado?.pedido_id || finalPedidoId}" generado (sin viajes creados - revisar consola).`);
        }

        if (rowToSave.turno_id) {
          const { error: turnoAttachError } = await supabase
            .from('turnos_reservados')
            .update({ despacho_id: despachoCreado.id, updated_at: new Date().toISOString() })
            .eq('id', rowToSave.turno_id);
          if (turnoAttachError) {
            console.error('⚠️ Error vinculando turno al despacho:', turnoAttachError);
          }
        }

        await fetchGeneratedDispatches(user.id);

        setFormRows(prevRows => prevRows.filter(row => row.tempId !== rowToSave.tempId));
        if (formRows.length === 1 && formRows[0]?.tempId === rowToSave.tempId) {
          setFormRows([{ ...EMPTY_FORM_ROW }]);
        }
      }
    } catch (err: any) {
      console.error('Error inesperado en handleSaveRow:', err);
      setErrorMsg('Ocurrió un error inesperado. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Computed values ──────────────────────────────────────────────────

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // ─── Return ───────────────────────────────────────────────────────────

  return {
    // Auth
    user,
    userName,
    empresaPlanta,

    // UI feedback
    loading,
    errorMsg,
    successMsg,
    loadingGenerated,

    // Form
    formRows,
    setFormRows,
    handleRowChange,
    handleOrigenSelect,
    handleDestinoSelect,
    handleOpenTurnoModal,
    handleConfirmarReservaTurno,
    handleSaveRow,
    today,

    // Turnos modal
    isTurnoModalOpen,
    setIsTurnoModalOpen,
    turnoFecha,
    setTurnoFecha,
    turnoSlots,
    turnoSelectedSlot,
    setTurnoSelectedSlot,
    loadingTurnos,
    savingTurno,
    turnoRowTempId,
    refreshVentanasTurno,

    // Dispatches
    generatedDispatches,
    activeTab,
    setActiveTab,
    forceRefresh,

    // Selection
    selectedDespachos,
    selectAll,
    deletingDespachos,
    handleSelectDespacho,
    handleSelectAll,
    handleDeleteSelected,

    // Expand
    expandedDespachos,
    viajesDespacho,
    handleToggleExpandDespacho,

    // Assign modal
    isAssignModalOpen,
    selectedDispatchForAssign,
    handleAssignTransport,
    handleAssignSuccess,
    handleCloseAssignModal,

    // Red Nodexia modal
    isRedNodexiaModalOpen,
    selectedDispatchForRed,
    selectedViajeForRed,
    handleOpenRedNodexia,
    handleCloseRedNodexia,

    // Ver Estado modal
    isVerEstadoModalOpen,
    selectedViajeRedId,
    selectedViajeNumero,
    handleVerEstadoRed,
    handleCloseVerEstado,
    handleAceptarOfertaDesdeModal,

    // Cancelar modal
    isCancelarModalOpen,
    selectedDispatchForCancel,
    motivoCancelacion,
    setMotivoCancelacion,
    handleOpenCancelarModal,
    handleConfirmarCancelacion,
    handleCloseCancelarModal: () => {
      setIsCancelarModalOpen(false);
      setSelectedDispatchForCancel(null);
      setMotivoCancelacion('');
    },

    // Reprogramar modal
    isReprogramarModalOpen,
    selectedDispatchForReprogram,
    setIsReprogramarModalOpen,
    setSelectedDispatchForReprogram,

    // Editar modal
    isEditarModalOpen,
    selectedDispatchForEdit,
    setIsEditarModalOpen,
    setSelectedDispatchForEdit,

    // Delete confirm modal
    showDeleteConfirm,
    setShowDeleteConfirm,
    despachosPendingDelete,
    setDespachosPendingDelete,
    executeDelete,

    // Timeline modal
    isTimelineModalOpen,
    setIsTimelineModalOpen,
    timelineDespachoId,
    setTimelineDespachoId,
    timelinePedidoId,
    setTimelinePedidoId,
    timelineRefreshTrigger,
    setTimelineRefreshTrigger,

    // Trip actions
    handleCancelarViajeCoordinador,
    handleReasignarViaje,

    // Data reload
    fetchGeneratedDispatches,
  };
}
