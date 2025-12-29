import type { EstadoUnidadViaje, EstadoCargaViaje } from '../../lib/types';
interface EstadoDualBadgeProps {
    tipo: 'unidad' | 'carga';
    estado: EstadoUnidadViaje | EstadoCargaViaje;
    timestamp?: string | null;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}
export declare function EstadoDualBadge({ tipo, estado, timestamp, className, size }: EstadoDualBadgeProps): import("react").JSX.Element;
interface EstadosProgressBarProps {
    estadoUnidad: EstadoUnidadViaje;
    className?: string;
}
export declare function EstadosProgressBar({ estadoUnidad, className }: EstadosProgressBarProps): import("react").JSX.Element;
interface TimelineEstadosProps {
    tipo: 'unidad' | 'carga';
    estados: Array<{
        estado: string;
        timestamp: string | null;
        usuario?: string;
    }>;
    estadoActual: string;
}
export declare function TimelineEstados({ tipo, estados, estadoActual }: TimelineEstadosProps): import("react").JSX.Element;
export {};
