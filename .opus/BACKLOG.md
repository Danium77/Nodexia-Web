# BACKLOG — NODEXIA-WEB

**Última actualización:** 16-Mar-2026 (sesión 40)

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

### A7. Performance [NOT STARTED]
- [ ] Índices adicionales donde necesarios
- [ ] Query optimization para vistas pesadas
- [ ] Connection pooling revisión

---

## SIGUIENTE: Bloque B — Admin Dinámico + Features

Cada feature se diseña conceptualmente ANTES de codificar.

### B1. Admin Nodexia: Sistema dinámico [CONCEPT]
- Tablas: `funciones_sistema`, `funciones_empresa`, `funciones_rol`
- Panel: CRUD usuarios por empresa, toggle features por empresa/rol
- Hook: `useFeatureFlag('feature_name')`
- Componente: `<FeatureGate feature="...">`

### B2. Reportes gerenciales [CONCEPT]
- Dashboards con métricas de despachos, tiempos, cumplimiento
- Exportable PDF/Excel
- Habilitado vía feature flag

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
