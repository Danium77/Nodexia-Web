/**
 * Centralized type definitions for the entire application
 * This ensures consistency across all components and reduces duplication
 *
 * REGLA: Los estados se definen ÚNICAMENTE en lib/estados/config.ts
 *        Este archivo re-exporta aliases de compatibilidad.
 */

// =====================
// Re-export: Estados centralizados (FUENTE DE VERDAD: lib/estados/config.ts)
// =====================
import { EstadoViaje, type EstadoViajeType } from './estados/config';
export { EstadoViaje, type EstadoViajeType };

// =====================
// Base types
// =====================

export type UUID = string;
export type Timestamp = string; // ISO string

// =====================
// Company & Role types (MIGRACIÓN COMPLETADA)
// =====================

export type TipoEmpresa = 'planta' | 'transporte' | 'cliente' | 'admin';

/**
 * Roles internos simplificados - Sistema unificado
 * Los roles se interpretan contextualmente según el tipo de empresa
 * Migración 022: Roles genéricos que se adaptan al contexto
 * 
 * ROLES BASE DEL SISTEMA:
 * - admin_nodexia: Administrador central (acceso total)
 * - coordinador: Coordinador (planta/transporte según contexto)
 * - control_acceso: Control de acceso (solo planta)
 * - chofer: Chofer (solo transporte)
 * - supervisor: Supervisor (carga/flota según contexto)
 * - administrativo: Administrativo (ambos tipos)
 */
export type RolInterno = 
  | 'admin_nodexia'      // Super admin global
  | 'coordinador'        // Coordinador genérico (planta o transporte)
  | 'control_acceso'     // Control de acceso (solo planta)
  | 'chofer'             // Chofer (solo transporte)
  | 'supervisor'         // Supervisor genérico (carga o flota)
  | 'administrativo'     // Administrativo (ambos)
  | 'visor';             // Visor (clientes)

/**
 * Mapeo de roles válidos por tipo de empresa
 * Los roles genéricos se adaptan al contexto
 */
export const ROLES_BY_TIPO: Record<TipoEmpresa, RolInterno[]> = {
  planta: ['coordinador', 'control_acceso', 'supervisor', 'administrativo'],
  transporte: ['coordinador', 'chofer', 'supervisor', 'administrativo'],
  cliente: ['visor'],
  admin: ['admin_nodexia'],
};

/**
 * Labels amigables para tipos de empresa
 */
export const TIPO_EMPRESA_LABELS: Record<TipoEmpresa, string> = {
  planta: 'Planta',
  transporte: 'Empresa de Transporte',
  cliente: 'Cliente',
  admin: 'Administración',
};

/**
 * Función para obtener el nombre de rol según contexto
 * Migración 022: Nombres contextuales
 */
export function getRolDisplayName(rol: RolInterno, tipoEmpresa: TipoEmpresa): string {
  const contextualLabels: Record<RolInterno, Partial<Record<TipoEmpresa, string>>> = {
    admin_nodexia: { admin: 'Administrador Nodexia' },
    coordinador: { 
      planta: 'Coordinador de Planta', 
      transporte: 'Coordinador de Transporte',
      cliente: 'Coordinador',
      admin: 'Coordinador'
    },
    supervisor: { 
      planta: 'Supervisor de Carga', 
      transporte: 'Supervisor de Flota',
      cliente: 'Supervisor',
      admin: 'Supervisor'
    },
    control_acceso: { planta: 'Control de Acceso' },
    chofer: { transporte: 'Chofer' },
    administrativo: { 
      planta: 'Administrativo Planta', 
      transporte: 'Administrativo Transporte',
      cliente: 'Administrativo',
      admin: 'Administrativo'
    },
    visor: { cliente: 'Visor' },
  };

  return contextualLabels[rol]?.[tipoEmpresa] || ROL_INTERNO_LABELS[rol] || rol;
}

/**
 * Labels base para roles (sin contexto)
 */
export const ROL_INTERNO_LABELS: Record<RolInterno, string> = {
  admin_nodexia: 'Administrador Nodexia',
  coordinador: 'Coordinador',
  control_acceso: 'Control de Acceso',
  supervisor: 'Supervisor',
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
  // NUEVO - 21 Nov 2025: Vinculación con usuario para app móvil
  user_id?: UUID | null;
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

export type EstadoDespacho = EstadoViajeType; // 1:1 con viaje — ya no tiene estado propio

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
  estado: EstadoViajeType; // 1:1 — espejo del estado del viaje
  fecha_programada: Timestamp;
  fecha_real_salida?: Timestamp;
  fecha_real_entrega?: Timestamp;
  observaciones?: string;
  usuario_alta: UUID;
  fecha_alta: Timestamp;
  fecha_modificacion?: Timestamp;
  // 1:1 — un despacho tiene UN viaje
  /** @deprecated Ya no hay múltiples viajes — usar viaje directamente */
  cantidad_viajes_solicitados?: number;
  /** @deprecated Ya no hay múltiples viajes */
  cantidad_viajes_asignados?: number;
  /** @deprecated Ya no hay múltiples viajes */
  cantidad_viajes_completados?: number;
  // Relaciones populadas
  cliente?: Cliente; // DEPRECATED
  destino?: Destino; // NUEVO
  transporte?: Empresa;
  origen?: Origen;
  viaje?: ViajeDespacho;               // 1:1 relación
  /** @deprecated Usar `viaje` (1:1) */
  viajes?: ViajeDespacho[];
}

// =====================
// Incident types (tabla canónica: incidencias_viaje)
// =====================

/** @deprecated Usar TipoIncidenciaViaje */
export type TipoIncidencia = TipoIncidenciaViaje;

export type EstadoIncidencia = 
  | 'abierta' 
  | 'en_proceso' 
  | 'resuelta' 
  | 'cerrada';

/** @deprecated Usar IncidenciaViaje — tabla canónica es incidencias_viaje */
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

// =====================
// DEPRECATED: Estados duales eliminados — ahora hay UN solo estado por viaje
// Se mantienen aliases para compatibilidad durante migración
// FUENTE DE VERDAD: lib/estados/config.ts → EstadoViaje / EstadoViajeType
// =====================

/** @deprecated Usar EstadoViajeType de lib/estados/config.ts */
export type EstadoCargaViaje = EstadoViajeType;

/** @deprecated Usar EstadoViajeType de lib/estados/config.ts */
export type EstadoUnidadViaje = EstadoViajeType;

/** @deprecated Usar EstadoViajeType de lib/estados/config.ts */
export type EstadoViajeDespacho = EstadoViajeType;

/**
 * Interface base de viaje (Sistema 1:1 con despacho)
 * ESTADO ÚNICO — ya NO hay estados duales (carga/unidad por separado).
 * Un solo campo `estado` (= EstadoViajeType).
 */
export interface ViajeDespacho {
  id: UUID;
  despacho_id: UUID;
  numero_viaje: number;
  transport_id?: UUID;
  camion_id?: UUID;
  acoplado_id?: UUID;
  chofer_id?: UUID;
  
  // ESTADO ÚNICO (lib/estados/config.ts)
  estado: EstadoViajeType;             // Estado actual del viaje
  /** @deprecated Alias de `estado` — usar `estado` directamente */
  estado_carga?: EstadoViajeType;
  /** @deprecated Alias de `estado` — usar `estado` directamente */
  estado_unidad?: EstadoViajeType;
  
  // Multi-destino: parada actual (tabla paradas)
  parada_actual?: number;              // Orden de la parada actual (1..4)
  
  // CAMPOS DE REPROGRAMACIÓN (Migración 016 - 10 Ene 2026)
  fue_expirado?: boolean;                   // Si alguna vez estuvo en estado expirado
  fecha_expiracion_original?: Timestamp;    // Primera fecha en que expiró
  cantidad_reprogramaciones?: number;       // Contador de veces reprogramado
  motivo_reprogramacion?: string;           // Razón de la última reprogramación
  
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

/**
 * Tipos de incidencia en viajes (tabla canónica: incidencias_viaje)
 * Sincronizado con CHECK constraint de BD (migración 064)
 */
export type TipoIncidenciaViaje = 
  | 'retraso'                  // Demora en llegada o salida
  | 'averia_camion'            // Problema mecánico del vehículo
  | 'documentacion_faltante'   // Falta documentación requerida
  | 'producto_danado'          // Daño en la mercadería
  | 'accidente'                // Accidente en ruta o planta
  | 'demora'                   // Demora genérica
  | 'problema_mecanico'        // Falla mecánica en planta
  | 'problema_carga'           // Error durante carga/descarga
  | 'ruta_bloqueada'           // Ruta cortada o impedida
  | 'clima_adverso'            // Condiciones climáticas adversas
  | 'otro';                    // Otros casos

/**
 * Severidad de la incidencia
 */
export type SeveridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';

/** @deprecated Usar EstadoIncidencia */
export type EstadoResolucionIncidencia = EstadoIncidencia;

/**
 * Documento afectado por una incidencia de documentación
 */
export interface DocumentoAfectado {
  doc_id?: string;
  tipo: string;
  entidad_tipo: 'chofer' | 'camion' | 'acoplado';
  entidad_id: string;
  problema: 'faltante' | 'vencido' | 'rechazado' | 'pendiente';
}

/**
 * Interface de incidencia en viaje (tabla canónica: incidencias_viaje)
 * Las incidencias NO son estados del viaje, son registros separados
 */
export interface IncidenciaViaje {
  id: UUID;
  viaje_id: UUID;
  
  // Clasificación
  tipo_incidencia: TipoIncidenciaViaje;
  severidad: SeveridadIncidencia;
  estado: EstadoIncidencia;
  
  // Descripción
  descripcion: string;
  
  // Documentación afectada (cuando tipo = documentacion_faltante)
  documentos_afectados?: DocumentoAfectado[];
  
  // Fotos (URLs en storage)
  fotos_incidencia?: string[];
  
  // Actor que reporta
  reportado_por: UUID;
  
  // Resolución
  resuelto_por?: UUID;
  resolucion?: string;
  fecha_resolucion?: Timestamp;
  fecha_incidencia: Timestamp;
  
  // Timestamps
  created_at: Timestamp;
  updated_at?: Timestamp;
  
  // Relaciones populadas (joins opcionales)
  viaje?: ViajeDespacho;
  reportado_por_nombre?: string;
  resuelto_por_nombre?: string;
  numero_viaje?: string;
  despacho_pedido_id?: string;
}

// =====================
// DEPRECATED: Registros de estado dual — ya no se usan
// Se mantienen vacíos para compatibilidad de imports existentes
// =====================

/** @deprecated Estados duales eliminados — usar EstadoViajeType */
export interface EstadoUnidadViajeRecord {
  id: UUID;
  viaje_id: UUID;
  estado_unidad: EstadoViajeType;
  fecha_creacion: Timestamp;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

/** @deprecated Estados duales eliminados — usar EstadoViajeType */
export interface EstadoCargaViajeRecord {
  id: UUID;
  viaje_id: UUID;
  estado_carga: EstadoViajeType;
  fecha_creacion: Timestamp;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface HistorialUbicacion {
  id: UUID;
  viaje_id: UUID;
  chofer_id?: UUID;
  latitud: number;
  longitud: number;
  precision_metros?: number;
  altitud_metros?: number;
  velocidad_kmh?: number;
  rumbo_grados?: number;
  estado_unidad_momento?: string;
  fecha_registro: Timestamp;
  dispositivo_info?: any; // JSONB
  created_at: Timestamp;
}

export type TipoNotificacion = 
  | 'viaje_asignado'
  | 'llamado_carga'
  | 'viaje_cancelado'
  | 'incidencia_reportada'
  | 'demora_detectada'
  | 'documentacion_rechazada'
  | 'viaje_completado'
  | 'otro';

export interface Notificacion {
  id: UUID;
  user_id: UUID;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  datos_adicionales?: any; // JSONB
  viaje_id?: UUID;
  despacho_id?: UUID;
  leida: boolean;
  fecha_lectura?: Timestamp;
  enviada_push: boolean;
  fecha_envio_push?: Timestamp;
  token_fcm?: string;
  created_at: Timestamp;
}

// Vista unificada de estados (para dashboards)
/** @deprecated Simplificar — usar ViajeDespacho con estado único */
export interface VistaEstadoViajeCompleto {
  viaje_id: UUID;
  despacho_id: UUID;
  numero_despacho: string;
  numero_viaje: number;
  
  // Estado ÚNICO
  estado: EstadoViajeType;
  /** @deprecated */
  estado_unidad?: EstadoViajeType;
  /** @deprecated */
  estado_carga?: EstadoViajeType;
  fecha_planificacion?: Timestamp;
  fecha_documentacion_preparada?: Timestamp;
  fecha_carga_producto_ok?: Timestamp;
  fecha_documentacion_validada?: Timestamp;
  fecha_descargado?: Timestamp;
  fecha_completado?: Timestamp;
  producto?: string;
  peso_estimado_kg?: number;
  peso_real_kg?: number;
  remito_numero?: string;
  tiene_faltante: boolean;
  tiene_rechazo: boolean;
  observaciones_carga?: string;
  
  // Datos relacionados
  transporte_nombre?: string;
  camion_patente?: string;
  camion_marca?: string;
  camion_modelo?: string;
  acoplado_patente?: string;
  chofer_nombre?: string;
  chofer_telefono?: string;
  chofer_user_id?: UUID;
  
  // KPIs calculados
  horas_en_planta?: number;
  minutos_de_carga?: number;
  
  created_at: Timestamp;
  updated_at?: Timestamp;
}

// DEPRECATED - Mantener por compatibilidad
/** @deprecated Usar ViajeDespacho con estado único */
export interface VistaViajeDespacho extends VistaEstadoViajeCompleto {
  estado: EstadoViajeType;
  fecha_asignacion_camion?: Timestamp;
  fecha_ingreso_planta?: Timestamp;
  fecha_salida_planta?: Timestamp;
  fecha_confirmacion_entrega?: Timestamp;
  origen?: string;
  destino?: string;
  peso_estimado?: number;
  peso_real?: number;
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