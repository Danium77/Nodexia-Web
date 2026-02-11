# NODEXIA-WEB - Estado Actual del Proyecto

**Última actualización:** 11-Feb-2026 (Sesión 12 — Hardening + Red Nodexia Fixes + Esquema Definitivo Estados)
**Arquitecto/Tech Lead:** Opus (Claude)  
**Product Owner:** Usuario  
**Próxima presentación:** 18-Feb-2026 (7 días)

---

## 📊 ESTADO GENERAL

- **Fase:** Pre-MVP (Días 1-9 completados, adelantados al plan)
- **Stack:** Next.js 16 + React 19 + Supabase + TypeScript + Tailwind v4
- **Deployado:** No (desarrollo local)
- **Tests:** Mínimos (3 archivos)
- **Migraciones BD:** 109 archivos (046_CORREGIDO + 049 + 050 + 052 + 053 + 054 ejecutadas)
- **BD lista para documentación:** SÍ (3 tablas + 7 funciones + 3 triggers + 6 RLS + 14 indexes)
- **RLS corregido:** Migración 052 (get_visible_chofer_ids, get_visible_camion_ids, get_visible_acoplado_ids) - admin bypass + branches correctos
- **Storage Buckets:** documentacion-entidades, documentacion-viajes (privados, 10MB, PDF/JPG/PNG), remitos (público, 10MB)
- **API Routes Documentación:** 10 endpoints (upload, listar, [id], validar, pendientes, verificar-documentacion, documentos-detalle, estado-batch, alertas, preview-url)
- **API Routes Operativas (Sesión 11):** upload-remito, consultar-remito, chofer/viajes, viajes/[id]/estado-unidad
- **State Machine:** TRANSICIONES_VALIDAS en JS (19 estados, reemplaza RPC inexistente)
- **Esquema Definitivo Estados:** 22 estados en 7 fases (0-Creación a 6-Cierre + X-Cancelado) en `lib/estadosHelper.ts`
- **Tabla documentos_viaje:** La real es `documentos_viaje_seguro` (NOT NULL: viaje_id, tipo, nombre_archivo, file_url, storage_path, fecha_emision, subido_por)
- **Flujo E2E Validado:** Supervisor remito → CA egreso → Chofer viaje destino → Finalizar → Vacío ✅
- **Hardening:** ~20 APIs peligrosas eliminadas, GPS auth bypass fix, security headers, leaked key removida (commit e3b8e29)
- **Control de Acceso:** Verificación docs integrada con API (no RPC), criterios dinámicos chofer dependencia/autónomo
- **Alertas Documentación:** Hook useDocAlerts + DocAlertsBanner + DocComplianceCard
- **Dashboard Transporte:** Métricas completas (viajes + flota + docs compliance)
- **Seguridad API:** Auditoría completa realizada, pase de seguridad registrado como PENDIENTE CRÍTICO post-MVP (ver docs/PENDIENTE-CRITICO-SEGURIDAD-API.md)

---

## ✅ FUNCIONALIDADES QUE FUNCIONAN

### Coordinador de Planta:
- ✅ Ver planificación semanal/mensual/diaria con estados
- ✅ Gestionar ubicaciones
- ✅ Gestionar transportes vinculados
- ✅ Crear despachos
- ✅ Asignar transporte

### Transporte:
- ✅ Gestionar flota (camión, chofer, acoplado)
- ✅ Generar unidades operativas (chofer+camión+acoplado)
- ✅ Recibir despachos
- ✅ Asignar unidad operativa a despacho
- ✅ Ver ubicación en tiempo real de unidades
- ✅ Panel de estado de cada unidad operativa
- ✅ Asignación inteligente de unidades
- ✅ Acceso a red Nodexia (ofertas de carga)
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
13. **🔴 PENDIENTE CRÍTICO: Pase de seguridad API** — 23+ endpoints sin auth o sin scope. Ver docs/PENDIENTE-CRITICO-SEGURIDAD-API.md. DEBE completarse ANTES de producción.
14. **✅ RESUELTO: Chofer 0 viajes** — RLS bloqueaba queries → API route con service_role
15. **✅ RESUELTO: RPC actualizar_estado_unidad** — No existía → TRANSICIONES_VALIDAS en JS
16. **✅ RESUELTO: Tab filtering crear-despacho** — fuera_de_horario excluía despachos → removida exclusión
17. **✅ RESUELTO: arribado_destino invisible** — Faltaba en filtros/estilos de viajes-activos y crear-despacho
18. **✅ RESUELTO: Viajes no se expandían** — Query con joins complejos fallaba silenciosamente → simplificado a select('*') (commit a786b89)
19. **✅ RESUELTO: Red Nodexia mostraba datos stale** — Chofer/camión/acoplado visibles antes de confirmación → override con "Esperando oferta" (commit d0cac1c)
20. **✅ RESUELTO: Tab categorización demorado/expirado** — Esquema definitivo con membresía exclusiva de tabs (commit 9efe9a7)
21. **✅ RESUELTO: Hardening seguridad** — 20 APIs eliminadas, auth bypass GPS, security headers, leaked key (commit e3b8e29)

---

## 📅 PLAN INMEDIATO

**Ver:** `.copilot/TASKS-ACTIVE.md` para tareas en progreso  
**Ver:** `docs/MVP-ROADMAP.md` para plan de 10 días  
**Ver:** `docs/POST-MVP-PLAN.md` para profesionalización post-presentación

---

## 🔄 ÚLTIMA ACTIVIDAD

**Sesión 11-Feb-2026 (Sesión 12 — Hardening + Red Nodexia + Estados Definitivo):**

### Contexto:
- Hardening de seguridad pre-demo
- Red Nodexia: fixes de visualización y categorización
- Esquema definitivo de estados para viajes (22 estados, 7 fases)
- 7 días para la presentación MVP (18-Feb-2026)
- **RESULTADO: SEGURIDAD HARDENED + ESTADOS DEFINITIVOS** ✅

### Cambios principales:

**1. Hardening de seguridad (commit e3b8e29):**
- ~20 API routes peligrosas eliminadas (debug, test, bypass, delete-all)
- GPS auth bypass fix (validar JWT antes de guardar ubicación)
- Security headers en next.config.ts (CSP, HSTS, X-Frame-Options, etc.)
- Leaked Supabase service key removida de docs/
- Password hardcodeada reemplazada en nueva-invitacion.ts

**2. Red Nodexia fixes (commits a786b89, d0cac1c):**
- Viajes no se expandían → query simplificado a select('*')
- Datos stale de chofer/camión → override con "En Red Nodexia" / "Esperando oferta" cuando viaje no está en movimiento

**3. Tab categorización (commits 4ea02da, 4e34c1f, aafba23, 9efe9a7):**
- Despacho Red Nodexia aparecía en Demorados en vez de Expirados
- Múltiples iteraciones hasta solución definitiva
- Esquema final con membresía exclusiva de tabs

**4. Esquema definitivo de estados (commit 9efe9a7):**
- estadosHelper.ts reescrito completo: 22 estados en 7 fases
- Constantes: ESTADOS_FASE_ASIGNACION, ESTADOS_EN_MOVIMIENTO, ESTADOS_EN_PLANTA, ESTADOS_FINALES
- Helpers: estaEnMovimiento(), estaEnAsignacion(), esFinal(), estaEnPlanta()
- calcularEstadoOperativo() simplificado: Final>EnPlanta>EnMovimiento>Asignación
- Tab categorización en crear-despacho.tsx con prioridad exclusiva
- API: arribo_destino permite arribado_destino (destinos sin Nodexia)

### Archivos modificados/creados:
```
REESCRITOS:
- lib/estadosHelper.ts (esquema definitivo de estados, ~260 líneas)

ELIMINADOS (~20 archivos):
- APIs de debug/test/bypass/delete-all

MODIFICADOS:
- pages/crear-despacho.tsx (Red Nodexia override + tab categorización exclusiva + badges)
- pages/api/viajes/[id]/estado-unidad.ts (transición arribo_destino → arribado_destino)
- next.config.ts (security headers)
- pages/api/gps/save-location.ts (auth fix)
- pages/admin/nueva-invitacion.ts (hardcoded password removida)
```

### Commits de sesión:
- e3b8e29: Hardening (seguridad)
- a786b89: Fix viajes expand
- d0cac1c: Red Nodexia pending display
- 4ea02da, 4e34c1f, aafba23: Tab categorización iteraciones
- 9efe9a7: Esquema definitivo de estados

### Test Data de Referencia:
- Despacho: DSP-20260210-001 (id: 169630e5)
- Viaje: 43194a04
- Chofer: walter@logisticaexpres.com (user_id: cd5eaa17, chofer_id: 75251f55)

**Próximos pasos (quedan 7 días):**
- Fase 5: Destino con Nodexia (CA + descarga en destino)
- Cierre automático del viaje (vacío → completado)
- Sincronización estado viaje en crear-despacho
- Polish para demo + deploy staging

---

## 📌 NOTAS IMPORTANTES

- Usuario NO es desarrollador (logró esto con ayuda de IA)
- Presentación MVP: 18-Feb-2026
- Objetivo post-MVP: Profesionalizar sin equipo humano
- Stack moderno (puede tener bugs por versiones muy nuevas)
