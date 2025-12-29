// components/ui/EstadoDualBadge.tsx
// Componente reutilizable para mostrar estados duales (unidad o carga)
import { getColorEstadoUnidad, getLabelEstadoUnidad, getColorEstadoCarga, getLabelEstadoCarga, calcularProgresoViaje } from '../../lib/helpers/estados-helpers';
export function EstadoDualBadge({ tipo, estado, timestamp, className = '', size = 'md' }) {
    const color = tipo === 'unidad'
        ? getColorEstadoUnidad(estado)
        : getColorEstadoCarga(estado);
    const label = tipo === 'unidad'
        ? getLabelEstadoUnidad(estado)
        : getLabelEstadoCarga(estado);
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
        : null;
    return (<div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`inline-flex items-center rounded-full font-semibold text-white ${color} ${sizeClasses[size]}`} title={formattedTime ? `Actualizado: ${formattedTime}` : undefined}>
        {label}
      </span>
      {formattedTime && (<span className="text-xs text-gray-500">
          {formattedTime}
        </span>)}
    </div>);
}
export function EstadosProgressBar({ estadoUnidad, className = '' }) {
    const progreso = calcularProgresoViaje(estadoUnidad);
    return (<div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">Progreso del viaje</span>
        <span className="text-xs font-semibold text-gray-900">{progreso}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out" style={{ width: `${progreso}%` }}/>
      </div>
    </div>);
}
export function TimelineEstados({ tipo, estados, estadoActual }) {
    return (<div className="space-y-3">
      {estados.map((item, index) => {
            const isActual = item.estado === estadoActual;
            const isPasado = item.timestamp !== null;
            const color = tipo === 'unidad'
                ? getColorEstadoUnidad(item.estado)
                : getColorEstadoCarga(item.estado);
            const label = tipo === 'unidad'
                ? getLabelEstadoUnidad(item.estado)
                : getLabelEstadoCarga(item.estado);
            return (<div key={item.estado} className="flex items-start gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 ${isPasado
                    ? `${color} border-white`
                    : 'bg-gray-200 border-gray-300'} ${isActual ? 'ring-4 ring-blue-200' : ''}`}/>
              {index < estados.length - 1 && (<div className={`w-0.5 h-8 ${isPasado ? 'bg-blue-400' : 'bg-gray-300'}`}/>)}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className={`font-medium ${isActual ? 'text-blue-700' : isPasado ? 'text-gray-900' : 'text-gray-500'}`}>
                {label}
              </div>
              {item.timestamp && (<div className="text-xs text-gray-500 mt-1">
                  {new Date(item.timestamp).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>)}
              {item.usuario && (<div className="text-xs text-gray-400 mt-0.5">
                  por {item.usuario}
                </div>)}
            </div>
          </div>);
        })}
    </div>);
}
