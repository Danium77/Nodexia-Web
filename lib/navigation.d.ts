/**
 * Centralized navigation utilities for role-based routing
 * This ensures consistent navigation behavior across the entire app
 * MIGRACIÓN 022: Sistema de roles unificado
 */
import { RolInterno } from './types';
export type UserRole = RolInterno | 'admin_nodexia';
export type NavigationContext = 'clientes' | 'choferes' | 'flota' | 'configuracion' | 'destinos' | 'origenes' | 'red_nodexia';
/**
 * Get navigation URL based on user role and context
 */
export declare function getNavigationUrl(context: string, userRole: UserRole | string, fallback?: string): string;
/**
 * Role-based redirect logic for pages
 * MIGRACIÓN 022: Sistema de roles unificado
 */
export declare function shouldRedirectUser(currentPath: string, userRoles: string[], isLoading?: boolean): {
    shouldRedirect: boolean;
    redirectTo?: string;
};
/**
 * Utility to get the primary role (for UI decisions)
 * MIGRACIÓN 022: Roles unificados
 */
export declare function getPrimaryRole(roles: string[]): UserRole;
/**
 * Get the default dashboard route for a user role
 * MIGRACIÓN 022: Dashboards determinados por rol y tipo de empresa
 */
export declare function getDefaultDashboard(roles: string[], tipoEmpresa?: string): string;
/**
 * Check if user has permission to access a specific route
 * MIGRACIÓN 022: Permisos basados en roles unificados
 */
export declare function hasRoutePermission(route: string, userRoles: string[]): boolean;
