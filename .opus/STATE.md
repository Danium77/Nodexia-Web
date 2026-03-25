# ESTADO DEL PROYECTO — NODEXIA-WEB

**Última actualización:** 25-Mar-2026 (sesión 42)

---

## PRODUCCIÓN

- **URL:** www.nodexiaweb.com
- **Deploy:** Vercel (proyecto `nodexia-web-j6wl`, región `gru1`)
- **Supabase PROD:** `lkdcofsfjnltuzzzwoir`
- **Último commit:** `7418a9d` (25-Mar-2026)
- **Estado general:** Funcional con bugs menores
- **Monitoring:** Sentry integrado (pendiente configurar DSN en Vercel)
- **Supabase CLI:** Instalado (npx), logueado, linked a PROD

### Qué funciona en PROD
- Login/signup con roles multi-empresa
- Crear despachos desde coordinador de planta
- Flujo completo: despacho → asignación → tracking → control acceso → entrega
- Red Nodexia: publicar viaje, aceptar oferta desde transporte
- Gestión de flota: camiones, acoplados, choferes
- Unidades operativas: crear, activar/desactivar (vista creada hoy)
- Control de acceso: QR, ingreso/egreso con verificación de documentación
- Documentación: upload, validación, alertas vencimiento
- Chofer mobile: vista viajes, GPS tracking, cambio de estados
- Incidencias: CRUD básico
- Coordinador integral PyME: hereda 4 roles

### Qué está roto o incompleto en PROD
- **FK `usuarios_empresa.rol_empresa_id` roto** — migración 070 destruyó FK (DROP CASCADE). Campo dead. No restaurar.
- ~~**12 refs a `roles_empresa`** en código~~ — 0 refs ✅
- ~~**88 usos de `.single()`** — migrados a `.maybeSingle()` (commit `f57583f`)~~ ✅
- ~~**Migración 063 no ejecutada**~~ — verificada aplicada en PROD ✅
- ~~**`ofertas_red_nodexia`** sin UPDATE policy RLS~~ — 2 UPDATE policies creadas (migración 075) ✅
- **7 pages con `supabase.from()` directo** — viola separación de capas

### Migraciones PROD
- 079 migraciones tracked vía tabla `schema_migrations` (+ 017v vista manual)
- Migración 078: 7 índices de performance (P0+P1) aplicados
- Migración 079: Feature flags (funciones_sistema, funciones_empresa, funciones_rol) + seed 14 features
- Vista `vista_disponibilidad_unidades` registrada en tracking ✅
- Supabase CLI linked a PROD (`lkdcofsfjnltuzzzwoir`)

---

## DESARROLLO

- **Supabase DEV:** `yllnzkjpvaukeeqzuxit`
- **Schema divergencia:** Mínima (4 tablas backup + 1 policy cosmética)

---

## MÉTRICAS DEL CODEBASE

| Métrica | Valor | Meta |
|---------|-------|------|
| Archivos TS/TSX | 286 | — |
| API routes | 60 | — |
| Páginas | 25+ | — |
| Componentes | ~80 | — |
| Archivos >400 líneas | ~42 (-6) | 0 |
| Archivos >1000 líneas | 0 ✅ | 0 |
| Pages con queries directas | ~~7~~ 4 (A3 pending) | 0 |
| Refs a `roles_empresa` | ~~12~~ 0 ✅ | 0 |
| Usos de `.single()` (SELECT/UPDATE) | ~~88~~ 0 ✅ | 0 |
| Imports relativos `../../` | ~~114~~ 0 ✅ | 0 |
| IDOR vulnerabilities fijados | 6 ✅ | — |
| Migraciones SQL | 77 | — |
| Tests | 56 | — |

---

## ÚLTIMA SESIÓN (42 — 25-Mar-2026)

### Completado — Sentry Integration (pre-piloto)
- Instalado `@sentry/nextjs` v10.45.0
- Creados: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `next.config.ts` wrapeado con `withSentryConfig` (source maps ocultos)
- CSP actualizado: dominios `*.sentry.io`, `*.ingest.sentry.io`, `*.sentry-cdn.com`
- `pages/_error.tsx` creado para captura server-side
- `ErrorBoundary.tsx`: `Sentry.captureException()` integrado en `componentDidCatch`
- `withAuth.ts`: `Sentry.captureException()` en catch de API routes con contexto (url, method)
- `_app.tsx`: `Sentry.setUser()` con userId + email via `onAuthStateChange`
- Build verificado: 0 errores
- Commit `7418a9d` pushed
- **PENDIENTE USUARIO:** Crear proyecto en sentry.io + configurar 4 env vars en Vercel
  - `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

### También en esta sesión (commits previos entre sesiones)
- `28065d7` — fix: force SW cache invalidation v2 + network-first for Next.js bundles
- `b2d23ab` — fix: GPS endpoints use empresa_id instead of non-existent empresa_planta_id
- `6c1c156` — chore: remove temp db-check diagnostic endpoint
- `ee30b68` — fix: session refresh before scan + better error messages

### Hooks en el proyecto
| Hook | Líneas | State | Effects | Handlers |
|------|--------|-------|---------|----------|
| `useCrearDespacho` | 1536 | 41 useState | 2 | 17 |
| `useChoferMobile` | 580 | 25 useState | 9 | 12 |
| `useControlAcceso` | 610 | 16 useState | 2 | 9 |
| `useDespachosOfrecidos` | 398 | — | — | — |
| `useEstadosCamiones` | ~140 | — | — | — |
| `useSupervisorCarga` | ~270 | — | — | — |
| `useControlAcceso` | 610 | 16 useState | 2 | 9 |
| `useEstadosCamiones` | ~140 | — | — | — |
| `useSupervisorCarga` | ~270 | — | — | — |

### Próximos pasos sugeridos
- **A6**: Auditoría RLS completa
- **A3 bonus**: `despachos-ofrecidos.tsx` (1067 líneas), `lib/types.ts` (993 líneas)
- **A7**: Performance (índices, queries, connection pooling)
- **Bloque B**: Features (admin dinámico, reportes, turnos)
