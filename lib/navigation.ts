/**
 * Centralized navigation utilities for role-based routing
 * This ensures consistent navigation behavior across the entire app
 * MIGRADO A NUEVA ARQUITECTURA: planta/transporte/cliente
 */

import { RolInterno } from './types';

export type UserRole = RolInterno | 'super_admin' | 'admin'; // admin deprecated
export type NavigationContext = 'clientes' | 'choferes' | 'flota' | 'configuracion' | 'destinos' | 'origenes' | 'red_nodexia';

interface NavigationConfig {
  [key: string]: {
    [role in UserRole]?: string;
  } & { default?: string };
}

/**
 * Navigation mapping for different contexts and roles
 * ACTUALIZADO: coordinador (planta), coordinador_transporte (transporte)
 */
const NAVIGATION_MAP: NavigationConfig = {
  // Where to go when clicking "Volver" from entity detail pages
  back_from_clientes: {
    coordinador_transporte: '/transporte/configuracion',
    admin: '/configuracion/clientes',
    coordinador: '/configuracion/clientes',
    default: '/configuracion/clientes'
  },
  
  // Where to go when clicking "Gestionar" from cards
  gestionar_clientes: {
    coordinador_transporte: '/configuracion/clientes',
    admin: '/configuracion/clientes', 
    coordinador: '/configuracion/clientes',
    default: '/configuracion/clientes'
  },
  
  gestionar_choferes: {
    coordinador_transporte: '/transporte/choferes',
    admin: '/admin/choferes',
    coordinador: '/coordinador/choferes',
    default: '/transporte/choferes'
  },
  
  gestionar_flota: {
    coordinador_transporte: '/transporte/flota',
    admin: '/admin/flota',
    coordinador: '/coordinador/flota', 
    default: '/transporte/flota'
  },
  
  // Main configuration pages based on role
  main_configuracion: {
    coordinador_transporte: '/transporte/configuracion',
    admin: '/configuracion',
    coordinador: '/configuracion',
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
 * ACTUALIZADO: coordinador_transporte en lugar de transporte
 */
export function shouldRedirectUser(
  currentPath: string,
  userRoles: string[],
  isLoading: boolean = false
): { shouldRedirect: boolean; redirectTo?: string } {
  if (isLoading || userRoles.length === 0) {
    return { shouldRedirect: false };
  }
  
  // Users with only 'coordinador_transporte' role accessing general config should be redirected
  if (currentPath === '/configuracion' && 
      userRoles.includes('coordinador_transporte') && 
      !userRoles.includes('admin') && 
      !userRoles.includes('coordinador')) {
    return { 
      shouldRedirect: true, 
      redirectTo: '/transporte/configuracion' 
    };
  }
  
  // Add more redirect rules here as needed
  
  return { shouldRedirect: false };
}

/**
 * Utility to get the primary role (for UI decisions)
 * ACTUALIZADO: nuevo sistema de roles
 */
export function getPrimaryRole(roles: string[]): UserRole {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('control_acceso')) return 'control_acceso';
  if (roles.includes('supervisor_carga')) return 'supervisor_carga';
  if (roles.includes('coordinador')) return 'coordinador';
  if (roles.includes('coordinador_transporte')) return 'coordinador_transporte';
  if (roles.includes('chofer')) return 'chofer';
  if (roles.includes('administrativo')) return 'administrativo';
  if (roles.includes('visor')) return 'visor';
  
  // Default fallback
  return 'coordinador_transporte';
}

/**
 * Get the default dashboard route for a user role
 * ACTUALIZADO: dashboards diferenciados por tipo de empresa
 */
export function getDefaultDashboard(roles: string[]): string {
  if (roles.includes('super_admin')) return '/admin/super-admin-dashboard';
  if (roles.includes('coordinador')) return '/coordinator-dashboard'; // Coordinador de PLANTA
  if (roles.includes('control_acceso')) return '/control-acceso'; 
  if (roles.includes('supervisor_carga')) return '/supervisor-carga';
  if (roles.includes('coordinador_transporte')) return '/transporte/dashboard'; // Coordinador de TRANSPORTE
  if (roles.includes('chofer')) return '/chofer/viajes';
  if (roles.includes('administrativo')) return '/transporte/dashboard';
  if (roles.includes('visor')) return '/cliente/dashboard'; // Cliente solo visualiza
  
  return '/dashboard';
}

/**
 * Check if user has permission to access a specific route
 * ACTUALIZADO: permisos basados en roles nuevos
 */
export function hasRoutePermission(
  route: string, 
  userRoles: string[]
): boolean {
  // Super Admin can access everything
  if (userRoles.includes('super_admin')) return true;
  
  // Admin can access everything except super admin routes
  if (userRoles.includes('admin')) return true;
  
  // Super admin routes
  if (route.startsWith('/admin/super-admin')) {
    return userRoles.includes('super_admin');
  }
  
  // Route-specific permissions
  if (route.startsWith('/admin/')) {
    return userRoles.includes('admin') || userRoles.includes('super_admin');
  }
  
  if (route.startsWith('/transporte/')) {
    return userRoles.includes('coordinador_transporte') || 
           userRoles.includes('chofer') ||
           userRoles.includes('administrativo') ||
           userRoles.includes('admin');
  }
  
  if (route.startsWith('/planta/')) {
    return userRoles.includes('coordinador') || 
           userRoles.includes('control_acceso') ||
           userRoles.includes('supervisor_carga') ||
           userRoles.includes('admin');
  }
  
  // Red Nodexia accessible to plants and transports
  if (route.startsWith('/red-nodexia/')) {
    return userRoles.includes('coordinador') || 
           userRoles.includes('coordinador_transporte') ||
           userRoles.includes('admin');
  }
  
  // General configuracion routes
  if (route.startsWith('/configuracion/')) {
    return userRoles.length > 0; // Any authenticated user
  }
  
  return true; // Default allow
}