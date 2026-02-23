// pages/estados-camiones.tsx
// Panel de estados generales de todos los camiones
// Lee estado_unidad de viajes_despacho + datos de chofer/camion por joins separados

import { useState, useEffect } from 'react';
import { TruckIcon, ClockIcon, CheckCircleIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import MainLayout from '../components/layout/MainLayout';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface ViajeEstado {
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
  fecha_despacho?: string; // scheduled_local_date del despacho
  _esOrigen?: boolean;   // true si esta planta es origen del despacho
  _esDestino?: boolean;  // true si esta planta es destino del despacho
}

type TabEstado = 'todos' | 'confirmado' | 'ingresado_planta' | 'llamado_carga' | 'cargando' | 'cargado' | 'egreso' | 'en_transito_destino' | 'ingresado_destino' | 'descargando' | 'egreso_destino'
  | 'ca_en_planta' | 'ca_por_arribar' | 'ca_cargando' | 'ca_descargando' | 'ca_egresados';

export default function EstadosCamiones() {
  const { userEmpresas, primaryRole } = useUserRole();
  const esControlAcceso = primaryRole === 'control_acceso';
  const [viajes, setViajes] = useState<ViajeEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabActivo, setTabActivo] = useState<TabEstado>('todos');

  useEffect(() => {
    cargarViajes();
  }, [userEmpresas]);

  const cargarViajes = async () => {
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

      // Estados activos que queremos mostrar (origen + destino)
      const estadosActivos = [
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
        'egreso_destino'
      ];

      // Paso 1: Obtener despachos vinculados a las empresas del usuario
      // Buscar todos los usuarios de las mismas empresas
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

      // Rastrear si el despacho es como origen o destino para esta planta
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
        .in('estado', estadosActivos)
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
          : Promise.resolve({ data: [] })
      ]);

      const choferesMap = new Map((choferesRes.data || []).map((ch: any) => [ch.id, ch]));
      const camionesMap = new Map((camionesRes.data || []).map((ca: any) => [ca.id, ca]));

      // Paso 4: Armar viajes con datos completos
      const viajesCompletos: ViajeEstado[] = viajesData.map(v => {
        const chofer = v.chofer_id ? choferesMap.get(v.chofer_id) : null;
        const camion = v.camion_id ? camionesMap.get(v.camion_id) : null;
        const despacho = despachosMap.get(v.despacho_id);

        // Determinar si esta planta es origen o destino del despacho
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
  };

  // Mapear estados del sistema a estados simplificados para UI
  const mapearEstadoUI = (estadoUnidad: string): string => {
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
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmado': return 'text-blue-400 bg-blue-900/30';
      case 'ingresado_planta': return 'text-green-400 bg-green-900/30';
      case 'llamado_carga': return 'text-yellow-400 bg-yellow-900/30';
      case 'cargando': return 'text-orange-400 bg-orange-900/30';
      case 'cargado': return 'text-purple-400 bg-purple-900/30';
      case 'egreso': return 'text-gray-400 bg-gray-900/30';
      case 'en_transito_destino': return 'text-pink-400 bg-pink-900/30';
      case 'ingresado_destino': return 'text-teal-400 bg-teal-900/30';
      case 'descargando': return 'text-amber-400 bg-amber-900/30';
      case 'egreso_destino': return 'text-emerald-400 bg-emerald-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'confirmado': return 'Por Arribar';
      case 'ingresado_planta': return 'En Planta';
      case 'llamado_carga': return 'Llamado a Carga';
      case 'cargando': return 'Cargando';
      case 'cargado': return 'Cargado';
      case 'egreso': return 'Egreso';
      case 'en_transito_destino': return 'En Tránsito';
      case 'ingresado_destino': return 'En Planta';
      case 'descargando': return 'Descargando';
      case 'egreso_destino': return 'Egreso';
      default: return estado;
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'confirmado': return <ClockIcon className="h-5 w-5" />;
      case 'ingresado_planta': return <TruckIcon className="h-5 w-5" />;
      case 'llamado_carga':
      case 'cargando': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'cargado': return <CheckCircleIcon className="h-5 w-5" />;
      case 'egreso': return <ArrowRightOnRectangleIcon className="h-5 w-5" />;
      case 'en_transito_destino': return <TruckIcon className="h-5 w-5" />;
      case 'ingresado_destino': return <CheckCircleIcon className="h-5 w-5" />;
      case 'descargando': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'egreso_destino': return <ArrowRightOnRectangleIcon className="h-5 w-5" />;
      default: return <TruckIcon className="h-5 w-5" />;
    }
  };

  // ===== Contadores para TODOS los roles (operaciones detalladas) =====
  const estadosCount = {
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
  };

  // ===== Contadores para CONTROL DE ACCESO (badges simplificados) =====
  const hoyStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ── Helpers de clasificación por planta ──
  // Estados post-egreso desde la perspectiva de la planta ORIGEN
  const estadosPostEgresoOrigen = ['egreso_origen', 'en_transito_destino', 'ingresado_destino',
    'llamado_descarga', 'descargando', 'descargado', 'egreso_destino'];

  // ¿El viaje fue procesado por CA de ESTA planta? (ingresó o egresó alguna vez)
  const esRelevantePlanta = (v: ViajeEstado): boolean => {
    const estado = v.estado_unidad;
    if (v._esOrigen) {
      // Origen: desde asignación hasta cualquier estado posterior
      return ['camion_asignado', 'confirmado_chofer', 'en_transito_origen',
        'ingresado_origen', 'llamado_carga', 'cargando', 'cargado',
        ...estadosPostEgresoOrigen].includes(estado);
    }
    if (v._esDestino) {
      return ['en_transito_destino', 'ingresado_destino',
        'llamado_descarga', 'descargando', 'descargado', 'egreso_destino'].includes(estado);
    }
    return false;
  };

  // Viajes relevantes para esta planta
  const viajesPlanta = viajes.filter(esRelevantePlanta);

  // ── En Planta: desde ingresado hasta pre-egreso, respetando origen/destino ──
  const caEnPlantaFilter = (v: ViajeEstado): boolean => {
    if (v._esOrigen && ['ingresado_origen', 'llamado_carga', 'cargando', 'cargado'].includes(v.estado_unidad)) return true;
    if (v._esDestino && ['ingresado_destino', 'llamado_descarga', 'descargando', 'descargado'].includes(v.estado_unidad)) return true;
    return false;
  };
  const caEnPlanta = viajesPlanta.filter(caEnPlantaFilter).length;

  // ── Por Arribar: fecha despacho <= hoy, aún no ingresó a ESTA planta ──
  const caPorArribarFilter = (v: ViajeEstado): boolean => {
    if (!v.fecha_despacho || v.fecha_despacho > hoyStr) return false;
    if (v._esOrigen && ['camion_asignado', 'confirmado_chofer', 'en_transito_origen'].includes(v.estado_unidad)) return true;
    if (v._esDestino && v.estado_unidad === 'en_transito_destino') return true;
    return false;
  };
  const caPorArribar = viajesPlanta.filter(caPorArribarFilter).length;

  // ── Cargando: solo si esta planta es origen ──
  const caCargandoFilter = (v: ViajeEstado): boolean =>
    !!(v._esOrigen && ['llamado_carga', 'cargando'].includes(v.estado_unidad));
  const caCargando = viajesPlanta.filter(caCargandoFilter).length;

  // ── Descargando: solo si esta planta es destino ──
  const caDescargandoFilter = (v: ViajeEstado): boolean =>
    !!(v._esDestino && ['llamado_descarga', 'descargando'].includes(v.estado_unidad));
  const caDescargando = viajesPlanta.filter(caDescargandoFilter).length;

  // ── Egresados: camiones que ya salieron de ESTA planta ──
  const caEgresadosFilter = (v: ViajeEstado): boolean => {
    if (v._esOrigen && estadosPostEgresoOrigen.includes(v.estado_unidad)) return true;
    if (v._esDestino && v.estado_unidad === 'egreso_destino') return true;
    return false;
  };
  const caEgresados = viajesPlanta.filter(caEgresadosFilter).length;

  // ── Filtro para tabs de CA ──
  const filtrarCA = (tab: TabEstado): ViajeEstado[] => {
    switch (tab) {
      case 'ca_en_planta': return viajesPlanta.filter(caEnPlantaFilter);
      case 'ca_por_arribar': return viajesPlanta.filter(caPorArribarFilter);
      case 'ca_cargando': return viajesPlanta.filter(caCargandoFilter);
      case 'ca_descargando': return viajesPlanta.filter(caDescargandoFilter);
      case 'ca_egresados': return viajesPlanta.filter(caEgresadosFilter);
      default: return viajesPlanta;
    }
  };

  // Filtrar viajes según tab activo
  const viajesFiltrados = esControlAcceso
    ? (tabActivo === 'todos' ? viajesPlanta : filtrarCA(tabActivo))
    : (tabActivo === 'todos' ? viajes : filtrarCA(tabActivo));

  if (loading) {
    return (
      <MainLayout pageTitle="Estados de Camiones">
        <LoadingSpinner text="Cargando viajes..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Estados de Camiones">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <TruckIcon className="h-8 w-8 text-indigo-100" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Monitor General de Vehículos</h1>
            <p className="text-slate-300 mt-1">Estados en tiempo real de todos los camiones en planta</p>
          </div>
        </div>
      </div>

      {/* Resumen de Estados — badges unificados */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        {[
          { key: 'todos' as TabEstado, label: 'Todos', count: esControlAcceso ? viajesPlanta.length : viajes.length, color: 'cyan', Icon: TruckIcon },
          { key: 'ca_en_planta' as TabEstado, label: 'En Planta', count: caEnPlanta, color: 'green', Icon: TruckIcon },
          { key: 'ca_por_arribar' as TabEstado, label: 'Por Arribar', count: caPorArribar, color: 'blue', Icon: ClockIcon },
          { key: 'ca_cargando' as TabEstado, label: 'Cargando', count: caCargando, color: 'orange', Icon: ExclamationTriangleIcon },
          { key: 'ca_descargando' as TabEstado, label: 'Descargando', count: caDescargando, color: 'amber', Icon: ExclamationTriangleIcon },
          { key: 'ca_egresados' as TabEstado, label: 'Egresados', count: caEgresados, color: 'gray', Icon: ArrowRightOnRectangleIcon },
        ].map(({ key, label, count, color, Icon }) => (
          <div
            key={key}
            onClick={() => setTabActivo(key)}
            className={`cursor-pointer rounded-lg shadow-sm border p-4 transition-all ${
              tabActivo === key
                ? `bg-${color}-700 border-${color}-500 ring-2 ring-${color}-400`
                : `bg-slate-800 border-slate-700 hover:border-${color}-600`
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-${color}-400`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-300`}>{count}</p>
              </div>
              <Icon className={`h-8 w-8 text-${color}-500`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-100">
                {tabActivo === 'todos' ? 'Todos los Vehículos' : `Vehículos - ${
                  tabActivo.startsWith('ca_')
                    ? { ca_en_planta: 'En Planta', ca_por_arribar: 'Por Arribar', ca_cargando: 'Cargando', ca_descargando: 'Descargando', ca_egresados: 'Egresados' }[tabActivo] || tabActivo
                    : getEstadoTexto(tabActivo)
                }`}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {viajesFiltrados.length} {viajesFiltrados.length === 1 ? 'vehículo' : 'vehículos'}
              </p>
            </div>
            <button onClick={cargarViajes} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
              🔄 Actualizar
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {viajesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No hay vehículos en este estado</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Viaje</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Chofer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Vehículo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Ruta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {viajesFiltrados.map((viaje) => {
                  const estadoUI = mapearEstadoUI(viaje.estado_unidad);
                  // En tab Egresados: mostrar "Egresado" en vez del estado real del viaje
                  const esTabEgresados = tabActivo === 'ca_egresados';
                  return (
                    <tr key={viaje.id} className="hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {esTabEgresados ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-900/30">
                            <span className="mr-1.5"><ArrowRightOnRectangleIcon className="h-5 w-5" /></span>
                            Egresado
                          </div>
                        ) : (
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(estadoUI)}`}>
                            <span className="mr-1.5">{getEstadoIcon(estadoUI)}</span>
                            {getEstadoTexto(estadoUI)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-100">#{viaje.numero_viaje}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">
                          {viaje.chofer_nombre && viaje.chofer_apellido ? `${viaje.chofer_nombre} ${viaje.chofer_apellido}` : 'Sin asignar'}
                        </div>
                        {viaje.chofer_dni && <div className="text-sm text-slate-400">DNI: {viaje.chofer_dni}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">{viaje.camion_patente || 'Sin asignar'}</div>
                        {viaje.camion_marca && <div className="text-sm text-slate-400">{viaje.camion_marca} {viaje.camion_modelo || ''}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">
                          {viaje.origen && viaje.destino ? `${viaje.origen} → ${viaje.destino}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100">
                          {viaje.created_at ? new Date(viaje.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
