/**
 * Hook: useEstadosCamiones
 * Carga viajes activos con datos de choferes/camiones y provee
 * lógica de filtrado y conteo por estado para la página de monitor de vehículos.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../contexts/UserRoleContext';

// =====================
// Types
// =====================

export interface ViajeEstado {
  id: string;
  numero_viaje: string;
  estado_unidad: string;
  chofer_nombre?: string;
  chofer_apellido?: string;
  chofer_dni?: string;
  camion_patente?: string;
  camion_marca?: string;
  camion_modelo?: string;
  created_at: string;
  origen?: string;
  destino?: string;
  fecha_despacho?: string;
  _esOrigen?: boolean;
  _esDestino?: boolean;
}

export type TabEstado =
  | 'todos'
  | 'confirmado'
  | 'ingresado_planta'
  | 'llamado_carga'
  | 'cargando'
  | 'cargado'
  | 'egreso'
  | 'en_transito_destino'
  | 'ingresado_destino'
  | 'descargando'
  | 'egreso_destino'
  | 'ca_en_planta'
  | 'ca_por_arribar'
  | 'ca_cargando'
  | 'ca_descargando'
  | 'ca_egresados';

// =====================
// Helpers puros (mapeo de estados)
// =====================

const ESTADOS_ACTIVOS = [
  'camion_asignado',
  'confirmado_chofer',
  'en_transito_origen',
  'ingresado_origen',
  'llamado_carga',
  'cargando',
  'cargado',
  'egreso_origen',
  'en_transito_destino',
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
  'descargado',
  'egreso_destino',
];

const ESTADOS_POST_EGRESO_ORIGEN = [
  'egreso_origen',
  'en_transito_destino',
  'ingresado_destino',
  'llamado_descarga',
  'descargando',
  'descargado',
  'egreso_destino',
];

export function mapearEstadoUI(estadoUnidad: string): string {
  switch (estadoUnidad) {
    case 'camion_asignado':
    case 'confirmado_chofer':
    case 'en_transito_origen':
      return 'confirmado';
    case 'ingresado_origen':
      return 'ingresado_planta';
    case 'llamado_carga':
      return 'llamado_carga';
    case 'cargando':
      return 'cargando';
    case 'cargado':
      return 'cargado';
    case 'egreso_origen':
      return 'egreso';
    case 'en_transito_destino':
      return 'en_transito_destino';
    case 'ingresado_destino':
      return 'ingresado_destino';
    case 'llamado_descarga':
    case 'descargando':
    case 'descargado':
      return 'descargando';
    case 'egreso_destino':
      return 'egreso_destino';
    default:
      return 'confirmado';
  }
}

export function getEstadoTexto(estado: string): string {
  switch (estado) {
    case 'confirmado':
      return 'Por Arribar';
    case 'ingresado_planta':
      return 'En Planta';
    case 'llamado_carga':
      return 'Llamado a Carga';
    case 'cargando':
      return 'Cargando';
    case 'cargado':
      return 'Cargado';
    case 'egreso':
      return 'Egreso';
    case 'en_transito_destino':
      return 'En Tránsito';
    case 'ingresado_destino':
      return 'En Planta';
    case 'descargando':
      return 'Descargando';
    case 'egreso_destino':
      return 'Egreso';
    default:
      return estado;
  }
}

export function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'confirmado':
      return 'text-blue-400 bg-blue-900/30';
    case 'ingresado_planta':
      return 'text-green-400 bg-green-900/30';
    case 'llamado_carga':
      return 'text-yellow-400 bg-yellow-900/30';
    case 'cargando':
      return 'text-orange-400 bg-orange-900/30';
    case 'cargado':
      return 'text-purple-400 bg-purple-900/30';
    case 'egreso':
      return 'text-gray-400 bg-gray-900/30';
    case 'en_transito_destino':
      return 'text-pink-400 bg-pink-900/30';
    case 'ingresado_destino':
      return 'text-teal-400 bg-teal-900/30';
    case 'descargando':
      return 'text-amber-400 bg-amber-900/30';
    case 'egreso_destino':
      return 'text-emerald-400 bg-emerald-900/30';
    default:
      return 'text-gray-400 bg-gray-900/30';
  }
}

// =====================
// Filtros CA (control de acceso)
// =====================

function esRelevantePlanta(v: ViajeEstado): boolean {
  const estado = v.estado_unidad;
  if (v._esOrigen) {
    return [
      'camion_asignado',
      'confirmado_chofer',
      'en_transito_origen',
      'ingresado_origen',
      'llamado_carga',
      'cargando',
      'cargado',
      ...ESTADOS_POST_EGRESO_ORIGEN,
    ].includes(estado);
  }
  if (v._esDestino) {
    return [
      'en_transito_destino',
      'ingresado_destino',
      'llamado_descarga',
      'descargando',
      'descargado',
      'egreso_destino',
    ].includes(estado);
  }
  return false;
}

function caEnPlantaFilter(v: ViajeEstado): boolean {
  if (v._esOrigen && ['ingresado_origen', 'llamado_carga', 'cargando', 'cargado'].includes(v.estado_unidad)) return true;
  if (v._esDestino && ['ingresado_destino', 'llamado_descarga', 'descargando', 'descargado'].includes(v.estado_unidad)) return true;
  return false;
}

function caPorArribarFilter(v: ViajeEstado, hoyStr: string): boolean {
  if (!v.fecha_despacho || v.fecha_despacho > hoyStr) return false;
  if (v._esOrigen && ['camion_asignado', 'confirmado_chofer', 'en_transito_origen'].includes(v.estado_unidad)) return true;
  if (v._esDestino && v.estado_unidad === 'en_transito_destino') return true;
  return false;
}

function caCargandoFilter(v: ViajeEstado): boolean {
  return !!(v._esOrigen && ['llamado_carga', 'cargando'].includes(v.estado_unidad));
}

function caDescargandoFilter(v: ViajeEstado): boolean {
  return !!(v._esDestino && ['llamado_descarga', 'descargando'].includes(v.estado_unidad));
}

function caEgresadosFilter(v: ViajeEstado): boolean {
  if (v._esOrigen && ESTADOS_POST_EGRESO_ORIGEN.includes(v.estado_unidad)) return true;
  if (v._esDestino && v.estado_unidad === 'egreso_destino') return true;
  return false;
}

// =====================
// Hook principal
// =====================

export default function useEstadosCamiones() {
  const { userEmpresas, primaryRole } = useUserRole();
  const esControlAcceso = primaryRole === 'control_acceso' || primaryRole === 'coordinador_integral';

  const [viajes, setViajes] = useState<ViajeEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabActivo, setTabActivo] = useState<TabEstado>('todos');

  const cargarViajes = useCallback(async () => {
    try {
      setLoading(true);

      if (!userEmpresas || userEmpresas.length === 0) {
        setViajes([]);
        return;
      }

      const empresaIds = userEmpresas.map((ue: any) => ue.empresa?.id || ue.empresa_id).filter(Boolean);
      if (empresaIds.length === 0) {
        setViajes([]);
        return;
      }

      // CUITs de las empresas del usuario (para fallback en coincidencia de ubicaciones)
      const cuits = userEmpresas
        .map((ue: any) => ue.empresas?.cuit || ue.empresa?.cuit)
        .filter(Boolean);

      // Ubicaciones que pertenecen a estas empresas (por empresa_id O por cuit)
      const filtroUbic = [
        ...empresaIds.map((id: string) => `empresa_id.eq.${id}`),
        ...cuits.map((c: string) => `cuit.eq.${c}`),
      ].join(',');

      // Paso 1: Obtener despachos vinculados a las empresas del usuario
      const { data: companyUsers } = await supabase
        .from('usuarios_empresa')
        .select('user_id')
        .in('empresa_id', empresaIds)
        .eq('activo', true);

      const allUserIds = [...new Set((companyUsers || []).map(u => u.user_id).filter(Boolean))];

      if (allUserIds.length === 0) {
        setViajes([]);
        return;
      }

      // Obtener ubicaciones de la empresa (por empresa_id O por cuit)
      const { data: ubicsEmpresa } = filtroUbic
        ? await supabase.from('ubicaciones').select('id').or(filtroUbic)
        : await supabase.from('ubicaciones').select('id').in('empresa_id', empresaIds);

      const ubicIds = (ubicsEmpresa || []).map((u: any) => u.id);

      // Despachos creados por usuarios de la empresa (como origen)
      // + Despachos donde la empresa es destino (recepciones)
      const [despCreadosRes, despDestinoRes] = await Promise.all([
        allUserIds.length > 0
          ? supabase.from('despachos').select('id, origen, destino, scheduled_local_date').in('created_by', allUserIds)
          : Promise.resolve({ data: [] }),
        ubicIds.length > 0
          ? supabase.from('despachos').select('id, origen, destino, scheduled_local_date').in('destino_id', ubicIds)
          : Promise.resolve({ data: [] }),
      ]);

      const despachosOrigenIds = new Set((despCreadosRes.data || []).map((d: any) => d.id));
      const despachosDestinoIds = new Set((despDestinoRes.data || []).map((d: any) => d.id));

      const despachosMap = new Map<string, { id: string; origen: string; destino: string; scheduled_local_date?: string }>();
      for (const d of [...(despCreadosRes.data || []), ...(despDestinoRes.data || [])]) {
        despachosMap.set(d.id, d);
      }
      const despachos = [...despachosMap.values()];

      if (despachos.length === 0) {
        setViajes([]);
        return;
      }

      const despachoIds = despachos.map(d => d.id);

      // Paso 2: Obtener viajes activos de esos despachos
      const { data: viajesData, error: viajesError } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, chofer_id, camion_id, despacho_id, created_at')
        .in('despacho_id', despachoIds)
        .in('estado', ESTADOS_ACTIVOS)
        .order('created_at', { ascending: false });

      if (viajesError) {
        console.error('Error cargando viajes:', viajesError);
        setViajes([]);
        return;
      }

      if (!viajesData || viajesData.length === 0) {
        setViajes([]);
        return;
      }

      // Paso 3: Buscar datos de choferes y camiones en paralelo
      const choferIds = [...new Set(viajesData.map(v => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set(viajesData.map(v => v.camion_id).filter(Boolean))];

      const [choferesRes, camionesRes] = await Promise.all([
        choferIds.length > 0
          ? supabase.from('choferes').select('id, nombre, apellido, dni').in('id', choferIds)
          : Promise.resolve({ data: [] }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente, marca, modelo').in('id', camionIds)
          : Promise.resolve({ data: [] }),
      ]);

      const choferesMap = new Map((choferesRes.data || []).map((ch: any) => [ch.id, ch]));
      const camionesMap = new Map((camionesRes.data || []).map((ca: any) => [ca.id, ca]));

      // Paso 4: Armar viajes con datos completos
      const viajesCompletos: ViajeEstado[] = viajesData.map(v => {
        const chofer = v.chofer_id ? choferesMap.get(v.chofer_id) : null;
        const camion = v.camion_id ? camionesMap.get(v.camion_id) : null;
        const despacho = despachosMap.get(v.despacho_id);

        const esOrigen = despachosOrigenIds.has(v.despacho_id);
        const esDestino = despachosDestinoIds.has(v.despacho_id);

        return {
          id: v.id,
          numero_viaje: v.numero_viaje?.toString() || 'N/A',
          estado_unidad: v.estado || 'camion_asignado',
          chofer_nombre: chofer?.nombre,
          chofer_apellido: chofer?.apellido,
          chofer_dni: chofer?.dni,
          camion_patente: camion?.patente,
          camion_marca: camion?.marca,
          camion_modelo: camion?.modelo,
          created_at: v.created_at,
          origen: despacho?.origen || '',
          destino: despacho?.destino || '',
          fecha_despacho: despacho?.scheduled_local_date || '',
          _esOrigen: esOrigen,
          _esDestino: esDestino,
        };
      });

      setViajes(viajesCompletos);
    } catch (error: any) {
      console.error('Error cargando viajes:', error);
    } finally {
      setLoading(false);
    }
  }, [userEmpresas]);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  // =====================
  // Computed state (memoized)
  // =====================

  const hoyStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const viajesPlanta = useMemo(() => viajes.filter(esRelevantePlanta), [viajes]);

  const estadosCount = useMemo(
    () => ({
      confirmado: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'confirmado').length,
      ingresado_planta: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'ingresado_planta').length,
      llamado_carga: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'llamado_carga').length,
      cargando: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'cargando').length,
      carga_finalizada: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'cargado').length,
      egresado_planta: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'egreso').length,
      en_transito_destino: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'en_transito_destino').length,
      ingresado_destino: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'ingresado_destino').length,
      descargando: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'descargando').length,
      egreso_destino: viajes.filter(v => mapearEstadoUI(v.estado_unidad) === 'egreso_destino').length,
    }),
    [viajes]
  );

  const caCount = useMemo(
    () => ({
      enPlanta: viajesPlanta.filter(caEnPlantaFilter).length,
      porArribar: viajesPlanta.filter(v => caPorArribarFilter(v, hoyStr)).length,
      cargando: viajesPlanta.filter(caCargandoFilter).length,
      descargando: viajesPlanta.filter(caDescargandoFilter).length,
      egresados: viajesPlanta.filter(caEgresadosFilter).length,
    }),
    [viajesPlanta, hoyStr]
  );

  const viajesFiltrados = useMemo(() => {
    const base = esControlAcceso ? viajesPlanta : viajes;
    if (tabActivo === 'todos') return base;

    switch (tabActivo) {
      case 'ca_en_planta':
        return viajesPlanta.filter(caEnPlantaFilter);
      case 'ca_por_arribar':
        return viajesPlanta.filter(v => caPorArribarFilter(v, hoyStr));
      case 'ca_cargando':
        return viajesPlanta.filter(caCargandoFilter);
      case 'ca_descargando':
        return viajesPlanta.filter(caDescargandoFilter);
      case 'ca_egresados':
        return viajesPlanta.filter(caEgresadosFilter);
      default:
        return base;
    }
  }, [viajes, viajesPlanta, tabActivo, esControlAcceso, hoyStr]);

  return {
    viajes,
    viajesPlanta,
    viajesFiltrados,
    loading,
    tabActivo,
    setTabActivo,
    cargarViajes,
    esControlAcceso,
    estadosCount,
    caCount,
  };
}
