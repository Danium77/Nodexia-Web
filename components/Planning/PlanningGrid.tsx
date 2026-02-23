// components/Planning/PlanningGrid.tsx
import React, { useState, useMemo, useReducer, useRef } from 'react';
import { MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabaseClient';
import { getColorEstadoOperativo, getIconoEstadoOperativo, getLabelEstadoOperativo } from '../../lib/estados';

// Extend window for drag tracking
declare global {
  interface Window {
    _lastDragOverLog?: number;
  }
}

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
  prioridad?: string;
  viaje_numero?: number;
  despacho_id?: string;

  transporte_data?: { nombre: string; tipo_vehiculo?: string };
  camion_data?: { patente: string; marca?: string; modelo?: string };
  creador?: { nombre_completo: string };
  chofer?: { nombre_completo: string; telefono?: string };
}

interface PlanningGridProps {
  title: string;
  dispatches: Dispatch[];
  type: "despachos" | "recepciones";
  onReschedule?: () => void;
  weekOffset?: number; // 0 = semana actual, 1 = próxima, -1 = anterior
}

const PlanningGrid: React.FC<PlanningGridProps> = ({ title, dispatches, type, onReschedule, weekOffset = 0 }) => {
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const draggedDispatchRef = useRef<Dispatch | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{ dispatch: Dispatch; newDate: string; newTime: string } | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ day: string; time: string } | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // 🔥 NUEVO: Forzar re-render cuando sea necesario
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Calcular inicio de semana según weekOffset
  const calculateMondayOfWeek = (offset: number = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si es domingo, retroceder 6 días
    const monday = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
    monday.setHours(0, 0, 0, 0);
    
    // Aplicar offset de semanas
    if (offset !== 0) {
      monday.setDate(monday.getDate() + (offset * 7));
    }
    
    return monday;
  };

  // 🔍 DEBUG: Ver qué datos llegan al componente
  React.useEffect(() => {
    console.log('🔍 [PlanningGrid] Dispatches recibidos:', dispatches.length);
    if (dispatches.length > 0 && dispatches[0]) {
      console.log('🔍 [PlanningGrid] Primer dispatch:', dispatches[0]);
      console.log('  - transporte_data:', dispatches[0].transporte_data);
      console.log('  - camion_data:', dispatches[0].camion_data);
      console.log('  - chofer:', dispatches[0].chofer);
    }
  }, [dispatches]);

  const getStatusColor = (estado: string) => {
    const colors: Record<string, string> = {
      // Legacy display names
      'Generado': 'bg-gray-600',
      'Aceptado': 'bg-blue-600',
      'Asignado': 'bg-yellow-600',
      'Confirmado': 'bg-cyan-600',
      'En Camino a Origen': 'bg-indigo-600',
      'Arribado a Origen': 'bg-purple-600',
      'Cargando': 'bg-orange-600',
      'Cargado': 'bg-emerald-600',
      'Despachado': 'bg-green-600',
      'Camino a Destino': 'bg-pink-600',
      'Arribado a Destino': 'bg-red-600',
      'Descargando': 'bg-amber-600',
      'Descargado': 'bg-lime-600',
      'Terminado': 'bg-gray-700',
      // snake_case estado values — alineados con lib/estados/config.ts
      'pendiente': 'bg-gray-600',
      'transporte_asignado': 'bg-blue-600',
      'camion_asignado': 'bg-yellow-600',
      'confirmado_chofer': 'bg-cyan-600',
      'en_transito_origen': 'bg-indigo-600',
      'ingresado_origen': 'bg-green-600',
      'llamado_carga': 'bg-amber-600',
      'cargando': 'bg-orange-600',
      'cargado': 'bg-emerald-600',
      'egreso_origen': 'bg-purple-600',
      'en_transito_destino': 'bg-pink-600',
      'ingresado_destino': 'bg-teal-600',
      'llamado_descarga': 'bg-cyan-700',
      'descargando': 'bg-amber-600',
      'descargado': 'bg-lime-600',
      'egreso_destino': 'bg-emerald-700',
      'completado': 'bg-green-700',
      'cancelado': 'bg-red-600',
    };
    return colors[estado] || 'bg-slate-600';
  };

  const getStatusLabel = (estado: string) => {
    const labels: Record<string, string> = {
      'pendiente': '⏳ Pendiente',
      'transporte_asignado': '🚛 Transporte',
      'camion_asignado': '🚛 Camión Asignado',
      'confirmado_chofer': '✅ Confirmado',
      'en_transito_origen': '🚚 → Origen',
      'ingresado_origen': '🏭 En Planta',
      'llamado_carga': '📢 Llamado Carga',
      'cargando': '⚙️ Cargando',
      'cargado': '📦 Cargado',
      'egreso_origen': '🚪 Egreso Origen',
      'en_transito_destino': '🚚 → Destino',
      'ingresado_destino': '🏁 Ingresado Destino',
      'llamado_descarga': '📢 Llamado Descarga',
      'descargando': '📤 Descargando',
      'descargado': '✅ Descargado',
      'egreso_destino': '🚪 Egreso Destino',
      'completado': '🎉 Completado',
      'cancelado': '❌ Cancelado',
      // Legacy display-name compat
      'Generado': '📋 Generado',
      'Asignado': '🚛 Asignado',
      'Confirmado': '✔️ Confirmado'
    };
    return labels[estado] || estado;
  };

  // 🔥 Funciones mejoradas para Drag & Drop
  const canBeDragged = (dispatch: Dispatch) => {
    // Solo permitir drag para viajes editables (estados anteriores a confirmado_chofer)
    // Alineado con /api/despachos/actualizar
    const estadosNoEditables = [
      'confirmado_chofer',
      'en_transito_origen',
      'ingresado_origen',
      'llamado_carga',
      'cargando',
      'cargado',
      'egreso_origen',
      'en_transito_destino',
      'ingresado_destino',
      'llamado_descarga',
      'descargando',
      'descargado',
      'egreso_destino',
      'completado',
      'cancelado',
      'terminado'
    ];
    const estado = dispatch.estado?.toLowerCase().trim() || '';
    const allowed = !estadosNoEditables.includes(estado);
    console.log(`🔍 canBeDragged ${dispatch.pedido_id}: estado="${estado}", allowed=${allowed}`);
    return allowed;
  };

  const handleDragStart = (e: React.DragEvent, dispatch: Dispatch) => {
    const dragAllowed = canBeDragged(dispatch);
    
    if (!dragAllowed) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    console.log('🚀 Drag iniciado:', dispatch.pedido_id, 'target:', e.currentTarget);
    
    // 🔥 Usar ref para evitar re-render que cancela el drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dispatch.id);
    
    draggedDispatchRef.current = dispatch;
    
    // NO setear isDragging aquí, dejarlo en null hasta que realmente empiece a moverse
    setTimeout(() => {
      setIsDragging(true);
      console.log('✅ Drag activo, isDragging=true');
    }, 50); // Pequeño delay para evitar que el re-render cancele el drag
  };

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🏁 DRAG END - dropEffect:', e.dataTransfer.dropEffect);
    draggedDispatchRef.current = null;
    setIsDragging(false);
    setDropTarget(null);
    
    // Limpiar auto-scroll
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // CRÍTICO: Siempre preventDefault para permitir drop
    e.preventDefault();
    e.stopPropagation();
    
    // Importante: configurar dropEffect después de preventDefault
    if (draggedDispatchRef.current) {
      e.dataTransfer.dropEffect = 'move';
    }
    
    // 🔄 AUTO-SCROLL: Usar scroll de window pero mantener encabezado visible
    if (draggedDispatchRef.current) {
      const scrollThreshold = 150;
      const scrollSpeed = 40;
      const mouseY = e.clientY;
      const viewportHeight = window.innerHeight;
      
      // Distancias desde bordes del viewport
      const distanceFromTop = mouseY;
      const distanceFromBottom = viewportHeight - mouseY;
      
      // Log para debug
      const now = Date.now();
      if (!window._lastDragOverLog || now - window._lastDragOverLog > 500) {
        console.log('📍 mouseY:', mouseY.toFixed(0), 'distBottom:', distanceFromBottom.toFixed(0), 'scrollY:', window.scrollY.toFixed(0));
        window._lastDragOverLog = now;
      }
      
      // Limpiar scroll previo
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // Scroll hacia arriba
      if (distanceFromTop > 0 && distanceFromTop < scrollThreshold && window.scrollY > 0) {
        console.log('⬆️ AUTO-SCROLL UP');
        scrollIntervalRef.current = setInterval(() => {
          if (window.scrollY > 0) {
            window.scrollBy(0, -scrollSpeed);
          }
        }, 20);
      }
      // Scroll hacia abajo
      else if (distanceFromBottom > 0 && distanceFromBottom < scrollThreshold) {
        console.log('⬇️ AUTO-SCROLL DOWN');
        scrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 20);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent, dayName: string, timeSlot: string) => {
    e.preventDefault();
    console.log('🎯 DragEnter:', dayName, timeSlot);
    if (draggedDispatchRef.current) {
      setDropTarget({ day: dayName, time: timeSlot });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo limpiar si salimos del contenedor
    if (e.currentTarget === e.target) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, dayName: string, timeSlot: string) => {
    e.preventDefault();
    
    setDropTarget(null);
    setIsDragging(false);
    
    const draggedDispatch = draggedDispatchRef.current;
    console.log('💥 DROP detectado en:', dayName, timeSlot, 'draggedDispatch:', draggedDispatch?.pedido_id);
    
    if (!draggedDispatch) {
      console.log('❌ No hay dispatch siendo arrastrado');
      return;
    }

    const dispatch = draggedDispatch;
    draggedDispatchRef.current = null;

    // Obtener la nueva fecha basada en el día de la semana
    const newDate = weekDates[dayName];
    if (!newDate) {
      console.error('❌ No se encontró fecha para el día:', dayName);
      return;
    }

    const newDateStr = formatLocalDate(newDate);
    const newTimeStr = timeSlot;

    console.log('📅 Fecha actual:', dispatch.scheduled_local_date, dispatch.scheduled_local_time);
    console.log('📅 Nueva fecha:', newDateStr, newTimeStr);

    // Verificar si cambió realmente
    if (dispatch.scheduled_local_date === newDateStr && 
        dispatch.scheduled_local_time === newTimeStr) {
      console.log('ℹ️ Misma ubicación, cancelando');
      return;
    }

    // Mostrar modal de confirmación
    console.log('✅ Mostrando modal de confirmación');
    setRescheduleData({
      dispatch: dispatch,
      newDate: newDateStr,
      newTime: newTimeStr
    });
    setShowRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    if (!rescheduleData) return;

    try {
      setRescheduling(true);

      // Obtener sesión para autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Determinar el ID correcto (puede ser despacho_id o el ID si es un despacho directo)
      const despachoId = rescheduleData.dispatch.despacho_id || 
                        (rescheduleData.dispatch.id?.startsWith('despacho-') 
                          ? rescheduleData.dispatch.id.replace('despacho-', '') 
                          : rescheduleData.dispatch.id);

      console.log('📅 Reprogramando despacho:', despachoId, 'a', rescheduleData.newDate, rescheduleData.newTime);

      // 🔥 USAR API /api/despachos/actualizar con validación de seguridad + historial
      const response = await fetch('/api/despachos/actualizar', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          despacho_id: despachoId,
          fecha_despacho: rescheduleData.newDate,
          hora_despacho: rescheduleData.newTime,
          observaciones: 'Reprogramación vía drag & drop en planificación semanal'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error reprogramando despacho');
      }

      console.log('✅ Despacho reprogramado exitosamente vía API');
      
      // Cerrar modal
      setShowRescheduleModal(false);
      setRescheduleData(null);
      
      // Recargar datos
      if (onReschedule) {
        onReschedule();
      }
    } catch (error) {
      console.error('❌ Error reprogramando viaje:', error);
      alert(`Error al reprogramar el despacho: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setRescheduling(false);
    }
  };

  const getPriorityBorderColor = (prioridad?: string) => {
    switch (prioridad) {
      case 'Urgente': return 'border-red-500';
      case 'Alta': return 'border-orange-500';
      case 'Media': return 'border-yellow-500';
      case 'Baja': return 'border-green-500';
      default: return 'border-gray-600';
    }
  };

  const getPriorityGradient = (prioridad?: string) => {
    switch (prioridad) {
      case 'Urgente': return 'from-red-900/40 to-red-800/40';
      case 'Alta': return 'from-orange-900/40 to-orange-800/40';
      case 'Media': return 'from-yellow-900/40 to-yellow-800/40';
      case 'Baja': return 'from-green-900/40 to-green-800/40';
      default: return 'from-slate-900/40 to-slate-800/40';
    }
  };

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // --- NUEVA LÓGICA DE SEMANA CON OFFSET ---
  // Usar calculateMondayOfWeek con weekOffset
  const mondayOfWeek = useMemo(() => calculateMondayOfWeek(weekOffset), [weekOffset]);

  // Calcular las fechas para cada día de la semana (Lunes a Domingo)
  const weekDates: { [key: string]: Date } = {};
  daysOfWeek.forEach((dayName, index) => {
    const date = new Date(mondayOfWeek);
    date.setDate(mondayOfWeek.getDate() + index);
    weekDates[dayName] = date;
  });

  // 🔥 NUEVO: Generar franjas horarias fijas (cada hora de 00:00 a 23:00 - 24 horas)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 0; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const fixedTimeSlots = useMemo(() => generateTimeSlots(), []);

  // Helper para formatear fecha local como YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const sundayOfWeek = new Date(mondayOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000));

  // 🔥 CAMBIO CRÍTICO: Memoizar groupedDispatches y actualScheduledTimeSlots
  const { groupedDispatches, actualScheduledTimeSlots } = useMemo(() => {
    const grouped: Record<string, Record<string, Dispatch[]>> = {};
    const timeSlots = new Set<string>();

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
        
        // 🔥 NUEVO: Redondear al slot de hora más cercano (00 minutos)
        // Si son más de 30 minutos, redondear a la hora siguiente
        const roundedHour = minute >= 30 ? (hour + 1) : hour;
        const timeSlot = `${roundedHour.toString().padStart(2, '0')}:00`;

        if (!grouped[dispatchDayName]) {
          grouped[dispatchDayName] = {};
        }
        const dayGroup = grouped[dispatchDayName];
        if (dayGroup && !dayGroup[timeSlot]) {
          dayGroup[timeSlot] = [];
        }
        if (dayGroup && dayGroup[timeSlot]) {
          dayGroup[timeSlot].push(dispatch);
        }
        timeSlots.add(timeSlot);
      }
    });

    return { groupedDispatches: grouped, actualScheduledTimeSlots: timeSlots };
  }, [dispatches, mondayOfWeek, sundayOfWeek, weekDates]);

  // 🔥 MODIFICADO: Mostrar solo franjas con viajes por defecto, todas durante drag
  console.log('🔄 Renderizando PlanningGrid:', { 
    isDragging: isDragging, 
    draggedDispatch: draggedDispatchRef.current?.pedido_id,
    dispatchesCount: dispatches.length 
  });
  
  // 🔥 CRÍTICO: displayTimeSlots SOLO debe depender de isDragging
  const displayTimeSlots = useMemo(() => {
    console.log('♻️ Recalculando displayTimeSlots con isDragging:', isDragging);
    const result = isDragging 
      ? fixedTimeSlots // Mostrar TODAS las franjas durante drag (17 slots)
      : Array.from(actualScheduledTimeSlots).sort((a, b) => { // Solo franjas con viajes
          const [ha, ma] = a.split(':').map(Number);
          const [hb, mb] = b.split(':').map(Number);
          return ((ha || 0) * 60 + (ma || 0)) - ((hb || 0) * 60 + (mb || 0));
        });
    console.log('♻️ displayTimeSlots calculado:', result.length, 'slots');
    return result;
  }, [isDragging, fixedTimeSlots, actualScheduledTimeSlots]);
  
  console.log('📊 displayTimeSlots (post-useMemo):', displayTimeSlots.length, 'slots');
  // --- FIN NUEVA LÓGICA ---
  
  const handleViewLocation = (dispatch: Dispatch) => {
    console.log(`Ver ubicación del item: ${dispatch.id}`);
    // TODO: Implementar mapa
  };

  const handleViewDetail = (dispatch: Dispatch) => {
    console.log('🔍 [handleViewDetail] Dispatch seleccionado:', dispatch);
    console.log('  - transporte_data:', dispatch.transporte_data);
    console.log('  - camion_data:', dispatch.camion_data);
    console.log('  - chofer:', dispatch.chofer);
    setSelectedDispatch(dispatch);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDispatch(null);
  };

  return (
    <>
      <div className="bg-[#1b273b] p-1.5 rounded shadow-lg text-slate-100 mb-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-cyan-400">{title}</h3>
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-400">
              {dispatches.length} {type === 'despachos' ? 'despachos' : 'recepciones'} esta semana
            </span>
          </div>
        </div>
        <div 
          ref={tableContainerRef} 
          className="overflow-x-auto"
          onDragOver={handleDragOver}
        >
          <table className="min-w-full divide-y divide-gray-700 text-[9px]">
            <thead className="bg-[#0a0e1a] sticky top-0 z-20">
              <tr>
                <th scope="col" className="px-0.5 py-0.5 text-left text-[8px] font-medium text-cyan-400 uppercase tracking-tighter sticky left-0 bg-[#0a0e1a] z-30 w-6">
                  ⏰ Hora
                </th>
                {daysOfWeek.map((day) => (
                  <th key={day} scope="col" className="px-0.5 py-0.5 text-center text-[8px] font-medium text-cyan-400 uppercase tracking-wider min-w-[45px] max-w-[45px] bg-[#0a0e1a]">
                    <div className="text-[9px]">{day}</div>
                    <div className="text-[9px] text-gray-500 font-normal">
                      {weekDates[day] ? formatLocalDate(weekDates[day]!) : '-'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {displayTimeSlots.length === 0 ? (
                <tr>
                  <td colSpan={daysOfWeek.length + 1} className="px-2 py-4 text-center">
                    <div className="text-gray-400">
                      <div className="text-xl mb-1">📅</div>
                      <div className="text-[10px]">No hay {type === 'despachos' ? 'despachos' : 'recepciones'} programados</div>
                      <div className="text-[9px] mt-0.5">para la semana del {formatLocalDate(mondayOfWeek)} al {formatLocalDate(sundayOfWeek)}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayTimeSlots.map((time, timeIndex) => {
                  // 🔥 NUEVO: Logging para verificar que se renderiza correctamente
                  if (timeIndex === 0 || timeIndex === displayTimeSlots.length - 1) {
                    console.log(`📍 Renderizando celda ${time} (${timeIndex + 1}/${displayTimeSlots.length}), drag activo=${isDragging}`);
                  }
                  
                  return (
                  <tr key={time} className={timeIndex % 2 === 0 ? 'bg-[#0a0e1a]/30' : ''}>
                    <td className="px-1 py-0.5 whitespace-nowrap text-[9px] font-bold text-cyan-500 sticky left-0 bg-[#0a0e1a] z-10">
                      {time}
                    </td>
                    {daysOfWeek.map(day => {
                      const despachosInSlot = groupedDispatches[day]?.[time] || [];
                      const isDropTarget = isDragging && dropTarget?.day === day && dropTarget?.time === time;
                      const isDropZone = isDragging;
                      
                      return (
                        <td 
                          key={`${day}-${time}`} 
                          className={`px-0.5 py-0.5 border-l border-gray-800 align-top relative transition-all min-w-[45px] max-w-[45px] w-[45px]
                            ${isDropTarget ? 'bg-cyan-500/20 border-2 border-cyan-400' : ''}
                            ${isDropZone && !isDropTarget ? 'bg-cyan-900/5 hover:bg-cyan-500/10' : ''}
                          `}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, day, time)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, time)}
                          style={{ position: 'relative', zIndex: 1 }}
                        >
                          <div 
                            className={`w-full transition-all ${despachosInSlot.length > 0 ? 'min-h-[80px]' : isDragging ? 'min-h-[75px]' : 'min-h-[40px]'}`}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, day, time)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, time)}
                          >
                            {despachosInSlot.length > 0 ? (
                              despachosInSlot.map(dispatch => {
                                const isBeingDragged = draggedDispatchRef.current?.id === dispatch.id;
                                const isDraggable = canBeDragged(dispatch);
                                
                                // 🔥 NUEVO: Calcular estado operativo para styling
                                const estadoOp = (dispatch as any).estado_operativo;
                                const estaExpirado = estadoOp === 'expirado';
                                const estaDemorado = estadoOp === 'demorado';
                                const estaCompletado = dispatch.estado?.toLowerCase().trim() === 'completado';
                                
                                // Log solo UNA VEZ al renderizar
                                if (!(window as any)[`logged_${dispatch.id}`]) {
                                  console.log(`🎯 RENDER card ${dispatch.pedido_id}:`, {
                                    isDraggable,
                                    estadoOp,
                                    estaExpirado,
                                    estaDemorado,
                                    mostrarIconoReloj: estaDemorado
                                  });
                                  (window as any)[`logged_${dispatch.id}`] = true;
                                }
                                
                                return (
                                  <div
                                    key={dispatch.id}
                                    draggable={isDraggable}
                                    data-draggable={isDraggable ? "true" : "false"}
                                    data-pedido={dispatch.pedido_id}
                                    onDragStart={(e) => handleDragStart(e, dispatch)}
                                    onDragEnd={handleDragEnd}
                                    onClick={(_e) => {
                                      if (isDragging) return;
                                      handleViewDetail(dispatch);
                                    }}
                                    className={`group relative p-1.5 rounded mb-1 last:mb-0 border select-none
                                      ${estaExpirado ? 'border-gray-600' : estaCompletado ? 'border-green-700/40' : estaDemorado ? 'border-orange-500/50' : getPriorityBorderColor(dispatch.prioridad)}
                                      bg-gradient-to-br ${estaExpirado ? 'from-gray-800/50 to-gray-700/50' : estaCompletado ? 'from-green-900/20 to-green-800/10' : estaDemorado ? 'from-orange-900/30 to-orange-800/20' : getPriorityGradient(dispatch.prioridad)}
                                      ${estaExpirado ? 'opacity-75' : estaCompletado ? 'opacity-50' : ''}
                                      ${isDraggable
                                        ? 'cursor-grab active:cursor-grabbing' 
                                        : 'cursor-not-allowed opacity-75'
                                      }
                                    ${selectedDispatch?.id === dispatch.id ? 'ring-2 ring-cyan-500' : ''}
                                    ${isBeingDragged ? 'opacity-0 invisible' : ''}
                                  `}
                                  style={{ 
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    MozUserSelect: 'none',
                                    msUserSelect: 'none',
                                    touchAction: 'none',
                                    WebkitTouchCallout: 'none'
                                  } as React.CSSProperties}
                                  >
                                {/* CONTENEDOR INTERNO: elementos de solo lectura */}
                                <div 
                                  className="relative" 
                                  style={{ 
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none'
                                  }}
                                >
                                  {/* Destino u Origen según el tipo de vista */}
                                  <div className="flex flex-col gap-0.5">
                                    {/* Provincia ARRIBA - más prominente */}
                                    {((type === 'recepciones' && (dispatch as any).origen_provincia) || 
                                      (type === 'despachos' && (dispatch as any).destino_provincia)) && (
                                      <div className={`text-[9px] font-bold uppercase tracking-wide truncate ${
                                        estaExpirado ? 'text-gray-200' : estaCompletado ? 'text-green-400/70' : estaDemorado ? 'text-orange-300' : 'text-cyan-400'
                                      }`}>
                                        {type === 'recepciones' 
                                          ? (dispatch as any).origen_provincia
                                          : (dispatch as any).destino_provincia
                                        }
                                      </div>
                                    )}
                                    {/* Cliente/Ubicación ABAJO */}
                                    <div className={`flex items-center gap-0.5 text-[9px] truncate ${
                                      estaExpirado ? 'text-gray-200' : estaCompletado ? 'text-green-200/60' : estaDemorado ? 'text-orange-200' : 'text-slate-200'
                                    }`}>
                                      <MapPinIcon className="h-2.5 w-2.5 flex-shrink-0" />
                                      <span className="truncate font-medium">
                                        {type === 'recepciones' 
                                          ? (dispatch.origen || 'N/A')  // Recepciones: mostrar ORIGEN
                                          : (dispatch.destino || 'N/A') // Despachos: mostrar DESTINO
                                        }
                                      </span>
                                    </div>
                                  </div>

                                  {/* Transporte */}
                                  {dispatch.transporte_data && (
                                    <div className={`flex items-center gap-0.5 text-[9px] truncate ${
                                      estaExpirado ? 'text-gray-200' : estaCompletado ? 'text-green-300/60' : estaDemorado ? 'text-orange-300' : 'text-emerald-300'
                                    }`}>
                                      <TruckIcon className="h-2.5 w-2.5 flex-shrink-0" />
                                      <span className="truncate">{dispatch.transporte_data.nombre}</span>
                                    </div>
                                  )}

                                  {/* Chofer y Camión */}
                                  {(dispatch.chofer || dispatch.camion_data) && (
                                    <div className={`text-[9px] truncate ${
                                      estaExpirado ? 'text-gray-200' : estaCompletado ? 'text-green-300/60' : estaDemorado ? 'text-orange-200' : 'text-blue-300'
                                    }`}>
                                      <span className="truncate">
                                        {dispatch.chofer?.nombre_completo?.split(' ')[0] || ''}
                                        {dispatch.chofer && dispatch.camion_data && ' - '}
                                        {dispatch.camion_data?.patente || ''}
                                      </span>
                                    </div>
                                  )}

                                  {/* Estado */}
                                  <div className="mt-0.5">
                                    {/* 🔥 Badge de estado operativo */}
                                    {(estaExpirado || estaDemorado) && (
                                      <span className={`text-[8px] px-1 py-0.5 rounded text-white font-semibold block text-center mb-0.5 ${
                                        estaExpirado ? 'bg-red-600' : 'bg-orange-600'
                                      }`}>
                                        {estaExpirado ? '❌ EXPIRADO' : '⏰ DEMORADO'}
                                      </span>
                                    )}
                                    {/* Badge de estado normal */}
                                    <span className={`text-[8px] px-1 py-0.5 rounded ${getStatusColor(dispatch.estado)} text-white font-semibold block text-center`}>
                                      {getStatusLabel(dispatch.estado)}
                                    </span>
                                  </div>
                                </div> {/* FIN del contenedor con pointer-events-none */}

                                {/* 🔥 Ícono flotante de reloj para viajes demorados - DEBAJO del pin de ubicación */}
                                {estaDemorado && (
                                  <div 
                                    className="absolute bottom-8 right-1 bg-orange-500 rounded-full p-1 z-50 pointer-events-none shadow-lg" 
                                    title="Viaje demorado"
                                    style={{ zIndex: 999 }}
                                  >
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}

                                {/* Indicador de drag */}
                                {isDraggable && (
                                  <div className="absolute bottom-0 right-0 text-slate-400 group-hover:text-cyan-400 transition-colors opacity-50 pointer-events-none">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                                      <circle cx="8" cy="6" r="1.5"/>
                                      <circle cx="8" cy="12" r="1.5"/>
                                      <circle cx="8" cy="18" r="1.5"/>
                                      <circle cx="16" cy="6" r="1.5"/>
                                      <circle cx="16" cy="12" r="1.5"/>
                                      <circle cx="16" cy="18" r="1.5"/>
                                    </svg>
                                  </div>
                                )}

                                {/* Botón de ubicación - completamente deshabilitado en elementos draggables */}
                                {!isDraggable && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewLocation(dispatch);
                                    }}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-cyan-400 p-1 rounded-full hover:bg-cyan-700/50 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto"
                                    title="Ver en Mapa"
                                  >
                                    <MapPinIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                                )
                              })
                          ) : (
                            <div 
                              className={`w-full flex items-center justify-center text-gray-600 text-xs transition-all rounded
                                ${isDropTarget ? 'min-h-[100px] border-2 border-dashed border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold' : isDragging ? 'min-h-[75px]' : 'min-h-[40px]'}
                                ${isDropZone && !isDropTarget ? 'border-2 border-dashed border-cyan-500/30' : ''}
                              `}
                              onDragOver={handleDragOver}
                              onDragEnter={(e) => handleDragEnter(e, day, time)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day, time)}
                            >
                              {isDropTarget && '⬇️ Soltar aquí'}
                              {isDropZone && !isDropTarget && ''}
                            </div>
                          )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })
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
                  <label className="text-xs text-gray-400 uppercase">Camión</label>
                  <p className="text-white">
                    {selectedDispatch.camion_data 
                      ? `${selectedDispatch.camion_data.patente} - ${selectedDispatch.camion_data.marca || ''} ${selectedDispatch.camion_data.modelo || ''}`.trim()
                      : 'Sin asignar'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Chofer</label>
                  <p className="text-white">{selectedDispatch.chofer?.nombre_completo || 'Sin asignar'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Teléfono Chofer</label>
                  <p className="text-white">{selectedDispatch.chofer?.telefono || 'N/A'}</p>
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

      {/* Modal de Confirmación de Reprogramación */}
      {showRescheduleModal && rescheduleData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1b273b] rounded-lg shadow-xl max-w-md w-full border border-cyan-700">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                📅 Confirmar Reprogramación
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Viaje</div>
                  <div className="text-white font-semibold">{rescheduleData.dispatch.pedido_id}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Fecha Actual</div>
                    <div className="text-white">{rescheduleData.dispatch.scheduled_local_date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Nueva Fecha</div>
                    <div className="text-cyan-400 font-semibold">{rescheduleData.newDate}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Hora Actual</div>
                    <div className="text-white">{rescheduleData.dispatch.scheduled_local_time || 'Sin hora'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Nueva Hora</div>
                    <div className="text-cyan-400 font-semibold">{rescheduleData.newTime}</div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Ruta</div>
                  <div className="text-sm text-white">{rescheduleData.dispatch.origen} → {rescheduleData.dispatch.destino}</div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-300">
                  ⚠️ Esta acción actualizará la fecha y hora del viaje.
                  {rescheduleData.dispatch.transport_id && ' El transporte asignado será notificado.'}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setRescheduleData(null);
                  }}
                  disabled={rescheduling}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReschedule}
                  disabled={rescheduling}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {rescheduling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Reprogramando...
                    </>
                  ) : (
                    '✓ Confirmar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlanningGrid;