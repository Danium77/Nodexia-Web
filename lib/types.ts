/**
 * Centralized type definitions for the entire application
 * This ensures consistency across all components and reduces duplication
 */

// =====================
// Base types
// =====================

export type UUID = string;
export type Timestamp = string; // ISO string

// =====================
// Company & Role types (MIGRACIÓN COMPLETADA)
// =====================

import type { Empresa } from '../types/common';
export type TipoEmpresa = 'planta' | 'transporte' | 'cliente' | 'sistema';

/**
 * Roles internos por tipo de empresa
 * PLANTA: coordinador, control_acceso, supervisor_carga
 * TRANSPORTE: coordinador_transporte, chofer, administrativo
 * CLIENTE: visor
 */
export type RolInterno = 
  // Roles de Planta
  | 'coordinador' 
  | 'control_acceso' 
  | 'supervisor_carga'
  // Roles de Transporte
  | 'coordinador_transporte'
  | 'chofer'
  | 'administrativo'
  // Roles de Cliente
  | 'visor';

/**
 * Mapeo de roles válidos por tipo de empresa
 * Usado para validación en formularios y lógica de negocio
 */
export const ROLES_BY_TIPO: Record<TipoEmpresa, RolInterno[]> = {
  planta: ['coordinador', 'control_acceso', 'supervisor_carga'],
  transporte: ['coordinador_transporte', 'chofer', 'administrativo'],
  cliente: ['visor'],
  sistema: [], // Puedes agregar roles especiales aquí si los necesitas
};

/**
 * Labels amigables para tipos de empresa
 */
export const TIPO_EMPRESA_LABELS: Record<TipoEmpresa, string> = {
  planta: 'Planta',
  transporte: 'Empresa de Transporte',
  cliente: 'Cliente',
  sistema: 'Sistema',
};

/**
 * Labels amigables para roles
 */
export const ROL_INTERNO_LABELS: Record<RolInterno, string> = {
  coordinador: 'Coordinador',
  control_acceso: 'Control de Acceso',
  supervisor_carga: 'Supervisor de Carga',
  coordinador_transporte: 'Coordinador de Transporte',
  chofer: 'Chofer',
  administrativo: 'Administrativo',
  visor: 'Visor',
};

// DEPRECATED: Mantener por compatibilidad temporal
export type UserRole = RolInterno | 'admin' | 'super_admin';

// =====================
// User & Auth types
// =====================
import type { User } from '../types/common';
import type { Role } from '../types/common';

export interface ProfileUser {
  id: UUID;
  user_id: UUID;
  roles: UserRole[];
  created_at: Timestamp;
  updated_at?: Timestamp;
}

// =====================
// Company & User-Company Relationship types
// =====================

export interface Empresa {
  id: UUID;
  nombre: string;
  cuit: string;
  tipo_empresa: TipoEmpresa;
  direccion?: string;
  telefono?: string;
  email?: string;
  localidad?: string;
  provincia?: string;
  notas?: string;
  activo: boolean;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface UsuarioEmpresa {
  id: UUID;
  user_id: UUID;
  empresa_id: UUID;
  rol_interno: RolInterno;
  activo: boolean;
  fecha_asignacion: Timestamp;
  created_at: Timestamp;
  updated_at?: Timestamp;
  // Relaciones populadas
  empresa?: Empresa;
  usuario?: User;
}

export interface EmpresaCreateInput {
  nombre: string;
  cuit: string;
  tipo_empresa: TipoEmpresa;
  direccion?: string;
  telefono?: string;
  email?: string;
  localidad?: string;
  provincia?: string;
  notas?: string;
}

export interface EmpresaUpdateInput extends Partial<EmpresaCreateInput> {
  id: UUID;
  activo?: boolean;
}

// =====================
// Destination & Origin types (Nueva arquitectura)
// =====================

export interface Destino {
  id: UUID;
  nombre: string;
  razon_social?: string;
  cuit_destino?: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  horario_recepcion_desde?: string;
  horario_recepcion_hasta?: string;
  dias_recepcion?: string[];
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  requiere_turno: boolean;
  link_solicitud_turno?: string;
  observaciones_entrega?: string;
  tipo_carga_acepta?: string;
  capacidad_descarga_diaria?: number;
  tiempo_promedio_descarga_min?: number;
  empresa_cliente_id: UUID; // Link a empresa tipo 'cliente'
  empresa_creadora_id: UUID; // Quién creó el destino (planta)
  activo: boolean;
  created_at: Timestamp;
  updated_at?: Timestamp;
  // Relaciones
  empresa_cliente?: Empresa;
  empresa_creadora?: Empresa;
}

export interface Origen {
  id: UUID;
  codigo: string; // ÚNICO - para búsqueda por Admin
  nombre: string;
  tipo: 'planta' | 'deposito' | 'centro_distribucion';
  direccion: string;
  localidad: string;
  provincia: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  capacidad_almacenamiento_tn?: number;
  capacidad_carga_diaria_tn?: number;
  horario_carga_desde?: string;
  horario_carga_hasta?: string;
  dias_operacion?: string[];
  observaciones?: string;
  activo: boolean;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

// Vista de depósitos (subset de orígenes)
export type Deposito = Origen & { tipo: 'deposito' | 'centro_distribucion' };

// =====================
// Intermediate Table types (Relaciones Planta)
// =====================

export interface PlantaTransporte {
  id: UUID;
  planta_id: UUID;
  transporte_id: UUID;
  estado: 'activo' | 'pausado' | 'bloqueado';
  tarifa_acordada?: number;
  moneda?: string;
  es_preferido: boolean;
  prioridad?: number;
  observaciones?: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
  // Relaciones
  planta?: Empresa;
  transporte?: Empresa;
}

export interface PlantaOrigen {
  id: UUID;
  planta_id: UUID;
  origen_id: UUID;
  alias?: string; // Nombre personalizado por la planta
  es_origen_principal: boolean;
  observaciones?: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
  // Relaciones
  planta?: Empresa;
  origen?: Origen;
}

export interface PlantaDestino {
  id: UUID;
  planta_id: UUID;
  destino_id: UUID;
  es_destino_frecuente: boolean;
  observaciones?: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
  // Relaciones
  planta?: Empresa;
  destino?: Destino;
}

// =====================
// Red Nodexia types
// =====================

export type EstadoOfertaRed = 'borrador' | 'publicada' | 'tomada' | 'expirada' | 'cancelada';
export type UrgenciaOferta = 'baja' | 'media' | 'alta' | 'urgente';

export interface OfertaRedNodexia {
  id: UUID;
  despacho_id: UUID;
  empresa_planta_id: UUID;
  estado: EstadoOfertaRed;
  urgencia: UrgenciaOferta;
  tarifa_ofrecida?: number;
  moneda?: string;
  fecha_limite_respuesta?: Timestamp;
  observaciones_oferta?: string;
  visualizaciones: number;
  fecha_publicacion?: Timestamp;
  fecha_expiracion?: Timestamp;
  empresa_transporte_tomadora_id?: UUID;
  fecha_tomada?: Timestamp;
  created_at: Timestamp;
  updated_at?: Timestamp;
  // Relaciones
  despacho?: Despacho;
  planta?: Empresa;
  transporte_tomador?: Empresa;
}

export interface VisualizacionOferta {
  id: UUID;
  oferta_id: UUID;
  empresa_transporte_id: UUID;
  user_id: UUID;
  fecha_visualizacion: Timestamp;
  // Relaciones
  oferta?: OfertaRedNodexia;
  transporte?: Empresa;
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
  cliente_id: UUID; // DEPRECATED - usar destino_id
  destino_id?: UUID; // NUEVO - referencia a tabla destinos
  chofer_id?: UUID;
  chofer?: Chofer;
  vehiculo_id?: UUID;
  vehiculo?: Vehiculo;
  transport_id?: UUID; // Empresa de transporte asignada
  origen_id?: UUID; // Origen de carga
  estado: EstadoDespacho;
  fecha_programada: Timestamp;
  fecha_real_salida?: Timestamp;
  fecha_real_entrega?: Timestamp;
  observaciones?: string;
  usuario_alta: UUID;
  fecha_alta: Timestamp;
  fecha_modificacion?: Timestamp;
  // Campos para sistema de múltiples viajes (NUEVOS - Opción C)
  cantidad_viajes_solicitados?: number;
  cantidad_viajes_asignados?: number;
  cantidad_viajes_completados?: number;
  // Relaciones populadas
  cliente?: Cliente; // DEPRECATED
  destino?: Destino; // NUEVO
  transporte?: Empresa;
  origen?: Origen;
  viajes?: ViajeDespacho[]; // NUEVO - Lista de viajes del despacho
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
// Viajes Despacho types (NUEVO - Sistema Opción C)
// =====================

export type EstadoViajeDespacho = 
  | 'pendiente'
  | 'transporte_asignado'
  | 'camion_asignado'
  | 'confirmado'
  | 'en_transito'
  | 'en_planta'
  | 'esperando_carga'
  | 'cargando'
  | 'carga_completa'
  | 'en_ruta'
  | 'entregado'
  | 'completado'
  | 'cancelado'
  | 'incidencia';

export interface ViajeDespacho {
  id: UUID;
  despacho_id: UUID;
  numero_viaje: number;
  transport_id?: UUID;
  camion_id?: UUID;
  acoplado_id?: UUID;
  chofer_id?: UUID;
  estado: EstadoViajeDespacho;
  
  // Tracking temporal
  fecha_creacion: Timestamp;
  fecha_asignacion_transporte?: Timestamp;
  fecha_asignacion_camion?: Timestamp;
  fecha_confirmacion_chofer?: Timestamp;
  fecha_ingreso_planta?: Timestamp;
  fecha_llamado_carga?: Timestamp;
  fecha_inicio_carga?: Timestamp;
  fecha_fin_carga?: Timestamp;
  fecha_salida_planta?: Timestamp;
  fecha_llegada_destino?: Timestamp;
  fecha_confirmacion_entrega?: Timestamp;
  
  // Datos de carga
  producto?: string;
  peso_estimado?: number;
  peso_real?: number;
  unidad_medida?: string;
  
  // Documentación
  remito_numero?: string;
  remito_url?: string;
  carta_porte_url?: string;
  fotos_carga?: string[]; // Array de URLs
  documentacion_completa: boolean;
  
  // Observaciones
  observaciones?: string;
  notas_internas?: string;
  
  // Usuarios responsables
  asignado_por?: UUID;
  camion_asignado_por?: UUID;
  confirmado_por?: UUID;
  ingreso_registrado_por?: UUID;
  carga_supervisada_por?: UUID;
  salida_registrada_por?: UUID;
  entrega_confirmada_por?: UUID;
  
  // Metadatos
  created_at: Timestamp;
  updated_at?: Timestamp;
  
  // Relaciones populadas
  despacho?: Despacho;
  transporte?: Empresa;
  camion?: Camion;
  acoplado?: Acoplado;
  chofer?: Chofer;
  registros_acceso?: RegistroControlAcceso[];
  incidencias?: IncidenciaViaje[];
}

export type TipoMovimiento = 'ingreso' | 'egreso';

export interface RegistroControlAcceso {
  id: UUID;
  viaje_id: UUID;
  camion_id?: UUID;
  acoplado_id?: UUID;
  tipo_movimiento: TipoMovimiento;
  fecha_hora: Timestamp;
  patente_camion?: string;
  patente_acoplado?: string;
  registrado_por: UUID;
  observaciones?: string;
  foto_camion_url?: string;
  foto_acoplado_url?: string;
  temperatura_producto?: number;
  documentacion_ok: boolean;
  documentacion_observaciones?: string;
  created_at: Timestamp;
  
  // Relaciones populadas
  viaje?: ViajeDespacho;
  camion?: Camion;
  acoplado?: Acoplado;
}

export type TipoIncidenciaViaje = 
  | 'retraso'
  | 'averia_camion'
  | 'documentacion_faltante'
  | 'producto_danado'
  | 'accidente'
  | 'otro';

export type SeveridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';

export interface IncidenciaViaje {
  id: UUID;
  viaje_id: UUID;
  tipo_incidencia: TipoIncidenciaViaje;
  severidad: SeveridadIncidencia;
  estado: EstadoIncidencia; // Reutilizamos el tipo existente
  descripcion: string;
  resolucion?: string;
  fecha_incidencia: Timestamp;
  fecha_resolucion?: Timestamp;
  reportado_por: UUID;
  resuelto_por?: UUID;
  fotos_incidencia?: string[]; // Array de URLs
  created_at: Timestamp;
  updated_at?: Timestamp;
  
  // Relaciones populadas
  viaje?: ViajeDespacho;
}

// Vista completa de viajes (para reportes)
export interface VistaViajeDespacho {
  viaje_id: UUID;
  despacho_id: UUID;
  numero_despacho: string;
  numero_viaje: number;
  estado: EstadoViajeDespacho;
  transporte_nombre?: string;
  camion_patente?: string;
  camion_marca?: string;
  camion_modelo?: string;
  acoplado_patente?: string;
  chofer_nombre?: string;
  chofer_telefono?: string;
  origen?: string;
  destino?: string;
  fecha_creacion: Timestamp;
  fecha_asignacion_camion?: Timestamp;
  fecha_ingreso_planta?: Timestamp;
  fecha_salida_planta?: Timestamp;
  fecha_confirmacion_entrega?: Timestamp;
  horas_en_planta?: number;
  producto?: string;
  peso_estimado?: number;
  peso_real?: number;
  created_at: Timestamp;
  updated_at?: Timestamp;
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
  // Core entities
  Empresa: Empresa;
  UsuarioEmpresa: UsuarioEmpresa;
  Cliente: Cliente;
  Chofer: Chofer;
  Vehiculo: Vehiculo;
  Camion: Camion;
  Acoplado: Acoplado;
  Transporte: Transporte;
  Despacho: Despacho;
  Incidencia: Incidencia;
  // New architecture types
  Destino: Destino;
  Origen: Origen;
  Deposito: Deposito;
  PlantaTransporte: PlantaTransporte;
  PlantaOrigen: PlantaOrigen;
  PlantaDestino: PlantaDestino;
  OfertaRedNodexia: OfertaRedNodexia;
  VisualizacionOferta: VisualizacionOferta;
  // Sistema de viajes (Opción C)
  ViajeDespacho: ViajeDespacho;
  RegistroControlAcceso: RegistroControlAcceso;
  IncidenciaViaje: IncidenciaViaje;
  VistaViajeDespacho: VistaViajeDespacho;
};

export type CreateInputTypes = {
  Cliente: ClienteCreateInput;
  Chofer: ChoferCreateInput;
  Vehiculo: VehiculoCreateInput;
  Empresa: EmpresaCreateInput;
};

export type UpdateInputTypes = {
  Cliente: ClienteUpdateInput;
  Empresa: EmpresaUpdateInput;
};