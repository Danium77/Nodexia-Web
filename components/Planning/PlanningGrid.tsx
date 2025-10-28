// components/Planning/PlanningGrid.tsx
import React, { useState } from 'react';
import { MapPinIcon, EyeIcon } from '@heroicons/react/24/outline';

interface Dispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  scheduled_at: string;
  created_by: string;
  transport_id: string;
  driver_id: string;
  type?: string;
  scheduled_local_date?: string;
  scheduled_local_time?: string;

  transporte_data?: { nombre: string };
  creador?: { nombre_completo: string; };
  chofer?: { nombre_completo: string; };
}

interface PlanningGridProps {
  title: string;
  dispatches: Dispatch[];
  type: "despachos" | "recepciones";
}

const PlanningGrid: React.FC<PlanningGridProps> = ({ title, dispatches, type }) => {
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Generado': return 'bg-gray-600';
      case 'Aceptado': return 'bg-blue-600';
      case 'Asignado': return 'bg-yellow-600';
      case 'Confirmado': return 'bg-cyan-600';
      case 'En Camino a Origen': return 'bg-indigo-600';
      case 'Arribado a Origen': return 'bg-purple-600';
      case 'Cargando': return 'bg-orange-600';
      case 'Cargado': return 'bg-emerald-600';
      case 'Despachado': return 'bg-green-600';
      case 'Camino a Destino': return 'bg-pink-600';
      case 'Arribado a Destino': return 'bg-red-600';
      case 'Descargando': return 'bg-amber-600';
      case 'Descargado': return 'bg-lime-600';
      case 'Terminado': return 'bg-gray-700';
      default: return 'bg-slate-600';
    }
  };

  const getStatusLabel = (estado: string) => {
    const labels: Record<string, string> = {
      'Generado': '📋 Generado',
      'Aceptado': '✅ Aceptado',
      'Asignado': '🚛 Asignado',
      'Confirmado': '✔️ Confirmado',
      'En Camino a Origen': '🛣️ A Origen',
      'Arribado a Origen': '📍 En Origen',
      'Cargando': '⬆️ Cargando',
      'Cargado': '📦 Cargado',
      'Despachado': '🚚 Despachado',
      'Camino a Destino': '🛣️ A Destino',
      'Arribado a Destino': '📍 En Destino',
      'Descargando': '⬇️ Descargando',
      'Descargado': '✅ Descargado',
      'Terminado': '🏁 Terminado'
    };
    return labels[estado] || estado;
  };

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // --- NUEVA LÓGICA DE SEMANA Y AGRUPACIÓN ---
  const today = new Date(); // Fecha y hora actual del cliente
  today.setHours(0, 0, 0, 0); // Resetear a inicio del día para evitar problemas de hora

  // Calcular el Lunes de la semana actual
  const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diffToMonday = (currentDay === 0) ? -6 : (currentDay - 1) * -1; // Si es domingo, resta 6; sino, resta (día_actual-1)
  const mondayOfWeek = new Date(today.setDate(today.getDate() + diffToMonday));
  mondayOfWeek.setHours(0, 0, 0, 0); // Asegurarse de que sea el inicio del día del Lunes

  // Calcular las fechas para cada día de la semana (Lunes a Domingo)
  const weekDates: { [key: string]: Date } = {};
  daysOfWeek.forEach((dayName, index) => {
    const date = new Date(mondayOfWeek);
    date.setDate(mondayOfWeek.getDate() + index);
    weekDates[dayName] = date;
  });

  const groupedDispatches: Record<string, Record<string, Dispatch[]>> = {};
  const actualScheduledTimeSlots = new Set<string>();

  // Helper para formatear fecha local como YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const sundayOfWeek = new Date(mondayOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000));

  dispatches.forEach(dispatch => {
    // Preferir valores locales si existen
    let scheduledDate: Date | null = null;
    if ((dispatch as any).scheduled_local_date) {
      // si existe fecha local y hora local
      const localDate = (dispatch as any).scheduled_local_date;
      const localTime = (dispatch as any).scheduled_local_time || '00:00:00';
      // construir string yyyy-mm-ddTHH:MM:SS para parseo
      scheduledDate = new Date(`${localDate}T${localTime}`);
    } else if (dispatch.scheduled_at) {
      scheduledDate = new Date(dispatch.scheduled_at);
    }

    if (!scheduledDate || isNaN(scheduledDate.getTime())) return;

    // Comparar por fecha local (YYYY-MM-DD) para evitar problemas de zona horaria
    const scheduledLocal = formatLocalDate(scheduledDate);
    const mondayLocal = formatLocalDate(mondayOfWeek);
    const sundayLocal = formatLocalDate(sundayOfWeek);

    if (scheduledLocal < mondayLocal || scheduledLocal > sundayLocal) {
      return; // No está en la semana actual
    }

    // Encontrar el nombre del día de la semana comparando por fecha local
    let dispatchDayName = '';
    for (const dayName in weekDates) {
      const dayDate = weekDates[dayName];
      if (dayDate && formatLocalDate(dayDate) === scheduledLocal) {
        dispatchDayName = dayName;
        break;
      }
    }

    if (dispatchDayName) {
      const hour = scheduledDate.getHours();
      const minute = scheduledDate.getMinutes();
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      if (!groupedDispatches[dispatchDayName]) {
        groupedDispatches[dispatchDayName] = {};
      }
      if (!groupedDispatches[dispatchDayName]?.[timeSlot]) {
        groupedDispatches[dispatchDayName][timeSlot] = [];
      }
      groupedDispatches[dispatchDayName]?.[timeSlot]?.push(dispatch);
      actualScheduledTimeSlots.add(timeSlot);
    }
  });

  const displayTimeSlots = Array.from(actualScheduledTimeSlots).sort((a, b) => {
    const [ha, ma] = a.split(':').map(Number);
    const [hb, mb] = b.split(':').map(Number);
    return ((ha || 0) * 60 + (ma || 0)) - ((hb || 0) * 60 + (mb || 0));
  });
  // --- FIN NUEVA LÓGICA ---
  
  const handleViewLocation = (dispatch: Dispatch) => {
    console.log(`Ver ubicación del item: ${dispatch.id}`);
    // TODO: Implementar mapa
  };

  const handleViewDetail = (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDispatch(null);
  };

  return (
    <>
      <div className="bg-[#1b273b] p-4 rounded-lg shadow-lg text-slate-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-cyan-400">{title}</h3>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400">
              {dispatches.length} {type === 'despachos' ? 'despachos' : 'recepciones'} esta semana
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700 text-xs">
            <thead className="bg-[#0a0e1a]">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-cyan-400 uppercase tracking-wider sticky left-0 bg-[#0a0e1a] z-10 w-16">
                  ⏰ Hora
                </th>
                {daysOfWeek.map((day) => (
                  <th key={day} scope="col" className="px-2 py-2 text-center text-xs font-medium text-cyan-400 uppercase tracking-wider min-w-[140px]">
                    <div className="text-xs">{day}</div>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      {weekDates[day] ? formatLocalDate(weekDates[day]!) : '-'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {displayTimeSlots.length === 0 ? (
                <tr>
                  <td colSpan={daysOfWeek.length + 1} className="px-4 py-8 text-center">
                    <div className="text-gray-400">
                      <div className="text-3xl mb-2">📅</div>
                      <div className="text-sm">No hay {type === 'despachos' ? 'despachos' : 'recepciones'} programados</div>
                      <div className="text-xs mt-1">para la semana del {formatLocalDate(mondayOfWeek)} al {formatLocalDate(sundayOfWeek)}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayTimeSlots.map((time, timeIndex) => (
                  <tr key={time} className={timeIndex % 2 === 0 ? 'bg-[#0a0e1a]/30' : ''}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-cyan-500 sticky left-0 bg-[#0a0e1a] z-10">
                      {time}
                    </td>
                    {daysOfWeek.map(day => {
                      const despachosInSlot = groupedDispatches[day]?.[time] || [];
                      return (
                        <td key={`${day}-${time}`} className="px-2 py-2 border-l border-gray-800 align-top">
                          {despachosInSlot.length > 0 ? (
                            despachosInSlot.map(dispatch => (
                              <div
                                key={dispatch.id}
                                onClick={() => handleViewDetail(dispatch)}
                                className={`group relative p-2 rounded-lg text-xs mb-2 last:mb-0 cursor-pointer transition-all duration-300 border-2 ${
                                  selectedDispatch?.id === dispatch.id
                                    ? 'border-cyan-500 bg-cyan-900/40 shadow-lg shadow-cyan-500/20 z-20'
                                    : 'border-transparent bg-gradient-to-br from-blue-900/40 to-blue-800/30 hover:from-blue-800/60 hover:to-blue-700/50 hover:border-cyan-600/50 hover:shadow-xl hover:z-30 hover:scale-110'
                                }`}
                              >
                                {/* Vista Compacta (Default) */}
                                <div className="group-hover:hidden">
                                  {/* Badge de Estado Pequeño */}
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`w-2 h-2 rounded-full ${getStatusColor(dispatch.estado)} block`}></span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewLocation(dispatch);
                                      }}
                                      className="text-slate-400 hover:text-cyan-400 p-0.5 rounded-full hover:bg-cyan-700/50 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Ver en Mapa"
                                    >
                                      <MapPinIcon className="h-3 w-3" />
                                    </button>
                                  </div>

                                  {/* Info Mínima */}
                                  <p className="font-bold text-white text-xs truncate mb-0.5" title={dispatch.pedido_id}>
                                    {dispatch.pedido_id || 'N/A'}
                                  </p>
                                  <p className="text-slate-300 text-xs truncate" title={dispatch.destino}>
                                    📍 {dispatch.destino || 'N/A'}
                                  </p>
                                  
                                  {/* Tipo Badge */}
                                  <div className="absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded bg-black/50 text-slate-400 text-[10px]">
                                    {dispatch.type === 'recepcion' ? 'RX' : 'TX'}
                                  </div>
                                </div>

                                {/* Vista Expandida (Hover) */}
                                <div className="hidden group-hover:block">
                                  {/* Badge de Estado con Label */}
                                  <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-semibold ${getStatusColor(dispatch.estado)} text-white shadow`}>
                                      {getStatusLabel(dispatch.estado)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewLocation(dispatch);
                                      }}
                                      className="text-slate-300 hover:text-cyan-400 p-1 rounded-full hover:bg-cyan-700/50 transition-colors"
                                      title="Ver en Mapa"
                                    >
                                      <MapPinIcon className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* Info Completa */}
                                  <div className="space-y-1">
                                    <p className="font-bold text-white text-sm truncate" title={dispatch.pedido_id}>
                                      📦 {dispatch.pedido_id || 'N/A'}
                                    </p>
                                    <p className="text-slate-200 text-xs truncate" title={dispatch.destino}>
                                      📍 {dispatch.destino || 'N/A'}
                                    </p>
                                    <p className="text-slate-300 text-xs truncate" title={dispatch.transporte_data?.nombre}>
                                      🚛 {dispatch.transporte_data?.nombre || 'Sin asignar'}
                                    </p>
                                    {dispatch.chofer?.nombre_completo && (
                                      <p className="text-slate-400 text-xs truncate" title={dispatch.chofer.nombre_completo}>
                                        👤 {dispatch.chofer.nombre_completo}
                                      </p>
                                    )}
                                  </div>

                                  {/* Botón Ver Detalle */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetail(dispatch);
                                    }}
                                    className="w-full mt-2 px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                  >
                                    <EyeIcon className="h-3 w-3" />
                                    Ver Detalle
                                  </button>

                                  {/* Tipo Badge Expandido */}
                                  <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-black/50 text-slate-300 backdrop-blur-sm">
                                    {(dispatch.type || 'despacho').toString().toLowerCase()}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-full min-h-[60px] w-full border border-dashed border-gray-800 rounded-md opacity-20 hover:opacity-40 hover:border-gray-700 transition-all"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔥 NUEVO: Modal de Detalle */}
      {showDetailModal && selectedDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={closeDetailModal}>
          <div className="bg-[#1b273b] rounded-lg shadow-2xl max-w-2xl w-full mx-4 border-2 border-cyan-600/30" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-cyan-400">
                📦 Detalle del {selectedDispatch.type === 'recepcion' ? 'Recepción' : 'Despacho'}
              </h3>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Pedido ID</label>
                  <p className="text-white font-semibold">{selectedDispatch.pedido_id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Estado</label>
                  <p>
                    <span className={`px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(selectedDispatch.estado)} text-white inline-block`}>
                      {getStatusLabel(selectedDispatch.estado)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Origen</label>
                  <p className="text-white">{selectedDispatch.origen || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Destino</label>
                  <p className="text-white">{selectedDispatch.destino || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Fecha Programada</label>
                  <p className="text-white">
                    {selectedDispatch.scheduled_local_date || formatLocalDate(new Date(selectedDispatch.scheduled_at))}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Hora Programada</label>
                  <p className="text-white">
                    {selectedDispatch.scheduled_local_time || new Date(selectedDispatch.scheduled_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Transporte</label>
                  <p className="text-white">{selectedDispatch.transporte_data?.nombre || 'Sin asignar'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Chofer</label>
                  <p className="text-white">{selectedDispatch.chofer?.nombre_completo || 'Sin asignar'}</p>
                </div>
              </div>

              {/* Mapa placeholder */}
              <div className="mt-6 bg-gray-800 rounded-lg p-4 text-center">
                <MapPinIcon className="h-12 w-12 text-cyan-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Mapa de ubicación en tiempo real</p>
                <p className="text-gray-500 text-xs mt-1">(Próximamente)</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleViewLocation(selectedDispatch)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <MapPinIcon className="h-4 w-4" />
                Ver en Mapa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlanningGrid;