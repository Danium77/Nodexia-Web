import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import NetworkMetrics from '../components/Dashboard/NetworkMetrics';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DashboardStats {
  totalDespachos: number;
  despachosAsignados: number;
  despachosPendientes: number;
  transportesActivos: number;
  eficienciaRed: number;
  // 🆕 KPIs Operativos de Planta
  slotAdherence: number; // % de cumplimiento de ventanas horarias
  dwellTimePromedio: number; // Tiempo promedio en planta (minutos)
  pendientesDescarga: number; // Unidades próximas a arribar
}

interface DespachoReciente {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  prioridad: string;
  scheduled_local_date: string;
  transporte_data?: { nombre: string };
}

interface TransporteActivo {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  ubicacion_actual?: string;
  despachos_asignados: number;
}

const CoordinatorDashboard = () => {
  const router = useRouter();
  const { user: authUser, primaryRole, loading: roleLoading } = useUserRole(); // Usar Context
  const [userName, setUserName] = useState<string>('Coordinador');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalDespachos: 0,
    despachosAsignados: 0,
    despachosPendientes: 0,
    transportesActivos: 0,
    eficienciaRed: 0,
    slotAdherence: 0,
    dwellTimePromedio: 0,
    pendientesDescarga: 0
  });
  const [recentDispatches, setRecentDispatches] = useState<DespachoReciente[]>([]);
  const [activeTransports, setActiveTransports] = useState<TransporteActivo[]>([]);

  // Verificar autenticación y permisos
  useEffect(() => {
    if (roleLoading) return;

    if (!authUser) {
      router.replace('/login');
      return;
    }

    // Solo coordinadores pueden acceder
    if (primaryRole !== 'coordinador') {
      console.log(`⚠️ [coordinator-dashboard] Invalid role: ${primaryRole}`);
      router.replace('/dashboard');
      return;
    }

    // Cargar datos
    loadAllData();
  }, [authUser, primaryRole, roleLoading, router]);

  const loadAllData = async () => {
    if (!authUser) return;

    try {
      setLoading(true);

      // Obtener nombre del usuario
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('nombre_completo')
        .eq('email', authUser.email)
        .maybeSingle();

      if (usuarioData?.nombre_completo) {
        setUserName(usuarioData.nombre_completo);
      }

      // Cargar datos en paralelo
      await Promise.all([
        loadDashboardStats(authUser.id),
        loadRecentDispatches(authUser.id),
        loadActiveTransports()
      ]);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 KPI 1: Calcular Slot Adherence (% de cumplimiento de ventanas horarias)
  const calcularSlotAdherence = async (userId: string): Promise<number> => {
    try {
      // Obtener viajes de los últimos 7 días con hora programada
      const { data: viajes } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          despacho_id,
          despachos!inner(scheduled_at, created_by)
        `)
        .eq('despachos.created_by', userId)
        .gte('despachos.scheduled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!viajes || viajes.length === 0) return 0;

      // Obtener registros de control de acceso (ingresos)
      const viajeIds = viajes.map(v => v.id);
      const { data: registros } = await supabase
        .from('registro_control_acceso')
        .select('viaje_id, fecha_hora')
        .in('viaje_id', viajeIds)
        .eq('tipo_movimiento', 'ingreso');

      if (!registros || registros.length === 0) return 0;

      // Calcular cumplimiento: llegó ±15min de la hora programada
      let cumplidos = 0;
      registros.forEach(registro => {
        const viaje = viajes.find(v => v.id === registro.viaje_id);
        if (viaje && viaje.despachos) {
          const despacho = viaje.despachos as any;
          const horaProgr = new Date(despacho.scheduled_at).getTime();
          const horaReal = new Date(registro.fecha_hora).getTime();
          const diff = Math.abs(horaReal - horaProgr) / 60000; // diferencia en minutos
          
          if (diff <= 15) cumplidos++; // ±15 minutos = cumplido
        }
      });

      return Math.round((cumplidos / registros.length) * 100);
    } catch (error) {
      console.error('Error calculando slot adherence:', error);
      return 0;
    }
  };

  // 🆕 KPI 2: Calcular Dwell Time Promedio (tiempo de permanencia en planta)
  const calcularDwellTime = async (userId: string): Promise<number> => {
    try {
      // Obtener viajes con ingreso Y egreso en los últimos 7 días
      const { data: viajes } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          despacho_id,
          despachos!inner(created_by)
        `)
        .eq('despachos.created_by', userId);

      if (!viajes || viajes.length === 0) return 0;

      const viajeIds = viajes.map(v => v.id);
      const { data: registros } = await supabase
        .from('registro_control_acceso')
        .select('viaje_id, tipo_movimiento, fecha_hora')
        .in('viaje_id', viajeIds)
        .order('fecha_hora', { ascending: true });

      if (!registros || registros.length === 0) return 0;

      // Agrupar por viaje y calcular dwell time
      const dwellTimes: number[] = [];
      const viajesConIngresoEgreso = new Map<string, { ingreso?: Date; egreso?: Date }>();

      registros.forEach(r => {
        if (!viajesConIngresoEgreso.has(r.viaje_id)) {
          viajesConIngresoEgreso.set(r.viaje_id, {});
        }
        const viaje = viajesConIngresoEgreso.get(r.viaje_id)!;
        
        if (r.tipo_movimiento === 'ingreso' && !viaje.ingreso) {
          viaje.ingreso = new Date(r.fecha_hora);
        } else if (r.tipo_movimiento === 'egreso' && !viaje.egreso) {
          viaje.egreso = new Date(r.fecha_hora);
        }
      });

      // Calcular tiempos
      viajesConIngresoEgreso.forEach((viaje) => {
        if (viaje.ingreso && viaje.egreso) {
          const diff = (viaje.egreso.getTime() - viaje.ingreso.getTime()) / 60000; // minutos
          if (diff > 0 && diff < 480) dwellTimes.push(diff); // Solo si es < 8 horas (filtrar anomalías)
        }
      });

      if (dwellTimes.length === 0) return 0;

      const promedio = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
      return Math.round(promedio);
    } catch (error) {
      console.error('Error calculando dwell time:', error);
      return 0;
    }
  };

  // 🆕 KPI 3: Calcular Pendientes de Descarga (unidades próximas a arribar)
  const calcularPendientesDescarga = async (userId: string): Promise<number> => {
    try {
      // Obtener empresa del usuario para identificar recepciones
      const { data: usuarioEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id, empresas!inner(cuit)')
        .eq('user_id', userId)
        .maybeSingle();

      if (!usuarioEmpresa) return 0;

      const empresaId = usuarioEmpresa.empresa_id;
      const empresa = usuarioEmpresa.empresas as any;
      const cuit = empresa?.cuit;

      // Obtener ubicaciones de la empresa
      const { data: ubicaciones } = await supabase
        .from('ubicaciones')
        .select('id')
        .eq('cuit', cuit)
        .eq('activo', true);

      if (!ubicaciones || ubicaciones.length === 0) return 0;

      const ubicacionIds = ubicaciones.map(u => u.id);

      // Contar viajes en tránsito hacia estas ubicaciones (RECEPCIONES)
      const { data: despachos } = await supabase
        .from('despachos')
        .select('id')
        .in('destino_id', ubicacionIds);

      if (!despachos || despachos.length === 0) return 0;

      const despachoIds = despachos.map(d => d.id);
      
      // Contar viajes en estados próximos a arribar
      const { data: viajesEnTransito, count } = await supabase
        .from('viajes_despacho')
        .select('id', { count: 'exact', head: true })
        .in('despacho_id', despachoIds)
        .in('estado_carga', ['en_transito_destino', 'ingresado_destino']);

      return count || 0;
    } catch (error) {
      console.error('Error calculando pendientes de descarga:', error);
      return 0;
    }
  };

  const loadDashboardStats = async (userId: string) => {
    try {
      // Obtener empresa del usuario coordinador
      const { data: usuarioEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', userId)
        .maybeSingle();

      const empresaCoordinadoraId = usuarioEmpresa?.empresa_id;

      // Obtener transportes vinculados directamente a la empresa
      const { data: transportesVinculados } = await supabase
        .from('relaciones_empresa')
        .select('empresa_transporte_id')
        .eq('empresa_coordinadora_id', empresaCoordinadoraId)
        .eq('activo', true);

      const transportesVinculadosIds = transportesVinculados?.map(r => r.empresa_transporte_id) || [];

      // Obtener estadísticas de despachos
      const { data: despachos, error } = await supabase
        .from('despachos')
        .select('estado, transport_id')
        .eq('created_by', userId);

      if (error) throw error;

      const totalDespachos = despachos?.length || 0;
      const despachosAsignados = despachos?.filter(d => d.transport_id).length || 0;
      const despachosPendientes = totalDespachos - despachosAsignados;

      // 🔹 Eficiencia de RED NODEXIA: solo despachos asignados a transportes NO vinculados
      const despachosRedNodexia = despachos?.filter(d => 
        d.transport_id && !transportesVinculadosIds.includes(d.transport_id)
      ).length || 0;

      // Obtener empresas de transporte activas en la red Nodexia (NO vinculadas)
      const { data: empresasTransporte } = await supabase
        .from('empresas')
        .select('id')
        .eq('tipo_empresa', 'transporte')
        .eq('activo', true)
        .not('id', 'in', `(${transportesVinculadosIds.join(',')})`);

      const transportesActivos = empresasTransporte?.length || 0;

      // Calcular métricas de eficiencia (solo con red Nodexia)
      const eficienciaRed = totalDespachos > 0 ? Math.round((despachosRedNodexia / totalDespachos) * 100) : 0;

      // 🆕 KPI 1: Slot Adherence (Cumplimiento de ventanas horarias)
      const slotAdherence = await calcularSlotAdherence(userId);

      // 🆕 KPI 2: Dwell Time Promedio (Tiempo de permanencia en planta)
      const dwellTimePromedio = await calcularDwellTime(userId);

      // 🆕 KPI 3: Pendientes de Descarga (Unidades próximas a arribar)
      const pendientesDescarga = await calcularPendientesDescarga(userId);

      setStats({
        totalDespachos,
        despachosAsignados,
        despachosPendientes,
        transportesActivos,
        eficienciaRed,
        slotAdherence,
        dwellTimePromedio,
        pendientesDescarga
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentDispatches = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('despachos')
        .select(`
          id,
          pedido_id,
          origen,
          destino,
          estado,
          prioridad,
          scheduled_local_date,
          transport_id,
          transportes:transport_id (
            nombre
          )
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedDispatches = data?.map(d => {
        const transporteData = Array.isArray(d.transportes) 
          ? d.transportes[0] 
          : d.transportes;
        
        return {
          id: d.id,
          pedido_id: d.pedido_id,
          origen: d.origen,
          destino: d.destino,
          estado: d.estado,
          prioridad: d.prioridad,
          scheduled_local_date: d.scheduled_local_date,
          ...(transporteData && { transporte_data: transporteData })
        };
      }) || [];

      setRecentDispatches(formattedDispatches as any);

    } catch (error) {
      console.error('Error loading recent dispatches:', error);
    }
  };

  const loadActiveTransports = async () => {
    try {
      // Usar empresas de transporte en lugar de tabla transportes
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('tipo_empresa', 'transporte')
        .eq('activo', true)
        .limit(5);

      if (error) throw error;

      // Para cada transporte, contar despachos asignados
      const transportsWithStats = await Promise.all(
        (data || []).map(async (transport) => {
          const { data: despachos } = await supabase
            .from('despachos')
            .select('id')
            .eq('transport_id', transport.id);

          return {
            id: transport.id,
            nombre: transport.nombre,
            tipo: 'Transporte', // Todas son empresas tipo transporte
            estado: 'Disponible',
            ubicacion_actual: 'En ruta',
            despachos_asignados: despachos?.length || 0
          };
        })
      );

      setActiveTransports(transportsWithStats);

    } catch (error) {
      console.error('Error loading transports:', error);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, string> = {
      'pendiente': 'bg-gray-600 text-gray-100',
      'transporte_asignado': 'bg-blue-600 text-blue-100',
      'camion_asignado': 'bg-yellow-600 text-yellow-100',
      'confirmado_chofer': 'bg-blue-700 text-blue-100',
      'en_transito_origen': 'bg-purple-600 text-purple-100',
      'ingresado_origen': 'bg-cyan-600 text-cyan-100',
      'llamado_carga': 'bg-amber-600 text-amber-100',
      'cargando': 'bg-orange-600 text-orange-100',
      'cargado': 'bg-indigo-600 text-indigo-100',
      'egreso_origen': 'bg-violet-600 text-violet-100',
      'en_transito_destino': 'bg-purple-600 text-purple-100',
      'ingresado_destino': 'bg-teal-600 text-teal-100',
      'llamado_descarga': 'bg-amber-600 text-amber-100',
      'descargando': 'bg-cyan-600 text-cyan-100',
      'descargado': 'bg-emerald-600 text-emerald-100',
      'egreso_destino': 'bg-emerald-700 text-emerald-100',
      'completado': 'bg-green-700 text-green-100',
      'cancelado': 'bg-red-600 text-red-100',
    };
    return badges[estado] || 'bg-gray-600 text-gray-100';
  };

  const getPrioridadBadge = (prioridad: string) => {
    const badges = {
      'Alta': 'bg-red-600 text-red-100',
      'Normal': 'bg-yellow-600 text-yellow-100',
      'Baja': 'bg-green-600 text-green-100'
    };
    return badges[prioridad as keyof typeof badges] || 'bg-gray-600 text-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <LoadingSpinner size="xl" text="Cargando dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail="" userName="" pageTitle="Dashboard Coordinador" />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-2">
          
          {/* Header del Dashboard */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                  <span className="text-cyan-400 mr-3">⚡</span>
                  Panel de control
                </h1>
                <p className="text-gray-400 mt-2">
                  Bienvenido, {userName} - Centro de comando NODEXIA
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Estado de la Red NODEXIA</div>
                <div className="text-xl font-bold text-green-400 flex items-center justify-end">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Operativa</span>
                    <div className="ml-2 flex space-x-1">
                      <div className="w-1 h-4 bg-green-400 animate-pulse" style={{animationDelay: '0s'}}></div>
                      <div className="w-1 h-4 bg-green-400 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-1 h-4 bg-green-400 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.transportesActivos} nodos conectados
                </div>
              </div>
            </div>
          </div>

          {/* Métricas Principales con Animaciones */}
          <NetworkMetrics stats={stats} />

          {/* 🆕 KPIs Operativos de Planta */}
          <div className="mb-6 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-indigo-500/30">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-indigo-400 mr-3">📊</span>
              KPIs Operativos de Planta
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Slot Adherence */}
              <div className="bg-gray-800/50 rounded-lg p-5 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-gray-300 text-sm font-medium">Cumplimiento de Horarios</h4>
                  <span className="text-2xl">⏱️</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-4xl font-bold ${
                    stats.slotAdherence >= 80 ? 'text-green-400' :
                    stats.slotAdherence >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {stats.slotAdherence}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Llegadas dentro de ventana horaria (±15 min)
                </p>
                <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      stats.slotAdherence >= 80 ? 'bg-green-500' :
                      stats.slotAdherence >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${stats.slotAdherence}%` }}
                  ></div>
                </div>
              </div>

              {/* Dwell Time */}
              <div className="bg-gray-800/50 rounded-lg p-5 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-gray-300 text-sm font-medium">Tiempo de Permanencia</h4>
                  <span className="text-2xl">🕐</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-4xl font-bold ${
                    stats.dwellTimePromedio <= 60 ? 'text-green-400' :
                    stats.dwellTimePromedio <= 120 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {stats.dwellTimePromedio}
                  </span>
                  <span className="text-gray-400 text-lg">min</span>
                </div>
                <p className="text-xs text-gray-400">
                  Tiempo promedio en planta (últimos 7 días)
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-green-400">✓ Meta: &lt; 60 min</span>
                </div>
              </div>

              {/* Pendientes de Descarga */}
              <div className="bg-gray-800/50 rounded-lg p-5 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-gray-300 text-sm font-medium">Próximos a Arribar</h4>
                  <span className="text-2xl">🚛</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-4xl font-bold ${
                    stats.pendientesDescarga === 0 ? 'text-gray-400' :
                    stats.pendientesDescarga <= 5 ? 'text-green-400' :
                    stats.pendientesDescarga <= 10 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {stats.pendientesDescarga}
                  </span>
                  <span className="text-gray-400 text-lg">unidades</span>
                </div>
                <p className="text-xs text-gray-400">
                  Viajes en tránsito hacia planta
                </p>
                <div className="mt-3">
                  {stats.pendientesDescarga > 0 ? (
                    <button 
                      onClick={() => router.push('/planificacion?tab=tracking')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Ver en seguimiento →
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Sin unidades pendientes</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            
            {/* Despachos Recientes */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">📋 Despachos Recientes</h3>
                <button 
                  onClick={() => router.push('/crear-despacho')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm transition-colors"
                >
                  Ver Todos
                </button>
              </div>
              
              <div className="space-y-4">
                {recentDispatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No hay despachos aún</p>
                    <button 
                      onClick={() => router.push('/crear-despacho')}
                      className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm transition-colors"
                    >
                      Crear Primer Despacho
                    </button>
                  </div>
                ) : (
                  recentDispatches.map((dispatch) => (
                    <div key={dispatch.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{dispatch.pedido_id}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getPrioridadBadge(dispatch.prioridad)}`}>
                          {dispatch.prioridad}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">
                        📍 {dispatch.origen} → {dispatch.destino}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(dispatch.estado)}`}>
                          {dispatch.estado === 'transporte_asignado' ? '🚚 Asignado' : '⏳ Pendiente'}
                        </span>
                        <span className="text-xs text-gray-400">
                          📅 {dispatch.scheduled_local_date}
                        </span>
                      </div>
                      {dispatch.transporte_data && (
                        <div className="mt-2 text-xs text-green-400">
                          🚛 {dispatch.transporte_data.nombre}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Red de Transportes */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">🌐 Red de Transportes</h3>
                <div className="text-sm text-green-400 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  En línea
                </div>
              </div>
              
              <div className="space-y-4">
                {activeTransports.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">🚛</div>
                    <p>Conectando con la red...</p>
                  </div>
                ) : (
                  activeTransports.map((transport) => (
                    <div key={transport.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{transport.nombre}</h4>
                        <span className="px-2 py-1 rounded text-xs bg-green-600 text-green-100">
                          {transport.estado}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">
                        🚚 {transport.tipo}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          📍 {transport.ubicacion_actual}
                        </span>
                        <span className="text-cyan-400">
                          📦 {transport.despachos_asignados} despachos
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Valor de Red NODEXIA */}
          <div className="mb-2 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded p-2 border border-cyan-700">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center">
              <span className="text-cyan-400 mr-3">🌐</span>
              El Poder de la Red NODEXIA
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              
              {/* Reducción de Costos */}
              <div className="text-center">
                <div className="bg-green-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📉</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Reducción de Costos</h4>
                <p className="text-3xl font-bold text-green-400 mb-2">35%</p>
                <p className="text-gray-300 text-sm">
                  Optimización automática de rutas y consolidación de cargas
                </p>
              </div>

              {/* Tiempo de Respuesta */}
              <div className="text-center">
                <div className="bg-blue-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚡</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Tiempo de Respuesta</h4>
                <p className="text-3xl font-bold text-blue-400 mb-2">&lt; 15min</p>
                <p className="text-gray-300 text-sm">
                  Asignación instantánea de transportes disponibles en la red
                </p>
              </div>

              {/* Visibilidad Total */}
              <div className="text-center">
                <div className="bg-purple-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👁️</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Visibilidad Total</h4>
                <p className="text-3xl font-bold text-purple-400 mb-2">100%</p>
                <p className="text-gray-300 text-sm">
                  Trazabilidad completa desde origen hasta destino
                </p>
              </div>

            </div>

            {/* Métricas de Red en Tiempo Real */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-cyan-400">{stats.transportesActivos}</p>
                  <p className="text-gray-400 text-sm">Transportes Conectados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{stats.eficienciaRed}%</p>
                  <p className="text-gray-400 text-sm">Eficiencia Operativa</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">24/7</p>
                  <p className="text-gray-400 text-sm">Monitoreo Activo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">Real-Time</p>
                  <p className="text-gray-400 text-sm">Sincronización</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action Mejorado */}
          <div className="mt-8 bg-gradient-to-r from-cyan-800 via-blue-800 to-purple-800 rounded-xl p-8 border border-cyan-500 shadow-2xl relative overflow-hidden">
            {/* Efectos de fondo */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 animate-pulse"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-6 md:mb-0">
                  <h3 className="text-3xl font-bold text-white mb-3 flex items-center">
                    <span className="text-4xl mr-3">🚀</span>
                    ¿Listo para revolucionar tu logística?
                  </h3>
                  <p className="text-cyan-100 text-lg mb-3">
                    NODEXIA conecta tu carga con la red de transporte más eficiente de Argentina
                  </p>
                  <div className="flex items-center space-x-6 text-sm">
                    <span className="flex items-center text-green-300">
                      <span className="mr-2">✅</span> Ahorro inmediato del 35%
                    </span>
                    <span className="flex items-center text-blue-300">
                      <span className="mr-2">⚡</span> Asignación en menos de 15 min
                    </span>
                    <span className="flex items-center text-purple-300">
                      <span className="mr-2">🌐</span> Red 24/7 disponible
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <button 
                    onClick={() => router.push('/crear-despacho')}
                    className="px-8 py-4 bg-gradient-to-r from-white to-gray-100 text-cyan-800 font-bold rounded-lg hover:from-gray-100 hover:to-white transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center"
                  >
                    <span className="mr-2">📦</span>
                    Crear Despacho Ahora
                  </button>
                  <button 
                    onClick={() => router.push('/planificacion')}
                    className="px-8 py-3 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                  >
                    <span className="mr-2">📅</span>
                    Ver Planificación
                  </button>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;