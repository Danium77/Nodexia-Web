# 🚀 PRÓXIMA SESIÓN - 10-FEB-2026 (o posterior)

**Preparado por sesión anterior:** 09-FEB-2026 (Sesión 7)  
**Estado del proyecto:** ~89% completado  
**Última actualización:** 09-FEB-2026

---

## 📊 ESTADO ACTUAL

### Lo que se completó hoy (09-FEB-2026 - Sesión 7):

**Features nuevos:**
- ✅ **UX de Documentos requeridos por entidad** — `DocumentosFlotaContent.tsx` rediseñado con docs pre-listados (chofer: licencia, ART, seguro vida; camión/acoplado: seguro, RTO, cédula), upload inline por tipo, badges de estado, resumen Completo/Incompleto
- ✅ **Página de Validación de Documentos (Admin)** — `pages/admin/validacion-documentos.tsx` nueva (~400 líneas). Filtros por estado, aprobar con 1 click, rechazar con motivo obligatorio. Accesible para super_admin y admin_nodexia
- ✅ **Link "Validar Documentos" en Sidebar** — Agregado para roles super_admin y admin_nodexia
- ✅ **Card "Validar Documentos" en Super Admin Dashboard** — Con link a la página
- ✅ **Tab "Ingresados" en Despachos** — `crear-despacho.tsx` con pestaña 🏭 Ingresados que detecta viajes con estado_unidad ingresado_origen, en_playa_origen, etc.

**Bugs corregidos (de testing en vivo):**
- ✅ **estado_unidad "expirado" al re-escanear** — Agregado whitelist `ESTADOS_UNIDAD_VALIDOS` en control-acceso.tsx; si estado_unidad no es válido, usa fallback al campo `estado` o default `en_transito_origen`
- ✅ **Historial mostrando N/A en todo** — Reescrito `cargarHistorial()` con queries separadas (viajes_despacho + choferes + camiones) en vez de nested joins de Supabase que fallaban silenciosamente
- ✅ **Estado no se propagaba a vista Despachos/Planning** — `lib/api/estado-unidad.ts` ahora actualiza AMBAS columnas (`estado` Y `estado_unidad`) en viajes_despacho, tanto en path RPC como en fallback directo
- ✅ **Tab Ingresados vacía** — Detección ahora chequea AMBOS campos (estado_unidad y estado); agregados más estados a la lista ESTADOS_INGRESADOS
- ✅ **Alerta "Ya ingresado"** — Al escanear viaje ya ingresado, muestra alerta cyan en vez de intentar re-ingresar
- ✅ **UTF-8 mojibake en Super Admin Dashboard** — Corregidos todos los caracteres corruptos (AdministraciÃ³n → Administración, â†' → →, etc.)

---

## ⚠️ MIGRACIONES PENDIENTES DE EJECUTAR

### CRÍTICO — Ejecutar ANTES de testear:

**Migration 049** — `sql/migrations/049_fix_rpc_validar_transicion_firma.sql`
- Crea overload del RPC `validar_transicion_estado_unidad` con los nombres de parámetros correctos
- Sin esto, el RPC falla y usa fallback (funciona pero es menos robusto)

**Migration 050** — `sql/migrations/050_crear_tabla_registros_acceso.sql`
- Crea tabla `registros_acceso` con columnas: id, viaje_id, tipo_operacion, timestamp, usuario_id, datos_adicionales
- Políticas RLS incluidas
- Sin esto, el historial de Control de Acceso no persiste en BD

**Cómo ejecutar:**
1. Ir a Supabase Dashboard → SQL Editor
2. Copiar y pegar contenido de cada archivo
3. Ejecutar en orden (049 primero, luego 050)

---

## 🔧 ARCHIVOS CLAVE MODIFICADOS ESTA SESIÓN

### Control de Acceso — `pages/control-acceso.tsx` (~1335 líneas)
- `ESTADOS_UNIDAD_VALIDOS` whitelist (línea ~435)
- `cargarHistorial()` reescrito con queries separadas (línea ~128-176)
- Alerta "Ya ingresado" cyan (línea ~1020-1040)
- `confirmarIngreso()` solo transiciona en_transito → ingresado

### Estado Unidad API — `lib/api/estado-unidad.ts` (~240 líneas)
- **CAMBIO CRÍTICO:** Actualiza AMBAS columnas `estado` + `estado_unidad` en viajes_despacho
- RPC path: Después de RPC exitoso, sincroniza ambas columnas
- Fallback path: Update directo escribe ambas columnas

### Crear Despacho — `pages/crear-despacho.tsx` (~2952 líneas)
- `activeTab` type incluye `'ingresados'`
- Query de viajes ahora trae `estado_unidad`
- `ESTADOS_INGRESADOS` array con 7 estados
- Tab 🏭 Ingresados entre Asignados y Demorados
- Badge colors para estados ingresados (cyan, teal, amber, indigo)

### Documentos Flota — `components/Transporte/DocumentosFlotaContent.tsx` (~350 líneas)
- Rediseñado completo con `DOCUMENTOS_REQUERIDOS` config por tipo de entidad
- Upload inline por tipo de documento con `SubirDocumento`
- Badges de estado, resumen Completo/Incompleto/En validación

### Validación Documentos (NUEVO) — `pages/admin/validacion-documentos.tsx` (~400 líneas)
- Página admin para aprobar/rechazar documentos
- Filtros por estado, enriquecimiento de entidad (nombre chofer/camión + empresa)

### Sidebar — `components/layout/Sidebar.tsx`
- Link "✅ Validar Documentos" para super_admin y admin_nodexia

### Super Admin Dashboard — `pages/admin/super-admin-dashboard.tsx`
- UTF-8 fixes completos
- Card "Validar Documentos" agregada

---

## 🎯 QUÉ HACER EN LA PRÓXIMA SESIÓN

### Prioridad 1: Ejecutar migraciones y testear (1-2 horas)
1. Ejecutar migrations 049 y 050 en Supabase
2. Testear flow completo de Control de Acceso:
   - Escanear QR → validar docs → ingresar → verificar historial
   - Verificar que tab Ingresados muestra el viaje
   - Verificar que estado se refleja en Despachos y Planning
3. Testear validación de documentos desde admin

### Prioridad 2: Features pendientes para presentación (18-FEB-2026)
- **Dashboard de Coordinador de Planta** — Gestión de incidencias
- **Sistema de notificaciones** — Cuando se crean incidencias
- **Exportación CSV** del historial de acceso
- **Mejoras de UX** según feedback del usuario

### Prioridad 3: Hardening
- CI/CD pipeline
- Monitoring
- Tests automatizados

---

## 🐛 PROBLEMAS CONOCIDOS

### Críticos:
- ⚠️ **Migrations 049 y 050 no ejecutadas** — Sin ellas, RPC usa fallback e historial no persiste
- ⚠️ **Dual state columns** — `viajes_despacho` tiene `estado` Y `estado_unidad`; AMBOS deben actualizarse siempre (ya implementado en código, pero es un punto de fragilidad)

### No críticos:
- **RPC `validar_transicion_estado_unidad` con mismatch de firma** — Funciona por fallback, migration 049 lo arregla
- **eslint config warnings** al iniciar dev server (deprecated flat config) — No afecta funcionalidad
- **outdated baseline-browser-mapping** warning — Solo aviso, no afecta

---

## 💡 NOTAS TÉCNICAS IMPORTANTES

### Stack actualizado:
- **Next.js 16.1.2** + React 19 + Supabase + TypeScript + Tailwind v4
- Supabase Storage: Bucket privado `documentacion-entidades` (10MB, PDF/JPG/PNG)

### Tablas clave:
- `viajes_despacho` — Tiene AMBAS columnas `estado` y `estado_unidad` (mantener sincronizadas)
- `documentos_entidad` — Documentos subidos por entidad (chofer/camión/acoplado)
- `estado_unidad_viaje` — Log de transiciones de estado
- `registros_acceso` — Historial de ingresos/egresos (⚠️ migration 050 pendiente)
- `choferes` — FK: `chofer_id` (NO id_chofer)
- `camiones` — FK: `camion_id` (NO id_camion). NO tiene columna `tipo`

### Estados válidos de EstadoUnidadViaje (lib/types.ts):
`camion_asignado`, `en_transito_origen`, `ingresado_origen`, `en_playa_origen`, `llamado_carga`, `cargando`, `egreso_origen`, `en_transito_destino`, `ingresado_destino`, `en_playa_destino`, `descargando`, `egreso_destino`, `finalizado`
> ⚠️ "expirado" NO es un estado válido de unidad

### Patrones de código:
```typescript
// Query correcta de chofer
const { data: chofer } = await supabase
  .from('choferes')
  .select('id, nombre, apellido, dni, telefono, email')
  .eq('id', viajeData.chofer_id);  // ✅ chofer_id

// Query correcta de camión (sin 'tipo')
const { data: camion } = await supabase
  .from('camiones')
  .select('id, patente, marca, modelo, anio')  // ❌ NO incluir 'tipo'
  .eq('id', viajeData.camion_id);  // ✅ camion_id

// Actualizar estado — SIEMPRE ambas columnas
.from('viajes_despacho')
.update({ estado: nuevoEstado, estado_unidad: nuevoEstado, updated_at: new Date().toISOString() })
```

---

## 📚 DOCUMENTOS DE REFERENCIA

**Control de Acceso:**
- `pages/control-acceso.tsx` — Sistema principal (~1335 líneas)
- `lib/api/estado-unidad.ts` — API de transiciones de estado (~240 líneas)
- `sql/migrations/049_fix_rpc_validar_transicion_firma.sql` — ⚠️ PENDIENTE
- `sql/migrations/050_crear_tabla_registros_acceso.sql` — ⚠️ PENDIENTE

**Documentación de entidades:**
- `components/Transporte/DocumentosFlotaContent.tsx` — UX docs requeridos
- `components/Transporte/SubirDocumento.tsx` — Componente de upload
- `components/Transporte/ListaDocumentos.tsx` — Lista de documentos
- `pages/admin/validacion-documentos.tsx` — Validación admin

**Despachos:**
- `pages/crear-despacho.tsx` — Con tab Ingresados (~2952 líneas)

**BD:**
- `sql/create-viajes-despacho-system.sql` — Estructura viajes_despacho
- `sql/create_choferes_table.sql` — Estructura choferes
- `sql/create_flota_tables.sql` — Estructura camiones/acoplados
- `docs/ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md` — Referencia general

---

**Preparado por:** GitHub Copilot (Claude Opus 4.6)  
**Sesión anterior:** 09-FEB-2026 (Sesión 7)  
**Presentación MVP:** 18-FEB-2026  
**Esta info está actualizada y lista para usar** ✅
