/**
 * Helpers para validación de estados y transiciones
 * Incluye mapeo de colores, labels y lógica de negocio
 */
import type { EstadoUnidadViaje, EstadoCargaViaje, RolInterno } from '../types';
export declare const ESTADOS_UNIDAD_COLORS: Record<EstadoUnidadViaje, string>;
export declare const ESTADOS_UNIDAD_LABELS: Record<EstadoUnidadViaje, string>;
export declare const ESTADOS_CARGA_COLORS: Record<EstadoCargaViaje, string>;
export declare const ESTADOS_CARGA_LABELS: Record<EstadoCargaViaje, string>;
/**
 * Roles autorizados para actualizar cada estado de unidad
 */
export declare const ROLES_AUTORIZADOS_UNIDAD: Record<EstadoUnidadViaje, RolInterno[] | 'AUTOMATIC'>;
/**
 * Roles autorizados para actualizar cada estado de carga
 */
export declare const ROLES_AUTORIZADOS_CARGA: Record<EstadoCargaViaje, RolInterno[] | 'AUTOMATIC'>;
/**
 * Verifica si un rol puede actualizar un estado de unidad
 */
export declare function puedeActualizarEstadoUnidad(rol: RolInterno, estado: EstadoUnidadViaje): boolean;
/**
 * Verifica si un rol puede actualizar un estado de carga
 */
export declare function puedeActualizarEstadoCarga(rol: RolInterno, estado: EstadoCargaViaje): boolean;
/**
 * Filtra estados de unidad que el rol puede actualizar
 */
export declare function filtrarEstadosUnidadPorRol(rol: RolInterno, estados: EstadoUnidadViaje[]): EstadoUnidadViaje[];
/**
 * Filtra estados de carga que el rol puede actualizar
 */
export declare function filtrarEstadosCargaPorRol(rol: RolInterno, estados: EstadoCargaViaje[]): EstadoCargaViaje[];
/**
 * Identifica si un estado es automático
 */
export declare function esEstadoAutomatico(tipo: 'unidad' | 'carga', estado: EstadoUnidadViaje | EstadoCargaViaje): boolean;
/**
 * Obtiene el color para un estado de unidad
 */
export declare function getColorEstadoUnidad(estado: EstadoUnidadViaje): string;
/**
 * Obtiene el label para un estado de unidad
 */
export declare function getLabelEstadoUnidad(estado: EstadoUnidadViaje): string;
/**
 * Obtiene el color para un estado de carga
 */
export declare function getColorEstadoCarga(estado: EstadoCargaViaje): string;
/**
 * Obtiene el label para un estado de carga
 */
export declare function getLabelEstadoCarga(estado: EstadoCargaViaje): string;
/**
 * Calcula progreso del viaje (0-100)
 */
export declare function calcularProgresoViaje(estadoUnidad: EstadoUnidadViaje): number;
