// components/Planning/PlanningGrid.tsx
import React, { useState, useMemo, useReducer } from 'react';
import { MapPinIcon, TruckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabaseClient';

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
  const [draggedDispatch, setDraggedDispatch] = useState<Dispatch | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{ dispatch: Dispatch; newDate: string; newTime: string } | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ day: string; time: string } | null>(null);
  
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

  // 🔥 NUEVO: Diagnóstico de estado de drag
  React.useEffect(() => {
    console.log('🔥 isDragging cambió a:', isDragging);
    console.log('🔥 draggedDispatch:', draggedDispatch?.pedido_id);
  }, [isDragging, draggedDispatch]);

  // 🔥 NUEVO: Diagnóstico de estado de drag
  React.useEffect(() => {
    console.log('🔥 isDragging cambió a:', isDragging);
    console.log('🔥 draggedDispatch:', draggedDispatch?.pedido_id);
  }, [isDragging, draggedDispatch]);

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
      'pendiente': '⏳ Pendiente',
      'camion_asignado': '🚛 Camión Asignado',
      'confirmado_chofer': '✅ Confirmado',
      'en_transito_origen': '🚚 → Origen',
      'arribo_origen': '📍 En Origen',
      'en_transito_destino': '🚚 → Destino',
      'arribo_destino': '📍 En Destino',
      'entregado': '✅ Entregado',
      'cancelado': '❌ Cancelado',
      // Compatibilidad con estados antiguos
      'Generado': '📋 Generado',
      'Asignado': '🚛 Asignado',
      'Confirmado': '✔️ Confirmado'
    };
    return labels[estado] || estado;
  };

  // 🔥 Funciones mejoradas para Drag & Drop
  const canBeDragged = (dispatch: Dispatch) => {
    // Permitir arrastrar TODOS los viajes excepto completados, cancelados y en tránsito activo
    const notAllowedStates = [
      'terminado',
      'completado', 
      'cancelado',
      'en_transito',
      'descargando',
      'descargado'
    ];
    const estado = dispatch.estado?.toLowerCase().trim() || '';
    const allowed = !notAllowedStates.includes(estado);
    console.log(`🔍 canBeDragged ${dispatch.pedido_id}: estado="${estado}", allowed=${allowed}`);
    return allowed;
  };

  const handleDragStart = (e: React.DragEvent, dispatch: Dispatch) => {
    console.log(`⚡ handleDragStart LLAMADO para ${dispatch.pedido_id}`);
    const dragAllowed = canBeDragged(dispatch);
    console.log(`🎬 handleDragStart ${dispatch.pedido_id}: dragAllowed=${dragAllowed}`);
    
    if (!dragAllowed) {
      console.log('❌ Drag no permitido, cancelando');
      e.preventDefault();
      return; // NO stopPropagation
    }
    
    // NO prevenir default ni detener propagación si está permitido
    console.log('✅ Iniciando drag de:', dispatch.pedido_id, 'ID:', dispatch.id);
    console.log('📝 Estado ANTES:', { isDragging, draggedDispatch: draggedDispatch?.id });
    
    // 🔥 CRÍTICO: Configurar dataTransfer ANTES de cambiar estados
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dispatch.id);
    
    // 🔥 NUEVO: Crear imagen de arrastre personalizada para evitar cancelación
    const dragImage = e.currentTarget as HTMLElement;
    if (dragImage) {
      e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);
    }
    
    // Actualizar estados DESPUÉS de configurar dataTransfer
    setDraggedDispatch(dispatch);
    setIsDragging(true);
    
    // 🔥 CRÍTICO: Forzar re-render inmediato del componente
    setTimeout(() => forceUpdate(), 0);
    
    console.log('📝 Estado configurado:', { nuevoIsDragging: true, nuevoDragged: dispatch.id });
    console.log('🚀 handleDragStart COMPLETADO para', dispatch.pedido_id);
  };

  const handleDragEnd = (_e: React.DragEvent) => {
    console.log('🏁 DRAG END - Limpiando estado');
    setIsDragging(false);
    setDraggedDispatch(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDragging || !draggedDispatch) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, dayName: string, timeSlot: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) {
      console.log(`📍 Drag entered: ${dayName} ${timeSlot}`);
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
    e.stopPropagation();
    
    console.log('💥 DROP detectado en:', dayName, timeSlot);
    
    setDropTarget(null);
    
    if (!draggedDispatch) {
      console.log('❌ No hay dispatch siendo arrastrado');
      setIsDragging(false);
      return;
    }

    // Obtener la nueva fecha basada en el día de la semana
    const newDate = weekDates[dayName];
    if (!newDate) {
      console.error('❌ No se encontró fecha para el día:', dayName);
      return;
    }

    const newDateStr = formatLocalDate(newDate);
    const newTimeStr = timeSlot;

    console.log('📅 Fecha actual:', draggedDispatch.scheduled_local_date, draggedDispatch.scheduled_local_time);
    console.log('📅 Nueva fecha:', newDateStr, newTimeStr);

    // Verificar si cambió realmente
    if (draggedDispatch.scheduled_local_date === newDateStr && 
        draggedDispatch.scheduled_local_time === newTimeStr) {
      console.log('ℹ️ Misma ubicación, cancelando');
      setDraggedDispatch(null);
      setIsDragging(false);
      return;
    }

    // Mostrar modal de confirmación
    console.log('✅ Mostrando modal de confirmación');
    setRescheduleData({
      dispatch: draggedDispatch,
      newDate: newDateStr,
      newTime: newTimeStr
    });
    setShowRescheduleModal(true);
    setDraggedDispatch(null);
    setIsDragging(false);
  };

  const confirmReschedule = async () => {
    if (!rescheduleData) return;

    try {
      setRescheduling(true);

      // Determinar el ID correcto (puede ser despacho_id o el ID si es un despacho directo)
      const despachoId = rescheduleData.dispatch.despacho_id || 
                        (rescheduleData.dispatch.id?.startsWith('despacho-') 
                          ? rescheduleData.dispatch.id.replace('despacho-', '') 
                          : rescheduleData.dispatch.id);

      console.log('📅 Reprogramando despacho:', despachoId, 'a', rescheduleData.newDate, rescheduleData.newTime);

      // Actualizar en la BD - tabla despachos
      const { error } = await supabase
        .from('despachos')
        .update({
          scheduled_local_date: rescheduleData.newDate,
          scheduled_local_time: rescheduleData.newTime
        })
        .eq('id', despachoId);

      if (error) throw error;

      console.log('✅ Viaje reprogramado exitosamente');
      
      // Cerrar modal
      setShowRescheduleModal(false);
      setRescheduleData(null);
      
      // Recargar datos
      if (onReschedule) {
        onReschedule();
      }
    } catch (error) {
      console.error('❌ Error reprogramando viaje:', error);
      alert('Error al reprogramar el viaje. Por favor, intenta nuevamente.');
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

  // 🔥 NUEVO: Generar franjas horarias fijas (cada hora de 06:00 a 22:00)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 22; hour++) {
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
    isDragging, 
    draggedDispatch: draggedDispatch?.pedido_id,
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700 text-[9px]">
            <thead className="bg-[#0a0e1a]">
              <tr>
                <th scope="col" className="px-0.5 py-0.5 text-left text-[8px] font-medium text-cyan-400 uppercase tracking-tighter sticky left-0 bg-[#0a0e1a] z-10 w-6">
                  ⏰ Hora
                </th>
                {daysOfWeek.map((day) => (
                  <th key={day} scope="col" className="px-0.5 py-0.5 text-center text-[8px] font-medium text-cyan-400 uppercase tracking-wider min-w-[45px] max-w-[45px]">
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
                    console.log(`📍 Renderizando celda ${time} (${timeIndex + 1}/${displayTimeSlots.length}), isDragging=${isDragging}`);
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
                            className={`w-full transition-all ${despachosInSlot.length > 0 || isDropZone ? 'min-h-[60px]' : 'min-h-[30px]'}`}
                          >
                            {despachosInSlot.length > 0 ? (
                              despachosInSlot.map(dispatch => {
                                const isBeingDragged = draggedDispatch?.id === dispatch.id;
                                const isDraggable = canBeDragged(dispatch);
                                
                                // Log solo UNA VEZ al renderizar
                                if (!(window as any)[`logged_${dispatch.id}`]) {
                                  console.log(`🎯 RENDER card ${dispatch.pedido_id}: isDraggable=${isDraggable}, HTML draggable="${isDraggable}", pedido_id: ${dispatch.pedido_id}, id: ${dispatch.id}`);
                                  (window as any)[`logged_${dispatch.id}`] = true;
                                }
                                
                                return (
                                  <div
                                    key={dispatch.id}
                                    draggable={isDraggable}
                                    data-draggable={isDraggable ? "true" : "false"}
                                    data-pedido={dispatch.pedido_id}
                                    onDragStart={(e) => {
                                      console.log(`🚀 onDragStart INLINE disparado para ${dispatch.pedido_id}`);
                                      console.log(`   isDraggable=${isDraggable}, estado="${dispatch.estado}"`);
                                      if (!isDraggable) {
                                        console.log(`❌ Cancelando drag INLINE - no permitido para ${dispatch.pedido_id}`);
                                        e.preventDefault();
                                        return;
                                      }
                                      console.log(`📞 Llamando a handleDragStart para ${dispatch.pedido_id}`);
                                      handleDragStart(e, dispatch);
                                      console.log(`✅ handleDragStart terminado para ${dispatch.pedido_id}`);
                                    }}
                                    onDragEnd={handleDragEnd}
                                    onClick={(_e) => {
                                      if (!isDragging) {
                                        handleViewDetail(dispatch);
                                      }
                                    }}
                                    className={`group relative p-1.5 rounded mb-1 last:mb-0 transition-all duration-200 border select-none
                                      ${getPriorityBorderColor(dispatch.prioridad)}
                                      bg-gradient-to-br ${getPriorityGradient(dispatch.prioridad)}
                                      ${isDraggable
                                        ? 'cursor-grab hover:cursor-grab active:cursor-grabbing hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1' 
                                        : 'cursor-not-allowed opacity-60'
                                      }
                                    ${selectedDispatch?.id === dispatch.id ? 'ring-2 ring-cyan-500' : ''}
                                    ${isBeingDragged ? 'opacity-80 scale-95 shadow-2xl ring-2 ring-cyan-400' : ''}
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
                                {/* CONTENEDOR INTERNO: user-select-none para que el drag funcione */}
                                <div 
                                  className="relative" 
                                  style={{ 
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    pointerEvents: 'none' // Esto hace que todos los clics pasen al padre
                                  }}
                                >
                                  {/* Destino */}
                                  <div className="flex items-center gap-0.5 text-[9px] text-cyan-300 truncate">
                                    <MapPinIcon className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate font-semibold">{dispatch.destino || 'N/A'}</span>
                                  </div>

                                  {/* Transporte */}
                                  {dispatch.transporte_data && (
                                    <div className="flex items-center gap-0.5 text-[9px] text-emerald-300 truncate">
                                      <TruckIcon className="h-2.5 w-2.5 flex-shrink-0" />
                                      <span className="truncate">{dispatch.transporte_data.nombre}</span>
                                    </div>
                                  )}

                                  {/* Chofer y Camión */}
                                  {(dispatch.chofer || dispatch.camion_data) && (
                                    <div className="text-[9px] text-blue-300 truncate">
                                      <span className="truncate">
                                        {dispatch.chofer?.nombre_completo?.split(' ')[0] || ''}
                                        {dispatch.chofer && dispatch.camion_data && ' - '}
                                        {dispatch.camion_data?.patente || ''}
                                      </span>
                                    </div>
                                  )}

                                  {/* Estado */}
                                  <div className="mt-0.5">
                                    <span className={`text-[8px] px-1 py-0.5 rounded ${getStatusColor(dispatch.estado)} text-white font-semibold block text-center`}>
                                      {getStatusLabel(dispatch.estado)}
                                    </span>
                                  </div>

                                {/* Indicador de drag */}
                                {isDraggable && (
                                  <div className="absolute bottom-0 right-0 text-slate-400 group-hover:text-cyan-400 transition-colors opacity-50">
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
                                </div> {/* FIN del contenedor con pointer-events-none */}

                                {/* Botón de ubicación - CON pointer-events-auto para que sea clickeable */}
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
                              </div>
                                );
                              })
                          ) : (
                            <div className={`w-full flex items-center justify-center text-gray-600 text-xs transition-all rounded
                              ${isDropTarget ? 'min-h-[100px] border-2 border-dashed border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold' : 'min-h-[40px]'}
                              ${isDropZone && !isDropTarget ? 'border-2 border-dashed border-cyan-500/30' : ''}
                            `}>
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