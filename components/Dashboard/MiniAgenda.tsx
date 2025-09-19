import React from 'react';
import Link from 'next/link';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-800/60 border border-slate-700 p-4 rounded-lg ${className}`}>{children}</div>
);

const MiniAgenda: React.FC<{ dispatches?: any[] }> = ({ dispatches = [] }) => {
  // Use next 5 upcoming dispatches as demo. If dispatches provide scheduled_local_time, prefer that.
  const ordered = [...dispatches]
    .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''))
    .slice(0, 5);

  const formatted = ordered.map((d) => ({
    id: d.id,
    time: d.scheduled_local_time || (d.scheduled_at ? new Date(d.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'),
    destino: d.destino || 'Destino desconocido',
    transportista: (d.transporte_data && d.transporte_data.nombre) || 'Sin asignar',
  }));

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Mini Agenda</h3>
        <Link href="/planificacion" className="text-sm text-blue-300">Ver más</Link>
      </div>
      <ul className="space-y-2">
        {formatted.length === 0 && <li className="text-slate-400">No hay despachos próximos</li>}
        {formatted.map((f) => (
          <li key={f.id} className="flex items-center justify-between">
            <div className="text-slate-200 font-medium">{f.time}</div>
            <div className="text-slate-300 truncate ml-4">{f.destino}</div>
            <div className="text-slate-400 ml-4">{f.transportista}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default MiniAgenda;
