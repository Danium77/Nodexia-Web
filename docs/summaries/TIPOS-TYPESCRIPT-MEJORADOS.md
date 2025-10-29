
# 🎯 Tipos Definidos y Centralizados para Nodexia Web

## 📝 Convención y Centralización de Modelos

Todos los modelos principales (Empresa, User, Role, etc.) están centralizados en `types/common.ts`.
Esto permite evitar duplicados, facilita el mantenimiento y asegura consistencia en toda la app.

**Reglas y recomendaciones:**
- Siempre importa los modelos desde `types/common.ts` (ej: `import { Empresa } from '@/types/common'`).
- Si necesitas extender un modelo, usa `extends` y documenta el nuevo tipo en la misma carpeta.
- No definas modelos de dominio en archivos sueltos ni en componentes.
- Si agregas un nuevo modelo global, documenta el cambio aquí y en el archivo correspondiente.

## Ejemplo de uso recomendado

```typescript
import type { Empresa, User, Role } from '@/types/common';

const empresa: Empresa = {
  id: 'uuid',
  nombre: 'Nodexia',
  cuit: '30712345678',
  tipo_empresa: 'sistema',
  activa: true
};
```

---

## Modelos principales

// ...existing code...

```typescript
// === TIPOS BASE ===
export interface ApiResponse<T = unknown> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
}

// === TIPOS DE USUARIO ===
export interface UsuarioAuth {
  id: string;
  email: string;
  role?: string;
  empresa_id?: string;
  created_at: string;
}

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  empresa_id: string;
  role: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// === TIPOS DE EMPRESA ===
export interface EmpresaData {
  id: string;
  nombre: string;
  tipo_empresa: 'transporte' | 'cliente' | 'coordinador';
  contacto_email?: string;
  telefono?: string;
  direccion?: string;
  activa: boolean;
  created_at: string;
}

// === TIPOS DE SUPABASE ===
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
}

export interface SupabaseUser {
  id: string;
  email?: string;
  role?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

// === TIPOS DE DESPACHOS ===
export interface DespachoData {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  fecha_despacho: string;
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
  tipo_carga: string;
  prioridad: 'baja' | 'media' | 'alta';
  created_at: string;
  updated_at: string;
}

// === TIPOS DE FORMULARIOS ===
export interface FormData {
  [key: string]: string | number | boolean | File | null | undefined;
}

export interface ValidationError {
  field: string;
  message: string;
}

// === TIPOS DE MIDDLEWARE ===
export interface AuthMiddlewareResponse {
  user: UsuarioAuth;
  isValid: boolean;
  error?: string;
}

// === TIPOS GENÉRICOS MEJORADOS ===
export type AsyncOperation<T> = Promise<ApiResponse<T>>;
export type DatabaseOperation<T> = Promise<SupabaseResponse<T>>;
export type FormHandler = (data: FormData) => Promise<void>;
```