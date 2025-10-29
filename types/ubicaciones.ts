/**
 * Tipos para el sistema de ubicaciones
 * Plantas, depósitos y clientes
 */

export interface Ubicacion {
  id: string;
  
  // Información básica
  nombre: string;
  cuit: string;
  
  // Tipo
  tipo: 'planta' | 'deposito' | 'cliente';
  
  // Dirección
  direccion: string;
  ciudad?: string;
  provincia?: string;
  codigo_postal?: string;
  pais?: string;
  
  // Coordenadas (opcional)
  latitud?: number;
  longitud?: number;
  
  // Contacto
  telefono?: string;
  email?: string;
  contacto_nombre?: string;
  contacto_cargo?: string;
  
  // Operativa
  horario_atencion?: string;
  capacidad_carga?: string;
  observaciones?: string;
  
  // Control
  activo: boolean;
  
  // Auditoría
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmpresaUbicacion {
  id: string;
  
  // Relaciones
  empresa_id: string;
  ubicacion_id: string;
  
  // Tipo de relación
  es_origen: boolean;
  es_destino: boolean;
  
  // Configuración
  alias?: string;
  prioridad: number;
  notas?: string;
  
  // Control
  activo: boolean;
  
  // Auditoría
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Datos expandidos (joins)
  ubicacion?: Ubicacion;
}

export interface UbicacionAutocomplete {
  id: string;
  nombre: string;
  cuit: string;
  tipo: 'planta' | 'deposito' | 'cliente';
  direccion: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  alias?: string; // Nombre personalizado de la empresa
}

export interface UbicacionFormData {
  nombre: string;
  cuit: string;
  tipo: 'planta' | 'deposito' | 'cliente';
  direccion: string;
  ciudad: string;
  provincia: string;
  codigo_postal?: string;
  pais: string;
  latitud?: number;
  longitud?: number;
  telefono?: string;
  email?: string;
  contacto_nombre?: string;
  contacto_cargo?: string;
  horario_atencion?: string;
  capacidad_carga?: string;
  observaciones?: string;
  activo: boolean;
}

export interface VincularUbicacionData {
  empresa_id: string;
  ubicacion_id: string;
  es_origen: boolean;
  es_destino: boolean;
  alias?: string;
  prioridad?: number;
  notas?: string;
}
