// components/Planning/DayView.tsx
import React from 'react';
import { ClockIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';

interface DayViewProps {
  title: string;
  dispatches: any[];
  type: "despachos" | "recepciones";
  onReschedule?: () => void;
}

const DayView: React.FC<DayViewProps> = ({ title, dispatches, type }) => {
  // Filtrar solo los viajes de hoy
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const todayDispatches = dispatches.filter(d => d.scheduled_local_date === todayStr);

  // Agrupar por hora
  const groupedByHour: Record<string, any[]> = {};
  todayDispatches.forEach(d => {
    const hour = d.scheduled_local_time?.substring(0, 5) || '00:00';
    if (!groupedByHour[hour]) groupedByHour[hour] = [];
    groupedByHour[hour].push(d);
  });

  const sortedHours = Object.keys(groupedByHour).sort();

  const getStatusColor = (estado: string) => {
    const colors: Record<string, string> = {
      // Legacy
      'Generado': 'bg-gray-600', 'Aceptado': 'bg-blue-600', 'Asignado': 'bg-yellow-600',
      'Confirmado': 'bg-cyan-600', 'En Camino a Origen': 'bg-indigo-600',
      'Cargando': 'bg-orange-600', 'Despachado': 'bg-green-600', 'Terminado': 'bg-gray-700',
      // estado_unidad values
      'pendiente': 'bg-gray-600', 'transporte_asignado': 'bg-blue-600',
      'camion_asignado': 'bg-yellow-600', 'confirmado_chofer': 'bg-cyan-600',
      'en_transito_origen': 'bg-indigo-600', 'ingresado_origen': 'bg-green-600',
      'llamado_carga': 'bg-amber-600',
      'cargando': 'bg-orange-600', 'cargado': 'bg-teal-600', 'egreso_origen': 'bg-purple-600',
      'en_transito_destino': 'bg-pink-600', 'ingresado_destino': 'bg-emerald-600',
      'llamado_descarga': 'bg-amber-700', 'descargando': 'bg-orange-700', 'descargado': 'bg-teal-700',
      'egreso_destino': 'bg-green-700',
      'completado': 'bg-green-800', 'cancelado': 'bg-red-600',
    };
    return colors[estado] || 'bg-slate-600';
  };

  const getStatusLabel = (estado: string) => {
    const labels: Record<string, string> = {
      'pendiente': '⏳ Pendiente', 'transporte_asignado': '🚛 Transporte',
      'camion_asignado': '🚛 Camión', 'confirmado_chofer': '✅ Confirmado',
      'en_transito_origen': '🚚 → Origen', 'ingresado_origen': '🏭 En Planta',
      'llamado_carga': '📢 Carga',
      'cargando': '⚙️ Cargando', 'cargado': '📦 Cargado', 'egreso_origen': '🚪 Saliendo',
      'en_transito_destino': '🚚 → Destino', 'ingresado_destino': '🏁 Destino',
      'llamado_descarga': '📢 Descarga', 'descargando': '⚙️ Descargando', 'descargado': '📦 Descargado',
      'egreso_destino': '🚪 Egreso',
      'completado': '🎉 Completo', 'cancelado': '❌ Cancelado',
    };
    return labels[estado] || estado;
  };

  const getPriorityColor = (prioridad?: string) => {
    switch (prioridad) {
      case 'Urgente': return 'border-l-4 border-red-500';
      case 'Alta': return 'border-l-4 border-orange-500';
      case 'Media': return 'border-l-4 border-yellow-500';
      case 'Baja': return 'border-l-4 border-green-500';
      default: return 'border-l-4 border-gray-600';
    }
  };

  return (
    <div className="bg-[#1b273b] rounded shadow-lg p-1.5 mb-2">
      <h3 className="text-sm font-bold text-cyan-400 mb-1">{title} - Hoy ({todayStr})</h3>
      
      {todayDispatches.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-1">📅</div>
          <p className="text-gray-400 text-[10px]">No hay {type} programados para hoy</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedHours.map(hour => (
            <div key={hour} className="bg-[#0a0e1a] rounded p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <ClockIcon className="h-3 w-3 text-cyan-400" />
                <h4 className="text-[10px] font-semibold text-cyan-300">{hour}</h4>
                <span className="text-[9px] text-gray-500">({groupedByHour[hour]?.length || 0} viaje{(groupedByHour[hour]?.length || 0) !== 1 ? 's' : ''})</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {(groupedByHour[hour] || []).map(dispatch => (
                  <div
                    key={dispatch.id}
                    className={`bg-gradient-to-br rounded p-1.5 hover:shadow-xl transition-all cursor-pointer ${
                      dispatch.estado === 'expirado' 
                        ? 'from-gray-800/50 to-gray-700/50 border border-gray-600 opacity-75' 
                        : dispatch.estado === 'completado'
                        ? 'from-green-900/20 to-green-800/10 border border-green-700/40 opacity-50'
                        : `from-slate-800 to-slate-900 ${getPriorityColor(dispatch.prioridad)}`
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-[10px]">{dispatch.pedido_id || 'N/A'}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${getStatusColor(dispatch.estado)} text-white font-semibold`}>
                        {getStatusLabel(dispatch.estado)}
                      </span>
                    </div>

                    {/* Ruta */}
                    <div className="flex items-center gap-1 text-[9px] text-slate-300 mb-1">
                      <MapPinIcon className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        {/* Origen */}
                        <div className="flex flex-col gap-0.5">
                          {(dispatch as any).origen_provincia && (
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${
                              dispatch.estado === 'expirado' ? 'text-gray-200' : 'text-cyan-300'
                            }`}>
                              {(dispatch as any).origen_provincia}
                            </span>
                          )}
                          <span className={`truncate ${
                            dispatch.estado === 'expirado' ? 'text-gray-200' : 'text-slate-200'
                          }`}>{dispatch.origen || 'N/A'}</span>
                        </div>
                        {/* Flecha */}
                        <span className="text-slate-500">→</span>
                        {/* Destino */}
                        <div className="flex flex-col gap-0.5">
                          {(dispatch as any).destino_provincia && (
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${
                              dispatch.estado === 'expirado' ? 'text-gray-200' : 'text-cyan-300'
                            }`}>
                              {(dispatch as any).destino_provincia}
                            </span>
                          )}
                          <span className={`truncate ${
                            dispatch.estado === 'expirado' ? 'text-gray-200' : 'text-slate-200'
                          }`}>{dispatch.destino || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Transporte */}
                    {dispatch.transport_id && (
                      <div className="space-y-1 mt-3 pt-3 border-t border-gray-700">
                        <div className={`flex items-center gap-2 text-xs ${
                          dispatch.estado === 'expirado' ? 'text-gray-200' : 'text-emerald-300'
                        }`}>
                          <TruckIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{dispatch.transporte_data?.nombre || 'Transporte'}</span>
                        </div>
                        {dispatch.chofer && (
                          <div className="text-xs text-blue-300 ml-6">
                            👤 {dispatch.chofer.nombre_completo}
                          </div>
                        )}
                        {dispatch.camion_data && (
                          <div className="text-xs text-yellow-300 ml-6">
                            🚛 {dispatch.camion_data.patente}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prioridad badge */}
                    {dispatch.prioridad && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 rounded bg-slate-700 text-gray-300">
                          {dispatch.prioridad}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DayView;
