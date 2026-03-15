# BACKLOG — NODEXIA-WEB

**Última actualización:** 15-Mar-2026

---

## FASE ACTUAL: Bloque A — Refactorización + Enterprise

Objetivo: Base limpia, arquitectura para equipos, seguridad auditada.

### A1. Limpieza de código muerto [NOT STARTED]
- [ ] Eliminar 12 referencias a `roles_empresa` en código
- [ ] Reemplazar 31 `.single()` → `.maybeSingle()` 
- [ ] Eliminar imports no usados
- [ ] Limpiar campos deprecados de types

### A2. Migrar queries de pages a hooks [NOT STARTED]
Pages afectadas (7):
- [ ] `crear-despacho.tsx` — extraer a `useDespachos()`
- [ ] `chofer-mobile.tsx` — extraer a `useChoferViajes()`
- [ ] `control-acceso.tsx` — extraer a `useControlAcceso()`
- [ ] `supervisor-carga.tsx` — extraer a `useSupervisorCarga()`
- [ ] `despachos.tsx` — extraer a `useDespachosList()`
- [ ] `estados-camiones.tsx` — extraer a `useEstadosCamiones()`
- [ ] `planificacion.tsx` — extraer a `usePlanificacion()`

### A3. Partir archivos gigantes [NOT STARTED]
- [ ] `crear-despacho.tsx` (1743 líneas) → componentes + hook
- [ ] `chofer-mobile.tsx` (1315) → componentes + hook
- [ ] `control-acceso.tsx` (1277) → componentes + hook
- [ ] `lib/types.ts` (902) → dividir por dominio
- [ ] `lib/contexts/UserRoleContext.tsx` (602) → separar lógica

### A4. Configurar imports alias `@/` [NOT STARTED]
- [ ] Configurar `tsconfig.json` paths
- [ ] Migrar imports progresivamente (114 relativos)

### A5. Sync migraciones PROD [NOT STARTED]
- [ ] Ejecutar migración 063 en PROD
- [ ] Registrar `vista_disponibilidad_unidades` en schema_migrations
- [ ] Auditar cuáles de las 54 migraciones están ejecutadas en PROD

### A6. Seguridad y auditoría [NOT STARTED]
- [ ] Auditoría RLS completa (todas las tablas)
- [ ] Fix: `ofertas_red_nodexia` UPDATE policy
- [ ] Logging de acciones sensibles
- [ ] Revisar IDOR en endpoints restantes

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
