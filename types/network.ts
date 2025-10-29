// Tipos TypeScript para la estructura de red de empresas
import type { Empresa } from './common';

export interface RolEmpresa {
  id: string;
  nombre_rol: string;
  tipo_empresa: 'transporte' | 'coordinador' | 'ambos';
  descripcion: string;
  permisos: Record<string, boolean>;
  activo: boolean;
}

export interface UsuarioEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  rol_interno: string;
  nombre_completo?: string;
  email_interno?: string;
  telefono_interno?: string;
  departamento?: string;
  fecha_ingreso?: string;
  activo: boolean;
  fecha_vinculacion: string;
  vinculado_por?: string;
  notas?: string;
  empresa?: Empresa; // Para joins
  permisos?: Record<string, boolean>; // Permisos del rol
}

export interface RelacionEmpresa {
  id: string;
  empresa_coordinadora_id: string;
  empresa_transporte_id: string;
  estado: 'activa' | 'suspendida' | 'finalizada';
  fecha_inicio: string;
  fecha_fin?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  empresa_coordinadora?: Empresa;
  empresa_transporte?: Empresa;
}

export interface DespachoRed {
  id: string;
  empresa_cliente_id: string;
  empresa_transporte_id: string;
  chofer_id?: string;
  camion_id?: string;
  acoplado_id?: string;
  origen: string;
  destino: string;
  fecha_despacho: string;
  estado: 'planificado' | 'asignado' | 'en_ruta' | 'entregado' | 'cancelado';
  observaciones?: string;
  creado_por: string;
  fecha_creacion: string;
  empresa_cliente?: Empresa;
  empresa_transporte?: Empresa;
  chofer?: Chofer;
  camion?: Camion;
  acoplado?: Acoplado;
}

export interface TransportistaDisponible {
  id: string;
  nombre: string;
  cuit: string;
  email?: string;
  telefono?: string;
  activa: boolean;
  ya_contratado: boolean;
}

export interface ClienteEmpresa {
  id: string;
  nombre: string;
  cuit: string;
  email?: string;
  telefono?: string;
  fecha_inicio: string;
  estado: string;
}

export interface NetworkStats {
  total_empresas: number;
  empresas_transporte: number;
  empresas_coordinador: number;
  relaciones_activas: number;
  despachos_mes_actual: number;
}

// Interfaces existentes que necesitan actualización
export interface Chofer {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  licencia_conducir: string;
  vencimiento_licencia: string;
  telefono: string;
  email?: string;
  direccion?: string;
  fecha_ingreso: string;
  activo: boolean;
  foto_url?: string;
  empresa_id: string; // NUEVO CAMPO
  empresa?: Empresa; // Para joins
}

// Contexto del usuario en la red
export interface UserNetworkContext {
  user_id: string;
  empresa: Empresa;
  rol_interno: string;
  permisos: Record<string, boolean>;
  puede_crear_relaciones: boolean;
  puede_gestionar_despachos: boolean;
  puede_ver_red: boolean;
  puede_gestionar_usuarios: boolean;
  puede_gestionar_flota: boolean;
}

// Para formularios de creación
export interface CreateEmpresaData {
  nombre: string;
  cuit: string;
  tipo_empresa: 'transporte' | 'coordinador';
  email?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
}

export interface CreateUsuarioEmpresaData {
  email_usuario: string;
  rol_interno: string;
  nombre_completo: string;
  email_interno?: string;
  telefono_interno?: string;
  departamento?: string;
  fecha_ingreso?: string;
}

export interface UpdateUsuarioEmpresaData {
  rol_interno?: string;
  nombre_completo?: string;
  email_interno?: string;
  telefono_interno?: string;
  departamento?: string;
  fecha_ingreso?: string;
  activo?: boolean;
  notas?: string;
}

export interface CreateRelacionData {
  empresa_transporte_id: string;
  condiciones?: Record<string, any>;
}

export interface CreateDespachoRedData {
  empresa_transporte_id: string;
  chofer_id?: string;
  camion_id?: string;
  acoplado_id?: string;
  origen: string;
  destino: string;
  fecha_despacho: string;
  observaciones?: string;
}