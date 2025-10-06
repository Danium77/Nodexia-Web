/**
 * Centralized navigation utilities for role-based routing
 * This ensures consistent navigation behavior across the entire app
 */

export type UserRole = 'admin' | 'coordinador' | 'transporte' | 'control_acceso' | 'supervisor_carga' | 'chofer';
export type NavigationContext = 'clientes' | 'choferes' | 'flota' | 'configuracion';

interface NavigationConfig {
  [key: string]: {
    [role in UserRole]?: string;
  } & { default?: string };
}

/**
 * Navigation mapping for different contexts and roles
 */
const NAVIGATION_MAP: NavigationConfig = {
  // Where to go when clicking "Volver" from entity detail pages
  back_from_clientes: {
    transporte: '/transporte/configuracion',
    admin: '/configuracion/clientes',
    coordinador: '/configuracion/clientes',
    default: '/configuracion/clientes'
  },
  
  // Where to go when clicking "Gestionar" from cards
  gestionar_clientes: {
    transporte: '/configuracion/clientes',
    admin: '/configuracion/clientes', 
    coordinador: '/configuracion/clientes',
    default: '/configuracion/clientes'
  },
  
  gestionar_choferes: {
    transporte: '/transporte/choferes',
    admin: '/admin/choferes',
    coordinador: '/coordinador/choferes',
    default: '/transporte/choferes'
  },
  
  gestionar_flota: {
    transporte: '/transporte/flota',
    admin: '/admin/flota',
    coordinador: '/coordinador/flota', 
    default: '/transporte/flota'
  },
  
  // Main configuration pages based on role
  main_configuracion: {
    transporte: '/transporte/configuracion',
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
 */
export function shouldRedirectUser(
  currentPath: string,
  userRoles: string[],
  isLoading: boolean = false
): { shouldRedirect: boolean; redirectTo?: string } {
  if (isLoading || userRoles.length === 0) {
    return { shouldRedirect: false };
  }
  
  // Users with only 'transporte' role accessing general config should be redirected
  if (currentPath === '/configuracion' && 
      userRoles.includes('transporte') && 
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
 */
export function getPrimaryRole(roles: string[]): UserRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('control_acceso')) return 'control_acceso';
  if (roles.includes('supervisor_carga')) return 'supervisor_carga';
  if (roles.includes('coordinador')) return 'coordinador';
  if (roles.includes('chofer')) return 'chofer';
  if (roles.includes('transporte')) return 'transporte';
  
  // Default fallback
  return 'transporte';
}

/**
 * Check if user has permission to access a specific route
 */
export function hasRoutePermission(
  route: string, 
  userRoles: string[]
): boolean {
  // Admin can access everything
  if (userRoles.includes('admin')) return true;
  
  // Route-specific permissions
  if (route.startsWith('/admin/')) {
    return userRoles.includes('admin');
  }
  
  if (route.startsWith('/transporte/')) {
    return userRoles.includes('transporte') || userRoles.includes('admin');
  }
  
  if (route.startsWith('/coordinador/')) {
    return userRoles.includes('coordinador') || userRoles.includes('admin');
  }
  
  // General configuracion routes
  if (route.startsWith('/configuracion/')) {
    return userRoles.length > 0; // Any authenticated user
  }
  
  return true; // Default allow
}