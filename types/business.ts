// types/business.ts
// Business domain specific types

import { BaseEntity } from './common';

// Transport and Fleet types
export interface Transporte extends BaseEntity {
  nombre: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  localidad?: string;
  activo: boolean;
}

export interface Camion extends BaseEntity {
  numero_movil: string;
  patente: string;
  marca: string;
  modelo: string;
  año?: number;
  activo: boolean;
  profile_id: string;
}

export interface Acoplado extends BaseEntity {
  numero: string;
  patente: string;
  marca: string;
  modelo: string;
  año?: number;
  activo: boolean;
  profile_id: string;
}

export interface Chofer extends BaseEntity {
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  email?: string;
  licencia_numero?: string;
  licencia_vencimiento?: string;
  activo: boolean;
  profile_id: string;
}

// Client types
export interface Cliente extends BaseEntity {
  razon_social: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  localidad?: string;
  activo: boolean;
  profile_id: string;
}

// Dispatch types
export interface Despacho extends BaseEntity {
  pedido_id?: string;
  origen: string;
  destino: string;
  fecha_programada?: string;
  fecha_real?: string;
  estado: 'pendiente' | 'en_transito' | 'entregado' | 'cancelado';
  observaciones?: string;
  scheduled_at?: string;
  scheduled_local_date?: string;
  scheduled_local_time?: string;
  transport_id?: string;
  driver_id?: string;
  // Relations
  chofer?: Chofer;
  camion?: Camion;
  cliente?: Cliente;
  transporte_data?: { nombre?: string };
}

// Incident types
export interface Incidencia extends BaseEntity {
  tipo: string;
  descripcion?: string;
  severidad: 'info' | 'alerta' | 'critica';
  estado: 'abierta' | 'en_progreso' | 'resuelta' | 'cerrada';
  despacho_id?: string;
  usuario_id: string;
  fecha_resolucion?: string;
  // Relations
  despacho?: Despacho;
}

// Form input types for creation/updates
export interface CamionCreateInput {
  numero_movil: string;
  patente: string;
  marca: string;
  modelo: string;
  año?: number;
  profile_id: string;
}

export interface CamionUpdateInput extends Partial<CamionCreateInput> {
  activo?: boolean;
}

export interface AcopladoCreateInput {
  numero: string;
  patente: string;
  marca: string;
  modelo: string;
  año?: number;
  profile_id: string;
}

export interface AcopladoUpdateInput extends Partial<AcopladoCreateInput> {
  activo?: boolean;
}

export interface ClienteCreateInput {
  razon_social: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  localidad?: string;
  profile_id: string;
}

export interface ClienteUpdateInput extends Partial<ClienteCreateInput> {
  activo?: boolean;
}