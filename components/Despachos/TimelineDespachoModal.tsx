import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import {
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TimelineEvent {
  id: string;
  timestamp: string;
  tipo: 'estado' | 'asignacion' | 'documento' | 'incidencia' | 'nota' | 'sistema';
  accion: string;
  descripcion: string;
  usuario?: string;
  icono: string;
  color: string;
  metadata?: any;
}

interface TimelineDespachoModalProps {
  isOpen: boolean;
  onClose: () => void;
  despachoId: string;
  pedidoId: string;
}

const COLOR_MAP: Record<string, { dot: string; line: string; bg: string; text: string }> = {
  blue:   { dot: 'bg-blue-500',   line: 'border-blue-500/30',   bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  green:  { dot: 'bg-green-500',  line: 'border-green-500/30',  bg: 'bg-green-500/10',  text: 'text-green-400' },
  cyan:   { dot: 'bg-cyan-500',   line: 'border-cyan-500/30',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400' },
  teal:   { dot: 'bg-teal-500',   line: 'border-teal-500/30',   bg: 'bg-teal-500/10',   text: 'text-teal-400' },
  amber:  { dot: 'bg-amber-500',  line: 'border-amber-500/30',  bg: 'bg-amber-500/10',  text: 'text-amber-400' },
  orange: { dot: 'bg-orange-500', line: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  red:    { dot: 'bg-red-500',    line: 'border-red-500/30',    bg: 'bg-red-500/10',    text: 'text-red-400' },
  purple: { dot: 'bg-purple-500', line: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  indigo: { dot: 'bg-indigo-500', line: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  gray:   { dot: 'bg-gray-500',   line: 'border-gray-500/30',   bg: 'bg-gray-500/10',   text: 'text-gray-400' },
};

const TIPO_FILTER_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: '📋' },
  { key: 'estado', label: 'Estados', icon: '🔄' },
  { key: 'asignacion', label: 'Asignaciones', icon: '🚛' },
  { key: 'documento', label: 'Documentos', icon: '📄' },
  { key: 'incidencia', label: 'Incidencias', icon: '⚠️' },
  { key: 'nota', label: 'Notas', icon: '💬' },
];

export default function TimelineDespachoModal({
  isOpen,
  onClose,
  despachoId,
  pedidoId
}: TimelineDespachoModalProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');

  useEffect(() => {
    if (isOpen && despachoId) {
      fetchTimeline();
    }
  }, [isOpen, despachoId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetchWithAuth(`/api/despachos/timeline?despachoId=${despachoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar timeline');
      }

      setEvents(data.events || []);
    } catch (err: any) {
      console.error('Error cargando timeline:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filterTipo === 'all'
    ? events
    : events.filter(e => e.tipo === filterTipo);

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = '';
    if (diffMins < 1) relative = 'Justo ahora';
    else if (diffMins < 60) relative = `Hace ${diffMins}min`;
    else if (diffHours < 24) relative = `Hace ${diffHours}h`;
    else if (diffDays < 7) relative = `Hace ${diffDays}d`;
    else relative = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

    const absolute = date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return { relative, absolute };
  };

  // Group events by date
  const groupedEvents: { date: string; events: TimelineEvent[] }[] = [];
  filteredEvents.forEach(event => {
    const dateKey = new Date(event.timestamp).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const existing = groupedEvents.find(g => g.date === dateKey);
    if (existing) {
      existing.events.push(event);
    } else {
      groupedEvents.push({ date: dateKey, events: [event] });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Historial de Eventos</h2>
                <p className="text-xs text-gray-400">{pedidoId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTimeline}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                title="Actualizar"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filtros por tipo */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {TIPO_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterTipo(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  filterTipo === opt.key
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-3 text-gray-400 text-sm">Cargando historial...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-600" />
              <p className="mt-3 text-gray-400">No hay eventos registrados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedEvents.map((group, gi) => (
                <div key={gi}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-gray-800"></div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {group.date}
                    </span>
                    <div className="h-px flex-1 bg-gray-800"></div>
                  </div>

                  {/* Events for this date */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[17px] top-0 bottom-0 w-px bg-gray-800"></div>

                    <div className="space-y-0">
                      {group.events.map((event, ei) => {
                        const colors = COLOR_MAP[event.color] || COLOR_MAP.gray;
                        const time = formatTimestamp(event.timestamp);
                        
                        return (
                          <div key={event.id} className="relative flex gap-4 py-2.5 group">
                            {/* Dot */}
                            <div className="relative z-10 flex-shrink-0">
                              <div className={`w-[34px] h-[34px] rounded-full ${colors.bg} border-2 ${colors.line} flex items-center justify-center text-sm`}>
                                {event.icono}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold ${colors.text}`}>
                                    {event.accion}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5 break-words">
                                    {event.descripcion}
                                  </p>
                                  {event.usuario && (
                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                      por {event.usuario}
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-xs text-gray-500 font-mono">{time.relative}</p>
                                  <p className="text-[10px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {time.absolute}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/80">
          <p className="text-[11px] text-gray-600 text-center">
            {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} 
            {filterTipo !== 'all' && ` (filtrado)`}
            {events.length > 0 && ` · Desde ${new Date(events[events.length - 1]?.timestamp).toLocaleDateString('es-AR')}`}
          </p>
        </div>
      </div>
    </div>
  );
}
