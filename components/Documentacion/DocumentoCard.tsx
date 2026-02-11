// components/Documentacion/DocumentoCard.tsx
// Card individual para mostrar un documento con su estado

import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface DocumentoCardProps {
  documento: {
    id: string;
    tipo_documento: string;
    nombre_archivo: string;
    fecha_emision: string;
    fecha_vencimiento: string | null;
    estado_vigencia: 'pendiente_validacion' | 'vigente' | 'por_vencer' | 'vencido' | 'rechazado';
    file_url: string;
    validado_por?: string;
    fecha_validacion?: string;
    motivo_rechazo?: string;
  };
  onDelete?: (id: string) => void;
  onView?: (url: string) => void;
  showActions?: boolean;
}

export default function DocumentoCard({
  documento,
  onDelete,
  onView,
  showActions = true,
}: DocumentoCardProps) {
  // Calcular días restantes para vencimiento
  const calcularDiasRestantes = (): number | null => {
    if (!documento.fecha_vencimiento) return null;
    const hoy = new Date();
    const vencimiento = new Date(documento.fecha_vencimiento);
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  };

  const diasRestantes = calcularDiasRestantes();

  // Obtener color según estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return 'bg-green-900 text-green-300 border-green-700';
      case 'por_vencer':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'vencido':
        return 'bg-red-900 text-red-300 border-red-700';
      case 'pendiente_validacion':
        return 'bg-blue-900 text-blue-300 border-blue-700';
      case 'rechazado':
        return 'bg-red-900 text-red-300 border-red-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  // Obtener ícono según estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'por_vencer':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'vencido':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case 'pendiente_validacion':
        return <ClockIcon className="h-4 w-4 text-blue-600" />;
      case 'rechazado':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  // Obtener texto del estado
  const getEstadoTexto = () => {
    switch (documento.estado_vigencia) {
      case 'vigente':
        return diasRestantes !== null ? `Vigente (${diasRestantes} días)` : 'Vigente';
      case 'por_vencer':
        return diasRestantes !== null ? `Por vencer (${diasRestantes} días)` : 'Por vencer';
      case 'vencido':
        return diasRestantes !== null ? `Vencido (${Math.abs(diasRestantes)} días)` : 'Vencido';
      case 'pendiente_validacion':
        return 'Pendiente de validación';
      case 'rechazado':
        return 'Rechazado';
      default:
        return 'Sin información';
    }
  };

  // Formatear nombre del tipo de documento
  const formatTipoDocumento = (tipo: string): string => {
    const nombres: Record<string, string> = {
      licencia_conducir: 'Licencia de Conducir',
      art_clausula_no_repeticion: 'ART Cláusula No Repetición',
      seguro_vida_autonomo: 'Seguro de Vida Autónomo',
      seguro: 'Seguro',
      rto: 'Revisión Técnica Obligatoria',
      cedula: 'Cédula Verde',
      seguro_carga_global: 'Seguro de Carga Global',
    };
    return nombres[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors bg-slate-700">
      <div className="flex items-start justify-between gap-4">
        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-600 rounded-lg flex-shrink-0">
              <DocumentTextIcon className="h-5 w-5 text-slate-300" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-100 truncate">
                {formatTipoDocumento(documento.tipo_documento)}
              </h4>
              <p className="text-sm text-slate-400 truncate mt-0.5">
                {documento.nombre_archivo}
              </p>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                <span>
                  Emisión: {new Date(documento.fecha_emision).toLocaleDateString('es-ES')}
                </span>
                {documento.fecha_vencimiento && (
                  <span>
                    Vencimiento: {new Date(documento.fecha_vencimiento).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Barra de progreso para documentos por vencer */}
          {documento.estado_vigencia === 'por_vencer' && diasRestantes !== null && diasRestantes <= 30 && (
            <div className="mt-3">
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    diasRestantes <= 7 ? 'bg-red-500' :
                    diasRestantes <= 15 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(10, (diasRestantes / 30) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tiempo restante: {diasRestantes} días
              </p>
            </div>
          )}

          {/* Motivo de rechazo */}
          {documento.estado_vigencia === 'rechazado' && documento.motivo_rechazo && (
            <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
              <span className="font-semibold">Motivo:</span> {documento.motivo_rechazo}
            </div>
          )}
        </div>

        {/* Estado y acciones */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(
              documento.estado_vigencia
            )}`}
          >
            {getEstadoIcon(documento.estado_vigencia)}
            <span className="whitespace-nowrap">{getEstadoTexto()}</span>
          </span>

          {showActions && (
            <div className="flex gap-2">
              {onView && (
                <button
                  onClick={() => onView(documento.file_url)}
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600 rounded transition-colors"
                  title="Ver documento"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              )}
              {onDelete && documento.estado_vigencia === 'pendiente_validacion' && (
                <button
                  onClick={() => onDelete(documento.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors"
                  title="Eliminar documento"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
