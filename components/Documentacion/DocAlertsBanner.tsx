// components/Documentacion/DocAlertsBanner.tsx
// Banner compacto de alertas de documentación para dashboards
import React, { useState } from 'react';
import { DocAlerta, DocAlertasResumen } from '../../lib/hooks/useDocAlerts';
import { ExclamationTriangleIcon, ClockIcon, DocumentMinusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DocAlertsBannerProps {
  alertas: DocAlerta[];
  resumen: DocAlertasResumen;
  loading?: boolean;
  maxVisible?: number;
  onVerTodos?: () => void;
}

const TIPO_CONFIG = {
  vencido: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-red-900/20 border-red-700/50',
    text: 'text-red-400',
    label: 'Vencido',
    dot: 'bg-red-500',
  },
  por_vencer: {
    icon: ClockIcon,
    bg: 'bg-amber-900/20 border-amber-700/50',
    text: 'text-amber-400',
    label: 'Por vencer',
    dot: 'bg-amber-500',
  },
  faltante: {
    icon: DocumentMinusIcon,
    bg: 'bg-slate-800/50 border-slate-600/50',
    text: 'text-slate-400',
    label: 'Faltante',
    dot: 'bg-slate-500',
  },
};

function formatDocName(doc: string): string {
  return doc
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

const DocAlertsBanner: React.FC<DocAlertsBannerProps> = ({
  alertas,
  resumen,
  loading = false,
  maxVisible = 5,
  onVerTodos,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-[#1b273b] border border-gray-700 rounded-lg p-4 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-48 mb-3" />
        <div className="h-4 bg-gray-700/50 rounded w-64" />
      </div>
    );
  }

  if (resumen.total === 0) return null;

  const hasCritical = resumen.vencidos > 0;
  const hasWarning = resumen.por_vencer > 0;
  const visibleAlertas = expanded ? alertas : alertas.slice(0, maxVisible);
  const remaining = alertas.length - maxVisible;

  return (
    <div className={`rounded-lg border p-4 ${hasCritical ? 'bg-red-900/10 border-red-800/40' : hasWarning ? 'bg-amber-900/10 border-amber-800/40' : 'bg-[#1b273b] border-gray-700'}`}>
      {/* Header: resumen */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className={`h-5 w-5 ${hasCritical ? 'text-red-400' : 'text-amber-400'}`} />
          <h3 className="text-sm font-semibold text-white">Alertas de Documentación</h3>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${hasCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
            {resumen.total}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {resumen.vencidos > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {resumen.vencidos} vencidos
            </span>
          )}
          {resumen.por_vencer > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {resumen.por_vencer} por vencer
            </span>
          )}
          {resumen.faltantes > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              {resumen.faltantes} faltantes
            </span>
          )}
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="space-y-1.5">
        {visibleAlertas.map((alerta, i) => {
          const cfg = TIPO_CONFIG[alerta.tipo];
          const Icon = cfg.icon;
          return (
            <div key={`${alerta.entidad_tipo}-${alerta.entidad_nombre}-${alerta.documento}-${i}`}
              className={`flex items-center justify-between px-3 py-2 rounded border ${cfg.bg}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.text}`} />
                <span className="text-sm text-gray-300 truncate">
                  <span className="font-medium text-white">{alerta.entidad_nombre}</span>
                  {' — '}
                  {formatDocName(alerta.documento)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`text-xs font-medium ${cfg.text}`}>
                  {alerta.tipo === 'vencido' && alerta.dias_restantes !== undefined && (
                    `Hace ${Math.abs(alerta.dias_restantes)} días`
                  )}
                  {alerta.tipo === 'por_vencer' && alerta.dias_restantes !== undefined && (
                    `${alerta.dias_restantes} días`
                  )}
                  {alerta.tipo === 'faltante' && 'No cargado'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ver más / menos */}
      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="h-3 w-3" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDownIcon className="h-3 w-3" />
              Ver {remaining} alertas más
            </>
          )}
        </button>
      )}

      {/* Link a documentación */}
      {onVerTodos && (
        <button
          onClick={onVerTodos}
          className="mt-3 w-full text-center text-xs text-cyan-400 hover:text-cyan-300 py-1.5 border border-cyan-800/30 rounded hover:bg-cyan-900/20 transition-colors"
        >
          Ver documentación completa →
        </button>
      )}
    </div>
  );
};

export default DocAlertsBanner;
