import React from 'react';
import { useRouter } from 'next/router';
import ViajesSubTable from './ViajesSubTable';
import { getEstadoDisplay } from '../../lib/helpers/estados-helpers';
import type { DespachoTab } from './DespachoTabs';

interface DespachoTableRowProps {
  dispatch: any;
  activeTab: DespachoTab;
  isSelected: boolean;
  isExpanded: boolean;
  viajes: any[];
  onSelect: (despachoId: string) => void;
  onToggleExpand: (despachoId: string) => void;
  onAssignTransport: (dispatch: any) => void;
  onOpenRedNodexia: (dispatch: any) => void;
  onOpenCancelar: (dispatch: any) => void;
  onOpenTimeline: (despachoId: string, pedidoId: string) => void;
  onOpenReprogram: (dispatch: any) => void;
  onVerEstadoRed: (viaje: any) => void;
  onReasignarViaje: (despacho: any, viaje: any) => void;
  onCancelarViaje: (viajeId: string, despachoId: string, motivo: string) => void;
}

const DespachoTableRow: React.FC<DespachoTableRowProps> = ({
  dispatch,
  activeTab,
  isSelected,
  isExpanded,
  viajes,
  onSelect,
  onToggleExpand,
  onAssignTransport,
  onOpenRedNodexia,
  onOpenCancelar,
  onOpenTimeline,
  onOpenReprogram,
  onVerEstadoRed,
  onReasignarViaje,
  onCancelarViaje,
}) => {
  const router = useRouter();

  return (
    <React.Fragment>
      <tr className={isSelected ? "bg-cyan-900/20" : ""}>
        <td className="px-2 py-3 text-center w-8">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(dispatch.id)}
            className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
          />
        </td>
        <td className="px-2 py-3 text-sm font-medium w-32">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate">{dispatch.pedido_id}</span>
              {/* 🌐 Badge Red Nodexia */}
              {dispatch.origen_asignacion === 'red_nodexia' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 flex items-center gap-0.5 whitespace-nowrap" title="Asignado vía Red Nodexia">
                  🌐 Red
                </span>
              )}
            </div>
            {/* Contador de viajes */}
            {dispatch.viajes_generados !== undefined && dispatch.viajes_generados > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="px-1.5 py-0.5 bg-blue-600 text-blue-100 rounded text-xs font-bold inline-block">
                  📋 {dispatch.viajes_generados} generado{dispatch.viajes_generados > 1 ? 's' : ''}
                </span>
                {dispatch.viajes_cancelados_por_transporte !== undefined && dispatch.viajes_cancelados_por_transporte > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isExpanded) {
                        onToggleExpand(dispatch.id);
                      }
                      setTimeout(() => {
                        const element = document.getElementById(`viajes-${dispatch.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 300);
                    }}
                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-red-100 rounded text-xs font-bold inline-block animate-pulse cursor-pointer transition-all"
                    title="Click para ver viajes cancelados y reasignar"
                  >
                    🔄 {dispatch.viajes_cancelados_por_transporte} cancelado{dispatch.viajes_cancelados_por_transporte > 1 ? 's' : ''} - Reasignar
                  </button>
                )}
                {dispatch.viajes_sin_asignar !== undefined && dispatch.viajes_sin_asignar > 0 && dispatch.viajes_cancelados_por_transporte === 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-600 text-orange-100 rounded text-xs font-bold inline-block">
                    ⚠️ {dispatch.viajes_sin_asignar} sin asignar
                  </span>
                )}
              </div>
            )}
            {/* Fallback al antiguo formato si no hay datos de viajes */}
            {(dispatch.viajes_generados === undefined || dispatch.viajes_generados === 0) && dispatch.cantidad_viajes_solicitados && dispatch.cantidad_viajes_solicitados > 0 && (
              <span 
                className="px-1.5 py-0.5 bg-blue-600 text-blue-100 rounded text-xs font-bold cursor-help inline-block"
                title={`${dispatch.cantidad_viajes_solicitados} viajes pendientes de asignar. Haz clic en "Asignar Transporte" para gestionarlos.`}
              >
                📋 {dispatch.cantidad_viajes_solicitados} pendiente{dispatch.cantidad_viajes_solicitados > 1 ? 's' : ''}
              </span>
            )}
            {dispatch.transporte_data && activeTab === 'asignados' && (
              <span className="text-xs text-green-400">
                ✅ Todos asignados
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-3 text-sm w-20 truncate">{dispatch.fecha_despacho}</td>
        <td className="px-2 py-3 text-sm w-16 truncate">
          {dispatch.hora_despacho || '-'}
        </td>
        <td className="px-2 py-3 text-sm w-40 truncate" title={dispatch.origen}>{dispatch.origen}</td>
        <td className="px-2 py-3 text-sm w-40 truncate" title={dispatch.destino}>{dispatch.destino}</td>
        <td className="px-2 py-3 text-sm w-20">
          <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap ${
            dispatch.prioridad === 'Urgente' ? 'bg-red-600 text-red-100' :
            dispatch.prioridad === 'Alta' ? 'bg-orange-600 text-orange-100' :
            dispatch.prioridad === 'Media' ? 'bg-yellow-600 text-yellow-100' :
            'bg-gray-600 text-gray-100'
          }`}>
            {dispatch.prioridad}
          </span>
        </td>
        <td className="px-2 py-3 text-sm w-28 truncate">
          {dispatch.transporte_data ? (
            dispatch.transporte_data.esMultiple ? (
              <div className="text-purple-400 font-semibold" title="Este despacho tiene viajes asignados a múltiples transportes. Expande la tabla para ver detalles.">
                🚛 {dispatch.transporte_data.nombre}
              </div>
            ) : (
              <div className="text-green-400" title={`CUIT: ${dispatch.transporte_data.cuit || 'N/A'} - Tipo: ${dispatch.transporte_data.tipo || 'N/A'}`}>
                {dispatch.transporte_data.nombre}
              </div>
            )
          ) : (
            <span className="text-orange-400">Sin asignar</span>
          )}
        </td>
        <td className="px-2 py-3 text-sm w-20">
          {(() => {
            const tieneDemorados = dispatch.tiene_viajes_demorados;
            const tieneExpirados = dispatch.tiene_viajes_expirados;
            
            if (tieneDemorados) {
              return (
                <span className="px-1 py-0.5 rounded text-xs whitespace-nowrap bg-orange-600 text-white">
                  ⏰ Demorado
                </span>
              );
            } else if (tieneExpirados) {
              return (
                <span className="px-1 py-0.5 rounded text-xs whitespace-nowrap bg-red-600 text-white">
                  ❌ Expirado
                </span>
              );
            }
            
            const display = getEstadoDisplay(dispatch.estado || 'pendiente');
            return (
              <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap ${display.bgClass} ${display.textClass}`}>
                {display.label}
              </span>
            );
          })()}
        </td>
        <td className="px-2 py-3 text-sm text-center w-40">
          <div className="flex gap-1 justify-center items-center">
            {/* Botón expandir/contraer */}
            {dispatch.viajes_generados && dispatch.viajes_generados > 0 && (
              <button
                type="button"
                onClick={() => onToggleExpand(dispatch.id)}
                className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors"
                title={isExpanded ? "Contraer viajes" : "Ver viajes"}
              >
                {isExpanded ? '▼' : '▶'} Viajes
              </button>
            )}

            {/* Botón Historial */}
            <button
              type="button"
              onClick={() => onOpenTimeline(dispatch.id, dispatch.pedido_id)}
              className="px-2 py-1 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white text-xs transition-colors"
              title="Ver historial de eventos"
            >
              📜 Historial
            </button>
            
            {/* Botones para tab Expirados */}
            {activeTab === 'expirados' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpenReprogram(dispatch)}
                  className="px-3 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105"
                  title="Reprogramar despacho expirado"
                >
                  🔄 Reprogramar
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCancelar(dispatch)}
                  className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105"
                  title="Cancelar despacho expirado"
                >
                  ❌ Cancelar
                </button>
              </div>
            )}
            
            {activeTab !== 'expirados' && activeTab !== 'asignados' && activeTab !== 'completados' && (!dispatch.transporte_data || (dispatch.cantidad_viajes_solicitados && dispatch.cantidad_viajes_solicitados > 0)) && (
              <>
                <button
                  type="button"
                  onClick={() => onAssignTransport(dispatch)}
                  className="px-3 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105"
                  title={`Asignar transporte a ${dispatch.pedido_id}`}
                >
                  🚛 Asignar
                </button>
                <button
                  type="button"
                  onClick={() => onOpenRedNodexia(dispatch)}
                  className="px-4 py-2 rounded-lg bg-gray-900 border-2 border-white hover:border-cyan-400 text-white font-bold text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] hover:scale-110 flex items-center gap-2 group relative overflow-hidden"
                  title="Publicar en Red Nodexia - Red Colaborativa"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg className="w-5 h-5 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-cyan-400" />
                    <line x1="80" y1="20" x2="20" y2="80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-cyan-400" />
                    <circle cx="20" cy="20" r="8" fill="currentColor" className="text-cyan-400" />
                    <circle cx="80" cy="20" r="8" fill="currentColor" className="text-cyan-400" />
                    <circle cx="20" cy="80" r="8" fill="currentColor" className="text-cyan-400" />
                    <circle cx="80" cy="80" r="8" fill="currentColor" className="text-cyan-400" />
                    <circle cx="50" cy="50" r="10" fill="currentColor" className="text-cyan-300 animate-pulse" />
                  </svg>
                  <span className="relative z-10 font-extrabold tracking-wide">RED</span>
                </button>
              </>
            )}

            {/* Botón Ver Detalle para Completados */}
            {activeTab === 'completados' && (
              <button
                type="button"
                onClick={() => router.push(`/despachos/${dispatch.id}/detalle`)}
                className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105"
                title="Ver detalle completo del viaje"
              >
                📄 Ver Detalle
              </button>
            )}
          </div>
        </td>
      </tr>
      {/* Fila expandida con lista de viajes */}
      {isExpanded && (
        <tr className="bg-[#0a0e1a]">
          <td colSpan={9} className="px-4 py-3">
            <div className="ml-8" id={`viajes-${dispatch.id}`}>
              <ViajesSubTable
                viajes={viajes}
                pedidoId={dispatch.pedido_id}
                dispatch={dispatch}
                onVerEstadoRed={onVerEstadoRed}
                onReasignarViaje={onReasignarViaje}
                onCancelarViaje={onCancelarViaje}
              />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default DespachoTableRow;
