import React, { useState } from 'react';
import { 
  usePlanesSuscripcion, 
  useSuscripcionesAdmin,
  useEmpresasAdmin 
} from '../../lib/hooks/useSuperAdmin';
import type { 
  PlanSuscripcion, 
  SuscripcionEmpresa,
  EmpresaAdmin 
} from '../../types/superadmin';

export default function SuscripcionesManager() {
  const { planes } = usePlanesSuscripcion();
  const { suscripciones, loading, cambiarPlanEmpresa } = useSuscripcionesAdmin();
  const { empresas } = useEmpresasAdmin();
  
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const handleChangePlan = async () => {
    if (!selectedEmpresa || !selectedPlan) {
      alert('Seleccione empresa y plan');
      return;
    }

    try {
      setProcessing(true);
      await cambiarPlanEmpresa(selectedEmpresa, selectedPlan);
      setShowChangePlan(false);
      setSelectedEmpresa('');
      setSelectedPlan('');
      alert('Plan cambiado exitosamente');
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Error al cambiar plan');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activa': return 'bg-green-100 text-green-800';
      case 'suspendida': return 'bg-yellow-100 text-yellow-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      case 'vencida': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Cargando suscripciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con resumen de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planes.map((plan) => (
          <div key={plan.id} className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900">{plan.nombre}</h3>
            <div className="text-2xl font-bold text-purple-600 mt-2">
              {formatCurrency(plan.precio_mensual)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {suscripciones.filter(s => s.plan_id === plan.id && s.estado === 'activa').length} activas
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Límites: {plan.limite_usuarios} usuarios, {plan.limite_despachos} despachos/mes
            </div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Suscripciones Activas</h3>
        <button
          onClick={() => setShowChangePlan(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
        >
          Cambiar Plan
        </button>
      </div>

      {/* Tabla de suscripciones */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan Actual
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fechas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uso Actual
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facturación
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suscripciones.map((suscripcion) => {
              const empresa = empresas.find(e => e.empresa_id === suscripcion.empresa_id);
              const plan = planes.find(p => p.id === suscripcion.plan_id);
              
              return (
                <tr key={suscripcion.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{empresa?.nombre}</div>
                      <div className="text-sm text-gray-500">{empresa?.cuit}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{plan?.nombre}</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(plan?.precio_mensual || 0)}/mes
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(suscripcion.estado)}`}>
                      {suscripcion.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Inicio: {formatDate(suscripcion.fecha_inicio)}</div>
                      {suscripcion.fecha_fin && (
                        <div>Fin: {formatDate(suscripcion.fecha_fin)}</div>
                      )}
                      {suscripcion.proximo_pago && (
                        <div>Próximo: {formatDate(suscripcion.proximo_pago)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Usuarios: {suscripcion.usuarios_actuales}/{plan?.limite_usuarios}</div>
                      <div>Despachos: {suscripcion.despachos_mes_actual}/{plan?.limite_despachos}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {formatCurrency(suscripcion.monto_mensual)}
                      </div>
                      <div className="text-gray-500">
                        Ciclo: {suscripcion.ciclo_facturacion}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Cambiar Plan */}
      {showChangePlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Cambiar Plan de Suscripción</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <select
                  value={selectedEmpresa}
                  onChange={(e) => setSelectedEmpresa(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.empresa_id} value={empresa.empresa_id}>
                      {empresa.nombre} - {empresa.cuit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Plan
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Seleccionar plan...</option>
                  {planes.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} - {formatCurrency(plan.precio_mensual)}/mes
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlan && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  {(() => {
                    const plan = planes.find(p => p.id === selectedPlan);
                    return plan ? (
                      <div className="text-sm">
                        <div className="font-medium">{plan.nombre}</div>
                        <div>Precio: {formatCurrency(plan.precio_mensual)}/mes</div>
                        <div>Usuarios: {plan.limite_usuarios}</div>
                        <div>Despachos: {plan.limite_despachos}/mes</div>
                        {plan.caracteristicas && (
                          <div className="mt-2">
                            <div className="font-medium">Características:</div>
                            <ul className="list-disc list-inside text-gray-600">
                              {plan.caracteristicas.map((caracteristica, index) => (
                                <li key={index}>{caracteristica}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowChangePlan(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                disabled={processing || !selectedEmpresa || !selectedPlan}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {processing ? 'Cambiando...' : 'Cambiar Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}