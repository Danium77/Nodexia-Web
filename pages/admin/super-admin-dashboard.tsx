import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CreditCardIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalEmpresas: number;
  totalUsuarios: number;
  suscripcionesActivas: number;
  empresasActivas: number;
  transportes: number;
  coordinadores: number;
  clientes: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, primaryRole, loading } = useUserRole(); // Usar primaryRole en lugar de role
  const [stats, setStats] = useState<DashboardStats>({
    totalEmpresas: 0,
    totalUsuarios: 0,
    suscripcionesActivas: 0,
    empresasActivas: 0,
    transportes: 0,
    coordinadores: 0,
    clientes: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // NOTA: NO necesitamos useEffect para verificar rol.
  // La verificación se hace en el render (línea ~101)
  // Si no es super_admin, mostrará loading y no renderizará contenido.

  // Cargar estadísticas
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        // Contar empresas
        const { count: totalEmpresas } = await supabase
          .from('empresas')
          .select('*', { count: 'exact', head: true });

        const { count: empresasActivas } = await supabase
          .from('empresas')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true);

        const { count: transportes } = await supabase
          .from('empresas')
          .select('*', { count: 'exact', head: true })
          .eq('tipo_empresa', 'transporte');

        const { count: coordinadores } = await supabase
          .from('empresas')
          .select('*', { count: 'exact', head: true })
          .eq('tipo_empresa', 'coordinador');

        const { count: clientes } = await supabase
          .from('empresas')
          .select('*', { count: 'exact', head: true })
          .eq('tipo_empresa', 'cliente');

        // Contar usuarios
        const { count: totalUsuarios } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalEmpresas: totalEmpresas || 0,
          totalUsuarios: totalUsuarios || 0,
          suscripcionesActivas: 0, // TODO: cuando tengamos tabla de suscripciones
          empresasActivas: empresasActivas || 0,
          transportes: transportes || 0,
          coordinadores: coordinadores || 0,
          clientes: clientes || 0,
        });
      } catch (error) {
        console.error('Error al cargar estadÃ­sticas:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user]);

  // Mostrar loading mientras carga o si no es super_admin
  if (loading || primaryRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout pageTitle="Panel Super Administrador">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">AdministraciÃ³n Central Nodexia</h1>
          <p className="text-purple-100">Sistema de gestiÃ³n multi-tenant</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Empresas */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Empresas</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? '...' : stats.totalEmpresas}
                </p>
              </div>
              <BuildingOfficeIcon className="h-12 w-12 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">{stats.empresasActivas} activas</span>
            </div>
          </div>

          {/* Transportes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transportes</p>
                <p className="text-3xl font-bold text-cyan-600">
                  {loadingStats ? '...' : stats.transportes}
                </p>
              </div>
              <svg className="h-12 w-12 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
          </div>

          {/* Coordinadores */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Coordinadores</p>
                <p className="text-3xl font-bold text-purple-600">
                  {loadingStats ? '...' : stats.coordinadores}
                </p>
              </div>
              <BuildingOfficeIcon className="h-12 w-12 text-purple-500" />
            </div>
          </div>

          {/* Total Usuarios */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Usuarios</p>
                <p className="text-3xl font-bold text-green-600">
                  {loadingStats ? '...' : stats.totalUsuarios}
                </p>
              </div>
              <UsersIcon className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* GestiÃ³n de Empresas */}
          <button
            onClick={() => router.push('/admin/empresas')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <BuildingOfficeIcon className="h-10 w-10 text-blue-600 group-hover:text-blue-700" />
              <span className="text-blue-600 text-sm font-medium">Gestionar â†’</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Empresas</h3>
            <p className="text-sm text-gray-600">
              Crear y administrar transportes, coordinadores y clientes del sistema
            </p>
          </button>

          {/* GestiÃ³n de Usuarios */}
          <button
            onClick={() => router.push('/admin/usuarios')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <UsersIcon className="h-10 w-10 text-green-600 group-hover:text-green-700" />
              <span className="text-green-600 text-sm font-medium">Gestionar â†’</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Usuarios</h3>
            <p className="text-sm text-gray-600">
              Administrar usuarios, roles y permisos de acceso
            </p>
          </button>

          {/* Suscripciones */}
          <button
            onClick={() => router.push('/admin/suscripciones')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <CreditCardIcon className="h-10 w-10 text-purple-600 group-hover:text-purple-700" />
              <span className="text-purple-600 text-sm font-medium">Gestionar â†’</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Suscripciones</h3>
            <p className="text-sm text-gray-600">
              Planes, facturaciÃ³n y lÃ­mites de uso por empresa
            </p>
          </button>

          {/* Solicitudes de Registro */}
          <button
            onClick={() => router.push('/admin/solicitudes')}
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-white text-sm font-medium">Gestionar →</span>
            </div>
            <h3 className="text-lg font-bold mb-2">📋 Solicitudes de Registro</h3>
            <p className="text-sm text-purple-50">
              Aprobar o rechazar solicitudes de nuevas empresas
            </p>
          </button>

          {/* Analíticas */}
          <button
            onClick={() => router.push('/admin/analiticas')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <ChartBarIcon className="h-10 w-10 text-orange-600 group-hover:text-orange-700" />
              <span className="text-orange-600 text-sm font-medium">Ver â†’</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AnalÃ­ticas Globales</h3>
            <p className="text-sm text-gray-600">
              MÃ©tricas y estadÃ­sticas de toda la red Nodexia
            </p>
          </button>

          {/* ConfiguraciÃ³n */}
          <button
            onClick={() => router.push('/admin/configuracion')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <Cog6ToothIcon className="h-10 w-10 text-gray-600 group-hover:text-gray-700" />
              <span className="text-gray-600 text-sm font-medium">Configurar â†’</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">ConfiguraciÃ³n</h3>
            <p className="text-sm text-gray-600">
              ParÃ¡metros generales del sistema y ajustes avanzados
            </p>
          </button>

          {/* Red Nodexia */}
          <button
            onClick={() => router.push('/admin/red-nodexia')}
            className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-white text-sm font-medium">Gestionar â†’</span>
            </div>
            <h3 className="text-lg font-bold mb-2">Red Nodexia</h3>
            <p className="text-sm text-cyan-50">
              AdministraciÃ³n de la red colaborativa de transporte
            </p>
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

