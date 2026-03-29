# BACKLOG — NODEXIA-WEB

**Última actualización:** 29-Mar-2026 (sesión 45)

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
- [x] **Migración 080 aplicada en PROD** (25-Mar-2026)

### B3. Turnos de recepción [DONE]
- [x] DB tables: ventanas_recepcion, turnos_reservados, turno_contadores (migraciones 081, 082)
- [x] Trigger fn_generar_numero_turno con SECURITY DEFINER (migración 086 aplicada PROD)
- [x] turno_contadores RLS disabled (migración 087 registrada PROD)
- [x] Feature flag turnos_recepcion activado (sistema + Tecnopack Zayas planta + Transportes Nodexia Demo)
- [x] API ventanas.ts: GET (with slots), POST, PUT, DELETE — roles planta/admin
- [x] API reservas.ts: GET, POST (capacity check + auto-number), PATCH (cancel/update)
- [x] API validar-ingreso.ts: POST — validación en control de acceso con tolerancia temporal
- [x] API destino-requiere.ts: GET — check si destino es planta con turnos
- [x] GestionVentanas.tsx (536 líneas): CRUD ventanas, grid semanal, slots, ocupación, cancelar reservas
- [x] ReservaTurnos.tsx (268 líneas): selección planta, date picker, grid slots, crear/cancelar reservas
- [x] Integración useCrearDespacho: modal turno al seleccionar destino planta con turnos
- [x] Integración useControlAcceso: validar-ingreso al escanear QR
- [x] NOTIFY pgrst ejecutado
- [x] No requirió deploy — código ya en main, activación por DB flags

### B4. Despachos desde transporte [DONE]
- [x] Sidebar: "Crear Despacho" para coordinador + coordinador_integral transporte (feature-flagged)
- [x] useCrearDespacho: empresaActiva + esTransporte, auto-asigna transport_id, estado 'pendiente'
- [x] crear-despacho.tsx: usa empresaActiva para Header y DespachoModals
- [x] API ubicaciones/buscar: transporte busca en TODAS las ubicaciones del sistema
- [x] Feature flag despachos_transporte habilitado (Transportes Falbi, Transportes Nodexia Demo, Logística Express SRL)
- [x] Security fix: sanitizado PostgREST filter injection en ubicaciones/buscar.ts (commit `6b2fb27`)
- [x] FK fix: trigger `on_auth_user_created` (migración 088) — sync auth.users → public.usuarios
- [x] UX: transporte ve AsignarUnidadModal (flota propia) en vez de AssignTransportModal (commit `72d89e3`)
- [x] UX: botón RED oculto para transporte (tienen flota propia)
- [x] Fix: asignarUnidad() ahora setea id_transporte desde chofer.empresa_id (commit `2f8ceb3`)
- [x] Verificado: despachos aparecen en Despachos Ofrecidos y Viajes Activos
- [x] Build verificado (0 errores)

### B5. Integraciones externas [CONCEPT]
- API pública (OpenAPI/Swagger)
- API Keys para terceros
- Webhooks salientes
- Rate limiting

### B6. App Mobile Nativa [EN PROGRESO]
- Proyecto separado: `nodexia-chofer` (Expo SDK 55, React Native 0.83)
- Prompt de 10 funcionalidades PWA chofer entregado a Opus mobile
- GPS endpoint corregido: `/api/tracking/actualizar-ubicacion`
- Features a replicar: GPS tracking, QR modal, incidencias, remito upload, perfil, realtime, Google Maps nav, viaje pausado, estados informativos, hamburger menu

### Documentación y Auditoría [DONE]
- [x] RESUMEN-TECNICO-NODEXIA-2026-03.md (v2.0) — actualizado con métricas Mar-2026
- [x] AUDITORIA-COMPLETA-2026-03-29.md (v2.0) — 8 secciones, comparación Feb vs Mar, notas actualizadas

---

## PENDIENTES MENORES

- [x] `NOTIFY pgrst, 'reload schema'` en PROD ✅
- [ ] Perfil PyME: UI toggle `tiene_flota_propia`
- [ ] Perfil PyME: UI gestión `vendedor_clientes`
