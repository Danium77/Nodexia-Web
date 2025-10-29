// types/common.ts
// Centralized common types for the application

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  data: T | null;
  error?: {
    message: string;
    code?: string;
    details?: string;
  } | null;
  count?: number;
  hasMore?: boolean;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// User and Auth types
export interface User extends BaseEntity {
  email: string;
  nombre_completo?: string;
  phone?: string;
}

// Modelo centralizado de Empresa para toda la app
export interface Empresa extends BaseEntity {
  nombre: string;
  cuit: string;
  tipo_empresa: 'planta' | 'transporte' | 'cliente' | 'sistema';
  email?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  activa: boolean;
  usuario_admin?: string;
  fecha_creacion?: string;
  notas?: string;
}

export interface Role {
  id: number;
  name: string;
}