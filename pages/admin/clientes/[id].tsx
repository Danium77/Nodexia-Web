import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/layout/AdminLayout';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CreditCardIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ClienteDetalle {
  id: string;
  nombre: string;
  cuit: string;
  email: string;
  telefono?: string;
  direccion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
  tipo_ecosistema: string;
  plan_nombre: string;
  precio_mensual: number;
  configuracion_empresa: any;
}

export default function ClienteDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (id) {
      cargarClienteDetalle();
    }
  }, [id]);

  const cargarClienteDetalle = async () => {
    try {
      // Obtener empresa específica
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (empresaError) throw empresaError;

      // Obtener tipo de empresa
      let tipoEcosistema = 'No definido';
      if (empresaData.tipo_ecosistema_id) {
        const { data: tipoData } = await supabase
          .from('tipos_empresa_ecosistema')
          .select('nombre')
          .eq('id', empresaData.tipo_ecosistema_id)
          .single();
        tipoEcosistema = tipoData?.nombre || 'No definido';
      }

      // Obtener plan
      let planInfo = { nombre: 'Sin plan', precio_mensual: 0 };
      if (empresaData.plan_suscripcion_id) {
        const { data: planData } = await supabase
          .from('planes_suscripcion')
          .select('nombre, precio_mensual')
          .eq('id', empresaData.plan_suscripcion_id)
          .single();
        planInfo = planData || planInfo;
      }

      const clienteCompleto: ClienteDetalle = {
        ...empresaData,
        tipo_ecosistema: tipoEcosistema,
        plan_nombre: planInfo.nombre,
        precio_mensual: planInfo.precio_mensual
      };

      setCliente(clienteCompleto);
    } catch (error) {
      console.error('Error cargando cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-white text-lg">Cargando cliente...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!cliente) {
    return (
      <AdminLayout pageTitle="">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Cliente no encontrado</h2>
            <button
              onClick={() => router.push('/admin/clientes')}
              className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700"
            >
              Volver a Clientes
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/clientes')}
              className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{cliente.nombre}</h1>
              <p className="text-gray-400 mt-1">Gestión detallada del cliente</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center">
              <PencilIcon className="h-4 w-4 mr-2" />
              Editar
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center">
              <TrashIcon className="h-4 w-4 mr-2" />
              Eliminar
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-gray-800 rounded p-2 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${cliente.activa ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <h3 className="text-xl font-bold text-white">Estado: {cliente.activa ? 'Activo' : 'Inactivo'}</h3>
                <p className="text-gray-400">Cliente desde {new Date(cliente.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-cyan-400">{cliente.plan_nombre}</p>
              <p className="text-gray-400">${cliente.precio_mensual}/mes</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'general', name: 'Información General', icon: BuildingOfficeIcon },
                { id: 'usuarios', name: 'Usuarios', icon: UserGroupIcon },
                { id: 'plan', name: 'Plan y Facturación', icon: CreditCardIcon },
                { id: 'configuracion', name: 'Configuración', icon: CogIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-white">Datos de la Empresa</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Nombre</label>
                      <p className="text-white font-medium">{cliente.nombre}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">CUIT</label>
                      <p className="text-white font-medium">{cliente.cuit}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Email</label>
                      <p className="text-white font-medium">{cliente.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Teléfono</label>
                      <p className="text-white font-medium">{cliente.telefono || 'No especificado'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-white">Información del Negocio</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Tipo de Empresa</label>
                      <p className="text-white font-medium">{cliente.tipo_ecosistema}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Dirección</label>
                      <p className="text-white font-medium">{cliente.direccion || 'No especificada'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Fecha de Registro</label>
                      <p className="text-white font-medium">{new Date(cliente.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Última Actualización</label>
                      <p className="text-white font-medium">{new Date(cliente.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'usuarios' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-white">Usuarios del Cliente</h4>
                  <button className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 flex items-center">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Agregar Usuario
                  </button>
                </div>
                
                <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-4 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Próximamente</h4>
                      <p className="text-sm mt-1">La gestión de usuarios se implementará en el módulo correspondiente.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'plan' && (
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-white">Plan de Suscripción</h4>
                
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h5 className="text-xl font-bold text-white">{cliente.plan_nombre}</h5>
                      <p className="text-gray-400">Plan actual</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">${cliente.precio_mensual}</p>
                      <p className="text-gray-400">por mes</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700">
                      Cambiar Plan
                    </button>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                      Ver Historial
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'configuracion' && (
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-white">Configuración del Cliente</h4>
                
                {cliente.configuracion_empresa && (
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h5 className="font-bold text-white mb-4">Configuraciones Actuales</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Zona Horaria</label>
                        <p className="text-white font-medium">{cliente.configuracion_empresa.zona_horaria || 'No definida'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Moneda</label>
                        <p className="text-white font-medium">{cliente.configuracion_empresa.moneda || 'No definida'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Idioma</label>
                        <p className="text-white font-medium">{cliente.configuracion_empresa.idioma || 'No definido'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <button className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700">
                  Editar Configuración
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}