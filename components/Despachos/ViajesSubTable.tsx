import React from 'react';
import { getEstadoDisplay } from '../../lib/helpers/estados-helpers';

interface ViajeRow {
  id: string;
  numero_viaje: number;
  estado: string;
  estado_red?: string;
  en_red_nodexia?: boolean;
  observaciones?: string;
  motivo_cancelacion?: string;
  transporte?: { nombre: string; cuit?: string } | null;
  transporte_cancelado?: { nombre: string } | null;
  chofer?: { nombre: string; apellido: string; telefono?: string } | null;
  camion?: { patente: string; marca?: string; modelo?: string } | null;
  acoplado?: { patente: string; marca?: string; modelo?: string } | null;
}

interface ViajesSubTableProps {
  viajes: ViajeRow[];
  pedidoId: string;
  dispatch: { id: string };
  onVerEstadoRed: (viaje: ViajeRow) => void;
  onReasignarViaje: (dispatch: { id: string }, viaje: ViajeRow) => void;
  onCancelarViaje: (viajeId: string, despachoId: string, motivo: string) => void;
}

export default function ViajesSubTable({
  viajes,
  pedidoId,
  dispatch,
  onVerEstadoRed,
  onReasignarViaje,
  onCancelarViaje,
}: ViajesSubTableProps) {
  if (!viajes || viajes.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-2">
        No hay viajes registrados para este despacho
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
        📦 Viajes del Despacho {pedidoId}
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="py-2 px-2 w-16"># Viaje</th>
            <th className="py-2 px-2 w-44">Transporte</th>
            <th className="py-2 px-2 w-40">Chofer</th>
            <th className="py-2 px-2 w-36">Camión</th>
            <th className="py-2 px-2 w-36">Acoplado</th>
            <th className="py-2 px-2 w-28">Estado</th>
            <th className="py-2 px-2">Observaciones</th>
            <th className="py-2 px-2 w-24">Acción</th>
          </tr>
        </thead>
        <tbody>
          {viajes.map((viaje) => {
            const enRedPendiente = viaje.en_red_nodexia && viaje.estado_red !== 'asignado';
            return (
              <tr key={viaje.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                {/* # Viaje */}
                <td className="py-2 px-2 font-mono">
                  <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded">
                    #{viaje.numero_viaje}
                  </span>
                </td>

                {/* Transporte */}
                <td className="py-2 px-2">
                  {enRedPendiente ? (
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                        🌐 En Red Nodexia
                      </span>
                    </div>
                  ) : viaje.estado === 'cancelado_por_transporte' && viaje.transporte_cancelado ? (
                    <div>
                      <div className="text-red-400 font-medium line-through">{viaje.transporte_cancelado.nombre}</div>
                      <div className="text-orange-400 text-xs font-semibold">⚠️ Cancelado - Reasignar</div>
                    </div>
                  ) : viaje.transporte ? (
                    <div>
                      <div className="text-green-400 font-medium flex items-center gap-2">
                        {viaje.transporte.nombre}
                        {viaje.estado_red === 'asignado' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                            🌐 Red
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs">CUIT: {viaje.transporte.cuit}</div>
                    </div>
                  ) : (
                    <span className="text-orange-400">Sin asignar</span>
                  )}
                </td>

                {/* Chofer */}
                <td className="py-2 px-2">
                  {enRedPendiente ? (
                    <span className="text-gray-500 text-xs">Esperando oferta</span>
                  ) : viaje.chofer ? (
                    <div>
                      <div className="text-cyan-400 font-medium">
                        {viaje.chofer.nombre} {viaje.chofer.apellido}
                      </div>
                      <div className="text-gray-500 text-xs">
                        📱 {viaje.chofer.telefono || 'Sin teléfono'}
                      </div>
                    </div>
                  ) : viaje.transporte ? (
                    <span className="text-yellow-400 text-xs font-medium">⏳ Pendiente asignación</span>
                  ) : (
                    <span className="text-gray-500 text-xs">Sin asignar</span>
                  )}
                </td>

                {/* Camión */}
                <td className="py-2 px-2">
                  {enRedPendiente ? (
                    <span className="text-gray-500 text-xs">—</span>
                  ) : viaje.camion ? (
                    <div>
                      <div className="text-yellow-400 font-bold">
                        🚛 {viaje.camion.patente}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {viaje.camion.marca} {viaje.camion.modelo}
                      </div>
                    </div>
                  ) : viaje.transporte ? (
                    <span className="text-yellow-400 text-xs font-medium">⏳ Pendiente asignación</span>
                  ) : (
                    <span className="text-gray-500 text-xs">Sin asignar</span>
                  )}
                </td>

                {/* Acoplado */}
                <td className="py-2 px-2">
                  {enRedPendiente ? (
                    <span className="text-gray-500 text-xs">—</span>
                  ) : viaje.acoplado ? (
                    <div>
                      <div className="text-cyan-400 font-bold">
                        🚚 {viaje.acoplado.patente}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {viaje.acoplado.marca} {viaje.acoplado.modelo}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs">-</span>
                  )}
                </td>

                {/* Estado */}
                <td className="py-2 px-2">
                  <div className="flex flex-col gap-1">
                    {(() => {
                      if (enRedPendiente) {
                        return (
                          <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-200 border border-cyan-500/30">
                            🌐 En Red
                          </span>
                        );
                      }
                      const display = getEstadoDisplay(viaje.estado || 'pendiente');
                      return (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${display.bgClass} ${display.textClass}`}>
                          {display.label}
                        </span>
                      );
                    })()}
                  </div>
                </td>

                {/* Observaciones */}
                <td className="py-2 px-2 text-gray-400 text-xs">
                  {viaje.motivo_cancelacion ? (
                    <span className="text-orange-400 font-semibold">❌ {viaje.motivo_cancelacion}</span>
                  ) : viaje.observaciones && !viaje.observaciones.toLowerCase().includes('asignado') ? (
                    viaje.observaciones
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>

                {/* Acción */}
                <td className="py-2 px-2">
                  {viaje.en_red_nodexia && !viaje.transporte && viaje.estado_red !== 'asignado' ? (
                    <button
                      onClick={() => onVerEstadoRed(viaje)}
                      className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-lg shadow-cyan-500/30"
                      title="Ver ofertas recibidas y seleccionar transporte"
                    >
                      🌐 Ver Estado
                    </button>
                  ) : viaje.estado === 'cancelado_por_transporte' ? (
                    <button
                      onClick={() => onReasignarViaje(dispatch, viaje)}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium flex items-center gap-1"
                      title="Reasignar a otro transporte"
                    >
                      🔄 Reasignar
                    </button>
                  ) : (viaje.estado === 'transporte_asignado' || viaje.estado === 'camion_asignado') ? (
                    <button
                      onClick={() => {
                        const motivo = prompt('Motivo de cancelación:');
                        if (motivo) {
                          onCancelarViaje(viaje.id, dispatch.id, motivo);
                        }
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                      title="Cancelar viaje"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
