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
        return 'bg-green-900 text-green-300 border-green-700';
      case 'por_vencer':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'vencido':
        return 'bg-red-900 text-red-300 border-red-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-blue-100" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Documentación Detallada
                </h2>
                <p className="text-slate-400">Viaje: {numeroViaje}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="p-6 border-b border-slate-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-900 border border-green-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-300">Vigentes</p>
                  <p className="text-2xl font-bold text-green-200">{documentosVigentes}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-300">Por Vencer</p>
                  <p className="text-2xl font-bold text-yellow-200">{documentosPorVencer}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-red-900 border border-red-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-300">Vencidos</p>
                  <p className="text-2xl font-bold text-red-200">{documentosVencidos}</p>
                </div>
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Documentos */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Detalle de Documentos Requeridos
          </h3>
          
          <div className="space-y-3">
            {documentos.map((documento, index) => (
              <div
                key={index}
                className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors bg-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getEstadoIcon(documento.estado)}
                      <div>
                        <h4 className="font-medium text-slate-100">
                          {documento.nombre}
                        </h4>
                        <p className="text-sm text-slate-400">
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
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          documento.dias_restantes! <= 7 ? 'bg-red-500' :
                          documento.dias_restantes! <= 15 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.max(10, (documento.dias_restantes! / 30) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tiempo restante: {documento.dias_restantes} días
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="p-6 border-t border-slate-700 bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300">
              <strong>Total:</strong> {documentos.length} documentos requeridos
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-700"
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