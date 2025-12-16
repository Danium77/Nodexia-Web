import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layout/AdminLayout';
import WizardOnboarding from '../../components/Admin/WizardOnboarding';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  email: string;
  tipo_ecosistema: string;
  plan_nombre: string;
  activa: boolean;
  created_at: string;
  usuarios_count?: number;
  alertas_count?: number;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      // Primero, obtener todas las empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('*');

      if (empresasError) {
        console.error('Error cargando empresas:', empresasError);
        throw empresasError;
      }

      console.log('Empresas encontradas:', empresasData); // Para debug

      if (!empresasData || empresasData.length === 0) {
        setClientes([]);
        return;
      }

      // Obtener tipos de empresa
      const { data: tiposData } = await supabase
        .from('tipos_empresa_ecosistema')
        .select('*');

      // Obtener planes
      const { data: planesData } = await supabase
        .from('planes_suscripcion')
        .select('*');

      console.log('Tipos:', tiposData, 'Planes:', planesData); // Para debug

      // Mapear datos combinando información
      const clientesConDatos = empresasData.map(empresa => {
        const tipo = tiposData?.find(t => t.id === empresa.tipo_ecosistema_id);
        const plan = planesData?.find(p => p.id === empresa.plan_suscripcion_id);

        return {
          id: empresa.id,
          nombre: empresa.nombre,
          cuit: empresa.cuit,
          email: empresa.email,
          activa: empresa.activa,
          created_at: empresa.created_at,
          tipo_ecosistema: tipo?.nombre || 'No definido',
          plan_nombre: plan?.nombre || 'Sin plan',
          usuarios_count: Math.floor(Math.random() * 10) + 1, // Temporal
          alertas_count: Math.floor(Math.random() * 3) // Temporal
        };
      });

      setClientes(clientesConDatos);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter(cliente => {
    const matchBusqueda = cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                         cliente.cuit.includes(busqueda) ||
                         cliente.email.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchFiltro = filtro === 'todos' || 
                       (filtro === 'activos' && cliente.activa) ||
                       (filtro === 'inactivos' && !cliente.activa) ||
                       (filtro === 'alertas' && (cliente.alertas_count || 0) > 0);

    return matchBusqueda && matchFiltro;
  });

  const stats = {
    total: clientes.length,
    activos: clientes.filter(c => c.activa).length,
    conAlertas: clientes.filter(c => (c.alertas_count || 0) > 0).length,
    totalUsuarios: clientes.reduce((acc, c) => acc + (c.usuarios_count || 0), 0)
  };

  const onWizardComplete = (_clienteId: string) => {
    setShowWizard(false);
    cargarClientes(); // Recargar la lista
    // Opcional: navegar al detalle del cliente recién creado
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-white text-lg">Cargando clientes...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Clientes</h1>
            <p className="text-gray-400 mt-2">Administra todas las empresas cliente del ecosistema Nodexia</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center font-medium"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Cliente
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Clientes</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Activos</p>
                <p className="text-2xl font-bold text-green-400">{stats.activos}</p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Con Alertas</p>
                <p className="text-2xl font-bold text-orange-400">{stats.conAlertas}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Usuarios</p>
                <p className="text-2xl font-bold text-purple-400">{stats.totalUsuarios}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800 rounded p-2 border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, CUIT o email..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500"
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
                <option value="alertas">Con Alertas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {clientesFiltrados.map((cliente) => (
            <div key={cliente.id} className="bg-gray-800 rounded p-2 border border-gray-700 hover:border-gray-600 transition-all">
              {/* Header de la Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{cliente.nombre}</h3>
                  <p className="text-gray-400 text-sm">{cliente.cuit}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {(cliente.alertas_count || 0) > 0 && (
                    <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      {cliente.alertas_count} alertas
                    </div>
                  )}
                  <div className={`w-3 h-3 rounded-full ${cliente.activa ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
              </div>

              {/* Información */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Tipo:</span>
                  <span className="text-white font-medium">{cliente.tipo_ecosistema}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-cyan-400 font-medium">{cliente.plan_nombre}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Usuarios:</span>
                  <span className="text-white">{cliente.usuarios_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Creado:</span>
                  <span className="text-gray-300">{new Date(cliente.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button 
                  onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                  className="flex-1 bg-cyan-600 text-white py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                >
                  Ver Detalle
                </button>
                <button 
                  onClick={() => {
                    // Aquí puedes agregar un modal de configuración rápida o navegar a una página específica
                    console.log('Configurar cliente:', cliente.id);
                  }}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                >
                  ⚙️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {clientesFiltrados.length === 0 && (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No se encontraron clientes</h3>
            <p className="text-gray-500 mb-6">
              {busqueda || filtro !== 'todos' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primer cliente'
              }
            </p>
            {!busqueda && filtro === 'todos' && (
              <button
                onClick={() => setShowWizard(true)}
                className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Crear Primer Cliente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <WizardOnboarding
          onClose={() => setShowWizard(false)}
          onComplete={onWizardComplete}
        />
      )}
    </AdminLayout>
  );
}