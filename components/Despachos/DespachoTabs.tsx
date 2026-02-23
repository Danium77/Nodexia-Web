import React, { useMemo } from 'react';

export type DespachoTab = 'pendientes' | 'en_proceso' | 'asignados' | 'demorados' | 'expirados' | 'completados';

/**
 * Centralizes the dispatch filtering logic used for both tab counts and table filtering.
 * Eliminates duplication between tab badges and table body.
 */
export function filterDespachosByTab(dispatches: any[], tab: DespachoTab): any[] {
  return dispatches.filter(d => {
    const cantidadTotal = d.cantidad_viajes_solicitados || 1;
    const cantidadAsignados = d.viajes_asignados || 0;
    const viajesPendientes = cantidadTotal - cantidadAsignados;
    const tieneDemorados = d.tiene_viajes_demorados === true;
    const tieneExpirados = d.tiene_viajes_expirados === true;
    const tieneViajesEnProceso = d.tiene_viajes_en_proceso === true;
    const todosViajesCompletados = d.todos_viajes_completados === true;
    const esEstadoFinal = ['completado', 'cancelado', 'expirado', 'cancelado_por_transporte', 'finalizado', 'entregado'].includes(d.estado);
    // Un despacho está completado sólo si NO tiene viajes activos en proceso
    const esCompletado = (esEstadoFinal || todosViajesCompletados) && !tieneViajesEnProceso;

    switch (tab) {
      case 'completados':
        return esCompletado;
      case 'en_proceso':
        // Cualquier despacho con viajes activos entre confirmado y egreso_destino
        return tieneViajesEnProceso;
      case 'expirados':
        return tieneExpirados && !esCompletado && !tieneViajesEnProceso;
      case 'demorados':
        return tieneDemorados && !tieneExpirados && !esCompletado && !tieneViajesEnProceso;
      case 'pendientes':
        return cantidadAsignados === 0 && !tieneExpirados && !esCompletado && !tieneViajesEnProceso;
      case 'asignados':
        return (
          (cantidadAsignados > 0 && viajesPendientes === 0 && !tieneExpirados && !tieneDemorados && !esCompletado && !tieneViajesEnProceso) ||
          (d.estado === 'transporte_asignado' && !tieneExpirados && !tieneDemorados && !esCompletado && !tieneViajesEnProceso)
        );
      default:
        return false;
    }
  });
}

interface TabConfig {
  key: DespachoTab;
  label: string;
  icon: string;
  activeColor: string;
  badgeColor: string;
}

const TAB_CONFIG: TabConfig[] = [
  { key: 'pendientes', label: 'Pendientes', icon: '📋', activeColor: 'bg-orange-600', badgeColor: 'bg-orange-700' },
  { key: 'en_proceso', label: 'En Proceso', icon: '🚛', activeColor: 'bg-blue-600', badgeColor: 'bg-blue-700' },
  { key: 'asignados', label: 'Asignados', icon: '✅', activeColor: 'bg-green-600', badgeColor: 'bg-green-700' },
  { key: 'demorados', label: 'Demorados', icon: '⏰', activeColor: 'bg-orange-600', badgeColor: 'bg-orange-700' },
  { key: 'expirados', label: 'Expirados', icon: '❌', activeColor: 'bg-red-600', badgeColor: 'bg-red-700' },
  { key: 'completados', label: 'Completados', icon: '✅', activeColor: 'bg-emerald-600', badgeColor: 'bg-emerald-700' },
];

interface DespachoTabsProps {
  activeTab: DespachoTab;
  onTabChange: (tab: DespachoTab) => void;
  dispatches: any[];
}

const DespachoTabs: React.FC<DespachoTabsProps> = ({ activeTab, onTabChange, dispatches }) => {
  // Memoize counts to avoid recalculating on every render
  const counts = useMemo(() => {
    const result: Record<DespachoTab, number> = {
      pendientes: 0,
      en_proceso: 0,
      asignados: 0,
      demorados: 0,
      expirados: 0,
      completados: 0,
    };

    for (const tab of TAB_CONFIG) {
      result[tab.key] = filterDespachosByTab(dispatches, tab.key).length;
    }

    return result;
  }, [dispatches]);

  return (
    <div className="flex gap-2 mb-4">
      {TAB_CONFIG.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === tab.key
              ? `${tab.activeColor} text-white`
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {tab.icon} {tab.label}
          <span className={`ml-2 px-2 py-0.5 ${tab.badgeColor} rounded text-xs`}>
            {counts[tab.key]}
          </span>
        </button>
      ))}
    </div>
  );
};

export default DespachoTabs;
