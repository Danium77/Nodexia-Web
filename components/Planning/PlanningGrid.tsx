// components/Planning/PlanningGrid.tsx
import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

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
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Generado': return 'bg-gray-500';
      case 'Aceptado': return 'bg-blue-500';
      case 'Asignado': return 'bg-yellow-500';
      case 'Confirmado': return 'bg-cyan-500';
      case 'En Camino a Origen': return 'bg-indigo-500';
      case 'Arribado a Origen': return 'bg-purple-500';
      case 'Cargando': return 'bg-orange-500';
      case 'Cargado': return 'bg-emerald-500';
      case 'Despachado': return 'bg-green-500';
      case 'Camino a Destino': return 'bg-pink-500';
      case 'Arribado a Destino': return 'bg-red-500';
      case 'Descargando': return 'bg-amber-500';
      case 'Descargado': return 'bg-lime-500';
      case 'Terminado': return 'bg-gray-700';
      default: return 'bg-slate-400';
    }
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
      if (formatLocalDate(weekDates[dayName]) === scheduledLocal) {
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
      if (!groupedDispatches[dispatchDayName][timeSlot]) {
        groupedDispatches[dispatchDayName][timeSlot] = [];
      }
      groupedDispatches[dispatchDayName][timeSlot].push(dispatch);
      actualScheduledTimeSlots.add(timeSlot);
    }
  });

  const displayTimeSlots = Array.from(actualScheduledTimeSlots).sort((a, b) => {
    const [ha, ma] = a.split(':').map(Number);
    const [hb, mb] = b.split(':').map(Number);
    return (ha * 60 + ma) - (hb * 60 + mb);
  });
  // --- FIN NUEVA LÓGICA ---
  
  const handleViewLocation = (itemId: string) => {
    console.log(`Ver ubicación del item: ${itemId}`);
  };

  return (
    <div className="bg-[#1b273b] p-4 rounded-lg shadow-lg text-slate-100">
      <h3 className="text-xl font-semibold mb-4 text-cyan-400">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-[#0e1a2d]">
            <tr>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Hora</th>
              {daysOfWeek.map(day => (
                <th key={day} scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {displayTimeSlots.length === 0 ? (
                <tr>
                    <td colSpan={daysOfWeek.length + 1} className="px-4 py-8 text-center text-slate-400">
                        No hay {type === 'despachos' ? 'despachos' : 'recepciones'} programados para esta semana.
                    </td>
                </tr>
            ) : (
                displayTimeSlots.map(time => (
                    <tr key={time}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-300">{time}</td>
                        {daysOfWeek.map(day => {
                            const despachosInSlot = groupedDispatches[day]?.[time] || [];
                            return (
                                <td key={`${day}-${time}`} className="px-2 py-2 border-l border-gray-700 align-top">
                                    {despachosInSlot.length > 0 ? (
                                        despachosInSlot.map(dispatch => (
                                            <div
                                                key={dispatch.id}
                                                className="bg-blue-600/30 p-2 rounded-md text-xs relative mb-1 last:mb-0 cursor-grab hover:bg-blue-600/50 transition-colors duration-200"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`w-3 h-3 rounded-full ${getStatusColor(dispatch.estado)} block`}></span>
                                                    <button
                                                        onClick={() => handleViewLocation(dispatch.id)}
                                                        className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-cyan-700/50 transition-colors"
                                                        title="Ver en Mapa"
                                                    >
                                                        <MapPinIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <p className="font-medium text-slate-50 mb-0.5">{dispatch.pedido_id || 'N/A'} - {dispatch.destino || 'N/A'}</p>
                                                <p className="text-slate-200 mb-0.5">Trans: {dispatch.transporte_data?.nombre || 'N/A'}</p>
                                                <p className="text-slate-200">Chof: {dispatch.chofer?.nombre_completo || 'N/A'}</p>
                                                <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-black/30 text-slate-200">{(dispatch.type || 'despacho').toString().toLowerCase()}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full min-h-[50px] w-full border border-dashed border-gray-700 rounded-md opacity-20"></div>
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
  );
};

export default PlanningGrid;