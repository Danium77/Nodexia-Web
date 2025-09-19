import React from 'react';
import useDashboardKPIs from '../../lib/hooks/useDashboardKPIs';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-800/60 border border-slate-700 p-4 rounded-lg ${className}`}>{children}</div>
);

const Badge: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = 'bg-slate-600', children }) => (
  <span className={`px-2 py-0.5 text-xs rounded-full text-white ${color}`}>{children}</span>
);

const KPICards: React.FC = () => {
  const { kpis, loading } = useDashboardKPIs();

  const scheduledToday = kpis?.scheduledToday ?? 0;
  const inTransit = kpis?.inTransit ?? 0;
  const openIncidents = kpis?.openIncidents ?? 0;
  const onTimePct = kpis?.onTimePct ?? 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300">Despachos programados hoy</div>
            <div className="text-2xl font-bold text-white">{loading ? '…' : scheduledToday}</div>
          </div>
          <Badge color="bg-green-500">Hoy</Badge>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300">Despachos en tránsito</div>
            <div className="text-2xl font-bold text-white">{loading ? '…' : inTransit}</div>
          </div>
          <Badge color="bg-blue-500">En tránsito</Badge>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300">Incidencias abiertas</div>
            <div className="text-2xl font-bold text-white">{loading ? '…' : openIncidents}</div>
          </div>
          <Badge color="bg-red-500">Críticas</Badge>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300">% a tiempo</div>
            <div className="text-2xl font-bold text-white">{loading ? '…' : `${onTimePct}%`}</div>
          </div>
          <Badge color={onTimePct >= 95 ? 'bg-green-500' : onTimePct >= 90 ? 'bg-orange-500' : 'bg-red-500'}>{onTimePct >= 95 ? 'Excelente' : onTimePct >= 90 ? 'OK' : 'Atención'}</Badge>
        </div>
      </Card>
    </div>
  );
};

export default KPICards;
