# Arquitectura Técnica — Nodexia Web

> Documento generado para auditoría técnica externa.  
> Fecha: Julio 2025  
> Versión de la aplicación: Next.js 16.1.2 / React 19.2.0

---

## Índice

1. [Stack Tecnológico Completo](#1-stack-tecnológico-completo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Estructura de Base de Datos](#3-estructura-de-base-de-datos)
4. [Autenticación y Manejo de Roles](#4-autenticación-y-manejo-de-roles)
5. [Tracking en Tiempo Real (GPS)](#5-tracking-en-tiempo-real-gps)
6. [Comunicación entre Actores](#6-comunicación-entre-actores)
7. [Estructura de Carpetas](#7-estructura-de-carpetas)
8. [APIs Principales](#8-apis-principales)
9. [Decisiones de Arquitectura Relevantes](#9-decisiones-de-arquitectura-relevantes)
10. [Puntos Débiles o Incompletos](#10-puntos-débiles-o-incompletos)

---

## 1. Stack Tecnológico Completo

### Core

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (Pages Router) | 16.1.2 |
| UI | React | 19.2.0 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Package Manager | pnpm | workspace habilitado |

### Backend & Datos

| Componente | Tecnología | Versión |
|---|---|---|
| Base de datos | PostgreSQL (Supabase) | — |
| ORM / Cliente | @supabase/supabase-js | 2.75.1 |
| Auth helpers | @supabase/auth-helpers-nextjs | 0.10.0 |
| Driver SQL directo | pg (node-postgres) | 8.16.3 |
| Edge Functions | Deno (Supabase Functions) | — |

### Visualización & UI

| Componente | Tecnología | Versión |
|---|---|---|
| Mapas | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| Gráficos | Recharts | 3.8.0 |
| Íconos | lucide-react | 0.511.0 |
| QR Scanning | html5-qrcode | 2.3.8 |
| QR Generation | react-qr-code | 2.0.15 |
| Date handling | date-fns | 4.1.0 |
| PDF generation | jspdf + jspdf-autotable | 3.0.1 / 5.0.2 |
| Excel export | xlsx | 0.18.5 |

### Infraestructura & Deploy

| Componente | Tecnología | Detalle |
|---|---|---|
| Hosting | Vercel | Región: `gru1` (São Paulo) |
| Dev server | Turbopack | Habilitado via `next dev --turbopack` |
| Push notifications | Firebase Cloud Messaging | SDK 10.7.1 (compat) |
| Service Worker | Custom (`public/sw.js`) | v2 — Network First para API/bundles |

### Testing

| Componente | Tecnología | Versión |
|---|---|---|
| Unit / Integration | Jest | 30.2.0 |
| E2E | Playwright | 1.57.0 |
| React testing | @testing-library/react | 16.3.0 |

### Ambientes

| Ambiente | Supabase Project ID | Uso |
|---|---|---|
| Desarrollo | `yllnzkjpvaukeeqzuxit` | `.env.local` en dev |
| Producción | `lkdcofsfjnltuzzzwoir` | Variables de entorno en Vercel |

---

## 2. Arquitectura General

### Patrón Arquitectónico

Nodexia es una aplicación **monolítica basada en Next.js Pages Router** con API Routes como backend. No hay microservicios separados. La única pieza desplegada fuera de Vercel es una **Supabase Edge Function** para expiración automática de viajes.

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                               │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Pages (SSR   │  │  API Routes      │  │  Static       │  │
│  │  + CSR)       │  │  /api/**         │  │  Assets       │  │
│  │               │  │                  │  │  /public      │  │
│  └──────┬───────┘  └────────┬─────────┘  └───────────────┘  │
│         │                   │                                │
│         │  supabaseClient   │  supabaseAdmin                 │
│         │  (con RLS)        │  (service_role, sin RLS)       │
└─────────┼───────────────────┼────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                    │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐ │
│  │  Auth   │  │  RLS     │  │  Realtime  │  │  Edge      │ │
│  │  (JWT)  │  │  Policies│  │  (WebSocket)│  │  Functions│ │
│  └─────────┘  └──────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  Firebase Cloud      │
│  Messaging (push     │
│  notifications)      │
└──────────────────────┘
```

### Flujo de Datos — Dos Caminos

1. **Cliente → Supabase directo** (`supabaseClient`): Para operaciones simples donde RLS garantiza seguridad. Los query builders de Supabase resuelven el filtro vía JWT del usuario autenticado.

2. **Cliente → API Route → Supabase Admin** (`supabaseAdmin`): Para operaciones que requieren lógica de negocio, validaciones cruzadas entre empresas, o bypass de RLS. Todas las API Routes críticas usan el middleware `withAuth` que valida JWT y extrae el contexto de empresa/rol.

### Modelo de Rendering

- **CSR dominante**: La mayoría de páginas cargan datos en el cliente vía hooks (`useEffect` + Supabase queries).
- **No SSR/SSG para datos dinámicos**: Las páginas no usan `getServerSideProps` ni `getStaticProps` para datos de negocio.
- **API Routes**: Server-side functions (Vercel Serverless Functions, región São Paulo, timeout 30s).

### Service Worker

El Service Worker (`public/sw.js`, versión 2) implementa:
- **Network First**: Para `/api/` y `/_next/` (JS bundles) — prioriza datos frescos.
- **Cache First**: Para assets estáticos (`/icons/`, `/images/`, fuentes).
- **Invalidación de cache**: Al cambiar de versión, se borran todos los caches antiguos automáticamente.

---

## 3. Estructura de Base de Datos

### Esquema de Migraciones

87 migraciones SQL secuenciales (`sql/migrations/001_*` a `087_*`), ejecutadas con un runner custom (`scripts/run_migrations_direct.js`) usando `pg` directamente contra la base. No se usa Supabase CLI migrations.

### Entidades Principales

#### `empresas` — Entidad Central
La unidad organizacional fundamental. Toda la seguridad y los datos se resuelven alrededor de la empresa.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `nombre` | text | Nombre de la empresa |
| `cuit` | text | CUIT fiscal argentino |
| `tipo_empresa` | enum | `'planta'` \| `'transporte'` \| `'cliente'` |
| `codigo_turno` | text | Código alfanumérico para numeración de turnos |
| `activo` | boolean | Soft-delete flag |

#### `usuarios_empresa` — Relación Usuario ↔ Empresa + Rol
Un usuario puede pertenecer a múltiples empresas con distintos roles.

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | UUID → auth.users | Referencia a Supabase Auth |
| `empresa_id` | UUID → empresas | Empresa asociada |
| `rol_interno` | text | Rol del usuario en esa empresa |
| `activo` | boolean | Estado de la relación |

**Constraint**: UNIQUE(`user_id`, `empresa_id`, `rol_interno`) — permite multi-rol por empresa.

#### `despachos` — Órdenes de Despacho

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `numero_despacho` | text | Código legible (ej: `DSP-20260321-002`) |
| `empresa_id` | UUID → empresas | Empresa creadora (planta) |
| `destino_id` | UUID → destinos | Punto de entrega |
| `origen_id` | UUID → origenes | Punto de carga |
| `transport_id` | UUID → empresas | Empresa de transporte asignada |
| `chofer_id` | UUID → choferes | Chofer asignado |
| `estado` | text | Mirror del estado de `viajes_despacho` |
| `created_by` | UUID → auth.users | Usuario que creó el despacho |
| `fecha_programada` | timestamp | Fecha programada de despacho |

#### `viajes_despacho` — Registro Canónico del Viaje (1:1 con despacho)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `despacho_id` | UUID → despachos | Despacho asociado |
| `id_transporte` | UUID → empresas | Transporte asignado |
| `camion_id` | UUID → camiones | Vehículo asignado |
| `acoplado_id` | UUID → acoplados | Acoplado (opcional) |
| `chofer_id` | UUID → choferes | Chofer |
| `estado` | text | **Estado canónico** (18 valores posibles) |
| `parada_actual` | int | Índice de parada actual (multi-stop) |
| `origen_asignacion` | text | `'directo'` \| `'red_nodexia'` |
| Timestamps | timestamp | Cadena completa de timestamps por cada fase |
| Carga | varios | `producto`, `peso_estimado`, `peso_real` |
| Documentación | varios | `remito_numero`, `carta_porte_url`, `documentacion_completa` |

#### `estado_unidad_viaje` — Tracking de Unidad por Viaje
Registra estado GPS y ubicación del vehículo en cada viaje.

| Campo | Tipo | Descripción |
|---|---|---|
| `viaje_id` | UUID → viajes_despacho | |
| `ubicacion_actual_lat` | numeric | Latitud GPS |
| `ubicacion_actual_lon` | numeric | Longitud GPS |
| `velocidad_actual_kmh` | numeric | Velocidad actual |
| `ultima_actualizacion_gps` | timestamp | Timestamp del último dato GPS |

#### `tracking_gps` — Registro Crudo de GPS
Datos raw de geolocalización reportados por choferes.

| Campo | Tipo | Descripción |
|---|---|---|
| `chofer_id` | UUID → choferes | |
| `latitud` / `longitud` | numeric | Coordenadas |
| `velocidad` | numeric | 0-200 km/h (constraint) |
| `rumbo` | numeric | 0-360° (constraint) |
| `precision_metros` | numeric | Precisión del GPS |
| `bateria_porcentaje` | int | 0-100 (constraint) |
| `app_version` | text | Versión de la app móvil |

**Validación a nivel DB**: Trigger verifica coordenadas dentro de Argentina (lat -55 a -21, lon -73 a -53).  
**Retención**: Función `limpiar_tracking_antiguo()` elimina registros > 30 días.  
**Vista**: `ultima_ubicacion_choferes` — `DISTINCT ON chofer_id` ordenado por timestamp DESC.

### Tablas de Configuración y Relaciones

| Tabla | Propósito | FKs Principales |
|---|---|---|
| `origenes` | Puntos de carga globales (Admin crea) | — |
| `destinos` | Puntos de entrega (opcionalmente vinculados a cliente) | `empresa_cliente_id` → empresas |
| `planta_transportes` | Red privada de transporte por planta | `empresa_planta_id`, `empresa_transporte_id` → empresas |
| `planta_origenes` | Plantas vinculan sus orígenes | `empresa_planta_id` → empresas, `origen_id` → origenes |
| `planta_destinos` | Plantas vinculan sus destinos | `empresa_planta_id` → empresas, `destino_id` → destinos |
| `choferes` | Registros de choferes | `empresa_id` → empresas, `user_id` → auth.users |
| `camiones` | Vehículos de transporte | `empresa_id` → empresas |
| `acoplados` | Acoplados/semirremolques | `empresa_id` → empresas |
| `paradas` | Multi-stop (máx 4 por viaje) | `viaje_id` → viajes_despacho |

### Tablas Operacionales

| Tabla | Propósito | Migración |
|---|---|---|
| `notificaciones` | Notificaciones por usuario (tipadas, con FK a viaje/despacho) | 026 |
| `registros_acceso` | Registros de ingreso/egreso en plantas | 050 |
| `historial_despachos` | Log de auditoría de eventos en despachos | 055 |
| `documentos_recursos` | Gestión documental (licencias, VTV, seguros) con workflow de validación | 046 |
| `incidencias_viaje` | Incidentes de viaje (11 tipos, 4 severidades) | 064 |

### Sistema de Turnos (Planificación)

| Tabla | Propósito | Migración |
|---|---|---|
| `ventanas_recepcion` | Ventanas semanales por planta (día, hora inicio/fin, capacidad) | 081 |
| `turnos_reservados` | Reservaciones concretas de slots | 081-082 |
| `turno_contadores` | Secuencia por planta para numeración `{codigo_planta}{seq4}` | 082 |

### Red Nodexia (Marketplace)

| Tabla | Propósito |
|---|---|
| `viajes_red_nodexia` | Viajes publicados por plantas en el marketplace |
| `ofertas_red_nodexia` | Ofertas de transporte para viajes publicados |
| `visualizaciones_ofertas` | Tracking de qué transportes vieron las ofertas |

### Feature Flags

| Tabla | Propósito |
|---|---|
| `funciones_sistema` | Features globales del sistema (activo/inactivo) |
| `funciones_empresa` | Opt-in por empresa |
| `funciones_rol` | Visibilidad por rol |

### Diagrama ER Simplificado

```
                              ┌──────────────┐
                              │   empresas   │
                              │ (planta/     │
                              │  transporte/ │
                              │  cliente)    │
                              └──────┬───────┘
                 ┌───────────────────┼────────────────────────┐
                 │                   │                        │
     ┌───────────▼──┐  ┌────────────▼────────┐  ┌───────────▼────────┐
     │ usuarios_    │  │ planta_transportes  │  │ choferes          │
     │ empresa      │  │ (red privada)       │  │                   │
     │ (user+rol)   │  └─────────────────────┘  └────────┬──────────┘
     └──────────────┘                                    │
                                                         │
     ┌──────────┐      ┌────────────────┐      ┌────────▼──────────┐
     │ origenes │◄─────│   despachos    │─────►│ viajes_despacho   │
     └──────────┘      │               │      │ (estado canónico) │
     ┌──────────┐      │ empresa_id    │      │ + timestamps      │
     │ destinos │◄─────│ transport_id  │      │ + carga           │
     └──────────┘      └───────┬────────┘      └────────┬──────────┘
                               │                        │
                    ┌──────────▼──────────┐    ┌────────▼──────────┐
                    │ historial_despachos │    │ tracking_gps      │
                    │ (auditoría)         │    │ (GPS raw data)    │
                    └─────────────────────┘    └───────────────────┘
```

---

## 4. Autenticación y Manejo de Roles

### Flujo de Autenticación

1. **Login**: El usuario se autentica via Supabase Auth (email/password). Supabase emite un JWT.
2. **Contexto de rol**: El componente `UserRoleProvider` (contexto React) consulta `usuarios_empresa` JOIN `empresas` para obtener roles, empresa y tipo de empresa. Cachea en `localStorage`.
3. **Protección de API**: Cada API Route protegida usa el middleware `withAuth(handler, options)`.

### Middleware `withAuth` — Flujo Detallado

```
Request → Extraer Bearer token → supabaseAdmin.auth.getUser(token)
       → Query usuarios_empresa (empresa_id, rol_interno, tipo_empresa)
       → normalizeRole(rol_interno)
       → Verificar contra options.roles (si se especifican)
       → Pasar AuthContext al handler
```

**AuthContext** provisto al handler:
```typescript
{
  user: User;              // Objeto de Supabase Auth
  userId: string;          // user.id
  token: string;           // JWT original (para queries con RLS)
  empresaId: string|null;  // De usuarios_empresa
  rolInterno: string|null; // Rol normalizado
  tipoEmpresa: string|null // 'planta'|'transporte'|'cliente'
}
```

### Sistema de Roles

| Rol | Tipo de Empresa | Permisos Clave |
|---|---|---|
| `admin_nodexia` | Global | Acceso total al sistema |
| `coordinador` | Planta o Transporte | Gestión de despachos, asignación de transporte, estado |
| `coordinador_integral` | PyME | **Hereda**: coordinador + control_acceso + supervisor + administrativo |
| `control_acceso` | Planta | Registro de ingreso/egreso en plantas |
| `supervisor` | Planta o Transporte | Supervisión de carga (planta) o flota (transporte) |
| `chofer` | Transporte | Actualización de estado de viaje, GPS tracking |
| `administrativo` | Ambos | Administración y reportes |
| `gerente` | Ambos | Lectura + reportes ejecutivos |
| `vendedor` | Planta | Lectura de despachos de sus clientes |
| `visor` | Cliente | Visibilidad de despachos como destinatario |

### Herencia de Roles — `coordinador_integral`

El rol `coordinador_integral` es un **composite role** diseñado para PyMEs donde una persona cumple múltiples funciones. Cuando `withAuth` verifica permisos, si el usuario tiene rol `coordinador_integral`, se evalúan también:

```
coordinador_integral
├── coordinador
├── control_acceso
├── supervisor
└── administrativo
```

Esto significa que un endpoint protegido con `roles: ['supervisor']` acepta automáticamente a usuarios con `coordinador_integral`.

### Normalización de Roles Legacy

La función `normalizeRole()` mapea strings legacy a valores canónicos:

| Valor Legacy | Rol Normalizado |
|---|---|
| `'Super Admin'`, `'super_admin'` | `admin_nodexia` |
| `'Control de Acceso'` | `control_acceso` |
| `'Supervisor de Carga'`, `'supervisor_carga'` | `supervisor` |
| `'Coordinador de Transporte'` | `coordinador` |
| `'Operador'` | `administrativo` |

### Prioridad de Roles (Cliente)

El `UserRoleContext` expone un `primaryRole` basado en prioridad:

```
super_admin > admin_nodexia > coordinador_integral > coordinador >
control_acceso > supervisor > gerente > chofer > administrativo >
vendedor > visor
```

### Row Level Security (RLS)

RLS está activo en las tablas principales. Ejemplo de la política de `despachos` (migración 085):

Un usuario puede ver un despacho si:
1. Es el creador (`created_by = auth.uid()`)
2. Pertenece a la empresa dueña (`empresa_id` en sus `usuarios_empresa`)
3. Pertenece al transporte asignado (`transport_id` en sus `usuarios_empresa`)
4. Es `admin_nodexia`

**Nota sobre RLS**: Varias operaciones cross-empresa (ej: buscar despacho por QR en control de acceso) bypasean RLS usando API Routes con `supabaseAdmin` (service_role key). Esto es intencional: el middleware `withAuth` maneja la autorización a nivel de aplicación.

---

## 5. Tracking en Tiempo Real (GPS)

### Arquitectura del Tracking

```
┌─────────────────────┐          ┌──────────────────────┐
│  Chofer Mobile      │  HTTP    │  API Route           │
│  (PWA)              │────────►│  /api/gps/registrar  │
│                     │  POST    │  -ubicacion          │
│  useGPSTracking()   │  30s     │                      │
│  useChoferMobile()  │  interval│  withAuth             │
└─────────────────────┘          └──────────┬───────────┘
                                            │
                            ┌───────────────▼──────────────┐
                            │  tracking_gps                │
                            │  (raw GPS history)           │
                            │  + estado_unidad_viaje       │
                            │  (current position)          │
                            └──────────────────────────────┘
                                            │
                            ┌───────────────▼──────────────┐
                            │  Coordinador Dashboard       │
                            │  useUbicacionesChoferes()    │
                            │  → Leaflet map rendering     │
                            └──────────────────────────────┘
```

### Envío de GPS (Chofer)

**Hook `useGPSTracking`** (`lib/hooks/useGPSTracking.ts`):
- Se activa solo cuando el viaje está en estados de tránsito (`en_transito_origen` o `en_transito_destino`).
- Usa `navigator.geolocation.watchPosition()` con alta precisión + polling cada **30 segundos**.
- Datos enviados: latitud, longitud, precisión, velocidad (convertida de m/s a km/h), rumbo, altitud.
- Endpoint: `POST /api/gps/registrar-ubicacion`.

**Hook `useChoferMobile`** (`lib/hooks/useChoferMobile.ts`):
- Complementa `useGPSTracking` con datos adicionales: nivel de batería, versión de app.
- Endpoint alterno: `POST /api/tracking/actualizar-ubicacion`.
- Inserta directamente en `tracking_gps` vía Supabase.

### Validaciones de Coordenadas

- **A nivel de base de datos**: Trigger `validar_coordenadas_argentina` rechaza coordenadas fuera de los límites de Argentina (lat -55 a -21, lon -73 a -53).
- **Constraints**: Velocidad 0-200 km/h, rumbo 0-360°, batería 0-100%.

### Consulta de GPS (Coordinador)

| Endpoint | Método | Función |
|---|---|---|
| `/api/gps/ubicaciones-historicas` | GET | Historial GPS de un viaje (todos los puntos, ordenados por timestamp) |
| `/api/gps/estadisticas-viaje` | GET | Estadísticas calculadas: distancia total (Haversine), velocidad promedio/máxima, tiempo total, cantidad de puntos |

**Autorización**: Usuarios verifican pertenencia a la empresa del despacho o a la empresa de transporte. `admin_nodexia` accede a todo.

### Retención de Datos

`limpiar_tracking_antiguo()`: Elimina registros de `tracking_gps` mayores a 30 días. Vista `ultima_ubicacion_choferes` provee la última posición conocida de cada chofer.

---

## 6. Comunicación entre Actores

### Máquina de Estados del Viaje

El sistema implementa una **máquina de estados lineal centralizada** con 18 estados, definida en `lib/estados/config.ts`. Cada transición de estado está gobernada por reglas de autorización por rol.

```
PENDIENTE ──────────► TRANSPORTE_ASIGNADO ──► CAMION_ASIGNADO ──► CONFIRMADO_CHOFER
(coordinador)         (coordinador)           (coordinador)        (chofer)
     │
     │                              ┌─────────────────────────────────────────┐
     ▼                              │          CICLO PLANTA ORIGEN           │
EN_TRANSITO_ORIGEN ──► INGRESADO_ORIGEN ──► LLAMADO_CARGA ──► CARGANDO ──► CARGADO
(chofer)               (control_acceso)     (supervisor)      (supervisor)  (supervisor)
                                                                               │
                                                                               ▼
                                                                        EGRESO_ORIGEN
                                                                        (control_acceso)
                                                                               │
     ┌─────────────────────────────────────────────────────────────────────────┘
     ▼
EN_TRANSITO_DESTINO ──► INGRESADO_DESTINO ──► LLAMADO_DESCARGA ──► DESCARGANDO ──► DESCARGADO
(chofer)                (control_acceso)      (supervisor)         (supervisor)    (supervisor)
                                                                                       │
                                                                                       ▼
                                                                                 EGRESO_DESTINO
                                                                                 (control_acceso)
                                                                                       │
                                              ┌────────────────────────────────────────┘
                                              ▼
                                         COMPLETADO (automático para última parada)
                                         ──ó── EN_TRANSITO_DESTINO (si hay siguiente parada)

     CANCELADO ◄── (cualquier estado no-final, por coordinador/admin)
```

### Roles por Fase del Viaje

| Fase | Actor Principal | Acción |
|---|---|---|
| Creación y asignación | Coordinador (planta) | Crea despacho, asigna transporte/camión |
| Confirmación | Chofer | Confirma asignación desde app móvil |
| Tránsito | Chofer | Inicia viaje, GPS tracking automático |
| Planta (origen/destino) | Control de Acceso | Registra ingreso/egreso |
| Carga/Descarga | Supervisor | Gestiona proceso de carga/descarga |
| Documentación | Coordinador / Supervisor | Remitos, cartas de porte |

### Notificaciones

**Base de datos**: Tabla `notificaciones` con tipos tipados:
- `arribo_origen`, `arribo_destino`, `demora_detectada`, `cambio_estado`
- `recepcion_nueva`, `unidad_asignada`, `viaje_iniciado`, `viaje_completado`, `alerta_sistema`

**Triggers automáticos**:
- `trigger_notificar_arribo_destino`: Notifica a coordinadores de la empresa cliente cuando un viaje llega a estado `arribo_destino`.
- `notificar_coordinadores_empresa()`: Función reutilizable que crea notificaciones para todos los coordinadores de una empresa.

**Push Notifications** (Firebase):
- Service Worker Firebase (`public/firebase-messaging-sw.js`) usa Firebase Messaging SDK 10.7.1.
- Maneja mensajes en segundo plano: muestra notificación del sistema con ícono, vibración (`[200, 100, 200]`), y tag por `viaje_id`.
- Click handler: abre/focaliza la ventana existente o navega a `data.url`.

**Limpieza**: Las notificaciones leídas se eliminan automáticamente después de 7 días.

### Red Nodexia — Marketplace de Transporte

Flujo de marketplace para conectar plantas con transportes:

```
Planta publica viaje ──► viajes_red_nodexia (estado: pending)
                              │
Transporte ve oferta ──► visualizaciones_ofertas (tracking)
                              │
Transporte oferta ────► ofertas_red_nodexia (estado: pending)
                              │
Planta acepta ────────► API /api/red-nodexia/aceptar-oferta:
                         1. Oferta seleccionada → 'aceptada'
                         2. Otras ofertas → 'rechazada'
                         3. viajes_red_nodexia → 'asignado'
                         4. viajes_despacho → 'transporte_asignado'
                         5. despacho.transport_id = transporteId
                         6. origen_asignacion = 'red_nodexia'
                         7. Registro en historial_despachos
```

---

## 7. Estructura de Carpetas

```
nodexia-web/
├── components/                # Componentes React
│   ├── Admin/                 # Gestión de empresas, usuarios admin
│   ├── ControlAcceso/         # UI de control de acceso (QR, registros)
│   ├── Dashboard/             # Dashboard principal + widgets
│   ├── Despachos/             # Gestión de despachos
│   ├── Documentacion/         # Gestión documental
│   ├── forms/                 # Formularios reutilizables
│   ├── layout/                # Layout principal (Sidebar, Header, etc.)
│   ├── Maps/                  # Componentes de mapa (Leaflet)
│   ├── Modals/                # Modales reutilizables
│   ├── Network/               # Red Nodexia UI
│   ├── Planning/              # Planificación y turnos
│   ├── SuperAdmin/            # Panel super admin
│   ├── Transporte/            # Gestión de transporte/flota
│   └── ui/                    # Primitivos UI (botones, inputs, cards)
│
├── lib/                       # Lógica de negocio y utilidades
│   ├── api/                   # Funciones client-side para llamar APIs
│   ├── contexts/              # React Contexts
│   │   ├── UserRoleContext.tsx # Auth state + roles + empresa
│   │   └── FeatureFlagContext.tsx # Feature flags por empresa/rol
│   ├── estados/               # Máquina de estados centralizada
│   │   └── config.ts          # 18 estados, transiciones, roles autorizados
│   ├── helpers/               # Helpers de formato y utilidades
│   ├── hooks/                 # Custom hooks
│   │   ├── useControlAcceso.ts # QR scanning + registros acceso
│   │   ├── useGPSTracking.ts  # GPS tracking para choferes
│   │   ├── useChoferMobile.ts # Dashboard mobile del chofer
│   │   └── useUbicacionActual.ts # Ubicación del usuario control acceso
│   ├── middleware/            # Server-side middleware
│   │   └── withAuth.ts       # JWT + role verification
│   ├── services/              # Servicios de negocio
│   │   └── viajeEstado.ts    # Transiciones de estado + sincronización
│   ├── utils/                 # Utilidades generales
│   ├── validation/            # Schemas de validación
│   ├── validators/            # Validadores de negocio
│   ├── supabaseClient.ts     # Cliente con RLS (client-side)
│   ├── supabaseAdmin.ts      # Cliente service_role (server-side only)
│   ├── supabaseServerClient.ts # Cliente server-side con cookie auth
│   └── types.ts               # Tipos TypeScript centralizados
│
├── pages/                     # Next.js Pages Router
│   ├── api/                   # API Routes (Serverless Functions)
│   │   ├── admin/             # Endpoints de administración
│   │   ├── chofer/            # Endpoints para app chofer
│   │   ├── control-acceso/    # Búsqueda de despachos por QR
│   │   ├── despachos/         # CRUD de despachos
│   │   ├── documentacion/     # Gestión documental
│   │   ├── gps/               # Registrar/consultar GPS
│   │   ├── incidencias/       # Gestión de incidencias
│   │   ├── location/          # Gestión de ubicaciones
│   │   ├── notificaciones/    # Crear/leer notificaciones
│   │   ├── planificacion/     # Recepciones y turnos
│   │   ├── red-nodexia/       # Marketplace de transporte
│   │   ├── relaciones/        # Red privada planta-transporte
│   │   ├── reportes/          # Generación de reportes
│   │   ├── solicitudes/       # Solicitudes de relación
│   │   ├── supervisor-carga/  # Endpoints para supervisor
│   │   ├── tracking/          # Tracking en tiempo real
│   │   ├── transporte/        # Gestión de flota
│   │   ├── turnos/            # CRUD de turnos/slots
│   │   ├── ubicaciones/       # Gestión de ubicaciones
│   │   ├── usuario/           # Perfil y configuración
│   │   └── viajes/            # Gestión de viajes
│   ├── chofer-mobile.tsx      # PWA para choferes
│   ├── dashboard.tsx          # Dashboard principal
│   ├── login.tsx              # Página de login
│   └── [feature].tsx          # ~25 páginas de funcionalidades
│
├── sql/
│   └── migrations/            # 87 migraciones SQL secuenciales
│
├── scripts/                   # Scripts de migración y seed
│   ├── run_migrations_direct.js  # Runner de migraciones (usa pg)
│   └── seed_demo_users.js        # Seed de usuarios demo
│
├── supabase/
│   ├── functions/
│   │   └── expiracion-viajes/ # Edge Function: auto-expiración
│   └── config.toml            # Configuración local de Supabase
│
├── e2e/                       # Tests E2E (Playwright)
├── __tests__/                 # Tests unitarios (Jest)
├── public/
│   ├── sw.js                  # Service Worker v2
│   ├── firebase-messaging-sw.js # Firebase push notifications
│   └── manifest.json          # PWA manifest
│
├── next.config.ts             # Configuración Next.js + security headers
├── vercel.json                # Deploy config (región: São Paulo)
└── package.json               # Dependencias (pnpm)
```

---

## 8. APIs Principales

### Autenticación y Usuarios

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/usuario/perfil` | GET/PUT | Perfil del usuario autenticado |
| `/api/admin/crear-usuario` | POST | Crear usuario + asignar rol en empresa |
| `/api/admin/sync-usuarios` | POST | Sincronizar usuarios empresa |

### Despachos

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/despachos/crear` | POST | Crear nuevo despacho |
| `/api/despachos/actualizar-estado` | PATCH | Cambiar estado (valida transición + rol) |
| `/api/despachos/cancelar` | POST | Cancelar despacho + cascade a viaje |
| `/api/control-acceso/buscar-despacho` | POST | Buscar despacho por QR (3 niveles: exact → prefix → ilike) |

### GPS y Tracking

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/gps/registrar-ubicacion` | POST | Registrar punto GPS desde chofer |
| `/api/gps/ubicaciones-historicas` | GET | Historial GPS de un viaje |
| `/api/gps/estadisticas-viaje` | GET | Estadísticas del viaje (distancia, velocidad, tiempo) |
| `/api/tracking/actualizar-ubicacion` | POST | Actualizar ubicación (alterno, con batería) |

### Red Nodexia (Marketplace)

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/red-nodexia/aceptar-oferta` | POST | Aceptar oferta de transporte |
| `/api/red-nodexia/publicar` | POST | Publicar viaje en marketplace |
| `/api/red-nodexia/ofertar` | POST | Ofertar transporte para un viaje |

### Planificación y Turnos

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/planificacion/recepciones` | GET | Recepciones programadas (por turno o por destino) |
| `/api/turnos/*` | CRUD | Gestión de slots de turno |

### Notificaciones

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/notificaciones/marcar-leida` | POST/PATCH | Marcar notificación(es) como leída(s) |
| `/api/notificaciones/notificar-recepcion` | POST | Notificar recepción programada a empresa destino |

### Documentación

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/documentacion/validar` | POST | Validar documentos (licencia, VTV, seguro) |
| `/api/upload-remito` | POST | Subir remito/carta de porte |

### Incidencias

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/incidencias/*` | CRUD | Gestión de incidencias de viaje (11 tipos, 4 severidades) |

### Reportes

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/reportes/*` | GET | Generación de reportes (PDF/Excel) |

### Transporte y Flota

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/transporte/*` | CRUD | Gestión de flota (camiones, acoplados) |
| `/api/relaciones/*` | CRUD | Red privada planta-transporte |
| `/api/solicitudes/*` | CRUD | Solicitudes de relación entre empresas |

---

## 9. Decisiones de Arquitectura Relevantes

### 9.1 — Pages Router en vez de App Router

Next.js migró a App Router como patrón recomendado, pero Nodexia usa Pages Router. Esto fue una decisión pragmática: el proyecto comenzó antes de la estabilización de App Router y la migración tendría costo sin beneficio funcional claro en el corto plazo.

**Implicancias**: No hay Server Components. Todo el data fetching es client-side (hooks) o via API Routes. No se usa `getServerSideProps`.

### 9.2 — Dos Clientes Supabase (RLS vs Admin)

- `supabaseClient`: Client-side, con JWT del usuario. Respeta RLS. Para operaciones simples dentro de una empresa.
- `supabaseAdmin`: Server-side, service_role key. Bypasea RLS. Para operaciones cross-empresa o con lógica de autorización compleja.

**Decisión**: Operaciones cross-empresa (ej: control de acceso buscando despachos de otra empresa, Red Nodexia) **no pueden** depender de RLS porque RLS filtra por empresa del usuario. Se usa `supabaseAdmin` con autorización a nivel de aplicación vía `withAuth`.

### 9.3 — Estado 1:1 Despacho↔Viaje

Cada despacho tiene exactamente un `viajes_despacho`. El estado canónico vive en `viajes_despacho.estado` y se espeja a `despachos.estado` para simplificar queries.

**Decisión**: Separar las tablas permite aislar datos operativos (timestamps, GPS, carga) de datos administrativos (origen, destino, empresa) sin tablas con 50+ columnas.

### 9.4 — Máquina de Estados Centralizada

Los 18 estados están definidos en un único archivo (`lib/estados/config.ts`) con transiciones válidas, roles autorizados y configuración UI. Esto evita dispersión de lógica de estados en múltiples archivos.

**Consolidación**: Originalmente existían estados separados para "unidad" y "carga" (migraciones 011). Migraciones 058-059 unificaron todo en un flujo lineal. Los estados legacy se mantienen como fallback de mapeo.

### 9.5 — GPS con Polling en vez de WebSocket

El tracking GPS usa HTTP polling (POST cada 30 segundos) en vez de WebSocket persistente.

**Razón**: Los choferes operan con conectividad intermitente en rutas argentinas. HTTP polling con retry es más robusto que mantener un WebSocket abierto. El intervalo de 30 segundos es suficiente para tracking logístico (no es navigación turn-by-turn).

### 9.6 — Service Worker con Network First para Bundles

El SW usa Network First para `/_next/` y `/api/`, con fallback a cache. Esto evita que deploys queden "atrapados" en bundles viejos hasta que el usuario fuerce refresh.

**Aprendizaje**: En producción, la estrategia Cache First original causó que usuarios recibieran JS viejo incluso después de deploys críticos. La migración a Network First + versionado del SW resolvió el problema.

### 9.7 — Migraciones SQL Manuales

Se usan scripts Node.js (`scripts/run_migrations_direct.js`) con el driver `pg` para ejecutar migraciones directamente, en vez de Supabase CLI migrations.

**Razón**: Mayor control sobre el orden y la ejecución, especialmente para migraciones complejas que requieren transacciones. La tabla `schema_migrations` trackea qué migraciones se han ejecutado.

### 9.8 — Región São Paulo Exclusiva

Todo el deployment (Vercel + Supabase) está en la región `gru1` (São Paulo). No hay CDN multi-región ni edge computing distribuido.

**Razón**: Todos los usuarios están en Argentina. La latencia a São Paulo es ~20ms, aceptable para el caso de uso.

### 9.9 — Feature Flags en Base de Datos

El sistema de feature flags usa 3 tablas (`funciones_sistema`, `funciones_empresa`, `funciones_rol`) en vez de un servicio externo como LaunchDarkly.

**Decisión**: Permite granularidad por empresa y por rol sin costo adicional. Los flags se evalúan en el contexto React (`FeatureFlagContext`) con una consulta inicial al cargar la app.

### 9.10 — Security Headers vía next.config.ts

Seguridad HTTP implementada directamente en `next.config.ts`:
- **HSTS**: `max-age=63072000` (2 años) + preload
- **CSP**: Whitelist explícita para Supabase, Google Maps, Firebase
- **X-Frame-Options**: DENY (sin iframes)
- **Permissions-Policy**: Solo `geolocation(self)` permitido

---

## 10. Puntos Débiles o Incompletos

### 10.1 — Ausencia de Rate Limiting

Las API Routes no implementan rate limiting. Un actor malicioso podría bombardear endpoints como `/api/gps/registrar-ubicacion` o `/api/control-acceso/buscar-despacho`. **Riesgo**: DoS a nivel de aplicación, costos de Supabase/Vercel.

**Mitigación sugerida**: Middleware de rate limiting por IP/usuario, o Vercel WAF.

### 10.2 — Validación de Input Inconsistente

Algunos endpoints validan exhaustivamente (ej: `buscar-despacho` valida formato de QR), pero otros aceptan input sin validación formal (sin Zod/Joi schemas). La carpeta `lib/validation/` existe pero no se usa uniformemente.

**Riesgo**: Injection o datos corruptos en endpoints menos maduros.

### 10.3 — No Hay Queue/Retry para Operaciones Críticas

Operaciones como la aceptación de ofertas Red Nodexia ejecutan 7 pasos secuenciales en una sola request. Si falla en el paso 5, los pasos 1-4 quedan committed.

**Riesgo**: Estado inconsistente si la función serverless agota el timeout de 30s o hay un error parcial.

**Mitigación sugerida**: Usar transacciones PostgreSQL (`BEGIN/COMMIT`) o un sistema de saga.

### 10.4 — Sin Tests de Integración para APIs

Los tests existentes son mayormente unitarios (`__tests__/`). La cobertura E2E con Playwright cubre flujos de UI pero no valida APIs directamente. No hay tests de integración que verifiquen cascadas de estado o lógica de autorización cross-rol.

**Riesgo**: Regresiones en lógica de negocio crítica pasan desapercibidas.

### 10.5 — GPS Data Sin Compresión ni Batching

Cada punto GPS se envía como un POST individual cada 30 segundos. Con muchos choferes activos simultáneamente, esto genera alto volumen de requests e inserts.

**Riesgo**: Costos de base de datos. Retención de 30 días mitiga almacenamiento, pero no el throughput.

**Mitigación sugerida**: Batch de puntos (enviar cada 2-5 minutos con buffer local) y/o inserción batch vía `pg` COPY.

### 10.6 — `supabaseAdmin` en Variables de Entorno de Vercel

La service_role key de Supabase está como variable de entorno en Vercel y se usa en todas las API Routes server-side. Si bien Vercel no la expone al cliente, cualquier vulnerability de Server-Side Request Forgery (SSRF) en una API Route podría filtrar esta key.

**Riesgo**: Acceso total a la base de datos si la key se compromete.

**Mitigación sugerida**: Reducir el scope de `supabaseAdmin` donde sea posible. Activar audit logging en Supabase.

### 10.7 — Ausencia de Monitoreo y Alertas

No hay integración con herramientas de APM (Sentry, Datadog, New Relic). Los errores en producción se detectan reactivamente (usuarios reportan).

**Riesgo**: Errores silenciosos, degradación de performance no detectada, incidentes sin postmortem.

### 10.8 — Service Worker como Gestión de Cache

El Service Worker custom maneja estrategias de cache manualmente. Es frágil — errores en el SW pueden dejar a todos los usuarios con una versión rota sin forma fácil de recuperar (requiere versionado manual).

**Riesgo**: Bloqueo de updates si el SW se corrompe.

### 10.9 — Migraciones No Reversibles

Las migraciones SQL son forward-only (no hay rollback scripts). Si una migración causa problemas en producción, requiere una migración correctiva manual.

**Riesgo**: Dificultad para revertir cambios de schema en producción rápidamente.

### 10.10 — CSP con `unsafe-eval` y `unsafe-inline`

La Content Security Policy permite `'unsafe-eval'` y `'unsafe-inline'` en `script-src` y `style-src`. Esto debilita significativamente la protección contra XSS.

**Razón**: Requerido por dependencias (Google Maps, estilos inline de React/Tailwind).

**Riesgo**: XSS persistente si existe una vulnerabilidad de inyección.

**Mitigación sugerida**: Migrar a nonces para scripts inline y evaluar alternativas a `unsafe-eval`.

### 10.11 — Single Point of Failure en Supabase

Toda la infraestructura de datos depende de un único proyecto Supabase. No hay réplica de lectura, failover automatizado ni backup point-in-time configurado explícitamente.

**Mitigación**: Supabase Pro incluye backups automáticos diarios, pero el RTO/RPO no está documentado ni probado.

---

## Apéndice: Supabase Edge Function — Expiración de Viajes

**Ubicación**: `supabase/functions/expiracion-viajes/index.ts`

Función Deno que se ejecuta periódicamente (configurada para cada 15 minutos) y llama al RPC `ejecutar_expiracion_viajes()` para auto-expirar viajes pendientes que superen el plazo permitido.

```
Trigger (cron/manual) → Edge Function → supabaseAdmin.rpc('ejecutar_expiracion_viajes')
                                       → { viajes_expirados: N, timestamp: ISO }
```

---

*Fin del documento.*
