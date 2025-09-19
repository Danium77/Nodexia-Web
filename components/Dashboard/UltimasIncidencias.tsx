import React from 'react';
import Link from 'next/link';

const severityColor = (s: string) => {
  switch (s) {
    case 'critica':
      return 'bg-red-600';
    case 'alerta':
      return 'bg-orange-500';
    default:
      return 'bg-blue-500';
  }
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-800/60 border border-slate-700 p-4 rounded-lg ${className}`}>{children}</div>
);

const UltimasIncidencias: React.FC<{ incidencias?: any[] }> = ({ incidencias = [] }) => {
  const recent = incidencias.slice(0, 5);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Últimas Incidencias</h3>
        <Link href="/incidencias" className="text-sm text-blue-300">Ver todas</Link>
      </div>

      <ul className="space-y-3">
        {recent.length === 0 && <li className="text-slate-400">Sin incidencias recientes</li>}
        {recent.map((inc) => (
          <li key={inc.id} className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${severityColor(inc.severidad)}`} />
            <div className="flex-1">
              <div className="text-white font-medium">{inc.tipo}</div>
              <div className="text-slate-400 text-sm">Despacho {inc.despacho_id || '—'}</div>
            </div>
            <div className="text-sm text-slate-300">{inc.severidad}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default UltimasIncidencias;
