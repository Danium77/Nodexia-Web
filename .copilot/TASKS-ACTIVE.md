# TAREAS ACTIVAS

**Actualizado:** 13-Feb-2026 (Cierre Sesión 17)

---

## ✅ COMPLETADAS (Sesiones 16-17 — 13-Feb-2026)

### Centralización Completa de Estados ✅
**Completado por:** Opus directamente - Sesiones 16-17
**Alcance:** Reestructuración arquitectónica del sistema de estados para escalabilidad de equipo

#### 1. Sistema de estados centralizado ✅
- `lib/estados/config.ts` — 17+1 estados, TRANSICIONES_VALIDAS, ROLES_AUTORIZADOS, ESTADO_DISPLAY
- `lib/estados/index.ts` — Re-exports
- Legacy mapping en getEstadoDisplay() para backward compatibility

#### 2. Services layer ✅
- `lib/services/viajeEstado.ts` — cambiarEstadoViaje() sincroniza 3 tablas + timestamps automáticos
- `lib/services/notificaciones.ts` — notificarCambioEstado() centralizado
- ESTADO_A_TIMESTAMP: cada estado popula su columna timestamp en estado_unidad_viaje

#### 3. Purga de estados obsoletos (30+ archivos) ✅
- Eliminados del código ejecutable: arribo_origen, arribo_destino, en_playa_origen, viaje_completado, entregado, vacio, disponible_carga, etc.
- Solo permanecen en: config.ts legacy mapping (intencional), SQL histórico, tipo de notificación

#### 4. Migración confirmar-accion.ts ✅
- Antes: RPC validar_transicion_estado_unidad (desync risk)
- Ahora: cambiarEstadoViaje() + notificarCambioEstado()

#### 5. cancelarViaje() centralizado ✅
- Antes: update directo en estado_unidad_viaje
- Ahora: ruta via API → cambiarEstadoViaje()

#### 6. Lectura estandarizada ✅
- Todos: `estado || estado_unidad` (estado es canónico)
- estados-camiones.tsx: .in('estado') en vez de .in('estado_unidad')

#### 7. SQL Migration 058 + 059 ✅ EJECUTADAS
- 058: Migración de estados legacy, tabla paradas, CHECK constraints
- 059: Unificar estado_unidad_viaje, sync con viajes_despacho.estado

#### 8. 56 tests automatizados ✅
- `__tests__/lib/estados-config.test.ts`
- Completeness, transitions, happy-path, roles, legacy mapping, graph integrity (BFS)

#### 9. 0 TypeScript errors ✅

---

## ✅ COMPLETADAS (Sesión 14 — 12-Feb-2026)

### Fix: DSP-20260211-004 Chofer/Camión No Muestra ✅
**Completado por:** Opus directamente - Sesión 14
**Causa raíz dual:**
1. `AsignarUnidadModal` usaba client-side Supabase → RLS bloqueaba UPDATE
2. `enRedPendiente` en crear-despacho.tsx nullificaba `chofer_id` incluso cuando ya estaba asignado
**Archivos creados:** `pages/api/transporte/asignar-unidad.ts` (~104 líneas, service role)
**Archivos modificados:**
- `components/Transporte/AsignarUnidadModal.tsx` — Usa API route en vez de Supabase directo
- `pages/crear-despacho.tsx` — `enRedPendiente` ahora chequea `!v.chofer_id` + display intermedio "⏳ Pendiente asignación"

### Feature: Historial/Timeline de Eventos ✅
**Completado por:** Opus directamente - Sesión 14
**Archivos creados:**
- `sql/migrations/055_historial_despachos.sql` — Tabla para eventos custom (⚠️ pendiente ejecución)
- `pages/api/despachos/timeline.ts` — API que construye timeline híbrido (timestamps existentes + tabla historial)
- `components/Despachos/TimelineDespachoModal.tsx` — Modal con filtros por tipo, agrupación por fecha, timestamps relativos
**Archivos modificados:**
- `pages/crear-despacho.tsx` — Import + state + botón 📜 Historial + modal rendering
- `pages/api/red-nodexia/aceptar-oferta.ts` — Escribe al historial al aceptar oferta
- `pages/api/transporte/asignar-unidad.ts` — Escribe al historial al asignar unidad

### TASK-S26: Fase 5 — Destino con Nodexia ✅
**Completado por:** Opus directamente - Sesión 14
**Hallazgo:** Fase 5 ya estaba implementada (estados, transiciones, UI, supervisor descarga) — solo faltaba auto-detección de `tipo_operacion`
**Archivos modificados:**
- `pages/control-acceso.tsx` — Auto-detecta envio/recepcion por `empresa_id` de ubicación + security check permite empresa destino

### TASK-S27: Cierre Automático del Viaje ✅
**Completado por:** Ya implementado en Sesión 13
**Confirmado en Sesión 14:**
- `vacío → viaje_completado` automático (estado-unidad.ts paso 4)
- Despacho → `completado` cuando todos viajes terminan (paso 5)
- Despacho → `cancelado` cuando todos viajes cancelados

### Polish para Demo ✅
**Completado por:** Opus directamente - Sesión 14
**Fixes:**
1. `viajes-activos.tsx` — Query incluye Phase 5 states (viajes no desaparecen mid-journey)
2. `chofer/viajes.tsx` — Alias `arribo_destino` para que chofer no quede sin acciones
3. `despachos-ofrecidos.tsx` — Phase 5 states excluidos de tab "pendientes"
4. `estado-unidad.ts` — `arribo_destino → vacio` permitido (shortcut non-Nodexia destinations)

---

## ✅ COMPLETADAS (Sesión 12 — 11-Feb-2026)

### Hardening de Seguridad ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** e3b8e29
**Archivos eliminados:** ~20 API routes peligrosas (debug, test, bypass, delete-all)
**Archivos modificados:** `next.config.ts` (security headers), `pages/api/gps/save-location.ts` (auth fix), `pages/admin/nueva-invitacion.ts` (hardcoded password)
**Archivos limpiados:** Leaked Supabase key removida de docs

### Fix Viajes no se expandían ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** a786b89
**Problema:** Query con joins complejos a estado_carga_viaje/camiones/choferes/acoplados fallaba silenciosamente
**Solución:** Simplificado a `select('*')` — datos de entidades se buscan por separado

### Fix Red Nodexia datos stale ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** d0cac1c
**Problema:** Viaje en Red Nodexia mostraba chofer/camión/acoplado antes de confirmación
**Solución:** Override con "En Red Nodexia", "Esperando oferta", dashes cuando viaje no está en movimiento físico

### Esquema Definitivo de Estados ✅
**Completado por:** Opus directamente - Sesión 12
**Commit:** 9efe9a7
**Archivos reescritos:** `lib/estadosHelper.ts` (completo)
**Archivos modificados:** `pages/crear-despacho.tsx` (tabs + badges), `pages/api/viajes/[id]/estado-unidad.ts` (transición)
**Cambios:**
- 22 estados en 7 fases (0-Creación a 6-Cierre + X-Cancelado)
- Constantes: ESTADOS_FASE_ASIGNACION, ESTADOS_EN_MOVIMIENTO, ESTADOS_EN_PLANTA, ESTADOS_FINALES
- Helpers: estaEnMovimiento(), estaEnAsignacion(), esFinal(), estaEnPlanta()
- calcularEstadoOperativo() simplificado: Final>EnPlanta>EnMovimiento>Asignación
- Tab categorización exclusiva (expirado excluye demorado, demorado excluye asignado/en_proceso)
- Badge counts consistentes con filtros
- API: arribo_destino permite arribado_destino (destinos sin Nodexia)

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

## 🎯 PRÓXIMAS TAREAS (Sesión 18+)

### REFERENCIA: Esquema General
**Archivo:** `docs/ESQUEMA-GENERAL-NODEXIA.md`
- Mapa completo de 6 fases, roles, estados, API routes, tablas
- Consultar antes de cada sesión para contexto

### ⚠️ PENDIENTE: Ejecutar Migraciones 055 + 056
- `sql/migrations/055_historial_despachos.sql` — Tabla historial_despachos
- `sql/migrations/056_fix_rls_viajes_red_rechazados.sql` — RLS transportes rechazados

### DEUDA TÉCNICA (Post-centralización estados):

#### 1. Centralizar estado_carga_viaje (Prioridad MEDIA)
- Crear service análogo a viajeEstado.ts para operaciones de carga
- supervisor-carga.tsx hace updates directos → migrar a service
- actualizarEstadoDual() tiene error silencioso si carga falla → fix

#### 2. Renombrar prop estado_unidad → estado (Prioridad BAJA)
- Interfaz ViajeEstado en estados-camiones.tsx usa `estado_unidad` como prop name
- Cosmético pero limpia deuda técnica en componentes downstream

#### 3. Deprecar lib/estadosHelper.ts (Prioridad BAJA)
- Actualmente es bridge que re-exporta desde lib/estados/config.ts
- calcularEstadoOperativo() aún usa estado_unidad como fallback
- Migrar importadores a lib/estados directamente

### TASK-S23: Definir Circuito de Incidencias (Prioridad MEDIA)
- Quién crea incidencias: Control de Acceso
- Quién resuelve: Coordinador de Planta
- Estados: abierta → en_revision → resuelta/cerrada
- Notificaciones: al crear, al resolver

### TASK-S24: Deploy Staging (Prioridad ALTA — Demo 18-Feb)
- Build de producción
- Variables de entorno en Vercel (apuntar a BD prod)
- Replicar schema de dev a prod (migraciones SQL manuales)
- ⚠️ BD dev y prod son SEPARADAS — solo se deploya código + schema

### TASK-S25: Testing con Data Real (Prioridad ALTA — Demo 18-Feb)
- Probar flujo E2E completo incluyendo Fase 5 destino
- Fix bugs visuales o de UX restantes
- Verificar timeline/historial con datos reales
- Preparar datos para demo presentación 18-Feb

### ⚠️ RLS Gap: ofertas_red_nodexia UPDATE Policy (Post-MVP)
- Tabla tiene INSERT + SELECT policies pero NO UPDATE policy
- Actualmente bypaseado por API service role
- Debe agregarse para seguridad en producción

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
