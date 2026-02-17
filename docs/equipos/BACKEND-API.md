# GUÍA DEL EQUIPO BACKEND / API

**Proyecto:** Nodexia-Web  
**Stack:** Next.js 16 API Routes + Supabase (PostgreSQL 15) + TypeScript  
**Última actualización:** 16-Feb-2026

---

## 1. ARQUITECTURA BACKEND

### Stack tecnológico
- **Runtime:** Next.js API Routes (serverless en Vercel)
- **Base de datos:** Supabase (PostgreSQL 15 con Row Level Security)
- **Autenticación:** Supabase Auth (JWT)
- **Middleware:** `withAuth` — validación JWT + roles en cada endpoint
- **Validación:** Zod (lib/validators/) + validaciones manuales
- **Servicios:** Service layer en `lib/services/`

### Estructura de API Routes

```
pages/api/                          ← 55 endpoints
├── auth/
│   ├── login.ts                    ← Login con email/password
│   ├── signup.ts                   ← Registro de usuarios
│   └── me.ts                       ← Info del usuario actual
├── admin/
│   ├── setup-functions.ts          ← Setup de funciones SQL
│   ├── sync-all-usuarios.ts        ← Sync usuarios → tabla usuarios
│   └── crear-relacion.ts           ← Crear relaciones entre empresas
├── camiones/
│   └── index.ts                    ← CRUD de camiones
├── choferes/
│   ├── index.ts                    ← CRUD de choferes
│   └── [id].ts                     ← Detalle de chofer
├── control-acceso/
│   ├── crear-incidencia.ts         ← Crear incidencia (🔒 roles)
│   ├── documentos-detalle.ts       ← Detalle docs (🔒 roles)
│   └── validar-ingreso.ts          ← Validar ingreso a planta
├── despachos/
│   ├── index.ts                    ← CRUD de despachos
│   ├── [id].ts                     ← Detalle despacho
│   ├── [id]/
│   │   ├── cambiar-estado.ts       ← Transición de estados
│   │   └── timeline.ts            ← Timeline del despacho (🔒 empresa)
│   ├── crear.ts                    ← Crear despacho
│   └── estados.ts                  ← Listar estados
├── documentacion/
│   ├── entidades.ts                ← Documentos por entidad
│   ├── estado-batch.ts             ← Estado de múltiples docs
│   ├── preview-url.ts              ← URL de preview (🔒 empresa + path traversal)
│   ├── subir.ts                    ← Upload de documentos
│   └── tipos.ts                    ← Tipos de documentos
├── empresas/
│   ├── index.ts                    ← CRUD empresas
│   ├── [id].ts                     ← Detalle empresa
│   ├── invitar.ts                  ← Invitar usuarios
│   └── transportes-asociados.ts    ← Transportes vinculados
├── gps/
│   ├── actualizar.ts               ← Registrar posición GPS
│   ├── estadisticas-viaje.ts       ← Stats de viaje (🔒 empresa)
│   ├── ubicacion-actual.ts         ← Posición actual del chofer
│   └── ubicaciones-historicas.ts   ← Historial GPS (🔒 empresa)
├── incidencias/
│   └── index.ts                    ← CRUD incidencias
├── network/
│   ├── cargas-disponibles.ts       ← Marketplace de cargas
│   └── solicitar-carga.ts          ← Solicitar una carga
├── notificaciones/
│   ├── index.ts                    ← Listar notificaciones
│   ├── marcar-leidas.ts            ← Marcar como leídas
│   └── notificar-recepcion.ts      ← Notificar recepción (🔒 roles)
├── planificacion/
│   ├── horarios.ts                 ← Slots horarios
│   ├── reservar-slot.ts            ← Reservar turno
│   └── slots-disponibles.ts        ← Disponibilidad
├── red-nodexia/
│   ├── conexiones.ts               ← Gestión de conexiones
│   └── empresas.ts                 ← Búsqueda de empresas
├── relaciones/
│   └── index.ts                    ← Relaciones entre empresas
├── reportes/
│   ├── auditoria.ts                ← Reporte de auditoría
│   └── dashboard.ts                ← Datos del dashboard
├── usuarios/
│   ├── index.ts                    ← CRUD usuarios
│   └── [id].ts                     ← Detalle usuario
├── viajes/
│   ├── index.ts                    ← CRUD viajes
│   ├── [id].ts                     ← Detalle viaje
│   └── [id]/
│       └── estado.ts               ← Cambiar estado de viaje
├── health.ts                       ← Health check
├── sync-usuarios.ts                ← Sync de usuarios
└── webhook-user.ts                 ← Webhook de Supabase Auth
```

---

## 2. MIDDLEWARE DE AUTENTICACIÓN

### `withAuth` — Wrapper obligatorio para todos los endpoints

```typescript
// lib/middleware/withAuth.ts
import { withAuth } from '../../lib/middleware/withAuth';

// Uso básico — cualquier usuario autenticado
export default withAuth(async (req, res, user) => {
  // user = { id, email, rol_interno, empresa_id, tipo_empresa }
});

// Con restricción de roles
export default withAuth(async (req, res, user) => {
  // Solo estos roles pueden acceder
}, { roles: ['coordinador', 'admin_nodexia'] });
```

### El objeto `user` inyectado por withAuth

```typescript
interface AuthUser {
  id: string;           // UUID del usuario en Supabase Auth
  email: string;        // Email del usuario
  rol_interno: string;  // 'chofer' | 'coordinador' | 'control_acceso' | 'supervisor' | 'admin_nodexia'
  empresa_id: string;   // UUID de la empresa a la que pertenece
  tipo_empresa: string; // 'planta' | 'transporte'
}
```

### ⚠️ Regla CRÍTICA: Scope por empresa

Cada query DEBE filtrar por la empresa del usuario para evitar acceso cruzado (IDOR):

```typescript
// ✅ CORRECTO — Filtra por empresa del usuario
const { data } = await supabaseAdmin
  .from('despachos')
  .select('*')
  .eq('empresa_planta_id', user.empresa_id);

// ❌ INCORRECTO — Expone datos de todas las empresas
const { data } = await supabaseAdmin
  .from('despachos')
  .select('*');
```

---

## 3. SERVICE LAYER

```
lib/services/
├── despachoService.ts        ← Lógica de negocio de despachos
├── estadoService.ts          ← Máquina de estados
├── firebaseService.ts        ← Push notifications (Firebase)
├── notificacionService.ts    ← Notificaciones internas
└── controlAccesoService.ts   ← Validación de acceso en planta
```

### Patrón recomendado

```typescript
// En el API route:
export default withAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // 1. Validar input
  const parsed = MiSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  // 2. Verificar permisos según empresa
  // ...
  
  // 3. Ejecutar lógica de negocio (via service)
  const result = await miService.ejecutar(parsed.data, user);
  
  // 4. Responder
  return res.status(200).json(result);
});
```

---

## 4. CLIENTES SUPABASE

| Cliente | Archivo | Uso |
|---------|---------|-----|
| **supabase** (anon) | `lib/supabaseClient.ts` | Frontend — respeta RLS |
| **supabaseAdmin** | `lib/supabaseAdmin.ts` | Backend — SERVICE_ROLE, bypassa RLS |

```typescript
// Backend (API routes) → usar supabaseAdmin
import { supabaseAdmin } from '../../lib/supabaseAdmin';

// Frontend (pages/components) → usar supabase
import { supabase } from '../../lib/supabaseClient';
```

**NUNCA** crear instancias nuevas de `createClient()` en archivos individuales.

---

## 5. VALIDACIÓN

### Con Zod (`lib/validators/`)

```typescript
import { z } from 'zod';

const DespachoSchema = z.object({
  producto: z.string().min(1),
  peso_toneladas: z.number().positive(),
  empresa_planta_id: z.string().uuid(),
  // ...
});
```

### Validación de estados (`lib/estados/`)

```
lib/estados/
├── config.ts              ← Definición de los 18 estados
├── validaciones.ts        ← Reglas de transición
└── transiciones.ts        ← Ejecución de transiciones
```

---

## 6. MANEJO DE ERRORES

### Patrón estándar

```typescript
try {
  // operación...
} catch (error: any) {
  console.error('Contexto del error:', error);
  return res.status(500).json({ 
    error: 'Error al procesar la solicitud'  // ← Mensaje genérico al cliente
    // NUNCA exponer error.message en producción
  });
}
```

### ErrorBoundary (Frontend)
El `ErrorBoundary` global en `components/ErrorBoundary.tsx` captura errores de render de React. Solo muestra detalles en desarrollo.

---

## 7. VARIABLES DE ENTORNO

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # URL pública
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Key pública (RLS)
SUPABASE_SERVICE_ROLE_KEY=         # ⚠️ Solo backend — bypassa RLS

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# App
NEXT_PUBLIC_SITE_URL=
```

---

## 8. HEADERS DE SEGURIDAD (next.config.ts)

- **Content-Security-Policy:** script-src, style-src, img-src, connect-src definidos
- **X-Frame-Options:** DENY
- **X-Content-Type-Options:** nosniff
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Permissions-Policy:** camera, microphone, geolocation restringidos

---

## 9. DESPLIEGUE

- **Plataforma:** Vercel (`nodexia-web-j6wl`)
- **Dominio:** www.nodexiaweb.com
- **Deploy automático:** Push a `main` → Vercel build → deploy
- **Timeout:** API routes tienen 10s (plan free/hobby)
- **Regiones:** Auto (Vercel elige según tráfico)

---

## 10. DEUDA TÉCNICA

| Problema | Prioridad | Acción |
|----------|-----------|--------|
| No hay rate limiting en APIs | CRÍTICA | Implementar middleware de rate limit |
| Logs no estructurados | ALTA | Implementar logger con niveles |
| Sin capa de caché | MEDIA | Agregar Redis o Vercel KV |
| Tests de API: solo 2 archivos | ALTA | Ampliar cobertura |
| Service layer incompleto | MEDIA | Mover lógica de routes a services |
