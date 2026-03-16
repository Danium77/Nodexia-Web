# ARQUITECTURA — NODEXIA-WEB

**Última actualización:** 15-Mar-2026

---

## STACK

- **Framework:** Next.js 16 (Pages Router) + React 19 + TypeScript
- **Estilos:** Tailwind CSS v4 (PostCSS)
- **BD:** Supabase (PostgreSQL 15) con RLS
- **Auth:** Supabase Auth (JWT)
- **Deploy:** Vercel (serverless)
- **UI libs:** HeadlessUI v2.2.9, Heroicons, Lucide
- **Mapas:** React Google Maps API + Leaflet

---

## ESTRUCTURA DE CARPETAS

```
pages/                  ← Páginas (1 archivo = 1 ruta)
  api/                  ← 60 API routes (serverless)
components/             ← ~80 componentes React
  Admin/                ← 41 archivos — panel administración
  Transporte/           ← 35 archivos — flota, unidades, despachos
  Documentacion/        ← 14 archivos
  Planning/             ← 10 archivos
  Despachos/            ← 8 archivos
  Modals/               ← 8 archivos
  ui/                   ← 10 primitivos
  layout/               ← 6 archivos (sidebar, headers)
lib/
  estados/config.ts     ← FUENTE VERDAD: 17+1 estados, transiciones
  types.ts              ← Tipos core (902 líneas — dividir)
  services/             ← Lógica de negocio (viajeEstado, notificaciones)
  hooks/                ← 17 hooks React
  middleware/withAuth.ts ← Auth + roles en API routes
  contexts/             ← UserRoleContext (602 líneas — dividir)
  validators/           ← Validación Zod
  supabaseClient.ts     ← Cliente anon (respeta RLS)
  supabaseAdmin.ts      ← Cliente admin (bypasa RLS — solo backend)
  supabaseServerClient.ts ← createUserSupabaseClient(token) para API routes
types/                  ← Tipos por dominio (common, network, red-nodexia, ubicaciones)
sql/migrations/         ← 54 migraciones (001-074, con gaps)
```

---

## MODELO DE DATOS (TABLAS CORE)

| Tabla | Propósito |
|-------|-----------|
| `empresas` | Empresas del sistema (tipo: planta/transporte/cliente/admin) |
| `usuarios_empresa` | Junction user↔empresa↔rol. Campo canónico: `rol_interno` |
| `despachos` | Órdenes de despacho (1:1 con viaje) |
| `viajes_despacho` | Viajes asociados a despachos |
| `choferes` | Conductores (FK a empresa vía `empresa_id`) |
| `camiones` | Vehículos (FK a empresa vía `empresa_id`) |
| `acoplados` | Semirremolques |
| `unidades_operativas` | Chofer + camión + acoplado (equipo estable) |
| `ubicaciones` | Plantas, depósitos, clientes (con coordenadas) |
| `viajes_red_nodexia` | Marketplace de cargas |
| `ofertas_red_nodexia` | Ofertas de transporte a cargas en red |
| `documentos_entidad` | Documentación de recursos (camiones, choferes, etc.) |
| `incidencias` | Incidencias operativas |
| `registros_acceso` | Registro de ingreso/egreso en plantas |
| `tracking_gps` | Posiciones GPS de choferes |
| `notificaciones` | Sistema de notificaciones |
| `funciones_sistema` | Catálogo de feature flags (clave, nombre, kill switch global) |
| `funciones_empresa` | Features habilitadas por empresa (opt-in) |
| `funciones_rol` | Visibilidad por rol dentro de empresa (opt-out) |
| `audit_log` | Log de acciones sensibles (admin only) |

### Vistas
| Vista | Propósito |
|-------|-----------|
| `vista_disponibilidad_unidades` | Unidades operativas con datos de chofer/camión/acoplado + jornada |

### Campos deprecados (NO USAR)
- `usuarios_empresa.rol_empresa_id` — FK roto, campo dead
- `camiones.id_transporte` / `acoplados.id_transporte` / `choferes.id_transporte` — usar `empresa_id`
- Tabla `roles_empresa` — no hacer joins desde `usuarios_empresa`

---

## PATRONES CLAVE

### Auth + Roles
```
withAuth(handler, { roles: ['coordinador'] })
  → verifica JWT
  → obtiene rol de usuarios_empresa.rol_interno
  → normalizeRole() mapea legacy (ej: 'Coordinador de Transporte' → 'coordinador')
  → inyecta AuthContext { userId, empresaId, rol, token }
```

### Data flow correcto
```
Frontend (hook)  →  API route (withAuth)  →  Service (lib/services/)  →  Supabase (RLS)
                                              ↓
                                     createUserSupabaseClient(token)
```

### Estado de viajes
- 17 estados + cancelado en `lib/estados/config.ts`
- `TRANSICIONES_VALIDAS` define qué estado puede ir a cuál
- `cambiarEstadoViaje()` sincroniza: viajes_despacho + despachos + timestamps + historial
- Tabs (Pendiente, Asignado, En Proceso, etc.) se computan, no se almacenan

### Despacho:Viaje = 1:1
- Un despacho tiene exactamente un viaje
- El despacho NO tiene estado propio — se sincroniza desde el viaje

---

## LÍMITES POR EQUIPO (TARGET)

```
FRONTEND                 BACKEND                  BD                    MOBILE
─────────                ─────────                ──                    ──────
pages/*.tsx               pages/api/**             sql/migrations/       App separada
components/**             lib/services/            RLS policies          Consume API
lib/hooks/                lib/middleware/           Vistas, funciones     
lib/contexts/             lib/validators/          Índices
styles/                   lib/api/ (wrappers)

REGLA:                   REGLA:                   REGLA:                REGLA:
Solo hooks/contexts      Solo API routes          Solo migraciones      Solo /api/
para obtener datos       con withAuth             numeradas             endpoints
```

### Contratos entre equipos
- **Frontend → Backend:** hooks llaman API routes, nunca `supabase.from()` directo
- **Backend → BD:** vía `createUserSupabaseClient(token)`, nunca `supabaseAdmin` para datos de usuario
- **Frontend NUNCA toca:** `pages/api/`, `lib/services/`, `sql/`
- **Backend NUNCA toca:** `components/`, `styles/`

---

## ARCHIVOS CRÍTICOS (>700 líneas — prioridad refactoring)

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `pages/crear-despacho.tsx` | 1743 | Monolito: form + tabla + modales + queries |
| `pages/chofer-mobile.tsx` | 1315 | Multi-tab con lógica embebida |
| `pages/control-acceso.tsx` | 1277 | QR + docs + ingreso/egreso |
| `components/Admin/WizardUsuario.tsx` | 1220 | Wizard multi-step |
| `pages/transporte/despachos-ofrecidos.tsx` | 984 | Lista + filtros + acciones |
| `components/Planning/PlanningGrid.tsx` | 956 | Calendario complejo |
| `pages/supervisor-carga.tsx` | 909 | Multi-tab + estados |
| `lib/types.ts` | 902 | Tipos acumulados — dividir por dominio |
