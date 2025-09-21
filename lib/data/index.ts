// lib/data/index.ts
export { BaseQuery } from './base';
export type { DataResult, PaginatedResult, DatabaseError } from './base';

export { ClientesData } from './clientes';
export { FlotaData } from './flota';
export { ChoferesData } from './choferes';
export { DespachosData } from './despachos';

// Re-export all types for convenience
export type * from '../types';