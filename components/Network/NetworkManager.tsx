import React, { useState } from 'react';
import { 
  useNetworkContext, 
  useTransportistasDisponibles, 
  useClientesEmpresa, 
  useRelacionesEmpresa,
  useNetworkStats 
} from '../../lib/hooks/useNetwork';
import UsuariosEmpresaManager from './UsuariosEmpresaManager';
// import type { TransportistaDisponible } from '../../types/network';

interface NetworkManagerProps {
  onClose?: () => void;
}

export default function NetworkManager({ onClose }: NetworkManagerProps) {
  const { context, loading: contextLoading } = useNetworkContext();
  const { transportistas, loading: transportistasLoading, refresh: refreshTransportistas } = useTransportistasDisponibles();
  const { clientes, loading: clientesLoading } = useClientesEmpresa();
  const { relaciones, crearRelacion, finalizarRelacion, loading: relacionesLoading, refresh: refreshRelaciones } = useRelacionesEmpresa();
  const { stats, loading: statsLoading } = useNetworkStats();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'usuarios' | 'transportistas' | 'clientes' | 'relaciones'>('overview');
  const [selectedTransportista, setSelectedTransportista] = useState<string>('');
  const [showCreateRelacion, setShowCreateRelacion] = useState(false);
  const [processingRelacion, setProcessingRelacion] = useState(false);

  const isCoordinadorEmpresa = context?.empresa?.tipo_empresa === 'planta';
  const isTransporteEmpresa = context?.empresa?.tipo_empresa === 'transporte';

  const handleCrearRelacion = async () => {
    if (!selectedTransportista) return;

    try {
      setProcessingRelacion(true);
      await crearRelacion({ empresa_transporte_id: selectedTransportista });
      setShowCreateRelacion(false);
      setSelectedTransportista('');
      refreshTransportistas();
      alert('Relación creada exitosamente');
    } catch (error) {
      console.error('Error creating relation:', error);
      alert('Error al crear la relación');
    } finally {
      setProcessingRelacion(false);
    }
  };

  const handleFinalizarRelacion = async (relacionId: string) => {
    if (!confirm('¿Está seguro de finalizar esta relación?')) return;

    try {
      await finalizarRelacion(relacionId);
      await refreshRelaciones(); // Usar la función correcta
      await refreshTransportistas(); // También actualizar transportistas disponibles
      alert('Relación finalizada exitosamente');
    } catch (error) {
      console.error('Error finalizing relation:', error);
      alert('Error al finalizar la relación');
    }
  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando contexto de red...</p>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">
          No se pudo cargar el contexto de red. Verifique que su usuario esté asociado a una empresa.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Red de Empresas</h2>
            <p className="text-sm text-gray-600 mt-1">
              {context.empresa.nombre} - {context.empresa.tipo_empresa === 'transporte' ? 'Empresa de Transporte' : 'Empresa Coordinadora'}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Resumen
          </button>
          
          {context.puede_gestionar_usuarios && (
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'usuarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Usuarios
            </button>
          )}
          
          {isCoordinadorEmpresa && (
            <button
              onClick={() => setActiveTab('transportistas')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'transportistas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transportistas Disponibles
            </button>
          )}
          
          {isTransporteEmpresa && (
            <button
              onClick={() => setActiveTab('clientes')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'clientes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mis Clientes
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('relaciones')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'relaciones'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Relaciones Activas
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading ? (
                <div className="col-span-full text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : stats ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.total_empresas}</div>
                    <div className="text-sm text-blue-700">Total Empresas</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.empresas_transporte}</div>
                    <div className="text-sm text-green-700">Transportistas</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.empresas_coordinador}</div>
                    <div className="text-sm text-purple-700">Coordinadores</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.relaciones_activas}</div>
                    <div className="text-sm text-orange-700">Relaciones Activas</div>
                  </div>
                </>
              ) : (
                <div className="col-span-full text-center text-gray-500">
                  No se pudieron cargar las estadísticas
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Información de su empresa</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <div className="font-medium">{context.empresa.nombre}</div>
                </div>
                <div>
                  <span className="text-gray-600">CUIT:</span>
                  <div className="font-medium">{context.empresa.cuit}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <div className="font-medium capitalize">{context.empresa.tipo_empresa}</div>
                </div>
                <div>
                  <span className="text-gray-600">Su rol:</span>
                  <div className="font-medium capitalize">{context.rol_interno}</div>
                </div>
                <div>
                  <span className="text-gray-600">Permisos principales:</span>
                  <div className="text-sm">
                    {Object.entries(context.permisos)
                      .filter(([, value]) => value)
                      .slice(0, 3)
                      .map(([key]) => key.replace('_', ' '))
                      .join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usuarios Tab */}
        {activeTab === 'usuarios' && context.puede_gestionar_usuarios && (
          <UsuariosEmpresaManager />
        )}

        {/* Transportistas Tab */}
        {activeTab === 'transportistas' && isCoordinadorEmpresa && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Transportistas Disponibles</h3>
              <button
                onClick={() => setShowCreateRelacion(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Contratar Transportista
              </button>
            </div>

            {transportistasLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Cargando transportistas...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {transportistas.map((transportista) => (
                  <div key={transportista.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{transportista.nombre}</h4>
                        <p className="text-sm text-gray-600">CUIT: {transportista.cuit}</p>
                        {transportista.email && (
                          <p className="text-sm text-gray-600">Email: {transportista.email}</p>
                        )}
                        {transportista.telefono && (
                          <p className="text-sm text-gray-600">Teléfono: {transportista.telefono}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {transportista.ya_contratado ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            Ya Contratado
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                            Disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal para crear relación */}
            {showCreateRelacion && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-medium mb-4">Contratar Transportista</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Transportista
                    </label>
                    <select
                      value={selectedTransportista}
                      onChange={(e) => setSelectedTransportista(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Seleccione un transportista...</option>
                      {transportistas
                        .filter(t => !t.ya_contratado)
                        .map((transportista) => (
                        <option key={transportista.id} value={transportista.id}>
                          {transportista.nombre} - {transportista.cuit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreateRelacion(false)}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCrearRelacion}
                      disabled={!selectedTransportista || processingRelacion}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processingRelacion ? 'Procesando...' : 'Contratar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clientes Tab */}
        {activeTab === 'clientes' && isTransporteEmpresa && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Mis Clientes</h3>

            {clientesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Cargando clientes...</p>
              </div>
            ) : clientes.length > 0 ? (
              <div className="grid gap-4">
                {clientes.map((cliente) => (
                  <div key={cliente.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{cliente.nombre}</h4>
                        <p className="text-sm text-gray-600">CUIT: {cliente.cuit}</p>
                        {cliente.email && (
                          <p className="text-sm text-gray-600">Email: {cliente.email}</p>
                        )}
                        {cliente.telefono && (
                          <p className="text-sm text-gray-600">Teléfono: {cliente.telefono}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Cliente desde: {new Date(cliente.fecha_inicio).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        {cliente.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No tiene clientes asignados aún
              </div>
            )}
          </div>
        )}

        {/* Relaciones Tab */}
        {activeTab === 'relaciones' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Relaciones Activas</h3>

            {relacionesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Cargando relaciones...</p>
              </div>
            ) : relaciones.length > 0 ? (
              <div className="grid gap-4">
                {relaciones.map((relacion) => (
                  <div key={relacion.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {isCoordinadorEmpresa 
                            ? `Transportista: ${relacion.empresa_transporte?.nombre}`
                            : `Coordinadora: ${relacion.empresa_coordinadora?.nombre}`
                          }
                        </h4>
                        <p className="text-sm text-gray-600">
                          CUIT: {isCoordinadorEmpresa 
                            ? relacion.empresa_transporte?.cuit
                            : relacion.empresa_coordinadora?.cuit
                          }
                        </p>
                        <p className="text-sm text-gray-600">
                          Desde: {new Date(relacion.fecha_inicio).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {relacion.estado}
                        </span>
                        {context.puede_crear_relaciones && (
                          <button
                            onClick={() => handleFinalizarRelacion(relacion.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Finalizar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay relaciones activas
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}