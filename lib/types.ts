/**
 * Centralized type definitions for the entire application
 * This ensures consistency across all components and reduces duplication
 */

// =====================
// Base types
// =====================

export type UUID = string;
export type Timestamp = string; // ISO string
export type UserRole = 'admin' | 'coordinador' | 'transporte' | 'control_acceso' | 'supervisor_carga' | 'chofer';

// =====================
// User & Auth types
// =====================

export interface User {
  id: UUID;
  email: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface ProfileUser {
  id: UUID;
  user_id: UUID;
  roles: UserRole[];
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface Role {
  id: UUID;
  name: UserRole;
  description?: string;
}

// =====================
// Client types
// =====================

export interface Cliente {
  id: UUID;
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion?: string;
  telefono: string;
  documentacion?: string[];
  id_transporte?: UUID | null;
  usuario_alta?: UUID | null;
  fecha_alta?: Timestamp;
  fecha_modificacion?: Timestamp;
}

export interface ClienteCreateInput {
  nombre: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion?: string;
  telefono: string;
  documentacion?: string[];
  id_transporte?: UUID;
}

export interface ClienteUpdateInput extends Partial<ClienteCreateInput> {
  id: UUID;
}

// =====================
// Vehicle types
// =====================

export interface Vehiculo {
  id: UUID;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number;
  foto_url?: string | null;
  id_transporte: UUID;
  usuario_alta?: UUID | null;
  fecha_alta?: Timestamp;
  fecha_modificacion?: Timestamp;
}

export interface Camion extends Vehiculo {
  tipo: 'camion';
  capacidad_carga?: number;
  tipo_combustible?: 'diesel' | 'gasolina' | 'electrico';
}

export interface Acoplado extends Vehiculo {
  tipo: 'acoplado';
  capacidad_volumen?: number;
  tipo_acoplado?: 'semi' | 'completo';
}

export interface VehiculoCreateInput {
  patente: string;
  marca: string;
  modelo: string;
  anio?: number;
  foto_url?: string;
  id_transporte: UUID;
  tipo?: 'camion' | 'acoplado';
}

// =====================
// Driver types
// =====================

export interface Chofer {
  id: UUID;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  email?: string;
  foto_url?: string | null;
  licencia_conducir?: string;
  fecha_vencimiento_licencia?: Timestamp;
  id_transporte: UUID;
  usuario_alta?: UUID | null;
  fecha_alta?: Timestamp;
  fecha_modificacion?: Timestamp;
}

export interface ChoferCreateInput {
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  email?: string;
  foto_url?: string;
  licencia_conducir?: string;
  fecha_vencimiento_licencia?: Timestamp;
  id_transporte: UUID;
}

// =====================
// Transport company types
// =====================

export interface Transporte {
  id: UUID;
  nombre: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email?: string;
  activo: boolean;
  fecha_alta?: Timestamp;
  fecha_modificacion?: Timestamp;
}

// =====================
// Dispatch types
// =====================

export type EstadoDespacho = 
  | 'pendiente' 
  | 'asignado' 
  | 'en_transito' 
  | 'entregado' 
  | 'cancelado';

export interface Despacho {
  id: UUID;
  numero_despacho: string;
  cliente_id: UUID;
  cliente?: Cliente;
  chofer_id?: UUID;
  chofer?: Chofer;
  vehiculo_id?: UUID;
  vehiculo?: Vehiculo;
  estado: EstadoDespacho;
  fecha_programada: Timestamp;
  fecha_real_salida?: Timestamp;
  fecha_real_entrega?: Timestamp;
  observaciones?: string;
  usuario_alta: UUID;
  fecha_alta: Timestamp;
  fecha_modificacion?: Timestamp;
}

// =====================
// Incident types
// =====================

export type TipoIncidencia = 
  | 'retraso' 
  | 'averia' 
  | 'accidente' 
  | 'documentacion' 
  | 'otro';

export type EstadoIncidencia = 
  | 'abierta' 
  | 'en_proceso' 
  | 'resuelta' 
  | 'cerrada';

export interface Incidencia {
  id: UUID;
  despacho_id: UUID;
  despacho?: Despacho;
  tipo: TipoIncidencia;
  estado: EstadoIncidencia;
  descripcion: string;
  fecha_incidente: Timestamp;
  resolucion?: string;
  fecha_resolucion?: Timestamp;
  usuario_reporte: UUID;
  usuario_resolucion?: UUID;
  fecha_alta: Timestamp;
  fecha_modificacion?: Timestamp;
}

// =====================
// Form & UI types
// =====================

export interface FormState<T = any> {
  data: T;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface FilterState {
  [key: string]: any;
}

// =====================
// API Response types
// =====================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface ApiListResponse<T = any> extends ApiResponse<T[]> {
  pagination?: PaginationState;
  filters?: FilterState;
}

// =====================
// Utility types
// =====================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// =====================
// Hook return types
// =====================

export interface UseEntityHook<T, CreateInput, UpdateInput> {
  items: T[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (input: CreateInput) => Promise<T | null>;
  update: (input: UpdateInput) => Promise<T | null>;
  delete: (id: UUID) => Promise<boolean>;
  clear: () => void;
}

// =====================
// Export collections for convenience
// =====================

export type EntityTypes = {
  Cliente: Cliente;
  Chofer: Chofer;
  Vehiculo: Vehiculo;
  Camion: Camion;
  Acoplado: Acoplado;
  Transporte: Transporte;
  Despacho: Despacho;
  Incidencia: Incidencia;
};

export type CreateInputTypes = {
  Cliente: ClienteCreateInput;
  Chofer: ChoferCreateInput;
  Vehiculo: VehiculoCreateInput;
};

export type UpdateInputTypes = {
  Cliente: ClienteUpdateInput;
};