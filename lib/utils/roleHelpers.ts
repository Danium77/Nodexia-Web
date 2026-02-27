/**
 * Helpers para gestión de roles con interpretación contextual
 * Los roles genéricos se interpretan según el tipo_empresa
 */

export type RolInterno = 
  | 'admin_nodexia'
  | 'coordinador'
  | 'coordinador_integral'
  | 'vendedor'
  | 'control_acceso'
  | 'chofer'
  | 'supervisor'
  | 'administrativo';

export type TipoEmpresa = 'planta' | 'transporte' | 'cliente' | 'sistema' | 'ambos';

export interface RolContexto {
  rol_interno: RolInterno | string;
  tipo_empresa: TipoEmpresa | string;
  empresa_nombre?: string;
}

/**
 * Obtiene el nombre de display del rol según el contexto
 */
export function getRolDisplayName(
  rol_interno: string, 
  tipo_empresa?: string
): string {
  const rol = rol_interno.toLowerCase();
  
  switch (rol) {
    case 'admin_nodexia':
      return 'Administrador Nodexia';
      
    case 'coordinador':
      switch (tipo_empresa) {
        case 'planta':
          return 'Coordinador de Planta';
        case 'transporte':
          return 'Coordinador de Transporte';
        case 'cliente':
          return 'Coordinador Comercial';
        default:
          return 'Coordinador';
      }
      
    case 'supervisor':
      switch (tipo_empresa) {
        case 'planta':
          return 'Supervisor de Carga';
        case 'transporte':
          return 'Supervisor de Flota';
        default:
          return 'Supervisor';
      }
      
    case 'control_acceso':
      return 'Control de Acceso';
      
    case 'chofer':
      return 'Chofer';

    case 'coordinador_integral':
      return 'Coordinador Integral (PyME)';

    case 'vendedor':
      return 'Vendedor';
      
    case 'administrativo':
      switch (tipo_empresa) {
        case 'planta':
          return 'Administrativo Planta';
        case 'transporte':
          return 'Administrativo Transporte';
        default:
          return 'Administrativo';
      }
      
    default:
      // Capitalizar primera letra para roles personalizados
      return rol.charAt(0).toUpperCase() + rol.slice(1);
  }
}

/**
 * Obtiene la ruta de dashboard según el rol y tipo de empresa
 */
export function getDashboardRoute(rol_interno: string, tipo_empresa?: string): string {
  const rol = rol_interno.toLowerCase();
  
  // Admin Nodexia siempre va a /admin
  if (rol === 'admin_nodexia') {
    return '/admin/dashboard';
  }
  
  // Coordinador según tipo de empresa
  if (rol === 'coordinador' || rol === 'coordinador_integral') {
    switch (tipo_empresa) {
      case 'transporte':
        return '/transporte/dashboard';
      case 'planta':
        return '/dashboard'; // Dashboard de planificación
      default:
        return '/dashboard';
    }
  }
  
  // Control de acceso
  if (rol === 'control_acceso') {
    return '/control-acceso';
  }
  
  // Chofer
  if (rol === 'chofer') {
    return '/chofer/viajes';
  }
  
  // Supervisor
  if (rol === 'supervisor') {
    switch (tipo_empresa) {
      case 'planta':
        return '/supervisor/carga';
      case 'transporte':
        return '/transporte/dashboard';
      default:
        return '/dashboard';
    }
  }
  
  // Administrativo
  if (rol === 'administrativo') {
    return '/dashboard';
  }
  
  // Default
  return '/dashboard';
}

/**
 * Verifica si un rol tiene un permiso específico
 */
export function tienePermiso(
  permisos: Record<string, boolean> | null | undefined,
  permiso: string
): boolean {
  if (!permisos) return false;
  return permisos[permiso] === true;
}

/**
 * Verifica si un rol puede acceder a una ruta específica
 */
export function puedeAccederRuta(
  rol_interno: string,
  tipo_empresa: string,
  ruta: string
): boolean {
  const rol = rol_interno.toLowerCase();
  
  // Admin Nodexia tiene acceso a todo
  if (rol === 'admin_nodexia') {
    return true;
  }
  
  // Control de acceso solo puede acceder a su módulo
  if (rol === 'control_acceso') {
    return ruta.startsWith('/control-acceso');
  }
  
  // Chofer solo puede acceder a su módulo
  if (rol === 'chofer') {
    return ruta.startsWith('/chofer');
  }
  
  // Supervisor de carga
  if (rol === 'supervisor' && tipo_empresa === 'planta') {
    return ruta.startsWith('/supervisor') || ruta.startsWith('/dashboard');
  }
  
  // Coordinador tiene acceso amplio según tipo empresa
  if (rol === 'coordinador' || rol === 'coordinador_integral') {
    if (tipo_empresa === 'transporte') {
      return !ruta.startsWith('/admin') && !ruta.startsWith('/control-acceso');
    }
    return !ruta.startsWith('/admin');
  }
  
  // Por defecto, denegar acceso a rutas restringidas
  return !ruta.startsWith('/admin');
}

/**
 * Obtiene el color del badge según el rol
 */
export function getRolColor(rol_interno: string): string {
  const rol = rol_interno.toLowerCase();
  
  const colores: Record<string, string> = {
    'admin_nodexia': 'bg-yellow-500',
    'coordinador': 'bg-blue-500',
    'coordinador_integral': 'bg-blue-600',
    'vendedor': 'bg-teal-500',
    'control_acceso': 'bg-green-500',
    'chofer': 'bg-orange-500',
    'supervisor': 'bg-purple-500',
    'administrativo': 'bg-gray-500'
  };
  
  return colores[rol] || 'bg-gray-400';
}

/**
 * Obtiene el icono del rol
 */
export function getRolIcon(rol_interno: string): string {
  const rol = rol_interno.toLowerCase();
  
  const iconos: Record<string, string> = {
    'admin_nodexia': '👑',
    'coordinador': '📋',
    'coordinador_integral': '📋',
    'vendedor': '💼',
    'control_acceso': '🛡️',
    'chofer': '🚚',
    'supervisor': '👁️',
    'administrativo': '📄'
  };
  
  return iconos[rol] || '👤';
}

/**
 * Valida si un rol es válido para un tipo de empresa
 */
export function esRolValidoParaEmpresa(
  rol_interno: string,
  tipo_empresa: string
): boolean {
  const rol = rol_interno.toLowerCase();
  
  // Admin Nodexia es válido para todos
  if (rol === 'admin_nodexia') {
    return true;
  }
  
  // Control de acceso solo para plantas
  if (rol === 'control_acceso') {
    return tipo_empresa === 'planta';
  }
  
  // Chofer solo para transportes
  if (rol === 'chofer') {
    return tipo_empresa === 'transporte';
  }
  
  // Roles genéricos válidos para todos
  if (['coordinador', 'coordinador_integral', 'vendedor', 'supervisor', 'administrativo'].includes(rol)) {
    return true;
  }
  
  // Roles personalizados: permitir
  return true;
}
