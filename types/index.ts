// types/index.ts
// Barrel export — tipos organizados por dominio
//
// REGLA: Los tipos de estados están en lib/estados/config.ts
//        Los tipos de entidades están en lib/types.ts
//        Este folder contiene tipos de dominio específico.

// Common types (BaseEntity, ApiResponse, User, ComponentProps)
export * from './common';

// Domain-specific types (import directly for clarity):
//   import { ViajeRedCompleto } from '@/types/red-nodexia';
//   import { Ubicacion } from '@/types/ubicaciones';
//   import { PlanSuscripcion } from '@/types/superadmin';
//   import { RelacionEmpresa } from '@/types/network';