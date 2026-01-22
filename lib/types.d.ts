/**
 * Centralized type definitions for the entire application
 * This ensures consistency across all components and reduces duplication
 */
export type UUID = string;
export type Timestamp = string;
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
export type RolInterno = 'admin_nodexia' | 'coordinador' | 'control_acceso' | 'chofer' | 'supervisor' | 'administrativo' | 'visor';
/**
 * Mapeo de roles válidos por tipo de empresa
 * Los roles genéricos se adaptan al contexto
 */
export declare const ROLES_BY_TIPO: Record<TipoEmpresa, RolInterno[]>;
/**
 * Labels amigables para tipos de empresa
 */
export declare const TIPO_EMPRESA_LABELS: Record<TipoEmpresa, string>;
/**
 * Función para obtener el nombre de rol según contexto
 * Migración 022: Nombres contextuales
 */
export declare function getRolDisplayName(rol: RolInterno, tipoEmpresa: TipoEmpresa): string;
/**
 * Labels base para roles (sin contexto)
 */
export declare const ROL_INTERNO_LABELS: Record<RolInterno, string>;
export type UserRole = RolInterno | 'admin' | 'super_admin';
import type { User } from '../types/common';
export interface ProfileUser {
    id: UUID;
    user_id: UUID;
    roles: UserRole[];
    created_at: Timestamp;
    updated_at?: Timestamp;
}
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
    empresa_cliente_id: UUID;
    empresa_creadora_id: UUID;
    activo: boolean;
    created_at: Timestamp;
    updated_at?: Timestamp;
    empresa_cliente?: Empresa;
    empresa_creadora?: Empresa;
}
export interface Origen {
    id: UUID;
    codigo: string;
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
export type Deposito = Origen & {
    tipo: 'deposito' | 'centro_distribucion';
};
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
    planta?: Empresa;
    transporte?: Empresa;
}
export interface PlantaOrigen {
    id: UUID;
    planta_id: UUID;
    origen_id: UUID;
    alias?: string;
    es_origen_principal: boolean;
    observaciones?: string;
    created_at: Timestamp;
    updated_at?: Timestamp;
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
    planta?: Empresa;
    destino?: Destino;
}
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
    oferta?: OfertaRedNodexia;
    transporte?: Empresa;
}
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
export type EstadoDespacho = 'pendiente' | 'asignado' | 'en_transito' | 'entregado' | 'cancelado';
export interface Despacho {
    id: UUID;
    numero_despacho: string;
    cliente_id: UUID;
    destino_id?: UUID;
    chofer_id?: UUID;
    chofer?: Chofer;
    vehiculo_id?: UUID;
    vehiculo?: Vehiculo;
    transport_id?: UUID;
    origen_id?: UUID;
    estado: EstadoDespacho;
    fecha_programada: Timestamp;
    fecha_real_salida?: Timestamp;
    fecha_real_entrega?: Timestamp;
    observaciones?: string;
    usuario_alta: UUID;
    fecha_alta: Timestamp;
    fecha_modificacion?: Timestamp;
    cantidad_viajes_solicitados?: number;
    cantidad_viajes_asignados?: number;
    cantidad_viajes_completados?: number;
    cliente?: Cliente;
    destino?: Destino;
    transporte?: Empresa;
    origen?: Origen;
    viajes?: ViajeDespacho[];
}
export type TipoIncidencia = 'retraso' | 'averia' | 'accidente' | 'documentacion' | 'otro';
export type EstadoIncidencia = 'abierta' | 'en_proceso' | 'resuelta' | 'cerrada';
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
/**
 * Estados de la UNIDAD (Chofer + Camión)
 * Tracking logístico del vehículo
 */
export type EstadoUnidadViaje = 'pendiente' | 'asignado' | 'confirmado_chofer' | 'en_transito_origen' | 'arribado_origen' | 'en_playa_espera' | 'llamado_carga' | 'posicionado_carga' | 'carga_completada' | 'saliendo_origen' | 'en_transito_destino' | 'arribado_destino' | 'descarga_completada' | 'viaje_completado' | 'en_incidencia' | 'cancelado';
/**
 * Estados de la CARGA (Producto + Documentación)
 * Tracking operativo del producto
 */
export type EstadoCargaViaje = 'pendiente' | 'planificado' | 'documentacion_preparada' | 'en_proceso_carga' | 'cargado' | 'documentacion_validada' | 'en_transito' | 'en_proceso_descarga' | 'descargado' | 'documentacion_cierre' | 'completado' | 'con_faltante' | 'con_rechazo' | 'cancelado_sin_carga';
export type EstadoViajeDespacho = EstadoUnidadViaje;
export interface ViajeDespacho {
    id: UUID;
    despacho_id: UUID;
    numero_viaje: number;
    transport_id?: UUID;
    camion_id?: UUID;
    acoplado_id?: UUID;
    chofer_id?: UUID;
    estado: EstadoViajeDespacho;
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
    producto?: string;
    peso_estimado?: number;
    peso_real?: number;
    unidad_medida?: string;
    remito_numero?: string;
    remito_url?: string;
    carta_porte_url?: string;
    fotos_carga?: string[];
    documentacion_completa: boolean;
    observaciones?: string;
    notas_internas?: string;
    asignado_por?: UUID;
    camion_asignado_por?: UUID;
    confirmado_por?: UUID;
    ingreso_registrado_por?: UUID;
    carga_supervisada_por?: UUID;
    salida_registrada_por?: UUID;
    entrega_confirmada_por?: UUID;
    created_at: Timestamp;
    updated_at?: Timestamp;
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
    viaje?: ViajeDespacho;
    camion?: Camion;
    acoplado?: Acoplado;
}
export type TipoIncidenciaViaje = 'retraso' | 'averia_camion' | 'documentacion_faltante' | 'producto_danado' | 'accidente' | 'otro';
export type SeveridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';
export interface IncidenciaViaje {
    id: UUID;
    viaje_id: UUID;
    tipo_incidencia: TipoIncidenciaViaje;
    severidad: SeveridadIncidencia;
    estado: EstadoIncidencia;
    descripcion: string;
    resolucion?: string;
    fecha_incidencia: Timestamp;
    fecha_resolucion?: Timestamp;
    reportado_por: UUID;
    resuelto_por?: UUID;
    fotos_incidencia?: string[];
    created_at: Timestamp;
    updated_at?: Timestamp;
    viaje?: ViajeDespacho;
}
export interface EstadoUnidadViajeRecord {
    id: UUID;
    viaje_id: UUID;
    estado_unidad: EstadoUnidadViaje;
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
    ubicacion_actual_lat?: number;
    ubicacion_actual_lon?: number;
    ultima_actualizacion_gps?: Timestamp;
    velocidad_actual_kmh?: number;
    cancelado_por?: UUID;
    motivo_cancelacion?: string;
    observaciones_unidad?: string;
    created_at: Timestamp;
    updated_at?: Timestamp;
}
export interface EstadoCargaViajeRecord {
    id: UUID;
    viaje_id: UUID;
    estado_carga: EstadoCargaViaje;
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
    producto?: string;
    peso_estimado_kg?: number;
    peso_real_kg?: number;
    cantidad_bultos?: number;
    temperatura_carga?: number;
    remito_numero?: string;
    remito_url?: string;
    carta_porte_url?: string;
    certificado_calidad_url?: string;
    documentacion_adicional?: any[];
    tiene_faltante: boolean;
    detalle_faltante?: string;
    peso_faltante_kg?: number;
    tiene_rechazo: boolean;
    detalle_rechazo?: string;
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
    dispositivo_info?: any;
    created_at: Timestamp;
}
export type TipoNotificacion = 'viaje_asignado' | 'llamado_carga' | 'viaje_cancelado' | 'incidencia_reportada' | 'demora_detectada' | 'documentacion_rechazada' | 'viaje_completado' | 'otro';
export interface Notificacion {
    id: UUID;
    user_id: UUID;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string;
    datos_adicionales?: any;
    viaje_id?: UUID;
    despacho_id?: UUID;
    leida: boolean;
    fecha_lectura?: Timestamp;
    enviada_push: boolean;
    fecha_envio_push?: Timestamp;
    token_fcm?: string;
    created_at: Timestamp;
}
export interface VistaEstadoViajeCompleto {
    viaje_id: UUID;
    despacho_id: UUID;
    numero_despacho: string;
    numero_viaje: number;
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
    transporte_nombre?: string;
    camion_patente?: string;
    camion_marca?: string;
    camion_modelo?: string;
    acoplado_patente?: string;
    chofer_nombre?: string;
    chofer_telefono?: string;
    chofer_user_id?: UUID;
    horas_en_planta?: number;
    minutos_de_carga?: number;
    created_at: Timestamp;
    updated_at?: Timestamp;
}
export interface VistaViajeDespacho extends VistaEstadoViajeCompleto {
    estado: EstadoViajeDespacho;
    fecha_asignacion_camion?: Timestamp;
    fecha_ingreso_planta?: Timestamp;
    fecha_salida_planta?: Timestamp;
    fecha_confirmacion_entrega?: Timestamp;
    origen?: string;
    destino?: string;
    peso_estimado?: number;
    peso_real?: number;
}
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
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
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
export type EntityTypes = {
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
    Destino: Destino;
    Origen: Origen;
    Deposito: Deposito;
    PlantaTransporte: PlantaTransporte;
    PlantaOrigen: PlantaOrigen;
    PlantaDestino: PlantaDestino;
    OfertaRedNodexia: OfertaRedNodexia;
    VisualizacionOferta: VisualizacionOferta;
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
