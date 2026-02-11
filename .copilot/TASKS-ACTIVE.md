# TAREAS ACTIVAS

**Actualizado:** 10-Feb-2026 (Sesión 11)

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

## 🎯 PRÓXIMAS TAREAS (Sesión 12 — Próxima)

### REFERENCIA: Esquema General
**Archivo:** `docs/ESQUEMA-GENERAL-NODEXIA.md`
- Mapa completo de 6 fases, roles, estados, API routes, tablas
- Consultar antes de cada sesión para contexto

### TASK-S26: Fase 5 — Destino con Nodexia (Prioridad ALTA)
- CA debe poder registrar ingreso Y egreso en destino (no solo origen)
- Supervisor de descarga (reutilizar supervisor-carga adaptado)
- Estados: ingresado_destino → llamado_descarga → descargando → descargado → egreso_destino

### TASK-S27: Cierre Automático del Viaje (Prioridad ALTA)
- Transición vacío → viaje_completado (automática o manual)
- Cierre de despacho cuando todos los viajes están completados
- Actualización del estado del despacho

### TASK-S28: Sincronización Estado Viaje en Despachos (Prioridad ALTA)
- La línea del viaje en crear-despacho mostraba "Pendiente" para estados no mapeados
- Verificar que TODOS los estados nuevos tengan label correcto
- Sincronizar estado del despacho padre con progreso de viajes

### TASK-S23: Definir Circuito de Incidencias (Prioridad MEDIA)
- Quién crea incidencias: Control de Acceso
- Quién resuelve: Coordinador de Planta
- Estados: abierta → en_revision → resuelta/cerrada
- Notificaciones: al crear, al resolver

### TASK-S24: Deploy Staging (Prioridad MEDIA)
- Build de producción
- Variables de entorno en Vercel (apuntar a BD prod)
- Replicar schema de dev a prod (migraciones SQL manuales)
- ⚠️ BD dev y prod son SEPARADAS — solo se deploya código + schema

### TASK-S25: Polish para Demo (Prioridad MEDIA)
- Probar todos los dashboards con data real
- Fix bugs visuales o de UX restantes
- Preparar datos para demo presentación 18-Feb

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
