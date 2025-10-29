import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DashboardStats {
  totalClientes: number;
  clientesActivos: number;
  totalUsuarios: number;
  solicitudesPendientes: number;
  revenue: number;
  alertasLimites: number;
}

interface AlertaLimite {
  empresa: string;
  tipo: string;
  usado: number;
  limite: number;
  porcentaje: number;
}

export default function DashboardNodexia() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    clientesActivos: 0,
    totalUsuarios: 0,
    solicitudesPendientes: 0,
    revenue: 0,
    alertasLimites: 0
  });

  const [alertas, setAlertas] = useState<AlertaLimite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar estadísticas básicas
      const { data: empresas } = await supabase
        .from('view_empresas_completa')
        .select('*');

      const { data: usuarios } = await supabase
        .from('usuarios_empresa')
        .select('*');

      // Simular alertas de límites (esto se conectará con la lógica real)
      const alertasSimuladas: AlertaLimite[] = [
        { empresa: 'Tecnología Zayas S.A.', tipo: 'Usuarios Admin', usado: 4, limite: 5, porcentaje: 80 },
        { empresa: 'Transportes Demo S.A.', tipo: 'Gerentes', usado: 2, limite: 3, porcentaje: 67 }
      ];

      setStats({
        totalClientes: empresas?.length || 0,
        clientesActivos: empresas?.filter(e => e.activa)?.length || 0,
        totalUsuarios: usuarios?.length || 0,
        solicitudesPendientes: 3, // Simulado
        revenue: 25000, // Simulado
        alertasLimites: alertasSimuladas.length
      });

      setAlertas(alertasSimuladas);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Cargando dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Clientes Total',
      value: stats.totalClientes,
      icon: BuildingOfficeIcon,
      gradient: 'from-cyan-500/10 to-cyan-600/10',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
      valueColor: 'text-slate-50',
      change: '+2 este mes',
      changeColor: 'text-cyan-400'
    },
    {
      title: 'Clientes Activos',
      value: stats.clientesActivos,
      icon: CheckCircleIcon,
      gradient: 'from-green-500/10 to-green-600/10',
      border: 'border-green-500/30',
      iconColor: 'text-green-400',
      valueColor: 'text-slate-50',
      change: `${Math.round((stats.clientesActivos / stats.totalClientes) * 100)}% del total`,
      changeColor: 'text-green-400'
    },
    {
      title: 'Usuarios Totales',
      value: stats.totalUsuarios,
      icon: UsersIcon,
      gradient: 'from-purple-500/10 to-purple-600/10',
      border: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      valueColor: 'text-slate-50',
      change: '+5 esta semana',
      changeColor: 'text-purple-400'
    },
    {
      title: 'Revenue Mensual',
      value: `$${stats.revenue.toLocaleString()}`,
      icon: ArrowTrendingUpIcon,
      gradient: 'from-emerald-500/10 to-emerald-600/10',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      valueColor: 'text-slate-50',
      change: '+12% vs mes anterior',
      changeColor: 'text-emerald-400'
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats.solicitudesPendientes,
      icon: ExclamationTriangleIcon,
      gradient: 'from-amber-500/10 to-amber-600/10',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      valueColor: 'text-slate-50',
      change: 'Requieren atención',
      changeColor: 'text-amber-400'
    },
    {
      title: 'Alertas de Límites',
      value: stats.alertasLimites,
      icon: ExclamationTriangleIcon,
      gradient: 'from-red-500/10 to-red-600/10',
      border: 'border-red-500/30',
      iconColor: 'text-red-400',
      valueColor: 'text-slate-50',
      change: 'Revisar suscripciones',
      changeColor: 'text-red-400'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Dashboard Nodexia</h1>
        <p className="text-slate-400">Resumen general del ecosistema de clientes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div 
            key={index} 
            className={`bg-gradient-to-br ${card.gradient} rounded-lg p-6 border ${card.border} hover:border-opacity-50 transition-all duration-300`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`${card.iconColor} text-sm font-medium mb-1`}>{card.title}</p>
                <p className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
                <p className={`text-xs ${card.changeColor} mt-2`}>{card.change}</p>
              </div>
              <div className={`${card.iconColor} opacity-80`}>
                <card.icon className="h-10 w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de Límites */}
      {alertas.length > 0 && (
        <div className="bg-[#1b273b] rounded-lg p-6 border border-red-700/50">
          <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            Alertas de Límites de Suscripción
          </h2>
          <div className="space-y-3">
            {alertas.map((alerta, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[#0a0e1a] rounded-lg border border-slate-700">
                <div className="flex-1">
                  <p className="text-slate-50 font-medium">{alerta.empresa}</p>
                  <p className="text-slate-400 text-sm">{alerta.tipo}: {alerta.usado}/{alerta.limite}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        alerta.porcentaje >= 80 ? 'bg-red-500' : 
                        alerta.porcentaje >= 60 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${alerta.porcentaje}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    alerta.porcentaje >= 80 ? 'text-red-400' : 
                    alerta.porcentaje >= 60 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {alerta.porcentaje}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos Rápidos y Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Acciones Rápidas */}
        <div className="bg-[#1b273b] rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-slate-50 mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition-all duration-300 font-medium flex items-center gap-2">
              <span>+</span> Nuevo Cliente
            </button>
            <button className="w-full text-left p-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium flex items-center gap-2">
              <span>+</span> Crear Usuario
            </button>
            <button className="w-full text-left p-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-medium flex items-center gap-2">
              <span>📋</span> Ver Solicitudes
            </button>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-[#1b273b] rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-slate-50 mb-4">Actividad Reciente</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start p-3 bg-[#0a0e1a] rounded-lg">
              <span className="text-slate-300">Usuario creado</span>
              <span className="text-slate-500 text-xs">Hace 2h</span>
            </div>
            <div className="flex justify-between items-start p-3 bg-[#0a0e1a] rounded-lg">
              <span className="text-slate-300">Plan actualizado</span>
              <span className="text-slate-500 text-xs">Hace 4h</span>
            </div>
            <div className="flex justify-between items-start p-3 bg-[#0a0e1a] rounded-lg">
              <span className="text-slate-300">Nuevo cliente</span>
              <span className="text-slate-500 text-xs">Ayer</span>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="bg-[#1b273b] rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-slate-50 mb-4">Estado del Sistema</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#0a0e1a] rounded-lg">
              <span className="text-slate-300">Base de Datos</span>
              <span className="text-green-400 flex items-center gap-1 text-sm font-medium">
                <CheckCircleIcon className="h-4 w-4" />
                Online
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0e1a] rounded-lg">
              <span className="text-slate-300">API</span>
              <span className="text-green-400 flex items-center gap-1 text-sm font-medium">
                <CheckCircleIcon className="h-4 w-4" />
                Operativo
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0a0e1a] rounded-lg">
              <span className="text-slate-300">Notificaciones</span>
              <span className="text-green-400 flex items-center gap-1 text-sm font-medium">
                <CheckCircleIcon className="h-4 w-4" />
                Activas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}