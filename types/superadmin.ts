// Tipos TypeScript para Super Administración

export interface PlanSuscripcion {
  id: string;
  nombre: string;
  descripcion?: string;
  precio_mensual: number;
  precio_anual: number;
  caracteristicas: Record<string, any>;
  limites: {
    max_usuarios?: number;
    max_despachos_mes?: number;
    max_vehiculos?: number;
  };
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface SuscripcionEmpresa {
  id: string;
  empresa_id: string;
  plan_id: string;
  estado: 'activa' | 'suspendida' | 'cancelada' | 'vencida';
  fecha_inicio: string;
  fecha_fin?: string;
  precio_pagado: number;
  periodo: 'mensual' | 'anual';
  renovacion_automatica: boolean;
  fecha_creacion: string;
  creado_por: string;
  notas?: string;
  plan?: PlanSuscripcion;
  empresa?: Empresa;
}

export interface Pago {
  id: string;
  suscripcion_id: string;
  empresa_id: string;
  monto: number;
  moneda: string;
  estado: 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';
  metodo_pago?: string;
  referencia_externa?: string;
  fecha_vencimiento?: string;
  fecha_pago?: string;
  fecha_creacion: string;
  procesado_por?: string;
  detalles: Record<string, any>;
  notas?: string;
  suscripcion?: SuscripcionEmpresa;
  empresa?: Empresa;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  nombre_completo: string;
  permisos: Record<string, boolean>;
  activo: boolean;
  fecha_creacion: string;
  creado_por?: string;
}

export interface ConfiguracionSistema {
  id: string;
  clave: string;
  valor: any;
  descripcion?: string;
  categoria: string;
  fecha_actualizacion: string;
  actualizado_por?: string;
}

export interface LogAdmin {
  id: string;
  admin_id: string;
  admin_email?: string;
  accion: string;
  entidad_tipo: 'empresa' | 'usuario' | 'suscripcion' | 'pago';
  entidad_id?: string;
  detalles: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  fecha_creacion: string;
}

export interface EmpresaAdmin extends Empresa {
  plan_actual?: string;
  estado_suscripcion: string;
  fecha_fin_suscripcion?: string;
  total_usuarios: number;
  ultimo_pago?: string;
}

export interface EstadisticasSistema {
  total_empresas: number;
  empresas_activas: number;
  empresas_inactivas: number;
  empresas_transporte: number;
  empresas_coordinador: number;
  total_usuarios: number;
  suscripciones_activas: number;
  ingresos_mes_actual: number;
  pagos_pendientes: number;
}

// Formularios
export interface CreateEmpresaAdminData {
  nombre: string;
  cuit: string;
  tipo_empresa: 'transporte' | 'coordinador';
  email: string;
  telefono?: string;
  direccion?: string;
  admin_email: string;
  admin_nombre: string;
  plan_id?: string;
}

export interface CreatePagoData {
  suscripcion_id: string;
  empresa_id: string;
  monto: number;
  moneda?: string;
  metodo_pago?: string;
  referencia_externa?: string;
  fecha_vencimiento?: string;
  detalles?: Record<string, any>;
  notas?: string;
}

export interface UpdateSuscripcionData {
  plan_id?: string;
  estado?: 'activa' | 'suspendida' | 'cancelada' | 'vencida';
  fecha_fin?: string;
  renovacion_automatica?: boolean;
  notas?: string;
}

export interface SuperAdminContext {
  is_super_admin: boolean;
  admin_info?: SuperAdmin;
  permisos: Record<string, boolean>;
}

// Filtros y consultas
export interface FiltrosEmpresas {
  tipo_empresa?: 'transporte' | 'coordinador';
  estado_suscripcion?: 'activa' | 'suspendida' | 'cancelada' | 'vencida';
  plan?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
}

export interface FiltrosPagos {
  empresa_id?: string;
  estado?: 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';
  metodo_pago?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  monto_min?: number;
  monto_max?: number;
}

export interface FiltrosLogs {
  admin_id?: string;
  accion?: string;
  entidad_tipo?: 'empresa' | 'usuario' | 'suscripcion' | 'pago';
  fecha_desde?: string;
  fecha_hasta?: string;
}

// Respuestas de API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}