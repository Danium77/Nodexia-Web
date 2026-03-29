# ESTADO DEL PROYECTO — NODEXIA-WEB

**Última actualización:** 29-Mar-2026 (sesión 45)

---

## PRODUCCIÓN

- **URL:** www.nodexiaweb.com
- **Deploy:** Vercel (proyecto `nodexia-web-j6wl`, región `gru1`)
- **Supabase PROD:** `lkdcofsfjnltuzzzwoir`
- **Último commit:** `2f8ceb3` (26-Mar-2026)
- **Estado general:** Funcional — Bloques A + B1-B4 completados. App mobile en desarrollo.
- **Monitoring:** Sentry integrado (pendiente configurar DSN en Vercel)
- **Supabase CLI:** Instalado (npx), logueado, linked a PROD
- **App Mobile:** `nodexia-chofer` (Expo SDK 55, React Native 0.83) en desarrollo separado

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
- Despachos desde transporte: crear despacho, asignar unidad propia, visible en Despachos Ofrecidos y Viajes Activos
- Trigger `on_auth_user_created`: auto-sync auth.users → public.usuarios

### Qué está roto o incompleto en PROD
- **FK `usuarios_empresa.rol_empresa_id` roto** — migración 070 destruyó FK (DROP CASCADE). Campo dead. No restaurar.
- ~~**12 refs a `roles_empresa`** en código~~ — 0 refs ✅
- ~~**88 usos de `.single()`** — migrados a `.maybeSingle()` (commit `f57583f`)~~ ✅
- ~~**Migración 063 no ejecutada**~~ — verificada aplicada en PROD ✅
- ~~**`ofertas_red_nodexia`** sin UPDATE policy RLS~~ — 2 UPDATE policies creadas (migración 075) ✅
- **7 pages con `supabase.from()` directo** — viola separación de capas

### Migraciones PROD
- 080 migraciones tracked vía tabla `schema_migrations` (+ 017v vista manual)
- Migración 078: 7 índices de performance (P0+P1) aplicados
- Migración 079: Feature flags (funciones_sistema, funciones_empresa, funciones_rol) + seed 14 features
- Migración 080: Vistas KPIs reportes + feature flag reportes + rol gerente + índices (aplicada 25-Mar-2026)
- Migración 088: Trigger `on_auth_user_created` → `handle_new_user()` (sync auth.users → public.usuarios) (aplicada 26-Mar-2026)
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
| Archivos TS/TSX | 286+ | — |
| API routes | 70 | — |
| Páginas | 74 | — |
| Componentes | 94 | — |
| Hooks | 23 | — |
| Services | 6 | — |
| Archivos >400 líneas | ~42 (-6) | 0 |
| Archivos >1000 líneas | 0 ✅ | 0 |
| Pages con queries directas | ~~7~~ 4 (A3 pending) | 0 |
| Refs a `roles_empresa` | ~~12~~ 0 ✅ | 0 |
| Usos de `.single()` (SELECT/UPDATE) | ~~88~~ 0 ✅ | 0 |
| Imports relativos `../../` | ~~114~~ 0 ✅ | 0 |
| IDOR vulnerabilities fijados | 6 ✅ | — |
| Migraciones SQL | 87 | — |
| SQL files total | 106 | — |
| Feature Flags | 14 (11 activas) | — |
| Tablas BD | 50+ | — |
| Tests | 6 archivos | — |
| Contextos | 2 (UserRole + FeatureFlag) | — |

---

## ÚLTIMA SESIÓN (45 — 29-Mar-2026)

### Documentación y Auditoría
- **Prompt para app mobile**: Generado prompt completo de 10 funcionalidades PWA chofer para replicar en nodexia-chofer (Expo SDK 55)
- **GPS endpoint fix**: Corregido endpoint usado por mobile Opus (`/api/chofer/ubicacion` 404 → `/api/tracking/actualizar-ubicacion` que ya existe)
- **RESUMEN-TECNICO-NODEXIA-2026-03.md**: Creado versión 2.0 actualizada del resumen técnico-comercial en `docs/auditorias/`
- **AUDITORIA-COMPLETA-2026-03-29.md**: Creado versión 2.0 de la auditoría técnica integral en `docs/auditorias/`
  - Notas actualizadas: promedio D+ → C+, Monitoreo F → C+, Seguridad C- → B-
  - 8 secciones completas con comparación Feb-17 vs Mar-29
  - Fase 0 del plan de acción marcada como COMPLETADA

### Sesión anterior (44 — 26-Mar-2026)
- B4 Despachos desde Transporte — bugs & polish (ver CHANGELOG)

### Hooks en el proyecto (23 total)
| Hook | Líneas | State | Effects | Handlers |
|------|--------|-------|---------|----------|
| `useCrearDespacho` | ~1550 | 41 useState | 2 | 17 |
| `useChoferMobile` | 580 | 25 useState | 9 | 12 |
| `useControlAcceso` | 610 | 16 useState | 2 | 9 |
| `useDespachosOfrecidos` | 398 | — | — | — |
| `useEstadosCamiones` | ~140 | — | — | — |
| `useSupervisorCarga` | ~270 | — | — | — |
| `useGPSTracking` | — | — | — | — |
| + 16 más (ver lib/hooks/) | — | — | — | — |
| `useEstadosCamiones` | ~140 | — | — | — |
| `useSupervisorCarga` | ~270 | — | — | — |

### Próximos pasos sugeridos
- **B3**: Turnos de recepción (ventanas horarias, reservas, validación)
- **B4**: Despachos desde transporte
- **A3 bonus**: `lib/types.ts` (993 líneas)
- **Pendientes menores**: NOTIFY pgrst, perfil PyME

## ÚLTIMA SESIÓN (43 — 25-Mar-2026)

### Completado — B2: Reportes Gerenciales
- **API `reportes/kpis.ts` refactorizada:**
  - Migrada de auth manual + supabaseAdmin → `withAuth` + `createUserSupabaseClient`
  - Eliminada dependencia de tabla `super_admins` para admin check
  - Roles: admin_nodexia, coordinador, coordinador_integral, gerente, supervisor
  - admin_nodexia puede consultar cualquier empresa via query param
- **Cálculo de cumplimiento corregido:** era stub (siempre 100%), ahora calcula % completados/total 7d
- **Rol `gerente` agregado** a `normalizeRole()` en withAuth.ts
- **Export PDF implementado:** jspdf + jspdf-autotable
  - 3 secciones: Indicadores del Día, Tendencias (7d/30d), Detalle Diario
  - Tabla profesional con headers coloreados
- **Export Excel implementado:** xlsx
  - 4 hojas: KPIs, Tendencias, Despachos por Día, Cancelaciones
  - Columnas con ancho auto-ajustado
- **Paquetes instalados:** jspdf 4.2.1, jspdf-autotable 5.0.7, xlsx 0.18.5
- **Build verificado:** 0 errores
- Migración 080 aplicada en PROD ✅
- Commit: `fe0885f` + `e14b889` (deploy trigger)

### Completado — B3: Turnos de Recepción (activación)
- **Código ya existente** (4 APIs, 2 componentes, 4 migraciones, hooks integrados)
- **Migración 086 aplicada:** `fn_generar_numero_turno` con SECURITY DEFINER ✅
- **Migración 087 registrada:** `turno_contadores` RLS disabled (ya estaba aplicado) ✅
- **NOTIFY pgrst** ejecutado para refresh de schema PostgREST ✅
- **Feature flags activados:**
  - `funciones_sistema.turnos_recepcion` = true (ya estaba)
  - `funciones_empresa`: Tecnopack Zayas (planta) ✅ + Transportes Nodexia Demo (transporte) ✅
- **Verificación de componentes:**
  - `GestionVentanas.tsx` (536 líneas): CRUD ventanas, grid semanal, slots, cancelar reservas
  - `ReservaTurnos.tsx` (268 líneas): selección planta, date picker, grid slots, crear/cancelar reservas
  - `useCrearDespacho.ts`: integración turno modal (destino-requiere → slots → reservar)
  - `useControlAcceso.ts`: validar-ingreso al escanear QR
- **No se requirió deploy** — código ya estaba en main, activación por DB flags

### Completado — B4: Despachos desde Transporte
- **Sidebar:** "Crear Despacho" agregado para coordinador y coordinador_integral transporte, gated por feature flag
- **useCrearDespacho:** nuevas variables `empresaActiva`, `esTransporte`, `empresaTransporte`
  - Transporte auto-asigna `transport_id` a su propia empresa
  - Estado inicial `pendiente` (vs `pendiente_transporte` para plantas)
  - `empresaActiva` reemplaza `empresaPlanta` en cancelación y Red Nodexia
- **crear-despacho.tsx:** usa `empresaActiva` para Header y DespachoModals
- **API `ubicaciones/buscar`:** rama transporte busca en todas las ubicaciones del sistema (no solo vinculadas)
- **Feature flag:** `despachos_transporte` habilitado para Transportes Nodexia Demo
- **Commit:** `a9d82cb`
