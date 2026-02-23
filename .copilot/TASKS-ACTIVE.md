# TAREAS ACTIVAS

**Actualizado:** 22-Feb-2026 (Sesión 30 — Incidencias System + Despacho Edit/Reprogramar + CA Rework + Security Audit)

---

## 🔄 EN PROGRESO

### Evaluación Arquitectura para Equipos (PRÓXIMA SESIÓN)
**Estado:** Pendiente — solicitado por PO
**Objetivo:** Determinar si la arquitectura actual permite separar trabajo en equipos:
- Frontend (React/Next.js)
- Backend (API routes/Services)
- BD (Supabase/PostgreSQL)
- Android (app nativa)
- iOS (app nativa)
**Análisis requerido:** Acoplamiento actual, contratos API, shared types, migration strategy, mobile API contract

### Pre-Demo (28-Feb-2026 — 6 días)
**Estado:** En preparación
- ✅ Flujo E2E completo validado (todos los actores)
- ✅ Self-delivery flow para destinos no-Nodexia
- ✅ UX improvements: Flota unificada, detail page, modal compacto
- ✅ Security audit + performance indexes (Sesión 24)
- ✅ Documentación de equipos (4 guías: Frontend, Backend, BD, Mobile)
- ✅ Refactoring páginas grandes (15 componentes extraídos, 4 páginas)
- ✅ Principios de arquitectura documentados (QUICK-START-OPUS.md)
- ✅ Migration 062: RLS cross-company documentos_entidad (EJECUTADA en PROD)
- ✅ Patrón API sin bypass: createUserSupabaseClient + withAuth.token
- ✅ 4 endpoints control-acceso migrados a RLS
- ✅ Bugs timestamp corregidos (llamado_carga + egreso, patrón best-effort)
- ✅ Detalle despacho con remito images + timeline API
- ✅ Supervisor tabs: Cargas | Descargas | Completados | Escáner QR
- ✅ Descarga requiere foto remito entrega
- ✅ Auto-completar viaje tras egreso destino (Sesión 28)
- ✅ Badges unificados estados-camiones — 6 badges para todos los roles (Sesión 29)
- ✅ Diseño sistema incidencias documentado (Sesión 28)
- ✅ Migration 064 ejecutada — incidencias sistema provisorio (Sesión 29)
- ✅ Fix clasificación despachos en tabs — estado computado desde viajes (Sesión 29)
- ✅ Fix creación incidencias API 500 — supabaseAdmin + columna fix (Sesión 29)
- ✅ Restaurar `documentos_afectados` en API incidencias (Sesión 30)
- ✅ Sistema incidencias completo: API CRUD + detail page + doc resolution (Sesión 30)
- ✅ Incidencias en sidebar para 5 roles (Sesión 30)
- ✅ APIs despachos actualizar + reprogramar con notificaciones (Sesión 30)
- ✅ Estados-camiones CA rework — origin/destination tracking (Sesión 30)
- ✅ Doc upload auto-resolve empresa_id cross-company (Sesión 30)
- ✅ Doc listing cross_empresa role-gated (Sesión 30)
- ✅ UX fixes para demo (6 fixes) (Sesión 30)
- ✅ Security audit pre-deploy + fixes (Sesión 30)
- ✅ Script/guión de demo (GUION-DEMO-28FEB.md) (Sesión 30)
- ⬜ **Migration 063 pendiente ejecución en Supabase** (RLS documentos_viaje_planta)
- ⬜ Verificar incidencias E2E completo
- ⬜ Preparación datos demo

### Incidencias System (Sesión 28-30 — COMPLETADO)
**Estado:** ✅ Completado
**Diseño:** `docs/diagramas/INCIDENCIAS.md`
- ✅ Auditoría del estado actual (2 tablas, inconsistencias, gaps)
- ✅ Diseño propuesto (tabla unificada, CRUD, permisos, UI)
- ✅ API CRUD: GET/POST /api/incidencias, GET/PATCH /api/incidencias/[id]
- ✅ Detail page: pages/incidencias/[id].tsx con doc resolution panel
- ✅ Sidebar links para 5 roles
- ✅ Security: POST usa createUserSupabaseClient (RLS enforced)
- ⬜ Tests (post-MVP)

### Circuito Ambas-Plantas-Nodexia (Feature)
**Estado:** Definición completa, implementación parcial
- ✅ Circuito PM definido (4 preguntas respondidas por PO)
- ✅ Supervisor tabs Cargas + Descargas implementados
- ✅ ViajeAcciones soporta descarga con remito
- ⬜ Planning: mostrar recepciones en grilla semanal (coordinador destino)
- ⬜ Chofer: detectar destino-Nodexia, deshabilitar self-delivery
- ⬜ Data pipeline: fetch despachos donde MI planta es destino (empresa_destino_id o similar)

### Testing Pendiente
**Estado:** Pendiente
- ⬜ Test despachos ofrecidos / cargas en red en PROD
- ⬜ Red Nodexia flow completo en PROD

### Security P1
**Estado:** Pendiente (Post-MVP)
- ⬜ Rate limiting middleware (auditoría C1 - CRÍTICO)
- ⬜ CORS middleware para mobile apps
- ⬜ Math.random() → crypto en crear-usuario-sin-email (auditoría C2 - CRÍTICO)
- ⬜ Edge Function CORS restrict (auditoría C3 - CRÍTICO)
- ⬜ Ownership checks en 6 endpoints (auditoría H1 - ALTO)
- ⬜ RLS fix: historial_despachos y paradas (auditoría - ALTO)
- ⬜ **Refactor supabaseAdmin pre-existente:** upload.ts, validar.ts, timeline.ts, ubicaciones/crear.ts → createUserSupabaseClient
- ⬜ **Refactor supabaseAdmin despachos:** actualizar.ts, reprogramar.ts → createUserSupabaseClient para queries principales

### Performance P1
**Estado:** Pendiente (Post-MVP)
- ⬜ Mover Leaflet CSS fuera de _app.tsx
- ⬜ Arreglar N+1 queries crear-despacho
- ⬜ Dynamic import modales (9+ modales)
- ⬜ SWR para data caching
- ⬜ Activar 4 cron jobs faltantes en BD

### Infraestructura Equipos P0
**Estado:** Pendiente (Pre-onboarding)
- ⬜ GitHub Actions CI (build+lint+test)
- ⬜ Staging environment
- ⬜ Partir lib/types.ts en módulos por dominio
- ⬜ Instalar Sentry
- ⬜ Pre-commit hooks (husky)

---

## ✅ COMPLETADAS (Sesión 25 — 17-Feb-2026)

### Auditoría Técnica Integral ✅
**Completado por:** Opus directamente — Sesión 25
**Archivo:** `docs/auditorias/AUDITORIA-COMPLETA-2026-02-17.md`
**Contexto:** Evaluación completa del proyecto para escalar con equipos

#### Áreas auditadas:
- Seguridad de datos: 3 críticas, 5 altas, 6 medias, 4 bajas
- Estructura para 4 equipos (Frontend, Backend, BD, Mobile)
- Rendimiento web (performance grade: D+)
- Base de datos (34 tablas, RLS gaps, performance)
- Evaluación de producto vs. mejores prácticas (Samsara, Project44)
- Plan de acción 3 fases con métricas de éxito

### Refactoring Páginas Grandes ✅
**Completado por:** Opus directamente — Sesión 25
**Commit:** `deafb94`
**Contexto:** Extraer componentes de 4 páginas >1000 líneas para mejorar mantenibilidad

#### Resultados:
- `crear-despacho.tsx`: 2405→1593 líneas (-34%) — 5 componentes
- `chofer-mobile.tsx`: 1976→1429 líneas (-28%) — 7 componentes
- `control-acceso.tsx`: 1227→993 líneas (-19%) — 2 componentes
- `supervisor-carga.tsx`: 1157→1014 líneas (-12%) — 1 componente
- **Total: 1,736 líneas extraídas, 15 componentes nuevos**
- Build verificado 5 veces (todas OK)

### Documentación de Equipos Completa ✅
**Completado por:** Opus directamente — Sesión 25
**Contexto:** Crear guías para que equipos externos puedan trabajar en Frontend, Backend, BD y Mobile

#### Archivos creados:
- `docs/equipos/BD-SUPABASE.md` — Guía BD (13 secciones: tablas, RLS, migraciones, funciones, storage, cron, indexes)
- `docs/equipos/MOBILE.md` — Guía Mobile (13 secciones: API, auth, GPS, push, QR, offline, UX)

#### Archivos corregidos:
- `docs/equipos/BACKEND-API.md` — Service layer y estados actualizados a estructura real

---

## ✅ COMPLETADAS (Sesión 24 — 16-Feb-2026, sin cierre formal)

### Security + Performance Audit ✅
**Completado por:** Opus + Usuario — Sesión 24
**Commit:** `60e35fb`
**Contexto:** Auditoría de seguridad + performance previo a demo

#### Security fixes:
- IDOR fixes: preview-url (empresa validation + path traversal), GPS APIs, timeline
- Role restrictions: notificar-recepcion, documentos-detalle, crear-incidencia
- CSP header en next.config.ts
- demo-qr bloqueado en PROD, passwords removidos
- error.message sanitizado de 3 API responses
- 7 clientes Supabase duplicados → singleton

#### Stability:
- ErrorBoundary global en _app.tsx

#### Performance (Migración 060 — ✅ EJECUTADA EN PROD):
- 11 indexes (viajes_despacho, choferes, notificaciones, despachos)
- 3 cleanup functions (tracking_gps 90d, ubicaciones 90d, notificaciones leídas 30d)
- pg_cron jobs activados

### Documentación Equipos (parcial) ✅
- `docs/equipos/FRONTEND.md` — Guía frontend
- `docs/equipos/BACKEND-API.md` — Guía backend API (corregido en sesión 25)

---

## ✅ COMPLETADAS (Sesión 23 — 15-Feb-2026)

### Full Trip Lifecycle E2E Validated ✅
**Completado por:** Opus + Usuario — Sesión 23 (12 rondas)
**Contexto:** Testing completo del ciclo de viaje en PROD + UX redesign

#### Rondas 1-10: E2E Lifecycle Fixes ✅
- GPS tracking real, doc rejection, empresa_id fix
- Supervisor carga UX, estados granularity, remito preview
- TrackingView panels sync, egreso naming
- Commits: `4c24f53` → `530fbc0`

#### Ronda 11: Self-delivery flow ✅
- Chofer mobile: remito upload + "Completar Entrega" auto-chains 3 states
- TrackingView right panel badge fix (carga phases)
- Commit: `02128d8`

#### Ronda 12: Completados UX + Flota Redesign ✅
- Completados tab: hide Asignar/RED, add Ver Detalle
- NEW: Detail page `/despachos/[id]/detalle` (viajes + docs + timeline)
- Flota: 5 tabs → 2 (Unidades + Documentación)
- NEW: UnidadesFlotaUnificado (cards + unidades operativas section)
- Assignment modal: compact 2-col cards
- Commits: `b01f02b`, `64fe2ad`

---

## ✅ COMPLETADAS (Sesión 22 — 15-Feb-2026)

### 8 Bugs E2E Corregidos ✅
**Completado por:** Opus directamente - Sesión 22
**Contexto:** Testing E2E intensivo en PROD del flujo chofer↔viaje

#### Bug 1: id_transporte NULL al vincular chofer ✅
- Commit: `8f9e73f`

#### Bug 2: Duplicate DNI al re-vincular chofer ✅
- Commit: `b057bde`

#### Bug 3: Panel estados LED no enciende ✅
- Commit: `d1d566b`

#### Bug 4: CHECK constraint al confirmar viaje ✅
- Commit: `ca0b7f5`

#### Bug 5: Historial no registra cambios de estado ✅
- Commit: `ca0b7f5`

#### Bug 6: Botones Maps no visibles ✅
- Commit: `f5ae794`

#### Bug 7: Sin campos coordenadas en ubicaciones ✅
- Commit: `f5ae794`

#### Bug 8: GPS tracking auth falla ✅
- Commit: `716e5c3`

---

## ✅ COMPLETADAS (Sesión 19 — 14-Feb-2026)

### Security Hardening — 55/55 API Routes ✅
**Completado por:** Opus (Fases 1-4, sesiones previas + sesión 19)
**Alcance:** TODAS las API routes ahora usan `withAuth` middleware
- Phase 1-3: Bulk migration of routes to withAuth
- Phase 4: Eliminated `withAdminAuth` (replaced with `withAuth({ roles: [...] })`)

### DB Sync PROD ↔ DEV ✅
**Completado por:** Opus + Usuario
**Scripts:** 6 SQL scripts (columns, tables, indexes, functions, views, security)
**Fix rounds:** 5 iteraciones por diferencias PROD vs DEV
**Additional:** empresa_id migration, extra columns sync

### Security P0 Fixes ✅ (commit `aa2ce0e`)
1. delete-despacho.ts — x-admin-secret → withAuth
2. INSTRUCCIONES-DEV-EXTERNO.md — Removed hardcoded passwords
3. solicitudes/aprobar.ts — Removed password_temporal from audit

### PROD Fixes ✅ (commits `002a822`, `1b7dd24`)
1. viajes_despacho.scheduled_at — Column missing → ALTER TABLE
2. despachos-ofrecidos.tsx — FK constraint names fixed

### Vercel Cleanup ✅
- Deleted broken `nodexia-web`, kept `nodexia-web-j6wl` → www.nodexiaweb.com

---

## ✅ COMPLETADAS (Sesión 18 — 13-Feb-2026)

### Codebase Cleanup para Revisión de Cliente ✅
**Completado por:** Opus directamente - Sesión 18
**Objetivo:** Estructura profesional para que un dev del cliente revise el código

#### Archivado masivo:
- **scripts/** — 196 archivos → 5 operativos (archivados a scripts/archive/)
- **sql/** — 229 root → 0, 124 migraciones → 36 canónicas (archivados a sql/archive/)
- **docs/** — 244 archivos → 15 operativos (archivados a docs/archive/)

#### Dead code eliminado:
- **lib/** — 7 módulos muertos: email/, errors/, navigation.ts, type-guards.ts, api/middleware.ts, contexts/UserRoleContext.jsx, hooks/useNotifications.ts, utils/roleHelpers.js
- **components/** — 27 componentes muertos: Dashboard chain (6), SuperAdmin managers (5), forms (3), Modals (2), ui duplicates/dead (7), Despachos (1), ControlAcceso (1), context (1)
- **hooks/** — 3 dead: useDashboardKPIs, useSuperAdmin, useNotifications
- **Stale artifacts** — .vscode/settings.json + tsconfig.json en Admin/, Planning/, Transporte/, SuperAdmin/

#### Fixes:
- `lib/contexts/UserRoleContext.tsx` — getPrimaryRole inlined (was importing deleted navigation.ts)
- `components/ui/index.ts` — barrel limpiado (removed deleted exports)
- `.gitignore` — playwright-report/, test-results/, archive dirs

#### Verificación:
- Build: 0 errores ✅
- **Git:** Commit b582da2, pusheado a main

### Deuda Técnica: Centralización estado_carga_viaje ✅
**Completado por:** Opus directamente - Sesión 18
**Problema:** supervisor-carga.tsx usaba `actualizarEstadoDual()` con 2 API calls separadas — si estado_carga fallaba, continuaba silenciosamente
**Solución:** `cambiarEstadoViaje()` ahora sincroniza automáticamente `estado_carga_viaje` cuando el estado es carga-related
**Archivos modificados:**
- `lib/services/viajeEstado.ts` — Nueva función `sincronizarEstadoCarga()` + ESTADOS_CON_CARGA + ESTADO_A_TIMESTAMP_CARGA
- `pages/supervisor-carga.tsx` — `actualizarEstadoDual` reemplazado por `actualizarEstado` (single call)
- Eliminada dependencia de `lib/api/estado-carga.ts` en supervisor-carga

### Deuda Técnica: Deprecar lib/estadosHelper.ts ✅
**Completado por:** Opus directamente - Sesión 18
**Archivos creados:** `lib/estados/operativo.ts` (funciones UI: calcularEstadoOperativo, getColorEstadoOperativo, etc.)
**Archivos modificados:**
- `lib/estados/index.ts` — Re-exporta operativo.ts
- `lib/estadosHelper.ts` — Marcado DEPRECATED, solo re-exports
- `pages/crear-despacho.tsx` — Import migrado a `../lib/estados`
- `pages/planificacion.tsx` — Import migrado a `../lib/estados`
- `components/Planning/PlanningGrid.tsx` — Import migrado a `../../lib/estados`

### Prep Deploy Vercel (TASK-S24 parcial) ✅
**Completado por:** Opus directamente - Sesión 18
**Archivos creados:** `vercel.json`
**Verificaciones:**
- Build de producción: 0 errores ✅
- Tests estados: 56/56 pasan ✅
- localhost refs: todos con fallback a NEXT_PUBLIC_SITE_URL ✅
- File uploads: formidable + fs.readFileSync compatible con Vercel serverless ✅
**Git:** Commit b582da2, pusheado a main

---

## ✅ COMPLETADAS (Sesiones 16-17 — 13-Feb-2026)

### Centralización Completa de Estados ✅
**Completado por:** Opus directamente - Sesiones 16-17
**Alcance:** Reestructuración arquitectónica del sistema de estados para escalabilidad de equipo

#### 1. Sistema de estados centralizado ✅
- `lib/estados/config.ts` — 17+1 estados, TRANSICIONES_VALIDAS, ROLES_AUTORIZADOS, ESTADO_DISPLAY
- `lib/estados/index.ts` — Re-exports
- Legacy mapping en getEstadoDisplay() para backward compatibility

#### 2. Services layer ✅
- `lib/services/viajeEstado.ts` — cambiarEstadoViaje() sincroniza 3 tablas + timestamps automáticos
- `lib/services/notificaciones.ts` — notificarCambioEstado() centralizado
- ESTADO_A_TIMESTAMP: cada estado popula su columna timestamp en estado_unidad_viaje

#### 3. Purga de estados obsoletos (30+ archivos) ✅
- Eliminados del código ejecutable: arribo_origen, arribo_destino, en_playa_origen, viaje_completado, entregado, vacio, disponible_carga, etc.
- Solo permanecen en: config.ts legacy mapping (intencional), SQL histórico, tipo de notificación

#### 4. Migración confirmar-accion.ts ✅
- Antes: RPC validar_transicion_estado_unidad (desync risk)
- Ahora: cambiarEstadoViaje() + notificarCambioEstado()

#### 5. cancelarViaje() centralizado ✅
- Antes: update directo en estado_unidad_viaje
- Ahora: ruta via API → cambiarEstadoViaje()

#### 6. Lectura estandarizada ✅
- Todos: `estado || estado_unidad` (estado es canónico)
- estados-camiones.tsx: .in('estado') en vez de .in('estado_unidad')

#### 7. SQL Migration 058 + 059 ✅ EJECUTADAS
- 058: Migración de estados legacy, tabla paradas, CHECK constraints
- 059: Unificar estado_unidad_viaje, sync con viajes_despacho.estado

#### 8. 56 tests automatizados ✅
- `__tests__/lib/estados-config.test.ts`
- Completeness, transitions, happy-path, roles, legacy mapping, graph integrity (BFS)

#### 9. 0 TypeScript errors ✅

---

## ✅ COMPLETADAS (Sesión 14 — 12-Feb-2026)

### Fix: DSP-20260211-004 Chofer/Camión No Muestra ✅
**Completado por:** Opus directamente - Sesión 14
**Causa raíz dual:**
1. `AsignarUnidadModal` usaba client-side Supabase → RLS bloqueaba UPDATE
2. `enRedPendiente` en crear-despacho.tsx nullificaba `chofer_id` incluso cuando ya estaba asignado
**Archivos creados:** `pages/api/transporte/asignar-unidad.ts` (~104 líneas, service role)
**Archivos modificados:**
- `components/Transporte/AsignarUnidadModal.tsx` — Usa API route en vez de Supabase directo
- `pages/crear-despacho.tsx` — `enRedPendiente` ahora chequea `!v.chofer_id` + display intermedio "⏳ Pendiente asignación"

### Feature: Historial/Timeline de Eventos ✅
**Completado por:** Opus directamente - Sesión 14
**Archivos creados:**
- `sql/migrations/055_historial_despachos.sql` — Tabla para eventos custom (⚠️ pendiente ejecución)
- `pages/api/despachos/timeline.ts` — API que construye timeline híbrido (timestamps existentes + tabla historial)
- `components/Despachos/TimelineDespachoModal.tsx` — Modal con filtros por tipo, agrupación por fecha, timestamps relativos
**Archivos modificados:**
- `pages/crear-despacho.tsx` — Import + state + botón 📜 Historial + modal rendering
- `pages/api/red-nodexia/aceptar-oferta.ts` — Escribe al historial al aceptar oferta
- `pages/api/transporte/asignar-unidad.ts` — Escribe al historial al asignar unidad

### TASK-S26: Fase 5 — Destino con Nodexia ✅
**Completado por:** Opus directamente - Sesión 14
**Hallazgo:** Fase 5 ya estaba implementada (estados, transiciones, UI, supervisor descarga) — solo faltaba auto-detección de `tipo_operacion`
**Archivos modificados:**
- `pages/control-acceso.tsx` — Auto-detecta envio/recepcion por `empresa_id` de ubicación + security check permite empresa destino

### TASK-S27: Cierre Automático del Viaje ✅
**Completado por:** Ya implementado en Sesión 13
**Confirmado en Sesión 14:**
- `vacío → viaje_completado` automático (estado-unidad.ts paso 4)
- Despacho → `completado` cuando todos viajes terminan (paso 5)
- Despacho → `cancelado` cuando todos viajes cancelados

### Polish para Demo ✅
**Completado por:** Opus directamente - Sesión 14
**Fixes:**
1. `viajes-activos.tsx` — Query incluye Phase 5 states (viajes no desaparecen mid-journey)
2. `chofer/viajes.tsx` — Alias `arribo_destino` para que chofer no quede sin acciones
3. `despachos-ofrecidos.tsx` — Phase 5 states excluidos de tab "pendientes"
4. `estado-unidad.ts` — `arribo_destino → vacio` permitido (shortcut non-Nodexia destinations)

---

## ✅ COMPLETADAS (Sesión 12 — 11-Feb-2026)

### Hardening de Seguridad ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** e3b8e29
**Archivos eliminados:** ~20 API routes peligrosas (debug, test, bypass, delete-all)
**Archivos modificados:** `next.config.ts` (security headers), `pages/api/gps/save-location.ts` (auth fix), `pages/admin/nueva-invitacion.ts` (hardcoded password)
**Archivos limpiados:** Leaked Supabase key removida de docs

### Fix Viajes no se expandían ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** a786b89
**Problema:** Query con joins complejos a estado_carga_viaje/camiones/choferes/acoplados fallaba silenciosamente
**Solución:** Simplificado a `select('*')` — datos de entidades se buscan por separado

### Fix Red Nodexia datos stale ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** d0cac1c
**Problema:** Viaje en Red Nodexia mostraba chofer/camión/acoplado antes de confirmación
**Solución:** Override con "En Red Nodexia", "Esperando oferta", dashes cuando viaje no está en movimiento físico

### Esquema Definitivo de Estados ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** 9efe9a7
**Archivos reescritos:** `lib/estadosHelper.ts` (completo)
**Archivos modificados:** `pages/crear-despacho.tsx` (tabs + badges), `pages/api/viajes/[id]/estado-unidad.ts` (transición)
**Cambios:**
- 22 estados en 7 fases (0-Creación a 6-Cierre + X-Cancelado)
- Constantes: ESTADOS_FASE_ASIGNACION, ESTADOS_EN_MOVIMIENTO, ESTADOS_EN_PLANTA, ESTADOS_FINALES
- Helpers: estaEnMovimiento(), estaEnAsignacion(), esFinal(), estaEnPlanta()
- calcularEstadoOperativo() simplificado: Final>EnPlanta>EnMovimiento>Asignación
- Tab categorización exclusiva (expirado excluye demorado, demorado excluye asignado/en_proceso)
- Badge counts consistentes con filtros
- API: arribo_destino permite arribado_destino (destinos sin Nodexia)

---

## ✅ COMPLETADAS (Sesión 11 — 10-Feb-2026)

### Flujo Remito + Egreso + Chofer E2E ✅
**Completado por:** Opus directamente - Sesión 11
**Archivos creados:** `pages/api/upload-remito.ts`, `pages/api/consultar-remito.ts`, `pages/api/chofer/viajes.ts`
**Archivos modificados:** `supervisor-carga.tsx`, `control-acceso.tsx`, `chofer/viajes.tsx`, `api/viajes/[id]/estado-unidad.ts`, `crear-despacho.tsx`, `viajes-activos.tsx`
**Resultado:** Flujo completo funciona E2E — supervisor sube remito → CA valida y egresa → chofer viaja a destino → chofer finaliza

### API estado-unidad sin RPC ✅
**Completado por:** Opus directamente - Sesión 11
**Problema:** `supabase.rpc('actualizar_estado_unidad')` no existía
**Solución:** Reescrito con tabla TRANSICIONES_VALIDAS en JS + update directo

### Display de estados corregido ✅
**Completado por:** Opus directamente - Sesión 11
**Problema:** `arribado_destino` mostraba "Pendiente", `fuera_de_horario` excluía de tabs
**Solución:** Labels, filtros, estilos y exclusiones corregidos en crear-despacho.tsx y viajes-activos.tsx

### Esquema General Documentado ✅
**Completado por:** Opus directamente - Sesión 11
**Archivo creado:** `docs/ESQUEMA-GENERAL-NODEXIA.md`

---

## ✅ COMPLETADAS (Sesión 10 — 10-Feb-2026)

### BUG-01: Control de acceso bloqueaba por docs "por vencer" ✅
**Completado por:** Opus directamente - Sesión 10
**Problema:** Docs "por vencer" (vence en 16 días) causaban bloqueo de ingreso en control de acceso
**Causa raíz dual:**
1. Trigger `actualizar_vigencia_documento` solo corre en INSERT/UPDATE → `estado_vigencia` stale en BD
2. Evaluación usaba conteo global de vencidos en vez de vencidos por tipo requerido
**Archivos modificados:** `pages/api/control-acceso/verificar-documentacion.ts`
**Cambios:**
- Nueva función `calcularVigenciaReal()` — recalcula vigencia desde `fecha_vencimiento` en tiempo real
- Nuevos campos `vencidos_criticos` y `por_vencer_criticos` — solo docs requeridos
- Para cada tipo requerido, toma el MEJOR doc disponible (vigente > por_vencer > pendiente > vencido > rechazado)
- Handler usa `vencidos_criticos` para bloqueado, `por_vencer_criticos` para advertencia

### BUG-02: Incidencias retornaba 500 ✅
**Completado por:** Opus directamente - Sesión 10
**Problema:** POST a `/api/control-acceso/crear-incidencia` retornaba 500
**Causa raíz:** 3 schemas distintos de tabla `incidencias_viaje` — API esperaba columnas que no existían
**Archivos modificados:** `pages/api/control-acceso/crear-incidencia.ts`
**Archivos creados:** `sql/migrations/053_fix_incidencias_viaje.sql`
**Cambios:**
- API ahora intenta schema nuevo primero, fallback a schema viejo si falla
- Migración 053: unifica tabla con columnas correctas + CHECK constraints + RLS

### BUG-03: Upload documentos retornaba 500 ✅
**Completado por:** Opus directamente - Sesión 10
**Problema:** SubirDocumento.tsx error "Error al registrar documento" (upload API 500)
**Causa raíz dual:**
1. `fecha_emision DATE NOT NULL` pero frontend no envía fecha → null violates constraint
2. `UNIQUE (entidad_tipo, entidad_id, tipo_documento, activo)` → 3er upload falla: desactivar 2do conflicta con 1er inactivo
**Archivos modificados:** `pages/api/documentacion/upload.ts`
**Archivos creados:** `sql/migrations/054_fix_documentos_entidad_constraints.sql`
**Cambios:**
- `fecha_emision` usa fecha actual como fallback si no se proporciona
- Desactivación robusta: si UPDATE falla, elimina inactivos viejos y reintenta
- Migración 054: `fecha_emision` nullable + partial UNIQUE index (solo activo=true)

---

## ✅ COMPLETADAS (Sesión 7 — 09-Feb-2026)

### TASK-S16: UX Documentos Requeridos por Entidad ✅
**Completado por:** Opus directamente - Sesión 7
**Archivos modificados:** `components/Transporte/DocumentosFlotaContent.tsx`
**Cambios:**
- Rediseño completo: DOCUMENTOS_REQUERIDOS config por tipo de entidad
- Chofer: licencia_conducir, art_clausula_no_repeticion, seguro_vida_autonomo
- Camión/Acoplado: seguro, rto, cedula
- Upload inline por tipo de doc con SubirDocumento (tiposPermitidos)
- Badges de estado, resumen Completo/Incompleto/En validación

### TASK-S17: Página Validación Documentos Admin ✅
**Completado por:** Opus directamente - Sesión 7
**Archivos creados:** `pages/admin/validacion-documentos.tsx` (~400 líneas)
**Archivos modificados:** `components/layout/Sidebar.tsx`, `pages/admin/super-admin-dashboard.tsx`
**Cambios:**
- Filtros por estado (pendiente/todos/vigente/rechazado/vencido)
- Aprobar con 1 click, rechazar con motivo obligatorio
- Enriquecimiento de entidad (nombre chofer/camión + empresa)
- Acceso: super_admin y admin_nodexia
- Link en Sidebar + Card en Super Admin Dashboard

### TASK-S18: Tab Ingresados en Despachos ✅
**Completado por:** Opus directamente - Sesión 7
**Archivos modificados:** `pages/crear-despacho.tsx`
**Cambios:**
- Tab 🏭 Ingresados entre Asignados y Demorados
- Query trae estado_unidad de viajes_despacho
- ESTADOS_INGRESADOS: ingresado_origen, en_playa_origen, en_carga, cargado, en_balanza, cargando, llamado_carga
- Detección chequea AMBOS campos (estado_unidad + estado)
- Badge colors: cyan, teal, amber, indigo por estado

### TASK-S19: Fix Bugs de Testing en Vivo (4 bugs) ✅
**Completado por:** Opus directamente - Sesión 7
**Archivos modificados:** `pages/control-acceso.tsx`, `lib/api/estado-unidad.ts`, `pages/crear-despacho.tsx`
**Bugs corregidos:**
1. estado_unidad "expirado" → whitelist ESTADOS_UNIDAD_VALIDOS + fallback
2. Historial N/A → queries separadas en vez de nested joins
3. Estado no propaga → actualizar AMBAS columnas estado + estado_unidad
4. Tab Ingresados vacía → chequear ambos campos + más estados

### TASK-S20: UTF-8 Fixes + Alerta Ya Ingresado ✅
**Completado por:** Opus directamente - Sesión 7
**Archivos modificados:** `pages/admin/super-admin-dashboard.tsx`, `pages/control-acceso.tsx`
**Cambios:**
- Mojibake corregido: AdministraciÃ³n → Administración, â†' → →, etc.
- Alerta cyan "Ya ingresado" al re-escanear viaje con estado ingresado

---

## ✅ COMPLETADAS (Sesiones anteriores)

### TASK-S01: API Upload de Documentación ✅
**Completado por:** Sonnet (Backend) → **Revisado y corregido por Opus**  
**Archivos:** `pages/api/documentacion/upload.ts`, `listar.ts`, `[id].ts`

### TASK-S02: Componente UI SubirDocumento ✅
**Completado por:** Sonnet (Frontend) → **Revisado y corregido por Opus**  
**Archivos:** `components/Documentacion/SubirDocumento.tsx`, `ListaDocumentos.tsx`, `DocumentoCard.tsx`, `index.ts`

### TASK-S03: API Validación de Documentos (Admin) ✅
**Completado por:** Sonnet → Opus  
**Archivos:** `pages/api/documentacion/validar.ts`, `pendientes.ts`

### TASK-S04: Panel de Validación UI (Admin) ✅
**Completado por:** Sonnet → Opus  
**Archivos:** `pages/admin/documentacion.tsx`, `components/Admin/DocumentacionAdmin.tsx`, `DocumentoPendienteCard.tsx`

### TASK-S05-S07: Control Acceso docs + incidencias + egreso ✅
### TASK-S08: Estado docs en Unidades Operativas ✅
### TASK-S09: Alertas de Vencimiento ✅
### TASK-S10: Limpiar Página Legacy Documentación ✅
### TASK-S11: Upload Documentos desde Perfil Chofer ✅
### TASK-S12: Métricas en Dashboard de Transporte ✅
### TASK-S13-S15: Control Acceso redesign + fixes Sesión 5 ✅

---

## 🎯 PRÓXIMAS TAREAS (Sesión 19+)

### REFERENCIA: Esquema General
**Archivo:** `docs/ESQUEMA-GENERAL-NODEXIA.md`
- Mapa completo de 6 fases, roles, estados, API routes, tablas
- Consultar antes de cada sesión para contexto

### ✅ COMPLETADO: Migraciones 055 + 056 en BD PROD (Sesión 20)
- ✅ `055_historial_despachos.sql` — Ya existía en PROD (creada en sync sesión 19)
- ✅ `056_fix_rls_viajes_red_rechazados.sql` — Ejecutada exitosamente
- ✅ 058 + 059 ya ejecutadas previamente

### DEUDA TÉCNICA RESTANTE:

#### 1. ✅ COMPLETADO: Centralizar estado_carga_viaje (Sesión 18)

#### 2. Renombrar prop estado_unidad → estado (Prioridad BAJA)
- Interfaz ViajeEstado en estados-camiones.tsx usa `estado_unidad` como prop name
- Cosmético pero limpia deuda técnica en componentes downstream

#### 3. ✅ COMPLETADO: Deprecar lib/estadosHelper.ts (Sesión 18)

### TASK-S23: Definir Circuito de Incidencias (Prioridad MEDIA)
- Quién crea incidencias: Control de Acceso
- Quién resuelve: Coordinador de Planta
- Estados: abierta → en_revision → resuelta/cerrada
- Notificaciones: al crear, al resolver

### TASK-S24: Deploy a Vercel (Prioridad ALTA — Demo 18-Feb)
- ✅ vercel.json creado
- ✅ Build limpio, código pusheado a GitHub
- **PENDIENTE:** Configurar variables de entorno en dashboard de Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL` → URL del proyecto Supabase PROD
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon key del proyecto PROD
  - `SUPABASE_SERVICE_ROLE_KEY` → service role key del proyecto PROD
  - `NEXT_PUBLIC_SITE_URL` → URL del deploy Vercel (ej: https://nodexia.vercel.app)
  - `NEXT_PUBLIC_USE_EMAIL_INVITES` → 'false' (o 'true' si SMTP configurado)
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → API key de Google Maps
- **PENDIENTE:** Ejecutar migraciones SQL en BD de producción
- **PENDIENTE:** Conectar repo GitHub en dashboard de Vercel

### TASK-S25: Testing con Data Real (Prioridad ALTA — Demo 18-Feb)
- Probar flujo E2E completo incluyendo Fase 5 destino
- Fix bugs visuales o de UX restantes
- Verificar timeline/historial con datos reales
- Preparar datos para demo presentación 18-Feb

### ⚠️ RLS Gap: ofertas_red_nodexia UPDATE Policy (Post-MVP)
- Tabla tiene INSERT + SELECT policies pero NO UPDATE policy
- Actualmente bypaseado por API service role
- Debe agregarse para seguridad en producción

### ⚠️ SEGURIDAD API (Post-MVP, ANTES de producción real)
- **Documento:** `docs/PENDIENTE-CRITICO-SEGURIDAD-API.md`
- 23+ endpoints sin auth o sin scope por empresa
- 4 API routes nuevas con service_role (upload-remito, consultar-remito, chofer/viajes, estado-unidad)
- Fases 1-8 documentadas

---

## 📋 CÓMO ASIGNAR TAREA A SONNET

Copiá este prompt al chat de Sonnet:

```
Sos un desarrollador del equipo Nodexia-Web. Tu tarea es [TASK-SXX].

Lee estos archivos para contexto:
- .copilot/PROJECT-STATE.md (estado del proyecto)
- La tarea específica en .copilot/TASKS-ACTIVE.md

Reglas:
1. NO modifiques archivos que no estén en la lista de la tarea
2. Seguí el patrón de código existente
3. Usá TypeScript estricto
4. Probá que compila sin errores
5. Al terminar, listá exactamente qué archivos creaste/modificaste
```
