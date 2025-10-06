// components/DocumentacionDetalle.tsx
// Componente para mostrar detalle completo de documentación

import { DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Documento {
  nombre: string;
  fecha_vencimiento: string;
  estado: 'vigente' | 'por_vencer' | 'vencido';
  dias_restantes?: number;
}

interface DocumentacionDetalleProps {
  numeroViaje: string;
  onClose: () => void;
}

export default function DocumentacionDetalle({ numeroViaje, onClose }: DocumentacionDetalleProps) {
  // Documentos demo con diferentes estados
  const documentos: Documento[] = [
    {
      nombre: 'Cédula Verde de Camión',
      fecha_vencimiento: '2025-12-15',
      estado: 'vigente',
      dias_restantes: 70
    },
    {
      nombre: 'Cédula Verde de Acoplado',
      fecha_vencimiento: '2025-11-20',
      estado: 'vigente',
      dias_restantes: 45
    },
    {
      nombre: 'Seguro Responsabilidad Civil Camión',
      fecha_vencimiento: '2025-10-25',
      estado: 'por_vencer',
      dias_restantes: 19
    },
    {
      nombre: 'Seguro Responsabilidad Civil Acoplado',
      fecha_vencimiento: '2025-10-30',
      estado: 'por_vencer',
      dias_restantes: 24
    },
    {
      nombre: 'Seguro de Carga',
      fecha_vencimiento: '2026-01-10',
      estado: 'vigente',
      dias_restantes: 96
    },
    {
      nombre: 'Licencia de Conducir del Chofer',
      fecha_vencimiento: '2025-09-30',
      estado: 'vencido',
      dias_restantes: -6
    },
    {
      nombre: 'Revisión Técnica Camión',
      fecha_vencimiento: '2025-11-05',
      estado: 'vigente',
      dias_restantes: 30
    },
    {
      nombre: 'Revisión Técnica Acoplado',
      fecha_vencimiento: '2025-10-15',
      estado: 'por_vencer',
      dias_restantes: 9
    },
    {
      nombre: 'Habilitación Carga Alimenticia',
      fecha_vencimiento: '2026-03-20',
      estado: 'vigente',
      dias_restantes: 165
    },
    {
      nombre: 'Habilitación Cargas Peligrosas',
      fecha_vencimiento: '2025-08-15',
      estado: 'vencido',
      dias_restantes: -52
    }
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'por_vencer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'vencido':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'por_vencer':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'vencido':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEstadoTexto = (documento: Documento) => {
    switch (documento.estado) {
      case 'vigente':
        return `Vigente (${documento.dias_restantes} días)`;
      case 'por_vencer':
        return `Por vencer (${documento.dias_restantes} días)`;
      case 'vencido':
        return `Vencido (${Math.abs(documento.dias_restantes!)} días)`;
      default:
        return 'Sin información';
    }
  };

  const documentosVigentes = documentos.filter(d => d.estado === 'vigente').length;
  const documentosPorVencer = documentos.filter(d => d.estado === 'por_vencer').length;
  const documentosVencidos = documentos.filter(d => d.estado === 'vencido').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Documentación Detallada
                </h2>
                <p className="text-gray-600">Viaje: {numeroViaje}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Vigentes</p>
                  <p className="text-2xl font-bold text-green-800">{documentosVigentes}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Por Vencer</p>
                  <p className="text-2xl font-bold text-yellow-800">{documentosPorVencer}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Vencidos</p>
                  <p className="text-2xl font-bold text-red-800">{documentosVencidos}</p>
                </div>
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Documentos */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detalle de Documentos Requeridos
          </h3>
          
          <div className="space-y-3">
            {documentos.map((documento, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getEstadoIcon(documento.estado)}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {documento.nombre}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Vencimiento: {new Date(documento.fecha_vencimiento).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(documento.estado)}`}>
                      {getEstadoIcon(documento.estado)}
                      <span>{getEstadoTexto(documento)}</span>
                    </span>
                  </div>
                </div>

                {/* Barra de progreso para documentos por vencer */}
                {documento.estado === 'por_vencer' && documento.dias_restantes! <= 30 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          documento.dias_restantes! <= 7 ? 'bg-red-500' :
                          documento.dias_restantes! <= 15 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.max(10, (documento.dias_restantes! / 30) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tiempo restante: {documento.dias_restantes} días
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Total:</strong> {documentos.length} documentos requeridos
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cerrar
              </button>
              {(documentosPorVencer > 0 || documentosVencidos > 0) && (
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                  Notificar Irregularidades
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}