// components/Planning/PlanningAlerts.tsx
import React, { useMemo } from 'react';
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  TruckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface Dispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  scheduled_local_date?: string;
  scheduled_local_time?: string;
  prioridad?: string;
  transport_id?: string;
  driver_id?: string;
  truck_id?: string;
  transporte_data?: { nombre: string };
}

interface Alert {
  id: string;
  type: 'conflict' | 'warning' | 'info';
  title: string;
  message: string;
  dispatches: string[];
}

interface PlanningAlertsProps {
  dispatches: Dispatch[];
  onDismiss?: (alertId: string) => void;
}

const PlanningAlerts: React.FC<PlanningAlertsProps> = ({ dispatches, onDismiss }) => {
  const alerts = useMemo(() => {
    const alertsList: Alert[] = [];

    // 1. Detectar conflictos de horario (mismo transporte, mismo horario)
    const transporteSchedule: Record<string, Dispatch[]> = {};
    
    dispatches.forEach(d => {
      if (d.transport_id && d.scheduled_local_date && d.scheduled_local_time) {
        const key = `${d.transport_id}_${d.scheduled_local_date}_${d.scheduled_local_time}`;
        if (!transporteSchedule[key]) {
          transporteSchedule[key] = [];
        }
        transporteSchedule[key].push(d);
      }
    });

    Object.entries(transporteSchedule).forEach(([key, items]) => {
      if (items.length > 1) {
        const transporteName = items[0]?.transporte_data?.nombre || 'Transporte';
        const fecha = items[0]?.scheduled_local_date;
        const hora = items[0]?.scheduled_local_time;
        
        alertsList.push({
          id: `conflict_${key}`,
          type: 'conflict',
          title: '⚠️ Conflicto de Horario',
          message: `${transporteName} tiene ${items.length} viajes asignados el ${fecha} a las ${hora}`,
          dispatches: items.map(i => i.pedido_id)
        });
      }
    });

    // 2. Viajes urgentes sin transporte asignado
    const urgentesNoAsignados = dispatches.filter(
      d => (d.prioridad === 'Urgente' || d.prioridad === 'Alta') && !d.transport_id
    );

    if (urgentesNoAsignados.length > 0) {
      alertsList.push({
        id: 'urgent_no_transport',
        type: 'warning',
        title: '🔴 Viajes Urgentes Sin Asignar',
        message: `Hay ${urgentesNoAsignados.length} viaje(s) de alta prioridad sin transporte asignado`,
        dispatches: urgentesNoAsignados.map(d => d.pedido_id)
      });
    }

    // 3. Viajes próximos (hoy) sin chofer/camión (solo si tienen transporte asignado)
    const hoy = new Date().toISOString().split('T')[0];
    const hoyIncompletos = dispatches.filter(
      d => d.scheduled_local_date === hoy && 
           d.transport_id && 
           (!d.driver_id) && 
           (!d.truck_id)
    );

    if (hoyIncompletos.length > 0) {
      alertsList.push({
        id: 'today_incomplete',
        type: 'warning',
        title: '⏰ Viajes de Hoy Incompletos',
        message: `${hoyIncompletos.length} viaje(s) programados para hoy sin chofer o camión asignado`,
        dispatches: hoyIncompletos.map(d => d.pedido_id)
      });
    }

    // 4. Viajes sin horario programado
    const sinHorario = dispatches.filter(
      d => d.estado === 'pendiente' && (!d.scheduled_local_date || !d.scheduled_local_time)
    );

    if (sinHorario.length > 0) {
      alertsList.push({
        id: 'no_schedule',
        type: 'info',
        title: 'ℹ️ Viajes Sin Programar',
        message: `${sinHorario.length} viaje(s) pendiente(s) sin fecha u hora asignada`,
        dispatches: sinHorario.map(d => d.pedido_id)
      });
    }

    return alertsList;
  }, [dispatches]);

  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'conflict':
        return {
          bg: 'bg-red-900/20',
          border: 'border-red-600',
          icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
        };
      case 'warning':
        return {
          bg: 'bg-orange-900/20',
          border: 'border-orange-600',
          icon: <ClockIcon className="h-5 w-5 text-orange-400" />
        };
      case 'info':
        return {
          bg: 'bg-blue-900/20',
          border: 'border-blue-600',
          icon: <TruckIcon className="h-5 w-5 text-blue-400" />
        };
    }
  };

  return (
    <div className="space-y-1 mb-2">
      {alerts.map(alert => {
        const styles = getAlertStyles(alert.type);
        
        return (
          <div
            key={alert.id}
            className={`${styles.bg} border ${styles.border} rounded p-1.5 flex items-start gap-1.5`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {styles.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-semibold text-white mb-0.5">
                {alert.title}
              </h4>
              <p className="text-[9px] text-gray-300 mb-1">
                {alert.message}
              </p>
              <div className="flex flex-wrap gap-1">
                {alert.dispatches.slice(0, 5).map(pedidoId => (
                  <span
                    key={pedidoId}
                    className="inline-block px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                  >
                    {pedidoId}
                  </span>
                ))}
                {alert.dispatches.length > 5 && (
                  <span className="inline-block px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                    +{alert.dispatches.length - 5} más
                  </span>
                )}
              </div>
            </div>

            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PlanningAlerts;
