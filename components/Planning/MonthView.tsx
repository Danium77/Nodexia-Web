// components/Planning/MonthView.tsx
import React, { useMemo } from 'react';
import { MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';

interface Dispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  scheduled_local_date?: string;
  scheduled_local_time?: string;
  prioridad?: string;
  transporte_data?: { nombre: string };
  camion_data?: { patente: string };
  chofer?: { nombre_completo: string };
}

interface MonthViewProps {
  title: string;
  dispatches: Dispatch[];
  type: "despachos" | "recepciones";
}

const MonthView: React.FC<MonthViewProps> = ({ title, dispatches, type }) => {
  // Obtener mes y año actual
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Calcular días del mes
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days: Date[] = [];

    // Agregar días vacíos al principio (para alinear con el día de la semana)
    const firstDayOfWeek = firstDay.getDay(); // 0 = domingo, 1 = lunes, etc.
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Lunes = 0

    for (let i = 0; i < offset; i++) {
      days.push(new Date(currentYear, currentMonth, -(offset - i - 1)));
    }

    // Agregar días del mes
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  }, [currentMonth, currentYear]);

  // Agrupar despachos por fecha
  const dispatchesByDate = useMemo(() => {
    const grouped: Record<string, Dispatch[]> = {};
    dispatches.forEach(d => {
      if (d.scheduled_local_date) {
        if (!grouped[d.scheduled_local_date]) {
          grouped[d.scheduled_local_date] = [];
        }
        grouped[d.scheduled_local_date].push(d);
      }
    });
    return grouped;
  }, [dispatches]);

  const getStatusColor = (estado: string) => {
    const colors: Record<string, string> = {
      'Generado': 'bg-gray-500',
      'Aceptado': 'bg-blue-500',
      'Asignado': 'bg-yellow-500',
      'Confirmado': 'bg-cyan-500',
      'En Camino a Origen': 'bg-indigo-500',
      'Cargando': 'bg-orange-500',
      'Despachado': 'bg-green-500',
      'Terminado': 'bg-gray-600'
    };
    return colors[estado] || 'bg-slate-500';
  };

  const getPriorityIndicator = (prioridad?: string) => {
    switch (prioridad) {
      case 'Urgente': return '🔴';
      case 'Alta': return '🟠';
      case 'Media': return '🟡';
      case 'Baja': return '🟢';
      default: return '⚪';
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isToday = (date: Date) => {
    const todayStr = formatDate(today);
    const dateStr = formatDate(date);
    return todayStr === dateStr;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="bg-[#1b273b] rounded-lg shadow-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-cyan-400">
          {title} - {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
            Hoy
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            Con {type}
          </span>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-cyan-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((date, index) => {
          const dateStr = formatDate(date);
          const dayDispatches = dispatchesByDate[dateStr] || [];
          const isTodayDate = isToday(date);
          const isCurrentMonthDate = isCurrentMonth(date);

          return (
            <div
              key={index}
              className={`
                min-h-[100px] rounded-lg p-2 border transition-all
                ${isTodayDate 
                  ? 'bg-cyan-900/30 border-cyan-500 shadow-lg' 
                  : dayDispatches.length > 0
                    ? 'bg-[#0a0e1a] border-blue-600/50'
                    : 'bg-[#0a0e1a] border-gray-800'
                }
                ${!isCurrentMonthDate ? 'opacity-30' : ''}
              `}
            >
              {/* Número del día */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${
                  isTodayDate 
                    ? 'text-cyan-400' 
                    : isCurrentMonthDate 
                      ? 'text-white' 
                      : 'text-gray-600'
                }`}>
                  {date.getDate()}
                </span>
                {dayDispatches.length > 0 && (
                  <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {dayDispatches.length}
                  </span>
                )}
              </div>

              {/* Lista de despachos (máximo 3 visibles) */}
              <div className="space-y-1">
                {dayDispatches.slice(0, 3).map(dispatch => (
                  <div
                    key={dispatch.id}
                    className="text-xs bg-gradient-to-r from-slate-800 to-slate-900 rounded p-1.5 cursor-pointer hover:shadow-lg transition-all border-l-2 border-cyan-500"
                    title={`${dispatch.pedido_id}: ${dispatch.origen} → ${dispatch.destino}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-mono text-white truncate">{dispatch.pedido_id}</span>
                      <span className="text-[9px]">{getPriorityIndicator(dispatch.prioridad)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 truncate">
                      <MapPinIcon className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{dispatch.origen?.substring(0, 12)}</span>
                    </div>
                    {dispatch.transporte_data && (
                      <div className="flex items-center gap-1 text-[9px] text-emerald-400 truncate mt-0.5">
                        <TruckIcon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{dispatch.transporte_data.nombre?.substring(0, 15)}</span>
                      </div>
                    )}
                  </div>
                ))}
                {dayDispatches.length > 3 && (
                  <div className="text-[9px] text-center text-cyan-400 font-semibold">
                    +{dayDispatches.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>🔴 Urgente</span>
          <span>🟠 Alta</span>
          <span>🟡 Media</span>
          <span>🟢 Baja</span>
          <span className="ml-auto">
            Total {type}: <span className="text-cyan-400 font-bold">{dispatches.length}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthView;
