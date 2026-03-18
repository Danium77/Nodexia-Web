import React, { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { supabase } from '@/lib/supabaseClient';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface KPIs {
  ejecutivo: {
    despachos_hoy: number;
    completados_hoy: number;
    cancelados_hoy: number;
    en_transito: number;
    incidencias_abiertas: number;
    dwell_avg_minutos: number | null;
    cumplimiento_pct: number | null;
  };
  tendencia_7d: TendenciaData;
  tendencia_30d: TendenciaData;
  cancelaciones_top: Array<{ motivo: string; cantidad: number }>;
  despachos_por_dia: Array<{ fecha: string; total: number; completados: number; cancelados: number }>;
}

interface TendenciaData {
  despachos: number;
  completados: number;
  cancelados: number;
  incidencias: number;
  tasa_completado: number;
  tasa_cancelacion: number;
}

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function KPICard({ label, value, subtitle, color = 'cyan' }: { label: string; value: string | number; subtitle?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'border-cyan-500/30 bg-cyan-500/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  };
  const textColor: Record<string, string> = {
    cyan: 'text-cyan-400',
    green: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.cyan}`}>
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${textColor[color] || textColor.cyan}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function TendenciaCard({ titulo, data }: { titulo: string; data: TendenciaData }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <h4 className="text-sm font-semibold text-slate-300 mb-3">{titulo}</h4>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold text-cyan-400">{data.despachos}</p>
          <p className="text-xs text-slate-500">Despachos</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-400">{data.tasa_completado}%</p>
          <p className="text-xs text-slate-500">Completados</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-400">{data.tasa_cancelacion}%</p>
          <p className="text-xs text-slate-500">Cancelados</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 text-xs text-slate-500">
        <span>📋 {data.incidencias} incidencias</span>
      </div>
    </div>
  );
}

export default function ReporteDashboard() {
  const { user, empresaId, hasAnyRole } = useUserRole();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (empresaId) params.set('empresa_id', empresaId);

      const res = await fetch(`/api/reportes/kpis?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al cargar KPIs');
      }

      const data = await res.json();
      setKpis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [user, empresaId]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const handleExportCSV = () => {
    if (!kpis) return;
    const rows = [
      ['Indicador', 'Valor'],
      ['Despachos Hoy', kpis.ejecutivo.despachos_hoy],
      ['Completados Hoy', kpis.ejecutivo.completados_hoy],
      ['Cancelados Hoy', kpis.ejecutivo.cancelados_hoy],
      ['En Tránsito', kpis.ejecutivo.en_transito],
      ['Incidencias Abiertas', kpis.ejecutivo.incidencias_abiertas],
      ['Dwell Time Promedio (min)', kpis.ejecutivo.dwell_avg_minutos || 'N/A'],
      ['Cumplimiento Horario (%)', kpis.ejecutivo.cumplimiento_pct || 'N/A'],
      [''],
      ['Tendencia 7 días'],
      ['Despachos', kpis.tendencia_7d.despachos],
      ['Tasa Completado', `${kpis.tendencia_7d.tasa_completado}%`],
      ['Tasa Cancelación', `${kpis.tendencia_7d.tasa_cancelacion}%`],
      ['Incidencias', kpis.tendencia_7d.incidencias],
      [''],
      ['Tendencia 30 días'],
      ['Despachos', kpis.tendencia_30d.despachos],
      ['Tasa Completado', `${kpis.tendencia_30d.tasa_completado}%`],
      ['Tasa Cancelación', `${kpis.tendencia_30d.tasa_cancelacion}%`],
      ['Incidencias', kpis.tendencia_30d.incidencias],
    ];

    if (kpis.despachos_por_dia.length > 0) {
      rows.push([''], ['Despachos por Día', 'Total', 'Completados', 'Cancelados']);
      kpis.despachos_por_dia.forEach(d => {
        rows.push([d.fecha, d.total, d.completados, d.cancelados] as any);
      });
    }

    const csv = rows.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-operacional-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        <span className="ml-3 text-slate-400">Cargando reportes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 font-semibold">Error al cargar reportes</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <button onClick={fetchKPIs} className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            📊 Reportes Gerenciales
          </h2>
          <p className="text-sm text-slate-400 mt-1">Panel ejecutivo de indicadores operacionales</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchKPIs}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 flex items-center gap-1"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white flex items-center gap-1"
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs Ejecutivos */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard label="Despachos Hoy" value={kpis.ejecutivo.despachos_hoy} color="cyan" />
        <KPICard label="Completados" value={kpis.ejecutivo.completados_hoy} color="green" />
        <KPICard label="Cancelados" value={kpis.ejecutivo.cancelados_hoy} color="red" />
        <KPICard label="En Tránsito" value={kpis.ejecutivo.en_transito} color="blue" />
        <KPICard label="Incidencias" value={kpis.ejecutivo.incidencias_abiertas} color="yellow" />
        <KPICard
          label="Dwell Time"
          value={kpis.ejecutivo.dwell_avg_minutos ? `${kpis.ejecutivo.dwell_avg_minutos} min` : '—'}
          subtitle="Promedio en planta"
          color="purple"
        />
        <KPICard
          label="Cumplimiento"
          value={kpis.ejecutivo.cumplimiento_pct ? `${kpis.ejecutivo.cumplimiento_pct}%` : '—'}
          subtitle="Horario"
          color="green"
        />
      </div>

      {/* Tendencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TendenciaCard titulo="📅 Últimos 7 días" data={kpis.tendencia_7d} />
        <TendenciaCard titulo="📆 Últimos 30 días" data={kpis.tendencia_30d} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despachos por día */}
        {kpis.despachos_por_dia.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">📈 Despachos - Últimos 14 días</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={kpis.despachos_por_dia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="completados" name="Completados" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelados" name="Cancelados" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cancelaciones Top */}
        {kpis.cancelaciones_top.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">🚫 Top Motivos de Cancelación (30 días)</h4>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={kpis.cancelaciones_top}
                  dataKey="cantidad"
                  nameKey="motivo"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {kpis.cancelaciones_top.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabla detalle despachos por día */}
      {kpis.despachos_por_dia.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">📋 Detalle Diario</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400">Fecha</th>
                  <th className="text-right py-2 px-3 text-slate-400">Total</th>
                  <th className="text-right py-2 px-3 text-slate-400">Completados</th>
                  <th className="text-right py-2 px-3 text-slate-400">Cancelados</th>
                  <th className="text-right py-2 px-3 text-slate-400">% Éxito</th>
                </tr>
              </thead>
              <tbody>
                {kpis.despachos_por_dia.map((d) => (
                  <tr key={d.fecha} className="border-b border-slate-800 hover:bg-slate-700/20">
                    <td className="py-2 px-3 text-slate-300">{d.fecha}</td>
                    <td className="py-2 px-3 text-right text-white font-medium">{d.total}</td>
                    <td className="py-2 px-3 text-right text-emerald-400">{d.completados}</td>
                    <td className="py-2 px-3 text-right text-red-400">{d.cancelados}</td>
                    <td className="py-2 px-3 text-right text-cyan-400">
                      {d.total > 0 ? `${Math.round((d.completados / d.total) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {kpis.ejecutivo.despachos_hoy === 0 && kpis.tendencia_7d.despachos === 0 && kpis.tendencia_30d.despachos === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">📭 Sin datos de despachos para esta empresa</p>
          <p className="text-sm mt-2">Los indicadores se poblarán cuando haya actividad operacional</p>
        </div>
      )}
    </div>
  );
}
