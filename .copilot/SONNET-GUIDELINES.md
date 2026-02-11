# GUÍA PARA PROMPTS A SONNET

**Propósito:** Referencia rápida para Opus al armar tareas para Sonnet.  
**Última actualización:** 08-Feb-2026 (19 bugs corregidos en S01-S04)

---

## ⛔ REGLA ABSOLUTA: NO SEED DATA

**NUNCA crear scripts SQL de INSERT para datos de procesos** (choferes, camiones, despachos, documentación, viajes, incidencias, empresas, etc.).  
Todos los datos operativos se cargan DESDE LA UI con los procesos funcionales.  
Si un feature necesita datos para probarse, primero asegurar que la carga desde UI funciona.  
**(DEC-007 — Directiva del PO)**

---

## 🚫 ERRORES PROHIBIDOS (incluir SIEMPRE en el prompt)

Copiar este bloque al final de cada prompt a Sonnet:

```
ERRORES PROHIBIDOS — si hacés alguno de estos, tu código será rechazado:

1. NO inventes nombres de tabla/columna. Usá EXACTAMENTE los de la sección SCHEMA abajo.
2. Response parsing: la API retorna { success, data: { ... } }. En frontend: `const json = await res.json(); const items = json.data.documentos;` — NUNCA `res.json()` directo.
3. Auth OBLIGATORIO en toda API: ver sección AUTH PATTERN abajo. Sin excepciones.
4. Import supabase server: `import { supabaseAdmin } from '@/lib/supabaseAdmin';` — NO crear client inline.
5. Import supabase client: `import { supabase } from '../../lib/supabaseClient';` — NO dynamic import.
6. El bucket es PRIVADO. NO usar getPublicUrl(). Generar signed URLs: `supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600)`
7. maxFileSize = 10 * 1024 * 1024 (10MB). NO 100MB.
8. El tipo entidad es 'camion' NO 'vehiculo'. Siempre 'camion'.
9. Año en camiones/acoplados es columna `anio` NO `ano`.
10. Frontend auth: SIEMPRE enviar `Authorization: Bearer ${session.access_token}` en headers.
```

---

## 📋 SCHEMA DE TABLAS (copiar al prompt cuando sea relevante)

### documentos_entidad
```
id UUID PK, entidad_tipo TEXT, entidad_id UUID, tipo_documento TEXT,
nombre_archivo TEXT, file_url TEXT, file_size INTEGER, mime_type TEXT,
bucket TEXT DEFAULT 'documentacion-entidades', storage_path TEXT,
fecha_emision DATE, fecha_vencimiento DATE,
estado_vigencia TEXT DEFAULT 'pendiente_validacion',
validado_por UUID, fecha_validacion TIMESTAMPTZ, motivo_rechazo TEXT,
validacion_excepcional BOOLEAN, validado_excepcionalmente_por UUID,
fecha_validacion_excepcional TIMESTAMPTZ, incidencia_id UUID,
requiere_reconfirmacion_backoffice BOOLEAN, reconfirmado_por UUID,
fecha_reconfirmacion TIMESTAMPTZ, subido_por UUID, empresa_id UUID,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, activo BOOLEAN
```

**CHECK entidad_tipo:** `'chofer'`, `'camion'`, `'acoplado'`, `'transporte'`  
**CHECK estado_vigencia:** `'pendiente_validacion'`, `'vigente'`, `'por_vencer'`, `'vencido'`, `'rechazado'`

### auditoria_documentos
```
id UUID PK, documento_id UUID FK→documentos_entidad,
accion TEXT, usuario_id UUID, usuario_rol TEXT,
estado_anterior TEXT, estado_nuevo TEXT, motivo TEXT,
ip_address INET, user_agent TEXT, metadata JSONB, created_at TIMESTAMPTZ
```

**CHECK accion:** `'creacion'`, `'validacion'`, `'rechazo'`, `'validacion_excepcional'`, `'reconfirmacion'`, `'reemplazo'`, `'vencimiento_automatico'`, `'cambio_estado'`

### choferes
```
id UUID PK, nombre TEXT, apellido TEXT, dni TEXT, telefono TEXT, email TEXT,
foto_url TEXT, empresa_id UUID FK→empresas, usuario_id UUID FK→auth.users,
user_id UUID FK→auth.users, activo BOOLEAN, fecha_alta TIMESTAMPTZ
```
- FK a empresa: `empresa_id` (NO `id_transporte`)
- FK a auth: tanto `usuario_id` como `user_id` existen. RLS usa `usuario_id`.

### camiones
```
id UUID PK, patente TEXT UNIQUE, marca TEXT, modelo TEXT, anio INTEGER,
foto_url TEXT, empresa_id UUID FK→empresas, activo BOOLEAN, fecha_alta TIMESTAMPTZ
```
- Año: **`anio`** (NO `ano`)
- FK a empresa: **`empresa_id`** (NO `id_transporte`)

### acoplados
```
id UUID PK, patente TEXT UNIQUE, marca TEXT, modelo TEXT, anio INTEGER,
foto_url TEXT, empresa_id UUID FK→empresas, activo BOOLEAN, fecha_alta TIMESTAMPTZ
```
- FK a empresa: **`empresa_id`** (NO `id_transporte`)

### empresas
```
id UUID PK, nombre TEXT, cuit TEXT UNIQUE, tipo_empresa TEXT CHECK('transporte','coordinador'),
email TEXT, telefono TEXT, direccion TEXT, localidad TEXT, provincia TEXT,
activa BOOLEAN DEFAULT true, fecha_creacion TIMESTAMPTZ, usuario_admin UUID
```
- Estado: **`activa`** (NO `activo`)
- PK es `id` (no hay columna `empresa_id`)

### super_admins
```
id UUID PK, user_id UUID UNIQUE FK→auth.users, nombre_completo TEXT,
permisos JSONB, activo BOOLEAN, fecha_creacion TIMESTAMPTZ, creado_por UUID
```

### usuarios
```
id UUID PK, user_id UUID, email TEXT, nombre_completo TEXT, phone TEXT,
rol TEXT, created_at TIMESTAMPTZ
```

### viajes_despacho (columnas FK relevantes)
```
id_transporte UUID FK→empresas, id_camion UUID FK→camiones,
id_acoplado UUID FK→acoplados, id_chofer UUID FK→choferes
```
- FK transporte: **`id_transporte`** (NO `empresa_transporte_id` ni `transport_id`)

---

## 🔐 AUTH PATTERN (copiar al prompt)

### API Route (server-side):
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Auth
const token = req.headers.authorization?.split(' ')[1];
if (!token) return res.status(401).json({ error: 'No autenticado' });
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
if (authError || !user) return res.status(401).json({ error: 'No autorizado' });
```

### Admin role check (cuando se necesita):
```typescript
const { data: isSuperAdmin } = await supabaseAdmin
  .from('super_admins').select('id')
  .eq('user_id', user.id).eq('activo', true).maybeSingle();
const { data: roles } = await supabaseAdmin
  .from('usuarios').select('rol')
  .eq('user_id', user.id).single();
const esAdmin = !!isSuperAdmin || roles?.rol === 'admin_nodexia';
if (!esAdmin) return res.status(403).json({ error: 'Sin permisos' });
```

### Frontend (client-side):
```typescript
import { supabase } from '../../lib/supabaseClient';

const { data: { session } } = await supabase.auth.getSession();
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify(payload),
});
const json = await response.json();
// Acceder datos: json.data.documentos, json.data.total, etc.
```

---

## 📦 API RESPONSE FORMAT

### Success:
```json
{ "success": true, "data": { "total": 5, "documentos": [...] } }
```
### Error:
```json
{ "error": "Mensaje corto", "details": "Explicación detallada" }
```

---

## 🎨 FRONTEND PATTERNS

### Layout Admin (pages/admin/*.tsx):
```tsx
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import Sidebar from '../../components/layout/Sidebar';
// Guard: primaryRole === 'super_admin' || primaryRole === 'admin_nodexia'
// Wrapper: <div className="flex h-screen bg-[#0a0e1a]"><Sidebar /><main>...</main></div>
```

### Componente estándar:
```tsx
import { supabase } from '../../lib/supabaseClient';
// Dark theme: bg-slate-800, border-slate-700, text-slate-100
// Iconos: @heroicons/react/24/outline
// Barrel export: components/[Module]/index.ts
```

### Roles del sistema:
`'coordinador'`, `'supervisor'`, `'control_acceso'`, `'chofer'`, `'administrativo'`, `'admin_nodexia'`, `'super_admin'`

---

## 📊 BUGS HISTÓRICOS DE SONNET (referencia)

| Sesión | Bug | Archivos afectados |
|--------|-----|--------------------|
| S01 | maxFileSize 100MB (bucket es 10MB) | upload.ts, SubirDocumento.tsx |
| S01 | getPublicUrl en bucket privado | upload.ts |
| S01 | Sin auth en APIs | upload.ts, listar.ts, [id].ts |
| S01 | createClient inline en vez de import | 3 APIs |
| S01 | subido_por como campo manual | upload.ts |
| S01 | Sin filtro activo=true por defecto | listar.ts |
| S02 | data.documentos en vez de data.data.documentos | ListaDocumentos.tsx |
| S02 | error.mensaje en vez de error.error | SubirDocumento.tsx |
| S02 | Dynamic import supabase | 2 componentes |
| S03 | Tabla `transportes` (no existe, es `empresas`) | pendientes.ts |
| S03 | Columna `ano` (es `anio`) | pendientes.ts |
| S03 | Sin empresa_nombre en response | pendientes.ts |
| S04 | res.json() sin navegar data.documentos | DocumentacionAdmin.tsx |
| S04 | 'vehiculo' en vez de 'camion' | 3 archivos frontend |
| S04 | Falta tipo 'transporte' en union | DocumentoPendienteCard.tsx |

**Patrón:** Sonnet repite response parsing y naming inventado en CADA task.
