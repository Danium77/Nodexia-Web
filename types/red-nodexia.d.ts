/**
 * Estados posibles de un viaje en la Red Nodexia
 */
export type EstadoRedNodexia = 'abierto' | 'con_ofertas' | 'asignado' | 'cancelado' | 'cerrado';
/**
 * Estados posibles de una oferta
 */
export type EstadoOferta = 'pendiente' | 'aceptada' | 'rechazada' | 'retirada' | 'expirada';
/**
 * Acciones registradas en historial
 */
export type AccionRedNodexia = 'publicado' | 'oferta_recibida' | 'oferta_aceptada' | 'oferta_rechazada' | 'viaje_asignado' | 'viaje_cancelado' | 'viaje_cerrado' | 'requisitos_actualizados';
/**
 * Viaje publicado en la Red Nodexia
 */
export interface ViajeRedNodexia {
    id: string;
    viaje_id: string;
    empresa_solicitante_id: string;
    tarifa_ofrecida: number;
    moneda: string;
    descripcion_carga?: string | null;
    estado_red: EstadoRedNodexia;
    fecha_publicacion: string;
    fecha_cierre?: string | null;
    fecha_asignacion?: string | null;
    transporte_asignado_id?: string | null;
    oferta_aceptada_id?: string | null;
    publicado_por?: string | null;
    asignado_por?: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Requisitos técnicos del viaje
 */
export interface RequisitosViajeRed {
    id: string;
    viaje_red_id: string;
    tipo_camion?: string | null;
    tipo_acoplado?: string | null;
    cantidad_ejes_minimo?: number | null;
    peso_maximo_kg?: number | null;
    volumen_maximo_m3?: number | null;
    largo_minimo_metros?: number | null;
    requiere_carga_peligrosa: boolean;
    requiere_termo: boolean;
    requiere_gps: boolean;
    requiere_carga_segura: boolean;
    tipo_carga?: string | null;
    clase_carga_peligrosa?: string | null;
    observaciones?: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Oferta de un transporte para un viaje en red
 */
export interface OfertaRedNodexia {
    id: string;
    viaje_red_id: string;
    transporte_id: string;
    mensaje?: string | null;
    camion_propuesto_id?: string | null;
    chofer_propuesto_id?: string | null;
    estado_oferta: EstadoOferta;
    fecha_oferta: string;
    fecha_respuesta?: string | null;
    ofertado_por?: string | null;
    score_matching?: number | null;
    distancia_origen_km?: number | null;
    created_at: string;
    updated_at: string;
}
/**
 * Preferencias de un transporte para la Red Nodexia
 */
export interface PreferenciasTransporteRed {
    id: string;
    transporte_id: string;
    zonas_interes?: string[] | null;
    radio_operacion_km?: number | null;
    acepta_nacional: boolean;
    tipos_carga_preferidos?: string[] | null;
    acepta_carga_peligrosa: boolean;
    acepta_carga_refrigerada: boolean;
    notificaciones_activas: boolean;
    notificacion_email: boolean;
    notificacion_push: boolean;
    acepta_cargas_red: boolean;
    horario_atencion_desde?: string | null;
    horario_atencion_hasta?: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Registro de historial de acciones en la red
 */
export interface HistorialRedNodexia {
    id: string;
    viaje_red_id?: string | null;
    oferta_id?: string | null;
    accion: AccionRedNodexia;
    descripcion?: string | null;
    usuario_id?: string | null;
    empresa_id?: string | null;
    metadata?: Record<string, any> | null;
    created_at: string;
}
/**
 * DTO para crear un viaje en la red
 */
export interface CrearViajeRedDTO {
    viaje_id: string;
    tarifa_ofrecida: number;
    descripcion_carga?: string;
    requisitos: {
        tipo_camion?: string;
        tipo_acoplado?: string;
        cantidad_ejes_minimo?: number;
        peso_maximo_kg?: number;
        volumen_maximo_m3?: number;
        largo_minimo_metros?: number;
        requiere_carga_peligrosa?: boolean;
        requiere_termo?: boolean;
        requiere_gps?: boolean;
        requiere_carga_segura?: boolean;
        tipo_carga?: string;
        clase_carga_peligrosa?: string;
        observaciones?: string;
    };
}
/**
 * DTO para crear una oferta
 */
export interface CrearOfertaDTO {
    viaje_red_id: string;
    mensaje?: string;
    camion_propuesto_id?: string;
    chofer_propuesto_id?: string;
}
/**
 * Vista completa de un viaje en red con todas sus relaciones
 */
export interface ViajeRedCompleto extends ViajeRedNodexia {
    requisitos?: RequisitosViajeRed;
    ofertas?: OfertaRedNodexia[];
    empresa_solicitante?: {
        id: string;
        nombre: string;
        tipo_empresa: string;
    };
    transporte_asignado?: {
        id: string;
        nombre: string;
    };
    viaje?: {
        id: string;
        numero_viaje: string;
        despacho?: {
            origen: string;
            destino: string;
            scheduled_local_date: string;
            scheduled_local_time: string;
        };
    };
    total_ofertas?: number;
    ofertas_pendientes?: number;
}
/**
 * Vista completa de una oferta con relaciones
 */
export interface OfertaRedCompleta extends OfertaRedNodexia {
    transporte?: {
        id: string;
        nombre: string;
        cuit?: string;
        telefono?: string;
        email?: string;
        localidad?: string;
        provincia?: string;
        calificacion?: number;
        viajes_realizados?: number;
    };
    camion_propuesto?: {
        id: string;
        patente: string;
        marca?: string;
        modelo?: string;
        tipo?: string;
    };
    chofer_propuesto?: {
        id: string;
        nombre: string;
        apellido: string;
        telefono?: string;
    };
    viaje_red?: ViajeRedCompleto;
}
/**
 * Filtros para búsqueda de viajes en red
 */
export interface FiltrosViajesRed {
    estado_red?: EstadoRedNodexia[];
    tipo_carga?: string[];
    tipo_camion?: string[];
    requiere_carga_peligrosa?: boolean;
    tarifa_minima?: number;
    tarifa_maxima?: number;
    zona_origen?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
}
/**
 * Estadísticas de la Red Nodexia
 */
export interface EstadisticasRedNodexia {
    total_viajes_abiertos: number;
    total_viajes_con_ofertas: number;
    total_viajes_asignados: number;
    total_ofertas_pendientes: number;
    promedio_ofertas_por_viaje: number;
    tiempo_promedio_asignacion_horas: number;
}
