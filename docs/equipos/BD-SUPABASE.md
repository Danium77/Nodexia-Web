# GUÍA DEL EQUIPO BASE DE DATOS / SUPABASE

**Proyecto:** Nodexia-Web  
**Stack:** Supabase (PostgreSQL 15) + Row Level Security + Edge Functions  
**Última actualización:** 17-Feb-2026

---

## 1. ARQUITECTURA DE BASE DE DATOS

### Stack tecnológico
- **Motor:** PostgreSQL 15 (gestionado por Supabase)
- **Seguridad:** Row Level Security (RLS) en todas las tablas
- **Auth:** Supabase Auth (JWT, tabla `auth.users`)
- **Storage:** Supabase Storage (buckets: `documentacion-entidades`, `documentacion-viajes`, `remitos`)
- **Realtime:** Supabase Realtime (suscripciones a cambios en `viajes_despacho`)
- **Edge Functions:** Deno (Supabase Functions) — `expiracion-viajes` cada 15 min
- **Cron:** pg_cron para limpieza periódica (tracking_gps, ubicaciones, notificaciones)

### Entornos

| Entorno | Supabase Project ID | Uso |
|---------|---------------------|-----|
| **PROD** | `lkdcofsfjnltuzzzwoir` | Producción (www.nodexiaweb.com) |
| **DEV** | `yllnzkjpvaukeeqzuxit` | Desarrollo local |

### Clientes Supabase

| Cliente | Archivo | Key | Bypass RLS |
|---------|---------|-----|------------|
| `supabase` (anon) | `lib/supabaseClient.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | NO — respeta RLS |
| `supabaseAdmin` | `lib/supabaseAdmin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | SÍ — bypasa RLS |

```typescript
// Frontend (pages/components) → supabase
import { supabase } from '../lib/supabaseClient';

// Backend (API routes) → supabaseAdmin
import { supabaseAdmin } from '../../lib/supabaseAdmin';
```

**NUNCA** crear instancias nuevas de `createClient()`. Siempre importar del singleton.

---

## 2. ESQUEMA DE TABLAS

### Tablas Core

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `empresas` | Empresas del sistema | `id`, `nombre`, `tipo_empresa` (planta/transporte/cliente/admin), `cuit` |
| `usuarios_empresa` | Junction usuario↔empresa↔rol | `user_id` → auth.users, `empresa_id` → empresas, `rol_interno`, `activo` |
| `choferes` | Conductores | `id`, `id_transporte` → empresas, `user_id` → auth.users, `dni`, `nombre`, `apellido` |
| `camiones` | Camiones | `id`, `id_transporte` → empresas, `patente`, `marca`, `modelo` |
| `acoplados` | Acoplados/semirremolques | `id`, `id_transporte` → empresas, `patente` |
| `origenes` | Orígenes de carga | `id`, `nombre`, `direccion`, `empresa_id`, `latitud`, `longitud` |
| `destinos` | Destinos de entrega | `id`, `nombre`, `direccion`, `empresa_cliente_id`, `latitud`, `longitud` |

### Tablas Operativas

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `despachos` | Despachos (1:1 con viaje) | `id`, `pedido_id` (DSP-YYYYMMDD-NNN), `empresa_planta_id`, `estado`, `producto`, `peso_toneladas` |
| `viajes_despacho` | Viajes (tabla operativa principal) | `id`, `despacho_id`, `transport_id`, `camion_id`, `acoplado_id`, `chofer_id`, `estado`, `numero_viaje` |
| `paradas` | Multi-destino (máx 4 paradas) | `id`, `viaje_id` → viajes_despacho, `orden`, `destino_id`, `estado` |
| `unidades_operativas` | Combinación chofer+camión+acoplado | `id`, `empresa_id`, `chofer_id`, `camion_id`, `acoplado_id` |
| `incidencias_viaje` | Incidencias en viajes | `viaje_id`, `tipo_incidencia`, `descripcion`, `reportado_por`, `estado_resolucion` |

### Tablas de Estado y Tracking

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `estado_unidad_viaje` | Timestamps por fase | `viaje_id` (UNIQUE), `timestamp_ingreso_origen`, `timestamp_carga`, `timestamp_egreso`, etc. |
| `estado_carga_viaje` | Estado de carga sincronizado | `viaje_id` (UNIQUE), `estado_carga`, `peso_real`, `bultos`, `temperatura` |
| `historial_despachos` | Timeline/audit del despacho | `despacho_id`, `tipo_evento`, `descripcion`, `datos_extra`, `usuario_id` |
| `auditoria_estados` | Auditoría detallada de cambios | `viaje_id`, `estado_anterior`, `estado_nuevo`, `cambiado_por`, `timestamp` |
| `tracking_gps` | Posiciones GPS | `chofer_id`, `viaje_id`, `lat`, `lng`, `accuracy`, `battery_level`, `timestamp` |

### Tablas de Relaciones

| Tabla | Links |
|-------|-------|
| `planta_transportes` | empresas (planta) ↔ empresas (transporte) — vinculación |
| `planta_origenes` | empresas (planta) ↔ origenes |
| `planta_destinos` | empresas (planta) ↔ destinos |
| `relaciones_empresas` | empresa_cliente_id ↔ empresa_transporte_id, estado (activa/inactiva) |

### Red Nodexia (Marketplace de Cargas)

| Tabla | Descripción |
|-------|-------------|
| `viajes_red_nodexia` | Viajes publicados en la red |
| `ofertas_red_nodexia` | Ofertas de transporte (⚠️ sin UPDATE RLS policy — bypaseado por API) |
| `requisitos_viaje_red` | Requisitos de un viaje en red |
| `historial_red_nodexia` | Historial de acciones en red |
| `visualizaciones_ofertas` | Tracking de qué ofertas fueron vistas |

### Sistema de Documentación

| Tabla | Descripción |
|-------|-------------|
| `documentos_entidad` | Documentos de entidades (chofer/camión/acoplado/transporte) |
| `documentos_recursos` | Recursos documentales (licencia, VTV, seguros) |
| `documentos_viaje_seguro` | Documentos seguros de viaje (remitos) |
| `auditoria_documentos` | Auditoría de cambios en documentos |

### Tablas de Soporte

| Tabla | Descripción |
|-------|-------------|
| `notificaciones` | Push notifications del sistema |
| `registros_acceso` | Registros de ingreso/egreso en planta |
| `cancelaciones_despachos` | Auditoría de cancelaciones |
| `historial_unidades_operativas` | Historial de cambios en unidades |

---

## 3. MÁQUINA DE ESTADOS (17 + cancelado)

La fuente de verdad está en `lib/estados/config.ts` pero la BD debe respetar el mismo esquema.

```
Fase 0 — Creación:          pendiente
Fase 1 — Asignación:        transporte_asignado → camion_asignado → confirmado_chofer
Fase 2 — Tránsito Origen:   en_transito_origen
Fase 3 — Planta Origen:     ingresado_origen → llamado_carga → cargando → cargado
Fase 4 — Egreso:            egreso_origen
Fase 5 — Tránsito Destino:  en_transito_destino
Fase 6 — Planta Destino:    ingresado_destino → llamado_descarga → descargando → descargado → egreso_destino
Fase 7 — Cierre:            completado
X — Cancelado:              cancelado (solo desde Fase 0-1)
```

### CHECK Constraints

Las tablas `viajes_despacho` y `estado_unidad_viaje` tienen CHECK constraints con los 18 valores válidos.  
**⚠️ Si se agrega un nuevo estado, actualizar AMBOS CHECK constraints.**

### Transiciones válidas

La validación de transiciones se hace en **JavaScript** (`lib/estados/config.ts` → `TRANSICIONES_VALIDAS`), no en PostgreSQL.  
El servicio `cambiarEstadoViaje()` valida antes de escribir.

### Timestamps automáticos

Cuando un viaje cambia de estado, `cambiarEstadoViaje()` hace upsert a `estado_unidad_viaje`:

| Estado | Timestamp column |
|--------|-----------------|
| `ingresado_origen` | `timestamp_ingreso_origen` |
| `llamado_carga` | `timestamp_llamado_carga` |
| `cargando` | `timestamp_inicio_carga` |
| `cargado` | `timestamp_fin_carga` |
| `egreso_origen` | `timestamp_egreso_origen` |
| `ingresado_destino` | `timestamp_ingreso_destino` |
| `egreso_destino` | `timestamp_egreso_destino` |

---

## 4. ROW LEVEL SECURITY (RLS)

### Patrón estándar

Todas las tablas tienen RLS habilitado. El patrón base usa `usuarios_empresa` como pivot de autorización:

```sql
-- El usuario ve filas de SU empresa
CREATE POLICY "tabla_select" ON tabla FOR SELECT TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM usuarios_empresa 
    WHERE user_id = auth.uid() AND activo = true
  )
);
```

### RLS Cross-Company (Control de Acceso)

Para que el control de acceso pueda ver choferes/camiones/acoplados de OTRAS empresas cuando están asignados a viajes en su planta, se usan funciones helper:

```sql
-- Migración 043
CREATE FUNCTION get_visible_chofer_ids(p_user_id UUID) RETURNS SETOF UUID AS $$
  -- Retorna IDs de choferes de la empresa + choferes en viajes activos en la planta
$$;

CREATE POLICY "choferes_cross" ON choferes FOR SELECT TO authenticated
USING (id IN (SELECT get_visible_chofer_ids(auth.uid())));
```

### Notificaciones

```sql
-- Solo ves TUS notificaciones
CREATE POLICY "notifs_select" ON notificaciones FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Sistema puede insertar libremente
CREATE POLICY "notifs_insert" ON notificaciones FOR INSERT TO authenticated
WITH CHECK (true);
```

### Admin bypass

Las funciones `is_super_admin()` y `get_empresas_admin()` permiten que admin_nodexia vea datos de todas las empresas.

### ⚠️ Gap conocido

`ofertas_red_nodexia` **no tiene UPDATE policy**. Actualmente bypaseado porque la API usa `supabaseAdmin` (service role). Pendiente agregar policy para seguridad en depth.

---

## 5. FUNCIONES SQL (RPCs)

### Funciones operativas

| Función | Uso |
|---------|-----|
| `registrar_ubicacion_gps(p_chofer_id, p_viaje_id, p_lat, p_lng, ...)` | Registrar posición GPS |
| `actualizar_estado_unidad(p_viaje_id, p_estado)` | Actualizar estado (legacy) |
| `actualizar_estado_carga(p_viaje_id, p_estado, p_peso, ...)` | Actualizar estado carga |
| `ejecutar_expiracion_viajes()` | Auto-expirar viajes vencidos (cron) |
| `verificar_documentacion_viaje(p_viaje_id)` | Check docs para ingreso a planta |

### Funciones administrativas

| Función | Uso |
|---------|-----|
| `asignar_usuario_empresa(p_user_id, p_empresa_id, p_rol)` | Vincular usuario a empresa |
| `crear_empresa_admin(p_nombre, p_tipo, ...)` | Crear empresa (admin) |
| `crear_relacion_empresa(p_cliente_id, p_transporte_id)` | Crear relación entre empresas |
| `is_super_admin(p_user_id)` | Verificar si es super admin |
| `get_user_empresa(p_user_id)` | Obtener empresa del usuario |

### Funciones de consulta

| Función | Uso |
|---------|-----|
| `get_dashboard_kpis(p_empresa_id)` | KPIs para dashboard |
| `get_estados_statistics(p_empresa_id)` | Estadísticas de estados |
| `get_notificaciones_count(p_user_id)` | Contador de notificaciones no leídas |
| `get_viaje_estados_historial(p_viaje_id)` | Historial de estados de un viaje |
| `get_ultima_ubicacion_viaje(p_viaje_id)` | Última posición GPS |

### Funciones de limpieza (pg_cron — Migración 060)

| Función | Frecuencia | Acción |
|---------|------------|--------|
| `limpiar_tracking_gps_antiguos()` | Diaria | Elimina GPS > 90 días |
| `limpiar_ubicaciones_antiguas()` | Diaria | Elimina ubicaciones > 90 días |
| `limpiar_notificaciones_leidas()` | Diaria | Elimina notificaciones leídas > 30 días |

### Seguridad de funciones (Migración 044)

```sql
-- Todas las funciones SECURITY DEFINER tienen:
REVOKE ALL ON FUNCTION fn_name FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_name FROM anon;
GRANT EXECUTE ON FUNCTION fn_name TO authenticated;
-- Admin functions: GRANT only to service_role
```

---

## 6. STORAGE (Supabase Storage)

### Buckets

| Bucket | Acceso | Tamaño máx | Tipos |
|--------|--------|------------|-------|
| `documentacion-entidades` | Privado | 10 MB | PDF, JPG, PNG |
| `documentacion-viajes` | Privado | 10 MB | PDF, JPG, PNG |
| `remitos` | Público | 10 MB | JPG, PNG |

### Estructura de paths

```
documentacion-entidades/
├── {empresa_id}/
│   ├── choferes/{chofer_id}/{tipo_doc}_{timestamp}.{ext}
│   ├── camiones/{camion_id}/{tipo_doc}_{timestamp}.{ext}
│   └── acoplados/{acoplado_id}/{tipo_doc}_{timestamp}.{ext}

remitos/
├── {viaje_id}/
│   └── remito_{timestamp}.{ext}
```

### Acceso a archivos privados

Los archivos privados requieren signed URLs generados por el backend:

```typescript
const { data } = await supabaseAdmin.storage
  .from('documentacion-entidades')
  .createSignedUrl(storagePath, 3600); // 1 hora
```

---

## 7. MIGRACIONES

### Directorio

```
sql/migrations/           ← 38 migraciones canónicas
sql/migrations/archive/   ← Migraciones históricas archivadas
```

### Convención de nombres

```
{NNN}_{descripcion_snake_case}.sql
```

Donde `NNN` es un número secuencial de 3 dígitos (001, 002, ..., 060).

### Migraciones relevantes recientes

| # | Archivo | Descripción | Estado |
|---|---------|-------------|--------|
| 055 | `historial_despachos.sql` | Tabla historial_despachos + RLS | ✅ PROD |
| 056 | `fix_rls_viajes_red_rechazados.sql` | RLS red nodexia | ✅ PROD |
| 058 | `centralizacion_estados_y_paradas.sql` | Estado centralizado + tabla paradas | ✅ PROD |
| 059 | `unificar_estado_unidad_viaje.sql` | Unificar dual state → single estado | ✅ PROD |
| 060 | `indices_performance_y_retencion.sql` | 11 indexes + 3 cleanup fns + pg_cron | ✅ PROD |

### Ejecutar migraciones

Las migraciones se ejecutan **manualmente** en el SQL Editor de Supabase Dashboard.  
No hay runner automático.

```
1. Abrir Supabase Dashboard → SQL Editor
2. Copiar el contenido del archivo .sql
3. Ejecutar
4. Verificar resultado
5. Marcar como ejecutada en TASKS-ACTIVE.md
```

### ⚠️ Reglas para nuevas migraciones

1. **Número secuencial**: Siguiente después del último (siguiente: 061)
2. **Idempotentes**: Usar `IF NOT EXISTS`, `CREATE OR REPLACE`
3. **Incluir RLS**: Toda tabla nueva debe tener RLS habilitado + policies
4. **CHECK constraints**: Si agrega estados, actualizar CHECKs en `viajes_despacho` Y `estado_unidad_viaje`
5. **REVOKE/GRANT**: Funciones SECURITY DEFINER deben tener REVOKE de public/anon
6. **Probar en DEV primero**: Ejecutar en DEV, verificar, luego PROD

---

## 8. INDEXES DE PERFORMANCE

### Indexes existentes (Migración 060)

```sql
-- Viajes
CREATE INDEX idx_viajes_despacho_estado ON viajes_despacho(estado);
CREATE INDEX idx_viajes_despacho_chofer ON viajes_despacho(chofer_id);
CREATE INDEX idx_viajes_despacho_transport ON viajes_despacho(transport_id);
CREATE INDEX idx_viajes_despacho_despacho ON viajes_despacho(despacho_id);
CREATE INDEX idx_viajes_despacho_created ON viajes_despacho(created_at DESC);

-- Choferes
CREATE INDEX idx_choferes_empresa ON choferes(id_transporte);
CREATE INDEX idx_choferes_user ON choferes(user_id);

-- Notificaciones
CREATE INDEX idx_notificaciones_user ON notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(user_id, leida);

-- Despachos
CREATE INDEX idx_despachos_empresa ON despachos(empresa_planta_id);
CREATE INDEX idx_despachos_estado ON despachos(estado);

-- Usuarios
CREATE INDEX idx_usuarios_empresa_empresa ON usuarios_empresa(empresa_id);
```

---

## 9. EDGE FUNCTIONS

### Expiración de viajes

```
supabase/functions/expiracion-viajes/index.ts
```

Deno edge function que corre cada 15 minutos (cron configurado en `supabase/config.toml`):

```typescript
// Llama a la función SQL que expira viajes vencidos
const { error } = await supabase.rpc('ejecutar_expiracion_viajes');
```

### Config (supabase/config.toml)

```toml
[functions.expiracion-viajes]
cron = "*/15 * * * *"

[functions]
timeout = 30
```

---

## 10. REALTIME

Configuración de Realtime en el frontend (chofer-mobile):

```typescript
const channel = supabase
  .channel('viajes-chofer')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'viajes_despacho',
    filter: `chofer_id=eq.${choferId}`
  }, (payload) => {
    // Actualizar estado del viaje en UI
  })
  .subscribe();
```

**Tablas con Realtime habilitado:** `viajes_despacho` (principal).

---

## 11. VARIABLES DE ENTORNO

```bash
# Supabase — REQUERIDAS
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # Key pública (RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # ⚠️ SOLO backend — bypasa RLS

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # O https://www.nodexiaweb.com
```

---

## 12. DEUDA TÉCNICA

| Problema | Prioridad | Acción |
|----------|-----------|--------|
| `ofertas_red_nodexia` sin UPDATE RLS policy | ALTA | Agregar policy con scope empresa |
| Migraciones no consolidadas (38+ archivos) | MEDIA | Consolidar en 5-10 migraciones |
| No hay migration runner automático | MEDIA | Implementar Supabase CLI migrations |
| Sin backups automatizados documentados | ALTA | Configurar PITR + export schedule |
| Funciones legacy RPCs redundantes | BAJA | Deprecar funciones reemplazadas por service layer |
| Sin monitoring de queries lentas | MEDIA | Configurar pg_stat_statements + alertas |

---

## 13. DIAGRAMA DE RELACIONES PRINCIPAL

```
auth.users ──┐
             │ user_id
             ▼
        usuarios_empresa ──── empresas
             │                   │
             │ rol_interno       │ tipo_empresa
             │                   │
             ▼                   ▼
     ┌───────────────┐   ┌──────────────┐
     │   choferes    │   │  despachos   │
     │   camiones    │   │     │        │
     │   acoplados   │   │     ▼        │
     └───────┬───────┘   │viajes_despacho
             │           │     │        │
             ▼           │     ▼        │
     unidades_operativas │ estado_unidad│
                         │ tracking_gps │
                         │ historial    │
                         └──────────────┘
```
