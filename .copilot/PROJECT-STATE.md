# NODEXIA-WEB - Estado Actual del Proyecto

**Última actualización:** 21-Feb-2026 (Sesión 29 — Badge Unificación + Despachos Tab Fix + Incidencias API Fix)
**Arquitecto/Tech Lead:** Opus (Claude)  
**Product Owner:** Usuario  
**Próxima presentación:** 28-Feb-2026 (7 días)

---

## 📊 ESTADO GENERAL

- **Fase:** Pre-MVP (Días 1-9 completados, adelantados al plan)
- **Stack:** Next.js 16 + React 19 + Supabase + TypeScript + Tailwind v4
- **Deployado:** SÍ — Vercel (`nodexia-web-j6wl`) → www.nodexiaweb.com
- **Tests:** 4 archivos (56 tests para sistema de estados centralizados)
- **Migraciones BD:** 112 archivos (055 + 056 + 058 + 059 + 064 ejecutadas en PROD)
- **BD lista para documentación:** SÍ (3 tablas + 7 funciones + 3 triggers + 6 RLS + 14 indexes)
- **Red Nodexia BD:** 4 tablas (`viajes_red_nodexia`, `requisitos_viaje_red`, `ofertas_red_nodexia`, `historial_red_nodexia`)
- **Historial Despachos BD:** Tabla `historial_despachos` (migración 055, ✅ ejecutada en PROD)
- **Incidencias BD:** Migration 064 ejecutada — `documentos_afectados` JSONB, CHECK constraints, índices, RLS policies
- **RLS corregido:** Migration 062 — funciones `get_visible_*_ids()` usan `ubicaciones.empresa_id` (CUIT como puente), COALESCE dual columns, admin bypass ✅ EJECUTADA EN PROD
- **RLS documentos_entidad:** Policy SELECT incluye cross-company vía `get_visible_*_ids()` (migration 062)
- **RLS gap:** `ofertas_red_nodexia` sin UPDATE policy (bypaseado por API service role)
- **PRINCIPIO MANDATO PO (18-Feb-2026):** CERO bypass RLS para usuarios autenticados, CERO inserts directos, CERO parches — documentado en QUICK-START-OPUS.md
- **Patrón API con RLS:** `withAuth` → `AuthContext.token` → `createUserSupabaseClient(token)` → queries con RLS
- **supabaseServerClient.ts:** Helper `createUserSupabaseClient(token)` para API routes sin bypass
- **Storage Buckets:** documentacion-entidades, documentacion-viajes (privados, 10MB, PDF/JPG/PNG), remitos (público, 10MB)
- **API Routes Documentación:** 10 endpoints (upload, listar, [id], validar, pendientes, verificar-documentacion, documentos-detalle, estado-batch, alertas, preview-url)
- **API Routes Operativas (Sesión 11):** upload-remito, consultar-remito, chofer/viajes, viajes/[id]/estado-unidad
- **API Routes Red Nodexia (Sesión 13):** `/api/red-nodexia/aceptar-oferta` (service role, 8 pasos atómicos + historial)
- **API Routes Sesión 14:** `/api/transporte/asignar-unidad` (service role, bypass RLS), `/api/despachos/timeline` (timeline híbrido)
- **State Machine:** TRANSICIONES_VALIDAS en `lib/estados/config.ts` (17+1 estados centralizados, 7 fases)
- **Esquema Definitivo Estados:** 17 estados + cancelado en `lib/estados/config.ts` (FUENTE ÚNICA DE VERDAD)
- **Estados (17+1):** pendiente, transporte_asignado, camion_asignado, confirmado_chofer, en_transito_origen, ingresado_origen, llamado_carga, cargando, cargado, egreso_origen, en_transito_destino, ingresado_destino, llamado_descarga, descargando, descargado, egreso_destino, completado (+cancelado)
- **Display Centralizado:** `ESTADO_DISPLAY` + `getEstadoDisplay()` con legacy mapping en `lib/estados/config.ts`
- **Despacho Sync:** `cambiarEstadoViaje()` sincroniza 3 tablas: viajes_despacho + despachos + estado_unidad_viaje + escribe timestamps + inserta historial
- **Auto-completar viaje (Sesión 28):** `cambiarEstadoViaje()` encadena `egreso_destino → completado` automáticamente (viaje + despacho + timestamps + historial con `auto: true`)
- **Services Layer:** `lib/services/viajeEstado.ts` (cambiarEstadoViaje, asignarUnidad) + `lib/services/notificaciones.ts` (notificarCambioEstado)
- **Badges por Rol (Sesión 29):** `estados-camiones.tsx` muestra 6 badges unificados para todos los roles (Todos, En Planta, Por Arribar, Cargando, Descargando, Egresados)
- **Estado Despacho Computado (Sesión 29):** Estado visual de despachos se computa desde viajes (en_proceso/completado) en vez de usar campo `estado` crudo de BD
- **Incidencias API (Sesión 29):** POST /api/incidencias usa supabaseAdmin para insert, auto-ensure usuario en tabla `usuarios`, logging mejorado
- **Incidencias (Sesión 28):** Diseño completo en `docs/diagramas/INCIDENCIAS.md` — tabla canónica `incidencias_viaje`, deprecar `incidencias`
- **Thin API Routes:** API routes delegan a services layer (no lógica directa en handlers)
- **Timestamps automáticos:** cambiarEstadoViaje() upsert timestamp por fase en estado_unidad_viaje
- **Sync estado_carga_viaje:** cambiarEstadoViaje() sincroniza automáticamente estado_carga_viaje (elimina actualizarEstadoDual)
- **Vercel Config:** vercel.json creado (región gru1, pnpm, API maxDuration 30s)
- **Git:** Pusheado a GitHub main (commit 1b7dd24)
- **Vercel:** Proyecto `nodexia-web-j6wl` → www.nodexiaweb.com (proyecto roto `nodexia-web` eliminado)
- **PROD Supabase:** `lkdcofsfjnltuzzzwoir` — Schema sincronizado con DEV
- **DEV Supabase:** `yllnzkjpvaukeeqzuxit`
- **Security Hardening (Sesión 19):** 55/55 API routes con `withAuth` middleware, `withAdminAuth` eliminado
- **Security Audit (Sesión 24):** IDOR fixes (preview-url, GPS, timeline), CSP header, ErrorBoundary global, 7 singleton fixes, error.message sanitizado
- **Performance (Sesión 24):** Migración 060 — 11 indexes + 3 cleanup fns (pg_cron) ejecutada en PROD
- **Team Docs (Sesión 24-25):** docs/equipos/ — FRONTEND.md, BACKEND-API.md, BD-SUPABASE.md, MOBILE.md
- **Refactoring (Sesión 25):** 15 components extracted from 4 large pages:
  - crear-despacho.tsx: 2405→1593 (5 components: DespachoForm, DespachoTabs, DespachoTableRow, CancelarDespachoModal, ViajesSubTable)
  - chofer-mobile.tsx: 1976→1429 (7 components: BottomNavBar, IncidenciasTab, PerfilTab, TripDetailsCard, QRModal, HamburgerMenu, IncidenciaModal)
  - control-acceso.tsx: 1227→993 (2 components: HistorialAccesos, EstadoBanners)
  - supervisor-carga.tsx: 1157→1014 (1 component: ViajeAcciones)
- **Auditoría Técnica (Sesión 25):** docs/auditorias/AUDITORIA-COMPLETA-2026-02-17.md — Seguridad (3C/5H/6M), Performance (D+), BD (C+), Equipos (B-), Testing (F), CI/CD (F), Plan 3 fases
- **DB Sync PROD (Sesión 19):** 6 scripts SQL ejecutados (columns, tables, indexes, functions, views, security)
- **Security P0 Fixes (Sesión 19):** delete-despacho migrado a withAuth, passwords removidos de docs, password_temporal removido de audit trail
- **PROD Testing (Sesión 19):** Despacho creado, viaje generado, transporte asignado, unidad asignada — flujo parcialmente validado E2E en PROD
- **Codebase Cleanup (Sesión 18):**
  - scripts/ archivado (196→5 operativos)
  - sql/ archivado (229 root→0, 124→36 migraciones canónicas)
  - docs/ archivado (244→15 operativos)
  - lib/ limpio (7 módulos dead code eliminados)
  - components/ limpio (27 componentes muertos + 3 hooks muertos eliminados)
  - .gitignore actualizado (playwright-report, test-results, archive dirs)
  - Build limpio: 0 errores
- **PostgREST FK Hints:** `ofertas_red_nodexia!viaje_red_id` para disambiguar 2 FKs a viajes_red_nodexia
- **Fase 5 Destino:** Control de acceso auto-detecta envio/recepcion por empresa_id de ubicación
- **Timeline/Historial:** Híbrido — timestamps existentes de viajes_despacho + tabla historial_despachos para eventos custom
- **Asignar Unidad:** API service role bypasa RLS (fix DSP-20260211-004)
- **Vinculación Model:** `relaciones_empresas` (empresa_cliente_id, empresa_transporte_id, estado: activa/inactiva)
- **Tabla `transportes`:** NO EXISTE — código legacy que la referenciaba fue corregido
- **Tabla documentos_viaje:** La real es `documentos_viaje_seguro` (NOT NULL: viaje_id, tipo, nombre_archivo, file_url, storage_path, fecha_emision, subido_por)
- **Flujo E2E Validado:** Supervisor remito → CA egreso → Chofer viaje destino → Finalizar → Vacío ✅
- **Red Nodexia E2E Validado:** Publicar → Ofertar → Aceptar → Rechazar otros → Display badges ✅
- **Hardening:** ~20 APIs peligrosas eliminadas, GPS auth bypass fix, security headers, leaked key removida (commit e3b8e29)
- **Control de Acceso:** Verificación docs real vía `validarDocumentacionCompleta()` → API → RLS, criterios dinámicos chofer dependencia/autónomo
- **Control de Acceso endpoints migrados a RLS:** documentos-detalle.ts, preview-url.ts (permiso), verificar-documentacion.ts, escanear-qr.ts, crear-incidencia.ts, confirmar-accion.ts
- **Control de Acceso endpoints pendientes supabaseAdmin:** NINGUNO — todos migrados a createUserSupabaseClient
- **Alertas Documentación:** Hook useDocAlerts + DocAlertsBanner + DocComplianceCard
- **Dashboard Transporte:** Métricas completas (viajes + flota + docs compliance)
- **Seguridad API:** Auditoría completa realizada, pase de seguridad registrado como PENDIENTE CRÍTICO post-MVP (ver docs/PENDIENTE-CRITICO-SEGURIDAD-API.md)

---

## ✅ FUNCIONALIDADES QUE FUNCIONAN

### Coordinador de Planta:
- ✅ Ver planificación semanal/mensual/diaria con estados
- ✅ Gestionar ubicaciones
- ✅ Gestionar transportes vinculados
- ✅ Desvincular transporte con validación de viajes activos + modal confirmación
- ✅ Crear despachos
- ✅ Asignar transporte
- ✅ Aceptar oferta Red Nodexia (API service role, 8 pasos atómicos)
- ✅ Ver detalle de despachos completados (viajes + docs + timeline + facturación)

### Transporte:
- ✅ Gestionar flota (camión, chofer, acoplado) — vista unificada en cards
- ✅ Generar unidades operativas (chofer+camión+acoplado) — con status badges
- ✅ Recibir despachos
- ✅ Asignar unidad operativa a despacho — modal compacto 2-col
- ✅ Ver ubicación en tiempo real de unidades
- ✅ Panel de estado de cada unidad operativa
- ✅ Asignación inteligente de unidades
- ✅ Acceso a red Nodexia (ofertas de carga)
- ✅ Red Nodexia: marketplace filtra viajes de empresas vinculadas directamente
- ✅ Red Nodexia: display "No seleccionado" para ofertas rechazadas (badge rojo, banner, opacity)
- ✅ Red Nodexia: modal in-app para confirmación de oferta (no browser alert)
- ✅ Estado de docs en tabla de unidades operativas (DocStatusBadge)
- ✅ Alertas de vencimiento de docs en sidebar (badge) y dashboard (banner)
- ✅ Compliance de documentación en dashboard (DocComplianceCard)
- ✅ Resumen de flota en dashboard (FlotaResumenCard)
- ✅ Página de documentación usando sistema nuevo (DocumentosFlotaContent)

### Chofer:
- ✅ Aceptar viaje asignado
- ✅ Iniciar viaje
- ✅ Intervención en estados según proceso
- ✅ GPS en tiempo real
- ✅ Visualización de datos de viaje con ubicación
- ✅ Integración Google Maps (trazar ruta)
- ✅ Ver y subir documentos desde perfil móvil
- ✅ Self-delivery: remito upload + auto-completar viaje (destinos no-Nodexia)

### Control de Acceso:
- ✅ Escanear QR (ingresar número de despacho)
- ✅ Visualización correcta del despacho escaneado
- ✅ Verificación de documentación de recursos al escanear QR (API route)
- ✅ Bloqueo de ingreso si docs faltantes/vencidos
- ✅ Criterios de docs dinámicos: chofer dependencia (ART+cláusula) vs autónomo (seguro vida)
- ✅ Alias de tipos de doc (vtv→rto, tarjeta_verde→cedula) para compatibilidad con datos legacy
- ✅ Modal de documentación detallada via API server-side (bypasea RLS)
- ✅ Botones de validación verifican estado real de docs
- ✅ Whitelist de estados válidos con fallback (no más "expirado")
- ✅ Alerta "Ya ingresado" al re-escanear viaje ingresado
- ✅ Historial con datos reales (chofer/camión) sin N/A
- ✅ Dual state sync (estado + estado_unidad siempre sincronizados)

### Admin Nodexia:
- ✅ Creación de empresas
- ✅ Creación de ubicaciones
- ✅ Creación de usuarios
- ✅ Vinculación usuarios-empresas
- ✅ Asignación de roles
- ✅ Validación de documentos (3 tabs: PENDIENTE/APROBADO/RECHAZADO, modal, notificaciones)

### Supervisor de Carga:
- ✅ Vista "En Planta" — vehículos ingresados esperando ser llamados a carga
- ✅ Vista "En Carga" — vehículos llamados o cargando activamente
- ✅ Vista "Cargados" — vehículos con carga completada, listos para egreso
- ✅ Escáner QR — búsqueda de viaje individual por código o N° viaje
- ✅ Acción "Llamar a Carga" — actualiza estado_unidad + estado_carga a llamado_carga
- ✅ Acción "Iniciar Carga" — actualiza ambos estados a cargando
- ✅ Acción "Completar Carga" — form con peso real (tons), bultos, temperatura
- ✅ Actualización dual de estado (estado_unidad + estado_carga sincronizados)
- ✅ Contadores de resumen en header (En Planta / En Carga / Cargados)
- ✅ Auto-refresh cada 30 segundos
- ✅ UI dark theme consistente con el resto de la app
- ✅ Upload de remito al completar carga (API route → Storage bucket remitos → documentos_viaje_seguro)

### Flujo E2E Operativo (Sesión 11 — VALIDADO):
- ✅ Supervisor sube remito al completar carga
- ✅ CA valida remito y permite egreso
- ✅ Chofer ve viajes asignados (API route bypasa RLS)
- ✅ Chofer confirma viaje → inicia hacia destino → arriba → finaliza
- ✅ API estado-unidad con TRANSICIONES_VALIDAS en JS (sin RPC PostgreSQL)
- ✅ Tab filtering correcto en crear-despacho (fuera_de_horario ya no excluido)
- ✅ Viajes-activos muestra todos los estados intermedios (incl. arribado_destino)

### Despachos:
- ✅ Tab Ingresados (detecta viajes ingresados por estado_unidad + estado)
- ✅ Badge colors por estado de unidad
- ✅ Contadores reconocen todos los estado_unidad (22 valores)

### Estado Monitor:
- ✅ Estado de camiones en planta (queries batch con datos reales)
- ✅ Viajes activos transporte (filtros, badges, LED, contadores reconocen estado_unidad)

### Planificación:
- ✅ Labels legibles para todos los estado_unidad en PlanningGrid, DayView, MonthView
- ✅ Colores correctos por estado en todas las vistas

---

## ❌ FUNCIONALIDADES FALTANTES (PARA MVP)

### Prioridad CRÍTICA (bloqueantes para MVP):
1. **Control de Acceso:**
   - ✅ Verificación de docs al escanear QR (TASK-S05 completada)
   - ✅ Gestión de incidencias mejorada (TASK-S06 completada)
   - ✅ Proceso de egreso mejorado (TASK-S07 completada)
   - ✅ Registro de ingreso en registros_acceso

2. **Gestión de Documentación:**
   - ✅ Upload y gestión de docs (S01 completada)
   - ✅ Componentes UI upload/lista (S02 completada)
   - ✅ Admin: Panel de validación (S03+S04 completadas)
   - ✅ Integración en página de flota (DocumentosFlotaContent reescrito)
   - ✅ Sistema de alertas de vencimiento (S09 completada)
   - ✅ Upload desde perfil chofer (S11 completada)
   - ✅ Métricas dashboard transporte (S12 completada)

### Prioridad MEDIA (nice-to-have para MVP):
- ⚠️ Tests automatizados
- ⚠️ Consolidación de migraciones
- ⚠️ Optimización de performance

---

## 🏗️ ARQUITECTURA ACTUAL

### Frontend:
```
pages/
├── /index.tsx                  # Dashboard principal
├── /despachos/*                # Gestión despachos
├── /control-acceso.tsx         # Control de acceso (1609 líneas)
├── /admin/*                    # Panel admin
└── /api/*                      # API routes

components/
├── /Admin/
├── /ControlAcceso/
├── /Despachos/
├── /Dashboard/
└── /layout/
```

### Backend:
- API Routes de Next.js
- Supabase (Postgres + Auth + Storage + RLS)
- Funciones SQL (RPCs)

### Base de Datos:
- ~45 tablas principales
- RLS implementado (con algunos fixes pendientes)
- Migraciones: necesitan consolidación urgente

---

## 🔥 PROBLEMAS CONOCIDOS

1. **Migraciones descontroladas:** 96 archivos SQL (muchos duplicados, fixes, debug)
2. **Código largo sin refactorizar:** control-acceso.tsx (1338 líneas)
3. **RLS con recursión:** ✅ RESUELTO — Migration 051 + 052 corrigieron
4. **Sin tests reales:** Solo 3 archivos de test
5. **Documentación de código:** Escasa en archivos legacy
6. **RPC validar_transicion_estado_unidad:** ✅ RESUELTO — Migración 049 ejecutada
7. **Dual state columns:** ✅ RESUELTO — AMBOS se actualizan siempre
8. **RLS visible recursos:** ✅ RESUELTO — Migration 052 aplicada (admin bypass + branches correctos)
9. **API auth 403:** ✅ RESUELTO — APIs usan usuarios_empresa.rol_interno (no usuarios.rol)
10. **✅ RESUELTO: Por vencer bloqueaba acceso** — API recalcula vigencia real desde fecha_vencimiento + evalúa por tipo requerido
11. **✅ RESUELTO: Migración 053 (incidencias_viaje)** — Ejecutada por usuario
12. **✅ RESUELTO: Migración 054 (documentos_entidad)** — Ejecutada por usuario
13. **✅ RESUELTO: Pase de seguridad API** — 55/55 API routes ahora usan `withAuth` middleware (Fases 1-4, Sesión 19). `withAdminAuth` eliminado.
14. **✅ RESUELTO: Chofer 0 viajes** — RLS bloqueaba queries → API route con service_role
15. **✅ RESUELTO: RPC actualizar_estado_unidad** — No existía → TRANSICIONES_VALIDAS en JS
16. **✅ RESUELTO: Tab filtering crear-despacho** — fuera_de_horario excluía despachos → removida exclusión
17. **✅ RESUELTO: arribado_destino invisible** — Faltaba en filtros/estilos de viajes-activos y crear-despacho
18. **✅ RESUELTO: Viajes no se expandían** — Query con joins complejos fallaba silenciosamente → simplificado a select('*') (commit a786b89)
19. **✅ RESUELTO: Red Nodexia mostraba datos stale** — Chofer/camión/acoplado visibles antes de confirmación → override con "Esperando oferta" (commit d0cac1c)
20. **✅ RESUELTO: Tab categorización demorado/expirado** — Esquema definitivo con membresía exclusiva de tabs (commit 9efe9a7)
21. **✅ RESUELTO: Hardening seguridad** — 20 APIs eliminadas, auth bypass GPS, security headers, leaked key (commit e3b8e29)
22. **✅ RESUELTO: PostgREST embed ambiguity** — ofertas_red_nodexia tiene 2 FKs a viajes_red_nodexia → FK hint `!viaje_red_id`
23. **✅ RESUELTO: RLS bloqueaba aceptar oferta** — ofertas no tenía UPDATE policy + trigger permission denied → API service role
24. **⚠️ RLS gap:** `ofertas_red_nodexia` sin UPDATE policy — Bypaseado por API, pero falta policy para seguridad en producción
25. **✅ RESUELTO: DSP-20260211-004 chofer/camión no muestra** — Causa: RLS bloqueaba AsignarUnidadModal + enRedPendiente nullificaba chofer_id. Fix: API service role + condición actualizada + display intermedio

---

## 📅 PLAN INMEDIATO

**Ver:** `.copilot/TASKS-ACTIVE.md` para tareas en progreso  
**Ver:** `docs/MVP-ROADMAP.md` para plan de 10 días  
**Ver:** `docs/POST-MVP-PLAN.md` para profesionalización post-presentación

---

## 🔄 ÚLTIMA ACTIVIDAD

**Sesión 17-Feb-2026 (Sesión 25 — Team Docs):**

### Contexto:
- Continuación de documentación de equipos iniciada en sesión 24
- Reconstrucción de contexto de sesión 24 (no guardada)

### Principales logros:
1. ✅ Creado `docs/equipos/BD-SUPABASE.md` — Guía completa equipo BD
2. ✅ Creado `docs/equipos/MOBILE.md` — Guía completa equipo Mobile
3. ✅ Corregido `docs/equipos/BACKEND-API.md` — Service layer y estados reales
4. ✅ Actualizado sistema de memoria (.copilot/)

---

**Sesión 16-Feb-2026 (Sesión 24 — Security + Performance Audit, sin cierre formal):**

### Contexto:
- Auditoría de seguridad + performance previo a demo
- Inicio de documentación de equipos

### Principales logros:
1. ✅ IDOR fixes en 4 APIs (preview-url, GPS, timeline)
2. ✅ CSP header + ErrorBoundary global
3. ✅ 7 Supabase singletons corregidos
4. ✅ Migración 060: 11 indexes + pg_cron (ejecutada en PROD)
5. ✅ Creados FRONTEND.md y BACKEND-API.md
6. ✅ Google verification file

### Commits sesión 24:
- `60e35fb` — Security+performance audit (16-Feb)
- `0084ddd` — Google verification + team docs (17-Feb)

---

**Sesión 15-Feb-2026 (Sesión 23 — Full Trip E2E + Flota Redesign + Detail Page):**

### Contexto:
- 12 rondas de testing E2E intensivo en PROD del ciclo COMPLETO de viaje
- Ciclo completo validado end-to-end: crear → asignar → tránsito → planta → carga → egreso → destino → completar
- Flujo self-delivery para destinos no-Nodexia implementado
- Rediseño Flota (5 tabs → 2 tabs unificados con Unidades Operativas)
- Detail page para despachos completados creada
- Modal de asignación rediseñado (cards compactas)

### Principales logros:
1. ✅ Ciclo de viaje COMPLETO validado E2E en PROD (todos los actores)
2. ✅ Self-delivery flow: chofer sube remito + auto-completa en destinos no-Nodexia
3. ✅ TrackingView: badges correctos en ambos paneles (left + right)
4. ✅ Completados tab: sin botones Asignar/RED, con "Ver Detalle"
5. ✅ Detail page: viajes + documentos + timeline + facturación placeholder
6. ✅ Flota unificada: Unidades Operativas + Inventario en card grid
7. ✅ Modal asignación: 2-col compact cards con status/location/docs

### Commits sesión 23:
- `4c24f53` → `d40fa8c` — Rounds 1-9 E2E fixes
- `530fbc0` — Egreso naming + viajes-activos split
- `02128d8` — Self-delivery flow + TrackingView fix
- `b01f02b` — Detail page + flota unified + modal compact
- `64fe2ad` — Unidades operativas in flota

### Flujo E2E COMPLETO validado:
- ✅ Crear despacho → viaje → asignar transporte → asignar unidad
- ✅ Chofer confirma → inicia → tránsito origen → ingreso → carga → egreso
- ✅ Tránsito destino → ingreso destino → descarga → egreso → completado
- ✅ Destino no-Nodexia: self-delivery (remito + auto-complete)
- ✅ State sync across ALL actors
- ✅ TrackingView panels correctos en todas las fases

---

**Sesión 13-Feb-2026 (Sesiones 16-17 — Centralización de Estados Completa):**

### Contexto:
- Reestructuración arquitectónica completa del sistema de estados para escalabilidad de equipo
- Migración de 22 estados legacy a 17+1 centralizados
- Purga completa de estados obsoletos en 30+ archivos
- Services layer (viajeEstado, notificaciones) para thin API routes
- 56 tests automatizados para el sistema de estados

### Cambios principales:

**1. Sistema de estados centralizado (lib/estados/config.ts):**
- 17 estados + cancelado como FUENTE ÚNICA DE VERDAD
- TRANSICIONES_VALIDAS, ORDEN_ESTADOS, ESTADO_DISPLAY, ROLES_AUTORIZADOS
- Funciones: validarTransicion, getProximosEstados, puedeActualizar, calcularProgreso
- Legacy mapping en getEstadoDisplay() para backward compatibility

**2. Services layer completo:**
- `lib/services/viajeEstado.ts` — cambiarEstadoViaje() sincroniza 3 tablas (viajes_despacho + despachos + estado_unidad_viaje)
- `lib/services/notificaciones.ts` — notificarCambioEstado() centralizado
- ESTADO_A_TIMESTAMP mapping: cada estado popula su timestamp en estado_unidad_viaje

**3. Purga de estados obsoletos (30+ archivos):**
- Eliminados: arribo_origen, arribo_destino, en_playa_origen, viaje_completado, entregado, vacio, disponible_carga, etc.
- Reemplazados por equivalentes centralizados en todo el código ejecutable

**4. confirmar-accion.ts migrado:**
- Antes: usaba RPC validar_transicion_estado_unidad (riesgo de desync)
- Ahora: usa cambiarEstadoViaje() + notificarCambioEstado()

**5. cancelarViaje() centralizado:**
- Antes: update directo en estado_unidad_viaje (bypasaba service)
- Ahora: ruta via API → cambiarEstadoViaje()

**6. Lectura estandarizada:**
- Todos los archivos usan `estado || estado_unidad` (estado es canónico)
- estados-camiones.tsx: query cambiada de .in('estado_unidad') a .in('estado')

**7. 56 tests automatizados:**
- Completeness (18 estados), transitions, happy-path, roles, legacy mapping, graph integrity

### Archivos creados:
```
lib/estados/config.ts — Fuente única de verdad (17+1 estados)
lib/estados/index.ts — Re-exports
lib/services/viajeEstado.ts — Service: cambiarEstadoViaje, asignarUnidad
lib/services/notificaciones.ts — Service: notificarCambioEstado
sql/migrations/058_centralizacion_estados_y_paradas.sql — Migración estados + paradas ✅ EJECUTADA
sql/migrations/059_unificar_estado_unidad_viaje.sql — CHECK constraint actualizado ✅ EJECUTADA
__tests__/lib/estados-config.test.ts — 56 tests
```

### Archivos modificados (30+):
```
Purga de estados obsoletos en: crear-despacho.tsx, despachos.tsx, notificaciones.tsx,
types/network.ts, MonthView.tsx, DayView.tsx, estados-camiones.tsx, supervisor-carga.tsx,
viajes-activos.tsx, despachos-ofrecidos.tsx, tracking-flota.tsx, demo-qr.tsx,
configuracion/transportes.tsx, actualizar-ubicacion.ts, escanear-qr.ts, chofer/viajes.ts,
control-acceso.tsx, confirmar-accion.ts, lib/api/estado-unidad.ts, lib/estadosHelper.ts
```

### Migraciones ejecutadas:
- ✅ `058_centralizacion_estados_y_paradas.sql`
- ✅ `059_unificar_estado_unidad_viaje.sql`

**✅ MIGRACIONES EJECUTADAS EN PROD (Sesión 20):**
- `sql/migrations/055_historial_despachos.sql` — Tabla historial_despachos ✅
- `sql/migrations/056_fix_rls_viajes_red_rechazados.sql` — RLS transportes rechazados ✅

**Próximos pasos (quedan 4 días):**
- Continuar testing E2E en PROD (chofer confirma viaje, tracking GPS, flujo completo)
- Security P1: Rate limiting middleware, CORS para mobile
- Code structure P2: Extraer lógica de modals, split lib/types.ts
- TASK-S23: Circuito de incidencias
- Verificar DEV FK names = PROD FK names (despachos↔ubicaciones)

---

## 📌 NOTAS IMPORTANTES

- Usuario NO es desarrollador (logró esto con ayuda de IA)
- Presentación MVP: 18-Feb-2026
- Objetivo post-MVP: Profesionalizar sin equipo humano
- Stack moderno (puede tener bugs por versiones muy nuevas)
- Tabla `transportes` NO existe — usar `empresas` con tipo_empresa='transporte'
- `despachos` usa `pedido_id` para identificadores DSP-YYYYMMDD-NNN
