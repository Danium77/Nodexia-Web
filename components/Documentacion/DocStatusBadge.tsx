// components/Documentacion/DocStatusBadge.tsx
// Badge visual para mostrar estado de documentación de una entidad
// Muestra: OK (verde), Por Vencer (amarillo), Problemas (rojo), Sin Docs (gris)

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

export interface DocStatusData {
  total_requeridos: number;
  total_subidos: number;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  faltantes: string[];
  estado: 'ok' | 'warning' | 'danger' | 'missing';
}

interface DocStatusBadgeProps {
  status: DocStatusData | null;
  compact?: boolean; // Solo icono, sin texto
  showDetails?: boolean; // Mostrar tooltip detallado
}

const ESTADO_CONFIG = {
  ok: {
    icon: CheckCircleIcon,
    label: 'Docs OK',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    label: 'Por Vencer',
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
  },
  danger: {
    icon: XCircleIcon,
    label: 'Problemas',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  },
  missing: {
    icon: DocumentIcon,
    label: 'Sin Docs',
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
  },
};

export default function DocStatusBadge({ status, compact = false }: DocStatusBadgeProps) {
  if (!status) {
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-500">
        ...
      </span>
    );
  }

  const config = ESTADO_CONFIG[status.estado];
  const Icon = config.icon;

  if (compact) {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bgClass} ${config.textClass}`}
        title={`${config.label}: ${status.total_subidos}/${status.total_requeridos} docs`}
      >
        <Icon className="h-3.5 w-3.5" />
        {status.total_subidos}/{status.total_requeridos}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bgClass} ${config.textClass} border ${config.borderClass}`}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{config.label}</span>
      <span className="opacity-70">({status.total_subidos}/{status.total_requeridos})</span>
    </div>
  );
}

// Componente para mostrar estado de docs de una unidad operativa completa
interface UnidadDocStatusProps {
  choferStatus: DocStatusData | null;
  camionStatus: DocStatusData | null;
  acopladoStatus: DocStatusData | null;
}

export function UnidadDocStatusSummary({ choferStatus, camionStatus, acopladoStatus }: UnidadDocStatusProps) {
  const statuses = [choferStatus, camionStatus, acopladoStatus].filter(Boolean) as DocStatusData[];
  
  if (statuses.length === 0) {
    return <span className="text-xs text-gray-500">Cargando...</span>;
  }

  // Estado general: el peor de los 3
  const hasExpired = statuses.some(s => s.estado === 'danger');
  const hasMissing = statuses.some(s => s.estado === 'missing');
  const hasWarning = statuses.some(s => s.estado === 'warning');

  const generalEstado = hasExpired || hasMissing ? 'danger' : hasWarning ? 'warning' : 'ok';
  const config = ESTADO_CONFIG[generalEstado];
  const Icon = config.icon;

  const totalReq = statuses.reduce((acc, s) => acc + s.total_requeridos, 0);
  const totalSub = statuses.reduce((acc, s) => acc + s.total_subidos, 0);
  const totalVig = statuses.reduce((acc, s) => acc + s.vigentes, 0);

  return (
    <div className="flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1 text-xs font-medium ${config.textClass}`}>
        <Icon className="h-4 w-4" />
        <span>{totalVig}/{totalReq}</span>
      </div>
      <div className="flex gap-0.5">
        <span 
          className={`w-2 h-2 rounded-full ${choferStatus ? ESTADO_CONFIG[choferStatus.estado].bgClass.replace('/20', '') : 'bg-gray-600'}`} 
          title={`Chofer: ${choferStatus?.estado || '?'}`}
        />
        <span 
          className={`w-2 h-2 rounded-full ${camionStatus ? ESTADO_CONFIG[camionStatus.estado].bgClass.replace('/20', '') : 'bg-gray-600'}`}
          title={`Camión: ${camionStatus?.estado || '?'}`}
        />
        {acopladoStatus && (
          <span 
            className={`w-2 h-2 rounded-full ${ESTADO_CONFIG[acopladoStatus.estado].bgClass.replace('/20', '')}`}
            title={`Acoplado: ${acopladoStatus?.estado || '?'}`}
          />
        )}
      </div>
    </div>
  );
}
