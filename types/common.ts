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

export interface Profile extends BaseEntity {
  name: string;
  type: 'planta' | 'transporte' | 'admin';
  cuit: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface ProfileUser extends BaseEntity {
  user_id: string;
  profile_id: string;
  role_id: number;
  nombre?: string;
  apellido?: string;
  dni?: string;
  localidad?: string;
  telefono?: string;
  // Relations
  profile?: Profile;
  role?: Role;
}