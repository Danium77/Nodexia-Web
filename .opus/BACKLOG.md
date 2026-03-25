# BACKLOG — NODEXIA-WEB

**Última actualización:** 25-Mar-2026 (sesión 43)

---

## FASE ACTUAL: Bloque A — Refactorización + Enterprise

Objetivo: Base limpia, arquitectura para equipos, seguridad auditada.

### A1. Limpieza de código muerto [DONE]
- [x] Eliminar 12 referencias a `roles_empresa` en código (commit `77be298`, -1546 líneas)
- [x] Reemplazar 88 `.single()` → `.maybeSingle()` (commit `f57583f`, 53 archivos) 
- [x] Dead imports: ninguno encontrado (limpieza anterior fue exhaustiva)
- [x] Campos deprecados: `rol_empresa_id` removido de usuarios.tsx (commit `c8d9246`)

### A2. Migrar queries de pages a hooks [DONE]
- [x] `estados-camiones.tsx` → `useEstadosCamiones()` (529→189 líneas, -64%)
- [x] `supervisor-carga.tsx` → `useSupervisorCarga()` (1023→726, -29%)
- [x] `despachos.tsx` → ya usa `useDispatches()` (solo 1 query auth, OK)
- [x] `crear-despacho.tsx` → completado en A3
- [x] `chofer-mobile.tsx` → completado en A3
- [x] `control-acceso.tsx` → completado en A3
- [ ] `planificacion.tsx` — 862 líneas, bajo threshold, queries entrelazadas (defer)

### A3. Partir archivos gigantes [DONE]
- [x] `crear-despacho.tsx` (1908 → ~190 líneas) — hook `useCrearDespacho` + `DespachoModals`
- [x] `chofer-mobile.tsx` (1440 → ~380 líneas) — hook `useChoferMobile`
- [x] `control-acceso.tsx` (1409 → ~350 líneas) — hook `useControlAcceso`
- [x] `despachos-ofrecidos.tsx` (984 → 530 líneas) — hook `useDespachosOfrecidos` (commit 3481f60)
- [ ] `planificacion.tsx` (862) — bajo threshold
- [ ] `lib/types.ts` (993) → dividir por dominio (DEFERRED: cross-deps haría circular imports)
- [ ] `lib/contexts/UserRoleContext.tsx` (602) → separar lógica

### A4. Configurar imports alias `@/` [DONE]
- [x] tsconfig.json paths ya configurados (verificado)
- [x] 430 imports migrados a `@/` en 166 archivos (commit `5d54da6`)
- [x] 0 imports relativos restantes

### A5. Sync migraciones PROD [DONE]
- [x] Auditar cuáles de las 54 migraciones están ejecutadas en PROD (todas 001-074 ✅)
- [x] Verificar migración 063 aplicada en PROD (policy existe ✅)
- [x] Registrar `vista_disponibilidad_unidades` en schema_migrations (017v ✅)
- [x] Fix `ofertas_red_nodexia` UPDATE policy (migración 075, 2 policies ✅)
- [x] Supabase CLI linked a PROD

### A6. Seguridad y auditoría [DONE]
- [x] Auditoría RLS completa — 36 tablas, 6 sobre-permisivas identificadas
- [x] Migración 076 creada y ejecutada: restrict WRITE en despachos, empresas, ubicaciones, usuarios_empresa, tracking_gps
- ~~[ ] Fix: `ofertas_red_nodexia` UPDATE policy~~ ✅ (movido a A5)
- [x] IDOR audit: 7 vulnerables, 6 fixeadas (eliminar/crear/invitar/actualizar/editar usuario + asignar-unidad)
- [x] Ejecutar migración 076 en PROD (aplicada exitosamente)
- [x] Logging de acciones sensibles: tabla `audit_log` (mig 077) + helper + 13 rutas instrumentadas

### A7. Performance [DONE]
- [x] Auditoría de ~90 índices existentes, identificados 16 faltantes (P0/P1/P2)
- [x] Migración 078: 7 índices creados (4 P0, 3 P1)
  - P0: `idx_usuarios_empresa_user_empresa_activo` (compound para RLS)
  - P0: `idx_relaciones_transporte` (empresa_transporte_id)
  - P0: `idx_registros_acceso_usuario` (usuario_id)
  - P1: `idx_viajes_despacho_created_at`, `idx_despachos_scheduled_date`, `idx_viajes_despacho_numero_viaje`, `idx_empresas_tipo`
- [x] Ejecutada en PROD exitosamente
- [ ] Query optimization para vistas pesadas (DEFERRED)
- [ ] Connection pooling revisión (DEFERRED)

### A8. Monitoring — Sentry [DONE]
- [x] Instalado `@sentry/nextjs` v10.45.0
- [x] Configs: client (replay + browser tracing), server, edge
- [x] `next.config.ts` wrapeado con `withSentryConfig` (source maps ocultos del browser)
- [x] CSP actualizado para dominios Sentry
- [x] `pages/_error.tsx` para captura server-side
- [x] `ErrorBoundary` + `withAuth` integrados con `Sentry.captureException()`
- [x] User context (userId, email) via `Sentry.setUser()` en `_app.tsx`
- [x] Build verificado, commit `7418a9d` pushed
- [ ] **PENDIENTE USUARIO:** Crear proyecto sentry.io + env vars en Vercel

---

## SIGUIENTE: Bloque B — Admin Dinámico + Features

Cada feature se diseña conceptualmente ANTES de codificar.

### B1. Admin Nodexia: Sistema dinámico [DONE]
- [x] Tablas: `funciones_sistema`, `funciones_empresa`, `funciones_rol` (migración 079)
- [x] 14 features seed (11 activas, 3 futuras: reportes, turnos, despachos_transporte)
- [x] RLS: SELECT autenticado, ALL admin_nodexia
- [x] API: `pages/api/admin/funciones.ts` (GET list, POST toggle_empresa/toggle_rol/toggle_global)
- [x] Context: `FeatureFlagProvider` en _app.tsx + hook `useFeatureFlags()`
- [x] Componente: `<FeatureGate feature="..." fallback={...}>`
- [x] Panel admin: `pages/admin/funciones.tsx` + `GestionFunciones.tsx`
- [x] Sidebar: entrada "Funciones" en AdminSidebar
- [x] Audit logging en todas las acciones de toggle

### B2. Reportes gerenciales [DONE]
- [x] DB views: vista_kpis_operacionales, vista_incidencias_agregadas, vista_dwell_time (migración 080)
- [x] Feature flag "reportes" activado (migración 080)
- [x] Rol "gerente" agregado a normalizeRole (withAuth) + UserRoleContext
- [x] API `reportes/kpis.ts` refactorizada: withAuth + createUserSupabaseClient (sin supabaseAdmin)
- [x] Cálculo de cumplimiento corregido (era stub siempre 100%)
- [x] ReporteDashboard: 7 KPI cards, tendencias 7d/30d, gráficos, tabla diaria
- [x] Export CSV existente
- [x] Export PDF (jspdf + jspdf-autotable): KPIs + tendencias + detalle diario
- [x] Export Excel (xlsx): 4 hojas (KPIs, Tendencias, Despachos por Día, Cancelaciones)
- [x] Build verificado
- [ ] **PENDIENTE USUARIO:** Aplicar migración 080 en PROD (SQL Editor Supabase)

### B3. Turnos de recepción [CONCEPT]
- Plantas definen ventanas horarias
- Transportes reservan turno
- Control de acceso valida turno
- Feature flag por empresa planta

### B4. Despachos desde transporte [CONCEPT]
- Transportes grandes cargan sus propios despachos
- Feature flag por empresa transporte

### B5. Integraciones externas [CONCEPT]
- API pública (OpenAPI/Swagger)
- API Keys para terceros
- Webhooks salientes
- Rate limiting

---

## PENDIENTES MENORES

- [ ] `NOTIFY pgrst, 'reload schema'` en PROD
- [ ] Perfil PyME: UI toggle `tiene_flota_propia`
- [ ] Perfil PyME: UI gestión `vendedor_clientes`
