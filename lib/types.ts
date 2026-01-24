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

export type TipoEmpresa = 'planta' | 'transporte' | 'cliente' | 'admin' | 'sistema';

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
  sistema: ['admin_nodexia', 'coordinador', 'supervisor', 'administrativo'],
};

/**
 * Labels amigables para tipos de empresa
 */
export const TIPO_EMPRESA_LABELS: Record<TipoEmpresa, string> = {
  planta: 'Planta',
  transporte: 'Empresa de Transporte',
  cliente: 'Cliente',
  admin: 'Administración',
  sistema: 'Sistema (Nodexia)',
};

/**
 * Función para obtener el nombre de rol según contexto
 * Migración 022: Nombres contextuales
 */
export function getRolDisplayName(rol: RolInterno, tipoEmpresa: TipoEmpresa): string {
  const contextualLabels: Record<RolInterno, Partial<Record<TipoEmpresa, string>>> = {
    admin_nodexia: { admin: 'Administrador Nodexia', sistema: 'Administrador Nodexia' },
    coordinador: { 
      planta: 'Coordinador de Planta', 
      transporte: 'Coordinador de Transporte',
      cliente: 'Coordinador',
      admin: 'Coordinador',
      sistema: 'Coordinador General'
    },
    supervisor: { 
      planta: 'Supervisor de Carga', 
      transporte: 'Supervisor de Flota',
      cliente: 'Supervisor',
      admin: 'Supervisor',
      sistema: 'Supervisor General'
    },
    control_acceso: { planta: 'Control de Acceso' },
    chofer: { transporte: 'Chofer' },
    administrativo: { 
      planta: 'Administrativo Planta', 
      transporte: 'Administrativo Transporte',
      cliente: 'Administrativo',
      admin: 'Administrativo',
      sistema: 'Administrativo Nodexia'
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

// =====================
// Estados DUALES del Sistema (Migración 015 V2 - 10 Ene 2026)
// =====================

/**
 * Estados de la CARGA (Producto + Documentación) - 17 estados
 * Refleja el ciclo de vida del producto desde planificación hasta entrega
 * Basado en: Excel "Flujo de Estados" - 10 Ene 2026
 * Patrón: Uber Freight / Amazon Relay
 */
export type EstadoCargaViaje = 
  // FASE 1: PLANIFICACIÓN
  | 'pendiente_asignacion'      // Despacho creado, esperando asignación de transporte
  | 'transporte_asignado'       // Transporte asignado por coordinador planta
  
  // FASE 2: ASIGNACIÓN RECURSOS
  | 'camion_asignado'           // Camión y chofer asignados
  
  // FASE 3: TRÁNSITO A ORIGEN
  | 'en_transito_origen'        // Chofer viajando hacia planta de carga
  
  // FASE 4: OPERACIÓN EN ORIGEN
  | 'en_playa_origen'           // En planta esperando proceso de carga
  | 'llamado_carga'             // Supervisor llamó al camión para cargar
  | 'cargando'                  // Proceso de carga en progreso
  | 'cargado'                   // Carga completada
  
  // FASE 5: EGRESO Y TRÁNSITO
  | 'egresado_origen'           // Control acceso autorizó salida de planta
  | 'en_transito_destino'       // Viajando hacia destino
  
  // FASE 6: OPERACIÓN EN DESTINO
  | 'arribado_destino'          // Chofer arribó a destino
  | 'llamado_descarga'          // Supervisor destino llamó a descarga
  | 'descargando'               // Proceso de descarga en progreso
  | 'entregado'                 // Producto entregado y documentado
  
  // FASE 7: FINALIZACIÓN
  | 'disponible'                // Transición antes del cierre
  
  // ESTADOS FINALES
  | 'completado'                // ✅ Viaje completado exitosamente (estado final)
  | 'cancelado'                 // Viaje cancelado
  | 'expirado';                 // Viaje expirado (sin recursos a tiempo)

/**
 * Estados de la UNIDAD (Chofer + Camión) - 17 estados
 * Refleja la ubicación física y operación del vehículo
 * Basado en: Excel "Flujo de Estados" - 10 Ene 2026
 * 
 * ⚠️ IMPORTANTE: La unidad termina en 'disponible' (estado final REUTILIZABLE).
 * Cuando se asigna a un nuevo viaje, pasa de 'disponible' → 'camion_asignado' (nuevo ciclo).
 * Los estados 'cancelado', 'expirado', 'incidencia' son finales NO reutilizables.
 */
export type EstadoUnidadViaje = 
  // FASE 1: ASIGNACIÓN
  | 'camion_asignado'           // Camión y chofer asignados
  
  // FASE 2: TRÁNSITO A ORIGEN
  | 'en_transito_origen'        // Viajando hacia planta de carga
  
  // FASE 3: OPERACIÓN EN ORIGEN
  | 'ingresado_origen'          // Control acceso registró ingreso
  | 'en_playa_origen'           // En playa de espera
  | 'llamado_carga'             // Llamado a posición de carga
  | 'cargando'                  // En proceso de carga
  
  // FASE 4: EGRESO
  | 'egreso_origen'             // Egresando de planta
  
  // FASE 5: TRÁNSITO A DESTINO
  | 'en_transito_destino'       // Viajando a destino
  
  // FASE 6: OPERACIÓN EN DESTINO
  | 'arribado_destino'          // Arribó a destino
  | 'ingresado_destino'         // Control acceso destino registró ingreso
  | 'llamado_descarga'          // Llamado a descarga
  | 'descargando'               // En proceso de descarga
  | 'vacio'                     // Camión vacío
  
  // FASE 7: FINALIZACIÓN (Estado final reutilizable)
  | 'disponible'                // ✅ ESTADO FINAL: Disponible para reasignación a nuevo viaje
  
  // ESTADOS FINALES NO REUTILIZABLES
  | 'cancelado'                 // Viaje cancelado (no reutilizable)
  | 'expirado'                  // Viaje expirado (no reutilizable)
  | 'incidencia';               // En resolución de incidencia (no reutilizable)

// DEPRECATED - Mantener por compatibilidad temporal
export type EstadoViajeDespacho = EstadoUnidadViaje;

/**
 * Interface base de viaje con estados duales (Migración 015 V2 - 10 Ene 2026)
 */
export interface ViajeDespacho {
  id: UUID;
  despacho_id: UUID;
  numero_viaje: number;
  transport_id?: UUID;
  camion_id?: UUID;
  acoplado_id?: UUID;
  chofer_id?: UUID;
  
  // ESTADOS DUALES (Migración 015 V2 - 10 Ene 2026)
  estado_carga: EstadoCargaViaje;     // Estado del producto/documentación (17 estados)
  estado_unidad?: EstadoUnidadViaje;  // Estado físico del camión/chofer (17 estados) - NULL si no hay unidad
  estado?: EstadoViajeDespacho;       // DEPRECATED: usar estado_carga y estado_unidad
  
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
 * Tipos de incidencia en viajes (Migración 015 V2 - 10 Ene 2026)
 * Basado en: SQL migrations/015_sistema_estados_duales_v2.sql
 */
export type TipoIncidenciaViaje = 
  | 'faltante_carga'           // Producto faltante en carga/descarga
  | 'rechazo_carga'            // Carga rechazada por calidad
  | 'demora_excesiva'          // Retraso significativo
  | 'documentacion_incorrecta' // Problemas con remito/carta porte
  | 'averia_camion'            // Problema mecánico
  | 'accidente'                // Accidente de tránsito
  | 'otro';                    // Otros casos

/**
 * Severidad de la incidencia
 */
export type SeveridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';

/**
 * Estado de resolución de incidencia
 */
export type EstadoResolucionIncidencia = 
  | 'reportada'      // Recién reportada
  | 'en_revision'    // Siendo analizada
  | 'en_resolucion'  // En proceso de resolución
  | 'resuelta'       // Resuelta
  | 'cerrada';       // Cerrada (viaje continúa o se cancela)

/**
 * Interface de incidencia en viaje (tabla: incidencias)
 * Las incidencias NO son estados del viaje, son registros separados
 */
export interface IncidenciaViaje {
  id: UUID;
  viaje_id: UUID;
  
  // Clasificación
  tipo_incidencia: TipoIncidenciaViaje;
  severidad: SeveridadIncidencia;
  estado_incidencia: EstadoResolucionIncidencia;
  
  // Descripción
  titulo: string;
  descripcion?: string;
  
  // Impacto
  bloquea_viaje: boolean;
  requiere_cancelacion: boolean;
  
  // Actor que reporta
  reportado_por_user_id?: UUID;
  reportado_por_rol?: string;  // 'chofer', 'supervisor', etc.
  
  // Resolución
  resuelto_por_user_id?: UUID;
  resolucion?: string;
  fecha_resolucion?: Timestamp;
  
  // Timestamps
  created_at: Timestamp;
  updated_at?: Timestamp;
  
  // Relaciones populadas
  viaje?: ViajeDespacho;
}

// Vista completa de viajes (para reportes)
// =====================
// Nuevas tablas de Estados Duales (21 Nov 2025)
// Interfaces que representan las TABLAS (records en DB)
// Los TYPES arriba representan los VALUES posibles
// =====================

export interface EstadoUnidadViajeRecord {
  id: UUID;
  viaje_id: UUID;
  estado_unidad: EstadoUnidadViaje; // <-- usa el TYPE, no la interface
  
  // Timestamps de transiciones (20 estados)
  fecha_creacion: Timestamp;
  fecha_asignacion?: Timestamp;
  fecha_confirmacion_chofer?: Timestamp;
  fecha_inicio_transito_origen?: Timestamp;
  fecha_arribo_origen?: Timestamp;
  fecha_ingreso_planta?: Timestamp;
  fecha_ingreso_playa?: Timestamp;
  fecha_inicio_proceso_carga?: Timestamp;
  fecha_cargado?: Timestamp;
  fecha_egreso_planta?: Timestamp;
  fecha_inicio_transito_destino?: Timestamp;
  fecha_arribo_destino?: Timestamp;
  fecha_ingreso_destino?: Timestamp;
  fecha_llamado_descarga?: Timestamp;
  fecha_inicio_descarga?: Timestamp;
  fecha_vacio?: Timestamp;
  fecha_egreso_destino?: Timestamp;
  fecha_disponible_carga?: Timestamp;
  fecha_viaje_completado?: Timestamp;
  fecha_cancelacion?: Timestamp;
  
  // GPS Tracking
  ubicacion_actual_lat?: number;
  ubicacion_actual_lon?: number;
  ultima_actualizacion_gps?: Timestamp;
  velocidad_actual_kmh?: number;
  
  // Cancelación
  cancelado_por?: UUID;
  motivo_cancelacion?: string;
  
  observaciones_unidad?: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface EstadoCargaViajeRecord {
  id: UUID;
  viaje_id: UUID;
  estado_carga: EstadoCargaViaje; // <-- usa el TYPE, no la interface
  
  // Timestamps de transiciones (17 estados)
  fecha_creacion: Timestamp;
  fecha_planificacion?: Timestamp;
  fecha_documentacion_preparada?: Timestamp;
  fecha_llamado_carga?: Timestamp;
  fecha_posicionado_carga?: Timestamp;
  fecha_iniciando_carga?: Timestamp;
  fecha_cargando?: Timestamp;
  fecha_carga_completada?: Timestamp;
  fecha_documentacion_validada?: Timestamp;
  fecha_en_transito?: Timestamp;
  fecha_arribado_destino?: Timestamp;
  fecha_iniciando_descarga?: Timestamp;
  fecha_descargando?: Timestamp;
  fecha_descargado?: Timestamp;
  fecha_entregado?: Timestamp;
  fecha_cancelacion?: Timestamp;
  
  // Datos de carga
  producto?: string;
  peso_estimado_kg?: number;
  peso_real_kg?: number;
  cantidad_bultos?: number;
  temperatura_carga?: number;
  
  // Documentación
  remito_numero?: string;
  remito_url?: string;
  carta_porte_url?: string;
  certificado_calidad_url?: string;
  documentacion_adicional?: any[]; // JSONB array
  
  // Faltantes/Rechazos
  tiene_faltante: boolean;
  detalle_faltante?: string;
  peso_faltante_kg?: number;
  tiene_rechazo: boolean;
  detalle_rechazo?: string;
  
  // Cancelación
  cancelado_por?: UUID;
  motivo_cancelacion?: string;
  
  observaciones_carga?: string;
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
export interface VistaEstadoViajeCompleto {
  viaje_id: UUID;
  despacho_id: UUID;
  numero_despacho: string;
  numero_viaje: number;
  
  // Estado UNIDAD
  estado_unidad: EstadoUnidadViaje;
  fecha_asignacion?: Timestamp;
  fecha_confirmacion_chofer?: Timestamp;
  fecha_arribo_origen?: Timestamp;
  fecha_unidad_carga_ok?: Timestamp;
  fecha_egreso_origen?: Timestamp;
  fecha_arribo_destino?: Timestamp;
  fecha_viaje_completado?: Timestamp;
  ubicacion_actual_lat?: number;
  ubicacion_actual_lon?: number;
  ultima_actualizacion_gps?: Timestamp;
  velocidad_actual_kmh?: number;
  observaciones_unidad?: string;
  
  // Estado CARGA
  estado_carga: EstadoCargaViaje;
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
export interface VistaViajeDespacho extends VistaEstadoViajeCompleto {
  estado: EstadoViajeDespacho; // Mapea a estado_unidad
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