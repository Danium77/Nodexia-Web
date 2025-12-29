/**
 * Helpers para gestión de roles con interpretación contextual
 * Los roles genéricos se interpretan según el tipo_empresa
 */
export type RolInterno = 'admin_nodexia' | 'coordinador' | 'control_acceso' | 'chofer' | 'supervisor' | 'administrativo';
export type TipoEmpresa = 'planta' | 'transporte' | 'cliente' | 'sistema' | 'ambos';
export interface RolContexto {
    rol_interno: RolInterno | string;
    tipo_empresa: TipoEmpresa | string;
    empresa_nombre?: string;
}
/**
 * Obtiene el nombre de display del rol según el contexto
 */
export declare function getRolDisplayName(rol_interno: string, tipo_empresa?: string): string;
/**
 * Obtiene la ruta de dashboard según el rol y tipo de empresa
 */
export declare function getDashboardRoute(rol_interno: string, tipo_empresa?: string): string;
/**
 * Verifica si un rol tiene un permiso específico
 */
export declare function tienePermiso(permisos: Record<string, boolean> | null | undefined, permiso: string): boolean;
/**
 * Verifica si un rol puede acceder a una ruta específica
 */
export declare function puedeAccederRuta(rol_interno: string, tipo_empresa: string, ruta: string): boolean;
/**
 * Obtiene el color del badge según el rol
 */
export declare function getRolColor(rol_interno: string): string;
/**
 * Obtiene el icono del rol
 */
export declare function getRolIcon(rol_interno: string): string;
/**
 * Valida si un rol es válido para un tipo de empresa
 */
export declare function esRolValidoParaEmpresa(rol_interno: string, tipo_empresa: string): boolean;
