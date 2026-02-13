/**
 * BRIDGE: Re-exports from canonical sources
 * Este archivo existe solo para compatibilidad de imports existentes.
 * Importar directamente de @/lib/types o @/types/network o @/types/superadmin.
 */

// Re-export from canonical lib/types.ts
export type { RolInterno as UserRole } from '../lib/types';
export type { TipoEmpresa } from '../lib/types';

// Re-export domain-specific types
export * from './superadmin';
export * from './network';
