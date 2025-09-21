import React, { useState } from 'react';
import { usePagosAdmin } from '../../lib/hooks/useSuperAdmin';
import type { PagoEmpresa, FiltroPagos } from '../../types/superadmin';

export default function PagosManager() {
  const { pagos, loading, registrarPago, procesarPago } = usePagosAdmin();
  const [filtros, setFiltros] = useState<FiltroPagos>({
    estado: undefined,
    fecha_desde: '',
    fecha_hasta: '',
    empresa_id: ''
  });
  
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);
  const [selectedPago, setSelectedPago] = useState<PagoEmpresa | null>(null);
  const [processing, setProcessing] = useState(false);

  const [nuevoPago, setNuevoPago] = useState({
    empresa_id: '',
    monto: '',
    metodo_pago: 'transferencia' as const,
    referencia_externa: '',
    observaciones: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR');
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'fallido': return 'bg-red-100 text-red-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetodoPagoLabel = (metodo: string) => {
    switch (metodo) {
      case 'transferencia': return 'Transferencia';
      case 'tarjeta': return 'Tarjeta';
      case 'efectivo': return 'Efectivo';
      case 'cheque': return 'Cheque';
      case 'mercadopago': return 'MercadoPago';
      default: return metodo;
    }
  };

  const handleRegistrarPago = async () => {
    if (!nuevoPago.empresa_id || !nuevoPago.monto) {
      alert('Empresa y monto son requeridos');
      return;
    }

    try {
      setProcessing(true);
      await registrarPago({
        empresa_id: nuevoPago.empresa_id,
        monto: parseFloat(nuevoPago.monto),
        metodo_pago: nuevoPago.metodo_pago,
        referencia_externa: nuevoPago.referencia_externa || undefined,
        observaciones: nuevoPago.observaciones || undefined
      });
      
      setShowRegistrarPago(false);
      setNuevoPago({
        empresa_id: '',
        monto: '',
        metodo_pago: 'transferencia',
        referencia_externa: '',
        observaciones: ''
      });
      alert('Pago registrado exitosamente');
    } catch (error) {
      console.error('Error registering payment:', error);
      alert('Error al registrar pago');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcesarPago = async (pagoId: string, accion: 'aprobar' | 'rechazar') => {
    const motivo = accion === 'rechazar' ? prompt('Motivo del rechazo:') : undefined;
    if (accion === 'rechazar' && !motivo) return;

    try {
      setProcessing(true);
      await procesarPago(pagoId, accion === 'aprobar', motivo);
      alert(`Pago ${accion === 'aprobar' ? 'aprobado' : 'rechazado'} exitosamente`);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error al procesar pago');
    } finally {
      setProcessing(false);
    }
  };

  // Aplicar filtros
  const pagosFiltrados = pagos.filter(pago => {
    if (filtros.estado && pago.estado !== filtros.estado) return false;
    if (filtros.empresa_id && pago.empresa_id !== filtros.empresa_id) return false;
    if (filtros.fecha_desde && new Date(pago.fecha_pago) < new Date(filtros.fecha_desde)) return false;
    if (filtros.fecha_hasta && new Date(pago.fecha_pago) > new Date(filtros.fecha_hasta)) return false;
    return true;
  });

  const resumenPagos = {
    total: pagosFiltrados.reduce((sum, p) => sum + p.monto, 0),
    completados: pagosFiltrados.filter(p => p.estado === 'completado').reduce((sum, p) => sum + p.monto, 0),
    pendientes: pagosFiltrados.filter(p => p.estado === 'pendiente').length,
    fallidos: pagosFiltrados.filter(p => p.estado === 'fallido').length
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Cargando pagos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(resumenPagos.total)}
          </div>
          <div className="text-sm text-blue-700">Total Procesado</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(resumenPagos.completados)}
          </div>
          <div className="text-sm text-green-700">Pagos Completados</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{resumenPagos.pendientes}</div>
          <div className="text-sm text-yellow-700">Pagos Pendientes</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{resumenPagos.fallidos}</div>
          <div className="text-sm text-red-700">Pagos Fallidos</div>
        </div>
      </div>

      {/* Filtros y Acciones */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filtros.estado || ''}
              onChange={(e) => setFiltros({...filtros, estado: e.target.value as any})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
              <option value="fallido">Fallido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros({...filtros, fecha_desde: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros({...filtros, fecha_hasta: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowRegistrarPago(true)}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              Registrar Pago
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Método
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pagosFiltrados.map((pago) => (
              <tr key={pago.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDateTime(pago.fecha_pago)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{pago.empresa_nombre}</div>
                  <div className="text-sm text-gray-500">{pago.suscripcion_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(pago.monto)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getMetodoPagoLabel(pago.metodo_pago)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pago.estado)}`}>
                    {pago.estado}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pago.referencia_externa || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    {pago.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => handleProcesarPago(pago.id, 'aprobar')}
                          disabled={processing}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleProcesarPago(pago.id, 'rechazar')}
                          disabled={processing}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedPago(pago)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Registrar Pago */}
      {showRegistrarPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Registrar Nuevo Pago</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa *
                </label>
                <input
                  type="text"
                  value={nuevoPago.empresa_id}
                  onChange={(e) => setNuevoPago({...nuevoPago, empresa_id: e.target.value})}
                  placeholder="ID de la empresa"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nuevoPago.monto}
                  onChange={(e) => setNuevoPago({...nuevoPago, monto: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={nuevoPago.metodo_pago}
                  onChange={(e) => setNuevoPago({...nuevoPago, metodo_pago: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="mercadopago">MercadoPago</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia Externa
                </label>
                <input
                  type="text"
                  value={nuevoPago.referencia_externa}
                  onChange={(e) => setNuevoPago({...nuevoPago, referencia_externa: e.target.value})}
                  placeholder="Número de comprobante, transacción, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={nuevoPago.observaciones}
                  onChange={(e) => setNuevoPago({...nuevoPago, observaciones: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowRegistrarPago(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={processing}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {processing ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Pago */}
      {selectedPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">Detalles del Pago</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha:</label>
                  <div className="text-sm text-gray-900">{formatDateTime(selectedPago.fecha_pago)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado:</label>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedPago.estado)}`}>
                      {selectedPago.estado}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Empresa:</label>
                  <div className="text-sm text-gray-900">{selectedPago.empresa_nombre}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monto:</label>
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(selectedPago.monto)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Método:</label>
                  <div className="text-sm text-gray-900">{getMetodoPagoLabel(selectedPago.metodo_pago)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Referencia:</label>
                  <div className="text-sm text-gray-900">{selectedPago.referencia_externa || '-'}</div>
                </div>
              </div>
              
              {selectedPago.observaciones && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observaciones:</label>
                  <div className="text-sm text-gray-900 mt-1">{selectedPago.observaciones}</div>
                </div>
              )}

              {selectedPago.fecha_procesamiento && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha de Procesamiento:</label>
                  <div className="text-sm text-gray-900">{formatDateTime(selectedPago.fecha_procesamiento)}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedPago(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}