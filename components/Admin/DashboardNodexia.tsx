import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CreditCardIcon, 
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
      color: 'bg-blue-500',
      change: '+2 este mes'
    },
    {
      title: 'Clientes Activos',
      value: stats.clientesActivos,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      change: `${Math.round((stats.clientesActivos / stats.totalClientes) * 100)}% del total`
    },
    {
      title: 'Usuarios Totales',
      value: stats.totalUsuarios,
      icon: UsersIcon,
      color: 'bg-purple-500',
      change: '+5 esta semana'
    },
    {
      title: 'Revenue Mensual',
      value: `$${stats.revenue.toLocaleString()}`,
      icon: ArrowTrendingUpIcon,
      color: 'bg-emerald-500',
      change: '+12% vs mes anterior'
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats.solicitudesPendientes,
      icon: ExclamationTriangleIcon,
      color: 'bg-orange-500',
      change: 'Requieren atención'
    },
    {
      title: 'Alertas de Límites',
      value: stats.alertasLimites,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      change: 'Revisar suscripciones'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Nodexia</h1>
          <p className="text-gray-400 mt-2">Resumen general del ecosistema de clientes</p>
        </div>
        <button 
          onClick={cargarDatos}
          className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{card.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.change}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de Límites */}
      {alertas.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            Alertas de Límites de Suscripción
          </h2>
          <div className="space-y-3">
            {alertas.map((alerta, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{alerta.empresa}</p>
                  <p className="text-gray-400 text-sm">{alerta.tipo}: {alerta.usado}/{alerta.limite}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        alerta.porcentaje >= 80 ? 'bg-red-500' : 
                        alerta.porcentaje >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${alerta.porcentaje}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    alerta.porcentaje >= 80 ? 'text-red-400' : 
                    alerta.porcentaje >= 60 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {alerta.porcentaje}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">Acciones Rápidas</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + Nuevo Cliente
            </button>
            <button className="w-full text-left p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              + Crear Usuario
            </button>
            <button className="w-full text-left p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              📋 Ver Solicitudes
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">Actividad Reciente</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Usuario creado</span>
              <span className="text-gray-500">Hace 2h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Plan actualizado</span>
              <span className="text-gray-500">Hace 4h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Nuevo cliente</span>
              <span className="text-gray-500">Ayer</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">Estado del Sistema</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Base de Datos</span>
              <span className="text-green-400 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">API</span>
              <span className="text-green-400 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Operativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Notificaciones</span>
              <span className="text-green-400 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Activas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}