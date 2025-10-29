/**
 * Tipos Faltantes Identificados en el Testing
 * Este archivo define tipos que están siendo usados pero no definidos
 */

// Tipos de Flota
export interface Camion {
  id: string;
  patente: string;
  marca?: string;
  modelo?: string;
  año?: number;
  estado: 'activo' | 'mantenimiento' | 'inactivo';
  id_transporte: string;
  created_at?: string;
  updated_at?: string;
}

export interface Acoplado {
  id: string;
  patente: string;
  tipo: 'semi' | 'completo' | 'portacontenedor';
  estado: 'activo' | 'mantenimiento' | 'inactivo';
  id_transporte: string;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Empresa
export interface Empresa {
  id: string;
  nombre: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  tipo_empresa: 'coordinador' | 'transporte' | 'ambos';
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  configuracion_empresa?: ConfiguracionEmpresa;
}

export interface ConfiguracionEmpresa {
  id: string;
  id_empresa: string;
  tipo_instalacion: 'planta' | 'cliente';
  permite_recepcionar: boolean;
  permite_despachar: boolean;
  requiere_documentacion_especial: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Roles y Auth
export type UserRole = 'super_admin' | 'admin' | 'coordinador' | 'supervisor_carga' | 'control_acceso' | 'chofer';

export interface Role {
  id: string;
  name: UserRole;
  description?: string;
  permisos?: Record<string, boolean>;
}

export interface Usuario {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  roles?: Role[];
  empresas?: Empresa[];
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Viajes y Despachos
export interface Viaje {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  fecha_despacho?: string;
  id_transporte?: string;
  id_chofer?: string;
  id_camion?: string;
  id_acoplado?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

// Re-exportar tipos existentes si es necesario
export * from './superadmin';
export * from './network';
