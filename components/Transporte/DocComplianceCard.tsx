// components/Transporte/DocComplianceCard.tsx
// Tarjeta de compliance de documentación para dashboard de transporte
import React from 'react';
import { DocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { DocAlertasResumen } from '../../lib/hooks/useDocAlerts';

interface DocComplianceCardProps {
  resumen: DocAlertasResumen;
  totalEntidades: number;
  loading?: boolean;
  onClick?: () => void;
}

const DocComplianceCard: React.FC<DocComplianceCardProps> = ({
  resumen,
  totalEntidades,
  loading = false,
  onClick,
}) => {
  if (loading) {
    return (
      <div className="bg-[#1b273b] rounded-lg p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4" />
        <div className="h-10 bg-gray-700 rounded w-16 mb-2" />
        <div className="h-4 bg-gray-700/50 rounded w-48" />
      </div>
    );
  }

  const totalProblemas = resumen.vencidos + resumen.por_vencer + resumen.faltantes;
  // Si no hay entidades, 100%. Si hay problemas, calcular ratio
  const complianceRate = totalEntidades === 0 
    ? 100 
    : Math.max(0, Math.round(100 - (totalProblemas / Math.max(1, totalEntidades * 3)) * 100));

  const isGood = complianceRate >= 80;
  const isWarning = complianceRate >= 50 && complianceRate < 80;
  const isCritical = complianceRate < 50;

  const colorClass = isGood ? 'text-green-400' : isWarning ? 'text-amber-400' : 'text-red-400';
  const bgClass = isGood ? 'bg-green-600/10' : isWarning ? 'bg-amber-600/10' : 'bg-red-600/10';
  const borderClass = isCritical ? 'border-red-800/50' : 'border-gray-800';
  const barColor = isGood ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div
      className={`bg-[#1b273b] rounded-lg p-6 border ${borderClass} hover:border-cyan-500/30 transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${bgClass} rounded-lg`}>
          {totalProblemas > 0 ? (
            <ExclamationTriangleIcon className={`h-6 w-6 ${colorClass}`} />
          ) : (
            <DocumentCheckIcon className="h-6 w-6 text-green-400" />
          )}
        </div>
        <span className={`text-3xl font-bold ${colorClass}`}>{complianceRate}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${complianceRate}%` }}
        />
      </div>

      <p className="text-gray-400 text-sm font-medium">Docs Completos</p>

      {totalProblemas > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {resumen.vencidos > 0 && (
            <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded">
              {resumen.vencidos} vencidos
            </span>
          )}
          {resumen.por_vencer > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded">
              {resumen.por_vencer} por vencer
            </span>
          )}
          {resumen.faltantes > 0 && (
            <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
              {resumen.faltantes} faltantes
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DocComplianceCard;
