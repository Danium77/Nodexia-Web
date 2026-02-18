# AUDITORÍA TÉCNICA INTEGRAL — NODEXIA WEB

**Fecha:** 17 de Febrero de 2026  
**Autor:** Opus (Tech Lead AI)  
**Solicitante:** Product Owner  
**Contexto:** Pre-demo (28-Feb-2026), evaluación para escalar con equipos de desarrollo

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Seguridad de Datos](#2-seguridad-de-datos)
3. [Estructura para Trabajo en Equipos](#3-estructura-para-trabajo-en-equipos)
4. [Rendimiento y Funcionamiento Web](#4-rendimiento-y-funcionamiento-web)
5. [Base de Datos — Estructura y Desempeño](#5-base-de-datos--estructura-y-desempeño)
6. [Evaluación de Producto — Qué Falta](#6-evaluación-de-producto--qué-falta)
7. [Plan de Acción Estructurado para Equipos](#7-plan-de-acción-estructurado-para-equipos)
8. [Benchmarks vs. Mejores Prácticas del Mercado](#8-benchmarks-vs-mejores-prácticas-del-mercado)

---

## 1. RESUMEN EJECUTIVO

### Estado General del Proyecto

| Dimensión | Nota | Detalle |
|-----------|------|---------|
| **Funcionalidades MVP** | **B+** | Flujos core de logística operativos. 72 páginas, 56 API endpoints, 88 componentes. |
| **Seguridad de Datos** | **C-** | 3 vulnerabilidades críticas, 5 altas. Auth base sólido pero faltan capas. |
| **Estructura para Equipos** | **B-** | Separación por dominio correcta, pero shared layer crea cuellos de botella. |
| **Rendimiento Web** | **D+** | 100% client-side rendering sin caché. N+1 queries. CSS innecesario global. |
| **Base de Datos** | **C+** | Schema bien diseñado (34 tablas, 10 vistas) pero RLS incompleto y sin transacciones. |
| **Testing** | **F** | ~3% cobertura efectiva. 50 tests, la mayoría stubs o skipped. |
| **CI/CD** | **F** | Sin pipeline. Sin staging. Sin quality gates. |
| **Monitoreo Producción** | **F** | Sin Sentry, sin logging estructurado, sin alertas. |
| **Documentación** | **B** | Exhaustiva (200+ docs) pero sprawling. Buenas guías de equipo. |

### Veredicto

> **Nodexia es un MVP funcional con cobertura de features impresionante para un sprint de 10 días con un solo desarrollador.** Sin embargo, tiene deuda técnica significativa en seguridad, testing, y rendimiento que DEBE resolverse antes de ir a producción real o escalar con equipos.

### Top 10 Acciones Prioritarias

| # | Acción | Categoría | Esfuerzo | Impacto |
|---|--------|-----------|----------|---------|
| 1 | Rate limiting en APIs | Seguridad | 1 día | Cierra vulnerabilidad crítica |
| 2 | Instalar Sentry | Monitoreo | 4 horas | Visibilidad de errores en PROD |
| 3 | GitHub Actions CI (build+lint+test) | CI/CD | 1 día | Quality gates básicas |
| 4 | Arreglar RLS de historial_despachos y paradas | Seguridad | 2 horas | Cierra leak de datos cross-empresa |
| 5 | Mover Leaflet CSS fuera de _app.tsx | Performance | 30 min | Mejora carga de TODAS las páginas |
| 6 | Arreglar N+1 queries crear-despacho | Performance | 4 horas | Página principal 10x más rápida |
| 7 | Partir lib/types.ts en módulos por dominio | Equipos | 4 horas | Elimina zona #1 de merge conflicts |
| 8 | Agregar SWR para caché de datos | Performance | 2 días | Elimina re-fetch en cada navegación |
| 9 | Programar cron jobs faltantes | BD | 1 hora | Docs auto-expiran, viajes auto-cancelan |
| 10 | Crear staging environment | CI/CD | 4 horas | Testing pre-producción |

---

## 2. SEGURIDAD DE DATOS

### 2.1 Resumen de Hallazgos

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| **CRÍTICO** | 3 | Todos ABIERTOS |
| **ALTO** | 5 | Todos ABIERTOS |
| **MEDIO** | 6 | Mixto |
| **BAJO** | 4 | Bajo riesgo |

### 2.2 Vulnerabilidades CRÍTICAS

#### C1. Sin Rate Limiting en NINGÚN Endpoint API
- **Impacto:** 40+ endpoints vulnerables a brute-force, credential stuffing y DDoS
- **Contexto:** Reconocido en docs propios como CRÍTICO pero nunca implementado
- **Protección actual:** Solo el rate limiting nativo de Supabase Auth en login
- **Remediación:** Implementar middleware `withRateLimit()` usando `next-rate-limit` o Redis. Aplicar globalmente con límites diferenciados (login: 5/min, GPS: 60/min, admin: 30/min)
- **Esfuerzo:** 1 día

#### C2. Contraseñas Temporales con `Math.random()`
- **Ubicación:** `pages/api/admin/crear-usuario-sin-email.ts` línea 47
- **Problema:** `Math.random()` NO es criptográficamente seguro. El prefijo `temp` es fijo y la parte aleatoria solo tiene ~41 bits de entropía
- **Contraste:** `nueva-invitacion.ts` ya usa `crypto.getRandomValues()` correctamente
- **Remediación:** Reemplazar con `crypto.getRandomValues()` (una línea)
- **Esfuerzo:** 5 minutos

#### C3. Edge Function CORS Permite Cualquier Origen
- **Ubicación:** `supabase/functions/expiracion-viajes/index.ts` línea 11
- **Problema:** `'Access-Control-Allow-Origin': '*'` permite que cualquier sitio web invoque la función que usa service_role key
- **Remediación:** Restringir a `nodexiaweb.com` y `localhost:3000`
- **Esfuerzo:** 5 minutos

### 2.3 Vulnerabilidades ALTAS

#### H1. Endpoints Sin Verificación de Ownership (Escalación Horizontal)
Endpoints que solo verifican autenticación pero NO que el usuario pertenezca a la empresa correcta:

| Endpoint | Riesgo |
|----------|--------|
| `consultar-remito` | Usuario de Empresa A puede consultar remitos de Empresa B |
| `upload-remito` | Cualquier usuario autenticado puede subir remitos |
| `documentacion/upload` | Sin scoping a empresa |
| `documentacion/listar` | Sin scoping a empresa |
| `viajes/[id]/estados` | Sin verificación de ownership |
| `documentacion/[id]` | Sin verificación de ownership |

**Remediación:** Agregar verificación `empresa_id` del usuario vs. recurso en cada endpoint.

#### H2. `select('*')` en API Routes — Overfetching
- 3 API routes server-side (bypasan RLS) + 40+ queries client-side usan `select('*')`
- Transmiten columnas innecesarias y podrían filtrar columnas nuevas futuras
- **Peores:** `viajes/[id]/estados`, `solicitudes/aprobar`, `despachos/timeline`

#### H3. Upload de Remitos Sin Validación de Tipo de Archivo
- **Ubicación:** `pages/api/upload-remito.ts`
- **Problema:** Acepta cualquier archivo (.html, .svg con XSS, .exe). Solo el nombre de archivo se usa para la extensión
- **Contraste:** `documentacion/upload.ts` SÍ valida MIME types correctamente

#### H4. Errores de Supabase Devueltos Crudos al Cliente
- Multiples endpoints devuelven `error.message`, `error.details`, `error.hint`, `error.code` directamente
- Expone nombres de tablas, constraints, y detalles del schema a atacantes
- **Ejemplos:** `documentacion/upload.ts`, `gps/registrar-ubicacion.ts`, `red-nodexia/aceptar-oferta.ts`

#### H5. Contraseña Temporal en Body del Response HTTP
- `nueva-invitacion.ts` devuelve `password_temporal` en la respuesta
- `crear-usuario-sin-email.ts` devuelve el link de activación
- Si se loguean respuestas API o se intercepta la sesión, credenciales expuestas

### 2.4 Vulnerabilidades MEDIAS

| # | Riesgo | Detalle |
|---|--------|---------|
| M1 | Sin middleware.ts global | Un endpoint nuevo sin `withAuth()` queda público automáticamente |
| M2 | `solicitudes_registro` permite INSERTs públicos | Diseño intencional para signup, pero sin rate limiting → flood de registros falsos |
| M3 | QR scan devuelve PII del chofer | DNI, teléfono y email al escanear un QR |
| M4 | Admin listUsers carga 1000 usuarios en memoria | Problema de escala |
| M5 | `eliminar-usuario deleteAll` cascadea agresivamente | Puede borrar despachos operativos |
| M6 | CSP permite `unsafe-eval` y `unsafe-inline` | Debilita protección XSS |

### 2.5 Lo Que YA Está Bien Protegido ✅

| Aspecto | Estado |
|---------|--------|
| `supabaseAdmin` aislado en API routes | ✅ Cero uso en frontend |
| `SUPABASE_SERVICE_ROLE_KEY` no expuesto al cliente | ✅ Sin prefijo `NEXT_PUBLIC_` |
| RLS habilitado en 15+ tablas | ✅ |
| Headers de seguridad (HSTS, X-Frame-Options, X-Content-Type-Options) | ✅ |
| Queries parametrizadas (sin SQL injection) | ✅ |
| `withAuth()` middleware consistente (~87% de endpoints) | ✅ |
| Límite 10MB en uploads | ✅ |
| Validación de coordenadas GPS en DB trigger | ✅ |
| Cleanup de usuario auth en caso de fallo de creación | ✅ |
| `.env` files excluidos de git | ✅ |

---

## 3. ESTRUCTURA PARA TRABAJO EN EQUIPOS

### 3.1 Dominios Identificados (9)

| # | Dominio | Componentes | Páginas | API Routes |
|---|---------|-------------|---------|------------|
| 1 | **Despachos** | `components/Despachos/` (5) | `crear-despacho.tsx`, `despachos/` | `api/despachos/` |
| 2 | **Transporte** | `components/Transporte/` (24) | `pages/transporte/` (10) | `api/transporte/` |
| 3 | **Control de Acceso** | `components/ControlAcceso/` (3) | `control-acceso.tsx` | `api/control-acceso/` (5) |
| 4 | **Admin / SuperAdmin** | `components/Admin/` (8) + `SuperAdmin/` (2) | `pages/admin/` (24) | `api/admin/` (16) |
| 5 | **Chofer (Mobile)** | — | `chofer-mobile.tsx`, `pages/chofer/` (3) | `api/chofer/` |
| 6 | **Red Nodexia** | `components/Network/` (2) | `red-nodexia.tsx`, `pages/red-nodexia/` | `api/red-nodexia/` |
| 7 | **Documentación** | `components/Documentacion/` (6) | `documentos.tsx` | `api/documentacion/` (8) |
| 8 | **Planning** | `components/Planning/` (10) | `planificacion.tsx` | — |
| 9 | **GPS/Tracking** | `components/Maps/` (3) | — | `api/gps/` (3) |

### 3.2 Fortalezas de la Estructura Actual

1. **Componentes organizados por dominio** — Cada equipo tiene su carpeta (`components/Despachos/`, `components/Transporte/`, etc.)
2. **API routes separadas por dominio** — Bajo riesgo de colisiones cross-equipo
3. **Cero imports entre páginas** — Las páginas no dependen unas de otras
4. **4 guías de equipo existentes** en `docs/equipos/` (Frontend, Backend, BD, Mobile)
5. **Buena separación de responsabilidades** a nivel de carpetas

### 3.3 Cuellos de Botella para Trabajo en Equipos

#### 🔴 CRÍTICO: `lib/types.ts` — 970 líneas, monolito de tipos

- **Importado por:** 40+ archivos de todos los dominios
- **Problema:** Cualquier equipo que necesite agregar o modificar un tipo toca este mismo archivo → merge conflicts constantes
- **Solución:** Partir en `types/despachos.ts`, `types/transporte.ts`, `types/admin.ts`, etc. con barrel exports

#### 🔴 CRÍTICO: `lib/contexts/UserRoleContext.tsx` — 584 líneas

- **Importado por:** 50+ archivos (TODOS los dominios)
- **Problema:** Auth + role + empresa + permisos en un solo contexto. Un cambio puede romper todas las páginas
- **Solución:** Extraer interface estable; evitar cambios frecuentes. Documentar contrato.

#### 🟠 ALTO: Páginas monolíticas

| Página | Líneas | Problema |
|--------|--------|---------|
| `crear-despacho.tsx` | 1,593 | 2 devs no pueden trabajar simultáneamente |
| `chofer-mobile.tsx` | 1,306 | Todo el PWA mobile en un archivo |
| `despachos-ofrecidos.tsx` | 984 | — |
| `planificacion.tsx` | 925 | — |
| `supervisor-carga.tsx` | 905 | — |
| `control-acceso.tsx` | 902 | — |

#### 🟡 MEDIO: Problemas menores

| Problema | Impacto |
|----------|---------|
| `components/Modals/` mezcla dominios | `AssignTransportModal`, `CancelarDespachoModal`, `CrearUbicacionModal` deberían estar en sus carpetas de dominio |
| `lib/hooks/` plano (17 hooks sin subdirectorios) | Sin agrupación por dominio |
| `types/` directory + `lib/types.ts` coexisten | Modelo de tipos dual genera confusión |

### 3.4 Distribución Propuesta para 4 Equipos

```
EQUIPO FRONTEND (2-3 devs)
├── Responsabilidad: Pages, Components, UI/UX
├── Dominio: components/*, pages/*.tsx (no API)
├── Shared: components/ui/, components/layout/
└── Tooling: Storybook, tests de componentes

EQUIPO BACKEND (2 devs)
├── Responsabilidad: API routes, middleware, services
├── Dominio: pages/api/*, lib/services/*, lib/middleware/*
├── Shared: lib/supabaseAdmin.ts, withAuth.ts
└── Tooling: API tests, rate limiting, Sentry

EQUIPO BD / DATA (1-2 devs)
├── Responsabilidad: Migrations, RLS, functions, performance
├── Dominio: sql/*, supabase/*, lib/estados/*
├── Shared: lib/types.ts (tipos deben ser generados desde schema)
└── Tooling: Migration runner, pgTAP tests

EQUIPO MOBILE (2 devs)
├── Responsabilidad: App nativa Android/iOS (React Native / Flutter)
├── Dominio: Consumidor de API (ver docs/API-CONTRACT-MOBILE.md)
├── Shared: Contrato API definido, auth compartido
└── Tooling: SDK Supabase, push notifications
```

### 3.5 Prerrequisitos para Onboarding de Equipos

| Prerrequisito | Estado | Prioridad |
|---------------|--------|-----------|
| Partir `lib/types.ts` en módulos | ❌ Pendiente | **P0** |
| CI pipeline (build+lint+test on PR) | ❌ Pendiente | **P0** |
| Branch protection en main | ❌ Desconocido | **P0** |
| Staging environment | ❌ Pendiente | **P0** |
| API documentation (OpenAPI/Swagger) | ❌ Pendiente | **P1** |
| Migration runner automatizado | ❌ Manual con SQL editor | **P1** |
| Pre-commit hooks (husky + lint-staged) | ❌ Pendiente | **P1** |
| Storybook para componentes | ❌ Pendiente | **P2** |
| Types generados desde DB schema | ❌ Manual | **P2** |

---

## 4. RENDIMIENTO Y FUNCIONAMIENTO WEB

### 4.1 Problema Estructural: 100% Client-Side Rendering

| Patrón | Uso |
|--------|-----|
| `getServerSideProps` | Solo 4 páginas admin |
| `getStaticProps` | **0 páginas** |
| `useEffect` + fetch client-side | **30+ páginas** |
| SWR / React Query (caché) | **0** |

**Impacto:** Cada navegación muestra una página vacía con spinner → fetch a Supabase → re-render. No hay caché — volver a una página ya visitada refetchea todo desde cero.

### 4.2 Top 5 Problemas de Performance

#### P1. N+1 Queries en `crear-despacho.tsx` (CRÍTICO)
```
Para 50 despachos → 100+ queries secuenciales
Cada despacho: query viajes_despacho + query empresas por ID
```
- **Debería ser:** 2-3 queries con `.in()` o una vista/RPC server-side
- **Impacto:** Página más usada carga en 3-5 segundos en vez de <1 segundo

#### P2. Leaflet CSS Cargado en TODAS las Páginas (ALTO)
- `import 'leaflet/dist/leaflet.css'` en `_app.tsx` (línea 2) + duplicado en `globals.css`
- ~40KB de CSS que solo usan 3-4 páginas de mapas
- **Fix:** Mover al componente de mapa con `dynamic()` import

#### P3. Modales Importados Estáticamente (ALTO)
- 9+ modales (QR, incidencia, cancelar, asignar, timeline, etc.) se cargan en el bundle inicial
- El usuario puede nunca abrirlos, pero paga el costo de descarga
- **Fix:** `dynamic(() => import('...'), { ssr: false })` para cada modal

#### P4. Sin Caché de Datos — SWR/React Query Ausente (CRÍTICO)
- Navegar Dashboard → Despachos → Dashboard refetchea TODO desde cero
- No hay stale-while-revalidate, no hay deduplicación de requests
- **Fix:** Implementar SWR con revalidación inteligente

#### P5. Doble Librería de Mapas (MEDIO)
- Leaflet + react-leaflet Y @react-google-maps/api + @googlemaps/js-api-loader
- ~150KB+ combinados gzipped
- **Fix:** Elegir uno (Google Maps para mobile/driver, Leaflet para admin dashboard)

### 4.3 Análisis por Página

| Página | fetch Pattern | Queries | Modales estáticos | Memo | Nota |
|--------|--------------|---------|-------------------|------|------|
| `crear-despacho` | client useEffect | ~20 | 7 | 0 | N+1 queries |
| `chofer-mobile` | client useEffect | ~8 | 3 | 0 | Sequential inits |
| `control-acceso` | client useEffect | ~6 | 0 | 0 | Waterfall en QR scan |
| `planificacion` | client useEffect | ~14 | 2 | 0 | 14 queries paralelas |
| `dashboard` | client useEffect | ~5 | 0 | 0 | — |
| `supervisor-carga` | client useEffect | ~6 | 1 | 0 | — |

### 4.4 Optimizaciones Ordenadas por Impacto/Esfuerzo

| # | Optimización | Impacto | Esfuerzo | Páginas Afectadas |
|---|-------------|---------|----------|-------------------|
| 1 | Mover Leaflet CSS a componentes de mapa | 🔴 Alto | 30 min | Todas (~70 páginas beneficiadas) |
| 2 | Arreglar N+1 en crear-despacho con `.in()` | 🔴 Alto | 4 horas | Página principal |
| 3 | Dynamic import modales | 🟠 Alto | 2 horas | 3 páginas más pesadas |
| 4 | Agregar SWR para data fetching | 🔴 Crítico | 2-3 días | Todas las páginas |
| 5 | `useMemo` en listas filtradas | 🟡 Medio | 4 horas | ~10 páginas |
| 6 | `<img>` → `next/image` + remotePatterns | 🟡 Medio | 2 horas | 5 páginas |
| 7 | Bundle analyzer | 🟡 Medio | 30 min | Visibilidad |
| 8 | Eliminar librería de mapas duplicada | 🟢 Bajo | 1 día | Bundle size |

---

## 5. BASE DE DATOS — ESTRUCTURA Y DESEMPEÑO

### 5.1 Schema Overview

| Dimensión | Cantidad |
|-----------|----------|
| **Tablas** | 34 |
| **Vistas** | 10 |
| **Funciones** | 30+ |
| **Triggers** | 9 |
| **Indexes** | ~85 |
| **Cron Jobs** | 3 activos (4 por activar) |
| **Migrations** | 39 archivos (001-060), ad-hoc SQL |

### 5.2 Tablas Principales por Dominio

```
CORE OPERATIVO
├── empresas              → Compañías (planta/transporte/cliente/admin)
├── usuarios_empresa      → Asignación usuario↔empresa↔rol
├── despachos             → Despachos (dispatch orders)
├── viajes_despacho       → Viajes (state machine 18 estados)
├── choferes              → Conductores
├── camiones              → Vehículos
├── acoplados             → Trailers
├── unidades_operativas   → Chofer+camión+acoplado combinados
└── paradas               → Multi-destino (max 4 paradas)

TRACKING & GPS
├── tracking_gps          → Posiciones GPS en tiempo real
├── historial_ubicaciones → GPS histórico (legacy)
└── ubicaciones           → Direcciones/coordenadas

DOCUMENTACIÓN
├── documentos_entidad    → Docs unificados (nuevo)
├── documentos_recursos   → Docs por recurso (legacy)
├── documentos_viaje_seguro → Seguros de viaje
├── auditoria_documentos  → Log de cambios en docs
└── incidencias_viaje     → Incidencias reportadas

RED NODEXIA (Marketplace)
├── ofertas_red_nodexia        → Ofertas publicadas
├── viajes_red_nodexia         → Solicitudes de viaje en red
├── visualizaciones_ofertas    → Tracking de vistas
└── relaciones_empresas        → Relaciones comerciales

AUDITORÍA & ADMIN
├── super_admins               → Super administradores
├── auditoria_estados          → Log de transiciones de estado
├── historial_despachos        → Timeline de eventos
├── cancelaciones_despachos    → Log de cancelaciones
├── historial_unidades_operativas → Cambios en unidades
└── notificaciones            → Push/in-app notifications
```

### 5.3 RLS (Row Level Security) — GAPS CRÍTICOS

#### Tablas CON RLS bien implementado ✅
- `unidades_operativas` — Scoped a empresa en SELECT/INSERT/UPDATE/DELETE
- `documentos_entidad` — Scoped a empresa + rol
- `cancelaciones_despachos` — Scoped a empresa + admin
- `choferes`, `camiones`, `acoplados` — Cross-empresa visibility Functions
- `auditoria_estados` — Scoped via viaje→despacho join

#### ⚠️ Tablas con RLS INSUFICIENTE

| Tabla | Problema | Riesgo |
|-------|----------|--------|
| **`historial_despachos`** | SELECT: `USING (true)` — cualquier usuario lee TODA la historia | **ALTO** |
| **`paradas`** | SELECT: `USING (true)`, INSERT/UPDATE: solo `auth.uid() IS NOT NULL` | **ALTO** |
| **`notificaciones`** | INSERT: `WITH CHECK (true)` — cualquier user puede insertar notificación para otro | **MEDIO** |

#### ❌ Tablas con RLS INCIERTO o AUSENTE

| Tabla | Riesgo | Detalle |
|-------|--------|---------|
| **`empresas`** | **ALTO** | No se encontró `ENABLE ROW LEVEL SECURITY` en migrations activas |
| **`despachos`** | **ALTO** | Solo en archive — no confirmado en PROD |
| **`viajes_despacho`** | **ALTO** | Solo en archive — no confirmado en PROD |
| **`incidencias_viaje`** | MEDIO | Solo en archive |

#### Problema adicional: Roles stale en policies
Algunas policies referencian `'admin_empresa'`, `'coordinador_transporte'`, `'supervisor_planta'` — roles del sistema VIEJO que ya no existen tras la simplificación de roles (migración 022). Estas policies **fallan silenciosamente** (nunca match).

### 5.4 Indexes — Cobertura y Gaps

**Bien indexado (85 indexes):** viajes_despacho (9 indexes), despachos (7), tracking_gps (3 composite), documentos_entidad (5), usuarios_empresa (4)

**Indexes faltantes recomendados:**

| Tabla | Columna(s) | Razón |
|-------|-----------|--------|
| `choferes` | `empresa_id` | FK usada en RLS joins — NO tiene index |
| `camiones` | `empresa_id` | FK usada en RLS joins — NO tiene index |
| `acoplados` | `empresa_id` | FK usada en RLS joins — NO tiene index |
| `empresas` | `tipo_empresa` | Filtro frecuente en RLS subqueries |
| `empresas` | `activa` | WHERE activa = TRUE es común |
| `despachos` | `scheduled_at` | Columna principal de sort en planificación |
| `viajes_despacho` | `updated_at` | ORDER BY y cleanup functions |
| `viajes_despacho` | `estado, updated_at` | Composite para listas ordenadas por estado |

### 5.5 Problemas de Performance de BD

#### 5.5.1 Sin Transacciones en Cambios de Estado (CRÍTICO)
`viajeEstado.ts` ejecuta 6 queries secuenciales sin transaction wrapping:
1. SELECT viaje
2. UPDATE viajes_despacho
3. UPDATE despachos (sync)
4. UPSERT estado_unidad_viaje (legacy)
5. UPSERT estado_carga_viaje (legacy)
6. INSERT historial_despachos

Si #3 falla, #2 ya se committed → despacho y viaje pueden desincronizarse.

#### 5.5.2 Funciones de Visibilidad Cross-Empresa O(N)
`get_visible_chofer_ids()`, `get_visible_camion_ids()`, `get_visible_acoplado_ids()` son `SECURITY DEFINER` usadas en RLS policies. Cada una hace 3 subqueries con JOINs. **Se ejecutan POR CADA FILA** durante un SELECT.

#### 5.5.3 Vistas con Subqueries Correlacionadas
- `vista_disponibilidad_unidades` — 2 subqueries correlacionadas por fila
- `documentos_proximos_vencer` — CASE con subqueries para nombres de entidad
- `vista_historial_unidades` — subqueries para nombres legibles

#### 5.5.4 Cron Jobs No Activados
4 funciones existen pero NO están programadas:

| Función | Consecuencia de NO Ejecutarla |
|---------|-------------------------------|
| `limpiar_viajes_abandonados()` | Viajes stuck en pendiente >72h nunca se cancelan |
| `marcar_documentos_vencidos()` | Docs vencidos aparecen como "validado" |
| `actualizar_vigencia_documentos_batch()` | vigente→por_vencer→vencido nunca se actualiza |
| `limpiar_cancelaciones_antiguas()` | Tabla crece indefinidamente |

#### 5.5.5 Tablas Deprecated Aún Reciben Escrituras
`estado_unidad_viaje` y `estado_carga_viaje` están DEPRECATED pero `viajeEstado.ts` escribe en ellas en CADA cambio de estado → 2 writes innecesarios por transición.

### 5.6 Triggers Existentes (9)

| Trigger | Calidad |
|---------|---------|
| `trigger_validar_coordenadas` (tracking_gps) | ✅ Bueno — valida rango Argentina |
| `tr_viajes_cambio_estado` (viajes_despacho) | ✅ Bueno — auditoría automática |
| `trigger_notificacion_arribo_destino` | ✅ Bueno — notifica coordinadores |
| `trigger_sync_delivery_scheduled` (despachos) | ✅ Bueno — sincroniza campos |
| Triggers de documentos (3) | ✅ Buenos — validación + auditoría + vigencia |
| `trigger_update_unidades_operativas_updated_at` | ✅ Bueno |

### 5.7 Triggers FALTANTES

| Trigger Necesario | Razón |
|-------------------|--------|
| `updated_at` auto en despachos, viajes, choferes, camiones, acoplados | No se actualiza automáticamente |
| Sync despacho.estado cuando viaje.estado cambia | Hoy se hace en app → riesgo de desync |
| Prevenir borrado de chofer/camión asignado a viaje activo | Puede dejar viaje huérfano |
| Validar transición de estado en DB | Hoy solo se valida en TypeScript |

### 5.8 Sistema de Migraciones

**Estado actual: AD-HOC y manual**
- 39 archivos SQL en `sql/migrations/` sin migration runner
- 6 archivos de sync en `sql/` para aplicar manualmente en Supabase SQL Editor
- No hay rollback, no hay versionado, no hay CI
- **Riesgo:** Schema drift entre DEV y PROD es muy probable

---

## 6. EVALUACIÓN DE PRODUCTO — QUÉ FALTA

### 6.1 Testing — Estado Actual

| Tipo | Archivos | Tests Reales | Tests Stub/Skip |
|------|----------|-------------|-----------------|
| Unit (Jest) | 4 | ~15 | ~15 stubs |
| E2E (Playwright) | 4 | ~5 | ~15 skipped |
| **Total** | **8** | **~20** | **~30** |

**Cobertura efectiva: ~3%** (20 tests reales / ~560 archivos significativos)

| Componente | Tests |
|-----------|-------|
| 72 páginas | **0 testeadas** |
| 56 API routes | **0 testeadas** |
| 88 componentes | **0 testeados** |
| Flujos críticos E2E | **0 testeados** (dashboard.spec.ts tiene 11 tests todos `test.skip()`) |
| lib/helpers + estados | 2 archivos testeados (único valor real) |

### 6.2 Monitoreo de Producción

| Necesidad | Estado | Impacto |
|-----------|--------|---------|
| Error monitoring (Sentry) | ❌ Ausente | Errores en PROD son invisibles |
| Session replay (LogRocket) | ❌ Ausente | No se puede debuggear issues de usuario |
| Log aggregation | ❌ Solo `console.log` | Logs perdidos en Vercel Function Logs sin estructura |
| Health check endpoint | ❌ Ausente | No se sabe si el sistema está activo |
| Uptime monitoring | ❌ Ausente | Caídas pasan desapercibidas |
| Performance monitoring | ❌ Ausente | No se miden tiempos de respuesta |
| Alertas | ❌ Ausentes | Nadie se entera de problemas |

### 6.3 CI/CD

| Necesidad | Estado |
|-----------|--------|
| Build verification on PR | ❌ Ausente |
| Test execution on PR | ❌ Ausente |
| Lint on PR | ❌ Ausente |
| Preview deployments | ⚠️ Solo via Vercel auto-deploy |
| Staging environment | ❌ Ausente |
| Database migration automation | ❌ Manual SQL editor |
| Pre-commit hooks | ❌ Ausente |
| Branch protection | ❌ Desconocido |

### 6.4 Features Faltantes para Producción Real

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Rate limiting | ❌ | **P0** |
| Logging estructurado | ❌ | **P0** |
| Error monitoring | ❌ | **P0** |
| Offline support (mobile) | ❌ | P1 |
| Push notifications (configuradas pero no auto) | ⚠️ Parcial | P1 |
| Exportar reportes (PDF/Excel) | ❌ | P1 |
| Audit trail completo (quién hizo qué) | ⚠️ Parcial | P1 |
| Multi-idioma | ❌ Hardcoded Spanish | P2 |
| Accesibilidad (WCAG 2.1) | ❌ Mínima | P2 |
| API pública documentada | ❌ | P2 |
| Backup y disaster recovery verificado | ❌ | P1 |
| GDPR/compliance de datos | ❌ | P1 |

---

## 7. PLAN DE ACCIÓN ESTRUCTURADO PARA EQUIPOS

### 7.1 Fase 0: Fundación (Semana 1-2, pre-equipos)

> **Objetivo:** Crear la infraestructura mínima para que 4 equipos trabajen sin pisarse.

| Tarea | Responsable | Días | Bloquea |
|-------|-------------|------|---------|
| GitHub Actions CI: build + lint + test on PR | DevOps/Backend | 1 | Todo lo demás |
| Branch protection rules en main | DevOps | 0.5 | — |
| Staging environment (Vercel + Supabase DEV) | DevOps | 0.5 | Frontend+Backend testing |
| Partir `lib/types.ts` en módulos por dominio | Frontend | 1 | Trabajo paralelo |
| Pre-commit hooks (husky + lint-staged) | DevOps | 0.5 | — |
| Instalar Sentry (client + API) | Backend | 0.5 | Monitoreo PROD |
| Rate limiting middleware | Backend | 1 | Seguridad PROD |
| Arreglar RLS: historial_despachos, paradas | BD | 0.5 | Seguridad datos |
| Activar 4 cron jobs faltantes | BD | 0.5 | Datos correctos |

### 7.2 Fase 1: Estabilización (Semana 3-4)

| Equipo | Tareas | Resultado |
|--------|--------|-----------|
| **Frontend** | SWR para data caching, dynamic imports modales, Leaflet CSS condicional, `useMemo` en filtros | Páginas 3-5x más rápidas |
| **Backend** | Ownership checks en 6 endpoints, sanitizar error messages, CORS edge function, file type validation upload-remito | Seguridad H1-H5 resueltas |
| **BD** | Missing indexes (choferes/camiones/acoplados.empresa_id), transaction wrapping en estado changes, quitar writes a tablas deprecated | Queries más rápidas, datos consistentes |
| **QA** | Tests E2E para 3 flujos críticos (despacho, acceso, tracking), tests de API para 10 endpoints principales | Cobertura 15%+ |

### 7.3 Fase 2: Profesionalización (Semana 5-8)

| Equipo | Tareas |
|--------|--------|
| **Frontend** | Storybook, component library, refactoring páginas >900 líneas, next/image, accessibility |
| **Backend** | API documentation (OpenAPI), structured logging, health check, performance monitoring |
| **BD** | Migration runner automatizado, validación de transiciones en DB, materialized views para KPIs, partitioning tracking_gps |
| **Mobile** | React Native / Flutter app siguiendo API-CONTRACT-MOBILE.md |
| **QA** | 60%+ cobertura, load testing, security testing OWASP |

### 7.4 Métricas de Éxito por Fase

| Fase | Métrica | Target |
|------|---------|--------|
| 0 | CI pipeline funcionando | 100% PRs verificados |
| 0 | Zero vulnerabilidades críticas | C1/C2/C3 cerrados |
| 1 | Test coverage | >15% |
| 1 | Page load time (LCP) | <2s en páginas principales |
| 1 | Zero vulnerabilidades altas | H1-H5 cerrados |
| 2 | Test coverage | >60% |
| 2 | Component library en Storybook | 100% componentes shared |
| 2 | API documentation | 100% endpoints documentados |
| 2 | Mobile app beta | iOS + Android en TestFlight/Play Console |

---

## 8. BENCHMARKS VS. MEJORES PRÁCTICAS DEL MERCADO

### 8.1 Comparación con Estándares de Plataformas Logísticas

| Práctica | Estándar Industria | Nodexia Actual | Gap |
|----------|-------------------|----------------|-----|
| **Auth & Security** | OAuth2 + MFA + rate limiting + WAF | Supabase Auth + basic roles | MFA, rate limiting, WAF |
| **Testing** | 80%+ cobertura, E2E automated | ~3%, mayormente stubs | 77 puntos porcentuales |
| **CI/CD** | Build→Test→Lint→Preview→Stage→Prod | Solo auto-deploy a Prod | Pipeline completo |
| **Monitoring** | Sentry + Datadog + PagerDuty | Console.log | Todo |
| **Performance** | SSR/ISR + CDN + Redis cache | Client-only, sin caché | SWR/Redis, SSR |
| **Mobile** | App nativa en stores | Solo PWA responsive | App nativa |
| **API** | RESTful documentada con OpenAPI | Ad-hoc endpoints sin docs | OpenAPI |
| **Datos** | GDPR compliance, encryption at rest | Basic Supabase encryption | GDPR policy, encryption |
| **Disponibilidad** | 99.9% SLA con failover | Sin SLA, sin monitoreo | SLA + monitoring |
| **Escalabilidad** | Horizontal scaling, queues | Vercel serverless + Supabase | Aceptable para escala actual |

### 8.2 Plataformas de Referencia (Benchmarks)

**Samsara (Logística SaaS, $800M revenue):**
- Real-time GPS con WebSockets (no polling)
- AI-driven route optimization
- Mobile app nativa iOS/Android
- 99.99% SLA
- SOC 2 Type II compliance

**Project44 (Supply Chain visibility):**
- Event-driven architecture
- REST + GraphQL APIs
- Multi-tenant con isolación completa
- Real-time webhooks para integraciones

**Lo que Nodexia hace MEJOR que su etapa sugeriría:**
- ✅ State machine bien diseñada (18 estados, transiciones validadas)
- ✅ Multi-tenant desde el día 1
- ✅ Red Nodexia (marketplace) — feature diferenciador
- ✅ QR-based access control — innovador para el mercado argentino
- ✅ Documentación exhaustiva del proyecto

### 8.3 Roadmap para Alcanzar Estándares de Mercado

```
AHORA (MVP) ───────── 3 MESES ───────── 6 MESES ───────── 12 MESES
│                      │                  │                  │
├─ Auth básico         ├─ Rate limiting   ├─ MFA opcional    ├─ SOC 2 prep
├─ RLS parcial         ├─ RLS completo    ├─ Encryption      ├─ Security audit
├─ 3% tests            ├─ 30% tests      ├─ 60% tests       ├─ 80%+ tests
├─ Sin CI              ├─ CI básico       ├─ CD completo     ├─ Feature flags
├─ Sin monitoreo       ├─ Sentry          ├─ Full APM        ├─ SLA 99.9%
├─ Client-side only    ├─ SWR cache       ├─ SSR + Redis     ├─ Edge caching
├─ PWA                 ├─ PWA mejorado    ├─ App nativa beta ├─ App en stores
├─ Spanish only        ├─ i18n framework  ├─ PT/EN support   ├─ Multi-idioma
└─ SQL manual          └─ Migration CI    └─ Auto-migration  └─ Schema versioning
```

---

## APÉNDICES

### A. Archivos Auditados

| Categoría | Archivos Revisados |
|-----------|-------------------|
| Pages | 72 archivos en `pages/` |
| API Routes | 56 endpoints en `pages/api/` |
| Components | 88 archivos en `components/` |
| Library | 38+ archivos en `lib/` |
| Database | 39 migrations, 6 sync scripts, 10 vistas |
| Config | next.config.ts, tsconfig.json, vercel.json, postcss.config.mjs |
| Tests | 8 archivos (4 unit, 4 E2E) |
| Documentation | 200+ docs en `docs/` |

### B. Herramientas Recomendadas

| Necesidad | Herramienta | Costo |
|-----------|-------------|-------|
| Error Monitoring | Sentry | Free tier (5K events/mes) |
| CI/CD | GitHub Actions | Free (2000 min/mes) |
| Rate Limiting | upstash/ratelimit | Free tier |
| Data Caching | SWR (Vercel) | Open source |
| Bundle Analysis | @next/bundle-analyzer | Open source |
| Pre-commit | Husky + lint-staged | Open source |
| API Docs | next-swagger-doc | Open source |
| Uptime | UptimeRobot | Free tier |
| Logging | Axiom / Vercel Logs | Free tier |

### C. Riesgo de NO Hacer Nada

| Si NO se implementa... | Consecuencia |
|------------------------|--------------|
| Rate limiting | Bot puede crashear APIs, brute-force passwords |
| Sentry | Bug en PROD tarda días/semanas en detectarse |
| CI pipeline | Código roto llega a producción |
| RLS fixes | Empresa A ve datos de Empresa B |
| Cron jobs | Documentos vencidos aparecen como válidos, viajes abandonados saturan el sistema |
| Testing | Cada cambio puede romper funcionalidad existente sin saberse |

---

**Fin de la Auditoría**

*Documento generado por análisis automatizado del codebase completo.*
*Para preguntas técnicas: consultar con el Tech Lead AI (Opus).*
