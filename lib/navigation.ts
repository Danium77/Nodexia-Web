/**
 * Centralized navigation utilities for role-based routing
 * This ensures consistent navigation behavior across the entire app
 * MIGRACIÓN 022: Sistema de roles unificado
 */

import { RolInterno } from './types';

export type UserRole = RolInterno | 'admin_nodexia';
export type NavigationContext = 'clientes' | 'choferes' | 'flota' | 'configuracion' | 'destinos' | 'origenes' | 'red_nodexia';

interface NavigationConfig {
  [key: string]: {
    [role in UserRole]?: string;
  } & { default?: string };
}

/**
 * Navigation mapping for different contexts and roles
 * MIGRACIÓN 022: Roles unificados (coordinador funciona para planta y transporte)
 */
const NAVIGATION_MAP: NavigationConfig = {
  // Where to go when clicking "Volver" from entity detail pages
  back_from_clientes: {
    coordinador: '/configuracion/clientes',
    admin_nodexia: '/admin/usuarios',
    default: '/configuracion/clientes'
  },
  
  // Where to go when clicking "Gestionar" from cards
  gestionar_clientes: {
    coordinador: '/configuracion/clientes',
    admin_nodexia: '/admin/usuarios', 
    default: '/configuracion/clientes'
  },
  
  gestionar_choferes: {
    coordinador: '/transporte/choferes',
    admin_nodexia: '/admin/usuarios',
    default: '/transporte/choferes'
  },
  
  gestionar_flota: {
    coordinador: '/transporte/flota',
    admin_nodexia: '/admin/flota', 
    default: '/transporte/flota'
  },
  
  // Main configuration pages based on role
  main_configuracion: {
    coordinador: '/configuracion',
    admin_nodexia: '/admin/usuarios',
    default: '/configuracion'
  }
};

/**
 * Get navigation URL based on user role and context
 */
export function getNavigationUrl(
  context: string, 
  userRole: UserRole | string,
  fallback?: string
): string {
  const config = NAVIGATION_MAP[context];
  
  if (!config) {
    console.warn(`Navigation context '${context}' not found`);
    return fallback || '/';
  }
  
  // Try to get URL for specific role
  const roleUrl = config[userRole as UserRole];
  if (roleUrl) return roleUrl;
  
  // Fallback to default
  const defaultUrl = config.default;
  if (defaultUrl) return defaultUrl;
  
  // Final fallback
  return fallback || '/';
}

/**
 * Role-based redirect logic for pages
 * MIGRACIÓN 022: Sistema de roles unificado
 */
export function shouldRedirectUser(
  currentPath: string,
  userRoles: string[],
  isLoading: boolean = false
): { shouldRedirect: boolean; redirectTo?: string } {
  if (isLoading || userRoles.length === 0) {
    return { shouldRedirect: false };
  }
  
  // Coordinador role is context-aware (no redirects needed)
  // Each user context determines which dashboard/config to show
  
  return { shouldRedirect: false };
}

/**
 * Utility to get the primary role (for UI decisions)
 * MIGRACIÓN 022: Roles unificados
 */
export function getPrimaryRole(roles: string[]): UserRole {
  if (roles.includes('admin_nodexia')) return 'admin_nodexia';
  if (roles.includes('coordinador')) return 'coordinador';
  if (roles.includes('control_acceso')) return 'control_acceso';
  if (roles.includes('supervisor')) return 'supervisor';
  if (roles.includes('chofer')) return 'chofer';
  if (roles.includes('administrativo')) return 'administrativo';
  if (roles.includes('visor')) return 'visor';
  
  // Default fallback
  return 'coordinador';
}

/**
 * Get the default dashboard route for a user role
 * MIGRACIÓN 022: Dashboards determinados por rol y tipo de empresa
 */
export function getDefaultDashboard(roles: string[], tipoEmpresa?: string): string {
  if (roles.includes('admin_nodexia')) return '/admin/super-admin-dashboard';
  
  if (roles.includes('coordinador')) {
    // Coordinador se diferencia por tipo de empresa
    if (tipoEmpresa === 'transporte') return '/transporte/dashboard';
    return '/coordinator-dashboard'; // Planta por defecto
  }
  
  if (roles.includes('control_acceso')) return '/control-acceso'; 
  if (roles.includes('supervisor')) {
    // Supervisor también se diferencia por tipo
    if (tipoEmpresa === 'transporte') return '/transporte/dashboard';
    return '/supervisor-carga';
  }
  if (roles.includes('chofer')) return '/chofer-mobile';
  if (roles.includes('administrativo')) return '/dashboard';
  if (roles.includes('visor')) return '/cliente/dashboard';
  
  return '/dashboard';
}

/**
 * Check if user has permission to access a specific route
 * MIGRACIÓN 022: Permisos basados en roles unificados
 */
export function hasRoutePermission(
  route: string, 
  userRoles: string[]
): boolean {
  // Admin Nodexia can access everything
  if (userRoles.includes('admin_nodexia')) return true;
  
  // Super admin routes (solo admin_nodexia)
  if (route.startsWith('/admin/super-admin')) {
    return userRoles.includes('admin_nodexia');
  }
  
  // Admin routes
  if (route.startsWith('/admin/')) {
    return userRoles.includes('admin_nodexia');
  }
  
  // Transporte routes
  if (route.startsWith('/transporte/')) {
    return userRoles.includes('coordinador') || 
           userRoles.includes('chofer') ||
           userRoles.includes('supervisor') ||
           userRoles.includes('administrativo') ||
           userRoles.includes('admin_nodexia');
  }
  
  // Planta routes
  if (route.startsWith('/planta/')) {
    return userRoles.includes('coordinador') || 
           userRoles.includes('control_acceso') ||
           userRoles.includes('supervisor') ||
           userRoles.includes('admin_nodexia');
  }
  
  // Red Nodexia accessible to coordinators
  if (route.startsWith('/red-nodexia/')) {
    return userRoles.includes('coordinador') || 
           userRoles.includes('admin_nodexia');
  }
  
  // General configuracion routes
  if (route.startsWith('/configuracion/')) {
    return userRoles.length > 0; // Any authenticated user
  }
  
  return true; // Default allow
}