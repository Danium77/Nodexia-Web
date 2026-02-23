// pages/incidencias.tsx
// Gestión de incidencias — tabla canónica incidencias_viaje
// Tabs: Abiertas | En Proceso | Resueltas | Cerradas + Filtros

import React, { useState, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Link from 'next/link';
import useIncidencias from '../lib/hooks/useIncidencias';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { IncidenciaViaje, TipoIncidenciaViaje, SeveridadIncidencia, EstadoIncidencia } from '../lib/types';

type TabKey = 'abiertas' | 'en_proceso' | 'resueltas' | 'cerradas';

const TABS: { key: TabKey; label: string; estado: EstadoIncidencia; icon: string }[] = [
  { key: 'abiertas', label: 'Abiertas', estado: 'abierta', icon: '🔴' },
  { key: 'en_proceso', label: 'En Proceso', estado: 'en_proceso', icon: '🟡' },
  { key: 'resueltas', label: 'Resueltas', estado: 'resuelta', icon: '🟢' },
  { key: 'cerradas', label: 'Cerradas', estado: 'cerrada', icon: '⚫' },
];

const TIPO_LABELS: Record<TipoIncidenciaViaje, string> = {
  retraso: 'Retraso',
  averia_camion: 'Avería Camión',
  documentacion_faltante: 'Doc. Faltante',
  producto_danado: 'Producto Dañado',
  accidente: 'Accidente',
  demora: 'Demora',
  problema_mecanico: 'Problema Mecánico',
  problema_carga: 'Problema Carga',
  ruta_bloqueada: 'Ruta Bloqueada',
  clima_adverso: 'Clima Adverso',
  otro: 'Otro',
};

const SEVERIDAD_CONFIG: Record<SeveridadIncidencia, { color: string; bg: string; label: string }> = {
  baja: { color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', label: 'Baja' },
  media: { color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', label: 'Media' },
  alta: { color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30', label: 'Alta' },
  critica: { color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', label: 'Crítica' },
};

function formatFecha(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const dias = Math.floor(hrs / 24);
  return `hace ${dias}d`;
}

const IncidenciasPage: React.FC = () => {
  const [tabActivo, setTabActivo] = useState<TabKey>('abiertas');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>('');
  const { incidencias, loading, error, counts } = useIncidencias();

  const incidenciasFiltradas = useMemo(() => {
    const estadoTab = TABS.find(t => t.key === tabActivo)?.estado;
    return incidencias.filter(inc => {
      if (inc.estado !== estadoTab) return false;
      if (filtroTipo && inc.tipo_incidencia !== filtroTipo) return false;
      if (filtroSeveridad && inc.severidad !== filtroSeveridad) return false;
      return true;
    });
  }, [incidencias, tabActivo, filtroTipo, filtroSeveridad]);

  return (
    <MainLayout pageTitle="Incidencias">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Incidencias</h1>
            <p className="text-slate-400 text-sm mt-1">
              {counts.total} total — {counts.abiertas} abiertas
              {counts.en_proceso > 0 && ` — ${counts.en_proceso} en proceso`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-4 bg-slate-800/40 rounded-lg p-1">
          {TABS.map(tab => {
            const count = counts[tab.key === 'abiertas' ? 'abiertas' : tab.key] || 0;
            const isActive = tabActivo === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTabActivo(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-4">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filtroSeveridad}
            onChange={e => setFiltroSeveridad(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas las severidades</option>
            <option value="critica">🔴 Crítica</option>
            <option value="alta">🟠 Alta</option>
            <option value="media">🟡 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Cargando incidencias..." variant="logo" color="primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 mb-4">
            {error}
          </div>
        )}

        {/* Lista */}
        {!loading && incidenciasFiltradas.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <span className="text-4xl block mb-3">📋</span>
            No hay incidencias {tabActivo !== 'abiertas' ? tabActivo.replace('_', ' ') : 'abiertas'}
          </div>
        )}

        <div className="space-y-3">
          {incidenciasFiltradas.map((inc) => {
            const severidadCfg = SEVERIDAD_CONFIG[inc.severidad as SeveridadIncidencia] || SEVERIDAD_CONFIG.media;
            const tipoLabel = TIPO_LABELS[inc.tipo_incidencia as TipoIncidenciaViaje] || inc.tipo_incidencia;

            return (
              <Link
                key={inc.id}
                href={`/incidencias/${inc.id}`}
                className="block bg-slate-800/60 border border-slate-700 p-4 rounded-xl hover:bg-slate-800/80 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Izquierda */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severidadCfg.bg} ${severidadCfg.color}`}>
                        {severidadCfg.label}
                      </span>
                      <span className="text-sm text-slate-300 font-medium">{tipoLabel}</span>
                      {inc.tipo_incidencia === 'documentacion_faltante' && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">📄 Docs</span>
                      )}
                    </div>
                    <p className="text-white text-sm line-clamp-2 mb-2">
                      {inc.descripcion}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {inc.numero_viaje && <span>🚛 {inc.numero_viaje}</span>}
                      {inc.despacho_pedido_id && <span>📦 {inc.despacho_pedido_id}</span>}
                      {inc.reportado_por_nombre && <span>👤 {inc.reportado_por_nombre}</span>}
                    </div>
                  </div>

                  {/* Derecha */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500 mb-1">
                      {tiempoRelativo(inc.fecha_incidencia || inc.created_at)}
                    </div>
                    <div className="text-xs text-slate-600">
                      {formatFecha(inc.fecha_incidencia || inc.created_at)}
                    </div>
                    {inc.resolucion && tabActivo !== 'abiertas' && (
                      <div className="text-xs text-green-400 mt-2 max-w-[200px] truncate">
                        ✅ {inc.resolucion}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default IncidenciasPage;
