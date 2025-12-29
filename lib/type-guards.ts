/**
 * Type Guards - Utilidades para verificación de tipos en runtime
 * MIGRACIÓN 022: Roles unificados
 */

import type { UserRole } from '@/types/missing-types';

/**
 * Verifica si un valor es un rol de usuario válido
 */
export function isUserRole(value: unknown): value is UserRole {
  const validRoles: UserRole[] = [
    'admin_nodexia',
    'coordinador',
    'supervisor',
    'control_acceso',
    'chofer',
    'administrativo'
  ];
  return typeof value === 'string' && validRoles.includes(value as UserRole);
}

/**
 * Verifica si un objeto tiene una propiedad específica
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * Verifica si un valor no es null ni undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Verifica si un array contiene elementos
 */
export function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
  return array.length > 0;
}

/**
 * Extrae valor seguro con fallback
 */
export function safeValue<T>(value: T | null | undefined, fallback: T): T {
  return isDefined(value) ? value : fallback;
}

/**
 * Verifica si un objeto tiene la estructura esperada de Empresa
 */
export function isEmpresa(obj: any): obj is { id: string; nombre: string; tipo_empresa: string } {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.nombre === 'string' &&
    typeof obj.tipo_empresa === 'string'
  );
}
