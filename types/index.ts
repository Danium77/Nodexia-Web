// types/index.ts
// Central export for all type definitions

// Common types
export * from './common';

// Business domain types  
export * from './business';

// Network and SuperAdmin types are available through direct imports
// to avoid naming conflicts. Use:
// import { Empresa } from '@/types/network';
// import { PlanSuscripcion } from '@/types/superadmin';