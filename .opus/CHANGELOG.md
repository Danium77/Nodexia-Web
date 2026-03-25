# CHANGELOG — NODEXIA-WEB

Registro cronológico de cambios significativos. Append-only.

---

## 25-Mar-2026 — Sesión 42: Sentry Integration (pre-piloto)

### Commit `7418a9d`
- Instalado `@sentry/nextjs` v10.45.0
- Creados: `sentry.client.config.ts` (replay + browser tracing + filtro extensiones), `sentry.server.config.ts`, `sentry.edge.config.ts`
- `next.config.ts` wrapeado con `withSentryConfig` (source maps ocultos del browser)
- CSP actualizado: `*.sentry.io`, `*.ingest.sentry.io`, `*.sentry-cdn.com`
- `pages/_error.tsx` creado para captura server-side (captureUnderscoreErrorException)
- `ErrorBoundary.tsx`: `Sentry.captureException()` en `componentDidCatch` con componentStack
- `withAuth.ts`: `Sentry.captureException()` en catch con url + method
- `_app.tsx`: `Sentry.setUser({ id, email })` via `onAuthStateChange`
- Rate limiter middleware (`lib/middleware/rateLimit.ts`)
- `docs/ARQUITECTURA-TECNICA.md` añadido
- Pendiente usuario: crear proyecto sentry.io + 4 env vars en Vercel

### Commits entre sesiones (41→42)
- `28065d7` — fix: force SW cache invalidation v2 + network-first for Next.js bundles
- `b2d23ab` — fix: GPS endpoints use empresa_id instead of empresa_planta_id
- `6c1c156` — chore: remove temp db-check diagnostic endpoint
- `ee30b68` — fix: session refresh before scan + better error messages

---

## 16-Mar-2026 — Sesión 39: A5 Sync PROD

### Migración 075 (aplicada en PROD)
- Audit PROD: 54 migraciones verificadas, 063 ya aplicada, vista ya existe
- Creado 2 UPDATE policies en `ofertas_red_nodexia`: plantas + transportes
- Registrado `vista_disponibilidad_unidades` en `schema_migrations` (version 017v)
- Fix `supabase/config.toml`: removido campo `cron` no soportado por CLI + `timeout` int→map
- Supabase CLI instalado (npx), logueado, linked a PROD
- Scripts: `scripts/audit_prod.js`, `scripts/run_migration_075.js`

---

## 16-Mar-2026 — Sesión 38: A3 Giant File Splits

### Commit `57e011b`
- Split `crear-despacho.tsx` (1908 → ~190 líneas)
- Creado `lib/hooks/useCrearDespacho.ts` (1536 líneas): 41 useState, 2 useEffect, 4 data loading, 17 handlers
- Creado `components/Despachos/DespachoModals.tsx` (219 líneas): 8 modals consolidated
- Fix: `onAceptarOferta` type `void` → `Promise<void>`
- Fix: Added `handleCloseCancelarModal` to hook (missing export)

### Commit `cc68fcb`
- Split `chofer-mobile.tsx` (1440 → ~380 líneas)
- Creado `lib/hooks/useChoferMobile.ts` (~580 líneas): 25 useState, 9 useEffect, GPS tracking, realtime subscription, 12 handlers
- Exported `ViajeChofer` and `UbicacionGPS` interfaces

### Commit `691c418`
- Split `control-acceso.tsx` (1409 → ~350 líneas)
- Creado `lib/hooks/useControlAcceso.ts` (~610 líneas): 16 useState, 2 useEffect, QR scanning, doc validation, incidencia creation
- Extracted module-level helpers: `validarDocumentacionCompleta`, `DOCS_REQUERIDOS`, `normalizarTipoDoc`
- Added `handleValidarDocumentacion` and `handleAsignarPlaya` handlers to hook

---

## 15-Mar-2026 — Sesión 37: A1 .single() + A2 hooks extraction

### Commit `f57583f`
- Migrados 88 `.single()` → `.maybeSingle()` en 53 archivos (SELECT/UPDATE queries)
- Conservados 18 INSERT `.single()` (patrón correcto post-insert)
- Eliminados backups muertos: `usuarios.tsx.old` (-1123 líneas), `roles.tsx.backup` (-660 líneas)

### Commit `c8d9246`
- Removido campo dead `rol_empresa_id` de `pages/admin/usuarios.tsx`
- Fixed WizardUsuario edit: usa `rol_interno` en lugar de FK UUID muerto

### Commit `e8746d3`
- Creado `useEstadosCamiones.ts`: datos + filtros + conteo memoizado
- Creado `useSupervisorCarga.ts`: datos + scanner QR + filtros por tab
- `estados-camiones.tsx`: 529 → 189 líneas (-64%)
- `supervisor-carga.tsx`: 1023 → 726 líneas (-29%)

---

## 15-Mar-2026 — Sesión 36: A1 roles_empresa cleanup

### Commit `77be298`
- Eliminados TODOS los `roles_empresa` references (9 archivos, -1546 líneas)
- Borrados: `pages/admin/roles.tsx`, `components/Admin/FormularioRol.tsx`
- Migrados a `ROLES_BY_TIPO`: WizardUsuario, GestionEmpresasReal, roleValidator
- Limpiados: AdminSidebar (nav link), usuarios.tsx (dead lookup), crear-despacho (comment)
- Tests reescritos para funciones migradas (getRolesForCompanyType, roleExists ahora sincrónicas)

---

## 15-Mar-2026 — Sesión 35: Fixes PROD + Auditoría + Nuevo sistema memoria

### Fixes desplegados
- `ea1de8e` — Fix RED button: eliminado join a `roles_empresa`, usar `rol_interno` directo
- `c0c86b4` — Fix "Ver Estado" button: broadened condition, `.maybeSingle()`, logging
- `5288d6d` — Fix CrearUnidadModal: queries resilientes, `unidades_operativas` no bloquea carga

### SQL ejecutado en PROD (manual)
- Creada vista `vista_disponibilidad_unidades` + GRANT + NOTIFY pgrst

### Descubrimientos
- FK `usuarios_empresa.rol_empresa_id → roles_empresa.id` roto por migración 070 (DROP CASCADE)
- `vista_disponibilidad_unidades` nunca fue creada en PROD (migración 017 no ejecutada)
- 48 archivos >400 líneas, 7 pages con queries directas, 31 `.single()`, 12 refs `roles_empresa`

### Decisiones
- No restaurar FK `rol_empresa_id` — tipos incompatibles, `rol_interno` es canónico
- Nuevo sistema memoria `.opus/` reemplaza `.copilot/` y docs redundantes
- Plan: Bloque A (refactor+enterprise) → Bloque B (admin dinámico + features)
- Opus maneja todas las áreas (front/back/BD/mobile) con sistema de memoria estructurado

### Feedback MVP (presentación 14-Mar-2026)
- Validación positiva: robusta, intuitiva, enfocada en dolores reales
- Solicitado: reportes gerenciales, turnos recepción, despachos desde transporte
- Preocupaciones: capacidad, seguridad, integraciones

---

## Pre 15-Mar-2026 — Historial resumido

### Sesiones 1-34 (08-Feb a 01-Mar-2026)
- Proyecto llevado de cero a MVP funcional en ~25 sesiones
- 074 migraciones BD, 60 API routes, 25 páginas, ~80 componentes
- Demo exitosa 28-Feb-2026
- Schema sync PROD↔DEV completado (527 diferencias → 5 irrelevantes)
- Security hardening: 55/55 API routes con withAuth
- Refactoring parcial: 15 componentes extraídos de 4 páginas grandes
- Coordinador integral PyME implementado
- Documentación equipos creada (4 guías)
- Principios de arquitectura establecidos (CERO bypass, CERO parches)
