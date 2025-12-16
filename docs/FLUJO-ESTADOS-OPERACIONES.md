# Flujo de Estados de Operaciones - Sistema Nodexia

## 📋 Análisis de Situación Actual

### Estructura de Base de Datos Actual

**Tablas Principales:**
- `despachos` - Orden de transporte (padre)
- `viajes_despacho` - Viajes individuales por camión (hijo)
- `choferes` - Registro de choferes (sin `user_id` actualmente)
- `camiones` / `acoplados` - Flota
- `empresas` - Plantas, Transportes, Clientes
- `usuarios_empresa` - Relación usuarios-empresas con rol

**Problema Identificado:**
- La tabla `choferes` **NO tiene campo `user_id`** para vincular con `auth.users`
- Los choferes son registros administrativos manejados por coordinadores de transporte
- Para que los choferes accedan al sistema móvil, necesitan:
  1. Usuario en `auth.users`
  2. Registro en `usuarios_empresa` con `rol_interno = 'chofer'`
  3. Vinculación con el registro en `choferes` (actualmente inexistente)

---

## 🎯 Propuesta de Arquitectura: Estados Duales

### Separación de Responsabilidades

Tu propuesta es correcta: necesitamos **dos sistemas de estados paralelos**:

1. **Estados de UNIDAD** (Chofer + Camión)
   - Seguimiento logístico del vehículo
   - Usado por: Coordinador Transporte, Chofer, Control Acceso
   
2. **Estados de DESPACHO/VIAJE** (Carga)
   - Seguimiento del producto y documentación
   - Usado por: Coordinador Planta, Supervisor Carga, Cliente

---

## 🚛 Sistema 1: Estados de UNIDAD (Chofer + Camión)

### Tabla: `estado_unidad_viaje`

Tracking del vehículo y su tripulación durante el viaje.

```sql
CREATE TABLE estado_unidad_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Estado actual de la unidad (20 estados)
  estado_unidad TEXT NOT NULL CHECK (estado_unidad IN (
    'pendiente',             -- Viaje creado, sin asignar
    'asignado',              -- Viaje asignado por coordinador transporte
    'confirmado_chofer',     -- Chofer confirmó el viaje
    'en_transito_origen',    -- En camino a planta de carga
    'arribo_origen',         -- Chofer reporta llegada
    'ingreso_planta',        -- Control Acceso registra ingreso físico
    'en_playa_espera',       -- En playa esperando llamado a carga
    'en_proceso_carga',      -- 🤖 AUTO: Supervisor inicia proceso de carga
    'cargado',               -- 🤖 AUTO: Carga completada (trigger)
    'egreso_planta',         -- 🤖 AUTO: Listo para salir (trigger)
    'en_transito_destino',   -- En camino a destino
    'arribo_destino',        -- Chofer reporta llegada a destino
    'ingreso_destino',       -- Control Acceso destino registra ingreso
    'llamado_descarga',      -- Operador llama a descarga
    'en_descarga',           -- 🤖 AUTO: Descarga en progreso (trigger)
    'vacio',                 -- Operador descarga confirma camión vacío
    'egreso_destino',        -- Control Acceso destino registra egreso
    'disponible_carga',      -- 🤖 AUTO: Unidad lista para nuevo viaje (trigger)
    'viaje_completado',      -- Viaje cerrado administrativamente
    'cancelado'              -- Viaje cancelado
  )),
  
  -- Timestamps de cada estado (20 campos)
  fecha_asignacion TIMESTAMPTZ,
  fecha_confirmacion_chofer TIMESTAMPTZ,
  fecha_inicio_transito_origen TIMESTAMPTZ,
  fecha_arribo_origen TIMESTAMPTZ,
  fecha_ingreso_planta TIMESTAMPTZ,        -- ← NUEVO
  fecha_ingreso_playa TIMESTAMPTZ,
  fecha_inicio_proceso_carga TIMESTAMPTZ,  -- ← NUEVO
  fecha_cargado TIMESTAMPTZ,               -- ← NUEVO
  fecha_egreso_planta TIMESTAMPTZ,
  fecha_inicio_transito_destino TIMESTAMPTZ,
  fecha_arribo_destino TIMESTAMPTZ,
  fecha_ingreso_destino TIMESTAMPTZ,       -- ← NUEVO
  fecha_llamado_descarga TIMESTAMPTZ,      -- ← NUEVO
  fecha_inicio_descarga TIMESTAMPTZ,       -- ← NUEVO
  fecha_vacio TIMESTAMPTZ,                 -- ← NUEVO
  fecha_egreso_destino TIMESTAMPTZ,        -- ← NUEVO
  fecha_disponible_carga TIMESTAMPTZ,      -- ← NUEVO
  fecha_viaje_completado TIMESTAMPTZ,
  
  -- Tracking GPS (opcional - futuro)
  ubicacion_actual_lat DECIMAL(10,8),
  ubicacion_actual_lon DECIMAL(11,8),
  ultima_actualizacion_gps TIMESTAMPTZ,
  
  -- Observaciones de la unidad
  observaciones_unidad TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estado_unidad_viaje_id ON estado_unidad_viaje(viaje_id);
CREATE INDEX idx_estado_unidad_estado ON estado_unidad_viaje(estado_unidad);
```

### Transiciones de Estado UNIDAD (20 Estados)

```
┌─────────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA COMPLETO - UNIDAD                │
│                        (20 estados)                             │
└─────────────────────────────────────────────────────────────────┘

🤖 Sistema:
  pendiente ─────────────────────> (Al crear viaje)

Coordinador Transporte:
  asignado ──────────────────────> (Asigna camión + chofer)

Chofer:
  confirmado_chofer ─────────────> (Acepta el viaje desde móvil)
  en_transito_origen ────────────> (Presiona "Salí hacia origen")
  arribo_origen ─────────────────> (Reporta llegada a planta)
  
Control Acceso (Origen):
  ingreso_planta ────────────────> (Escanea QR - Ingreso físico)
  en_playa_espera ───────────────> (Asigna posición de espera)
  
Supervisor Carga:
  🤖 en_proceso_carga ───────────> (AUTOMÁTICO al iniciar carga)
  🤖 cargado ────────────────────> (AUTOMÁTICO al finalizar carga)
  🤖 egreso_planta ──────────────> (AUTOMÁTICO - listo para salir)
  
Control Acceso (Origen):
  (Valida docs y autoriza egreso) ──> Estado egreso_planta
  
Chofer:
  en_transito_destino ───────────> (Sistema AUTOMÁTICO al egresar)
  arribo_destino ────────────────> (Reporta llegada a destino)
  
Control Acceso (Destino):
  ingreso_destino ───────────────> (Registra ingreso a planta destino)
  
Operador Descarga:
  llamado_descarga ──────────────> (Llama al camión para descargar)
  🤖 en_descarga ────────────────> (AUTOMÁTICO al iniciar descarga)
  vacio ─────────────────────────> (Confirma camión vacío)
  
Control Acceso (Destino):
  egreso_destino ────────────────> (Registra egreso de planta destino)
  
🤖 Sistema:
  disponible_carga ──────────────> (AUTOMÁTICO - unidad disponible)
  
Chofer:
  viaje_completado ──────────────> (Confirma fin de viaje)

ESTADOS ESPECIALES:
  cancelado ─────────────────────> (Coordinador cancela)
```

---

## 📦 Sistema 2: Estados de DESPACHO/VIAJE (Carga)

### Tabla: `estado_carga_viaje`

Tracking del producto, documentación y cumplimiento del pedido.

```sql
CREATE TABLE estado_carga_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  -- Estado actual de la carga (17 estados)
  estado_carga TEXT NOT NULL CHECK (estado_carga IN (
    'pendiente',                 -- Viaje creado, sin carga asignada
    'planificado',               -- Producto y cantidades definidas
    'documentacion_preparada',   -- 🤖 AUTO: Docs listos (trigger)
    'llamado_carga',             -- Supervisor llama al camión
    'posicionado_carga',         -- Camión posicionado en bay de carga
    'iniciando_carga',           -- Supervisor inicia proceso de carga
    'cargando',                  -- Carga en progreso (Supervisor)
    'carga_completada',          -- Producto cargado en camión
    'documentacion_validada',    -- Control Acceso validó docs de salida
    'en_transito',               -- 🤖 AUTO: Producto en tránsito (trigger)
    'arribado_destino',          -- 🤖 AUTO: Llegó a destino (trigger)
    'iniciando_descarga',        -- Operador inicia descarga
    'descargando',               -- Descarga en progreso
    'descargado',                -- Producto descargado completamente
    'entregado',                 -- Documentación firmada y entregada
    'con_faltante',              -- Entregado pero con faltante
    'con_rechazo',               -- Producto rechazado parcial o total
    'cancelado'                  -- Cancelado
  )),
  
  -- Timestamps de cada estado (16 campos)
  fecha_planificacion TIMESTAMPTZ,
  fecha_documentacion_preparada TIMESTAMPTZ,
  fecha_llamado_carga TIMESTAMPTZ,         -- ← NUEVO
  fecha_posicionado_carga TIMESTAMPTZ,     -- ← NUEVO
  fecha_iniciando_carga TIMESTAMPTZ,       -- ← NUEVO
  fecha_cargando TIMESTAMPTZ,              -- ← NUEVO
  fecha_carga_completada TIMESTAMPTZ,
  fecha_documentacion_validada TIMESTAMPTZ,
  fecha_en_transito TIMESTAMPTZ,
  fecha_arribado_destino TIMESTAMPTZ,      -- ← NUEVO
  fecha_iniciando_descarga TIMESTAMPTZ,    -- ← NUEVO
  fecha_descargando TIMESTAMPTZ,           -- ← NUEVO
  fecha_descargado TIMESTAMPTZ,
  fecha_entregado TIMESTAMPTZ,             -- ← NUEVO (reemplaza fecha_completado)
  fecha_completado TIMESTAMPTZ,            -- Cierre administrativo
  
  -- Datos de la carga
  producto TEXT,
  peso_estimado_kg DECIMAL(10,2),
  peso_real_kg DECIMAL(10,2),
  cantidad_bultos INTEGER,
  temperatura_carga DECIMAL(5,2),
  
  -- Documentación
  remito_numero TEXT,
  remito_url TEXT,
  carta_porte_url TEXT,
  certificado_calidad_url TEXT,
  documentacion_adicional JSONB,
  
  -- Control de faltantes/rechazos
  tiene_faltante BOOLEAN DEFAULT FALSE,
  detalle_faltante TEXT,
  tiene_rechazo BOOLEAN DEFAULT FALSE,
  detalle_rechazo TEXT,
  
  -- Observaciones de la carga
  observaciones_carga TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estado_carga_viaje_id ON estado_carga_viaje(viaje_id);
CREATE INDEX idx_estado_carga_estado ON estado_carga_viaje(estado_carga);
```

### Transiciones de Estado CARGA (17 Estados)

```
┌─────────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA COMPLETO - CARGA                 │
│                        (17 estados)                             │
└─────────────────────────────────────────────────────────────────┘

Coordinador Planta:
  pendiente ─────────────────────> (Despacho creado)
  planificado ───────────────────> (Asigna producto y cantidades)

🤖 Sistema:
  documentacion_preparada ───────> (AUTOMÁTICO al asignar chofer)

Supervisor Carga:
  llamado_carga ─────────────────> (Llama al camión para cargar)
  posicionado_carga ─────────────> (Confirma posicionamiento)
  iniciando_carga ───────────────> (Inicia proceso de carga)
  cargando ──────────────────────> (Carga en progreso)
  carga_completada ──────────────> (Confirma carga completa + peso real)
  
Control Acceso:
  documentacion_validada ────────> (Valida docs de salida + remito)
  
🤖 Sistema:
  en_transito ───────────────────> (AUTOMÁTICO al egresar de planta)
  arribado_destino ──────────────> (AUTOMÁTICO cuando chofer arriba)
  
Operador Descarga (Cliente):
  iniciando_descarga ────────────> (Inicia descarga)
  descargando ───────────────────> (Descarga en progreso)
  descargado ────────────────────> (Descarga finalizada)
  entregado ─────────────────────> (Docs firmados - Entrega completa)
  
🤖 Sistema:
  completado ────────────────────> (AUTOMÁTICO al egresar destino)

ESTADOS ESPECIALES:
  con_faltante ──────────────────> (Detecta faltante en destino)
  con_rechazo ───────────────────> (Producto rechazado)
  cancelado ─────────────────────> (Viaje cancelado)
```

---

## 🔄 Integración de Ambos Sistemas

### Vista Unificada: `vista_estado_viaje_completo`

```sql
CREATE OR REPLACE VIEW vista_estado_viaje_completo AS
SELECT 
  vd.id as viaje_id,
  vd.despacho_id,
  vd.numero_viaje,
  d.id_pedido as numero_despacho,
  
  -- ESTADO UNIDAD
  eu.estado_unidad,
  eu.fecha_asignacion,
  eu.fecha_confirmacion_chofer,
  eu.fecha_arribo_origen,
  eu.fecha_carga_completada as fecha_unidad_carga_ok,
  eu.fecha_egreso_origen,
  eu.fecha_arribo_destino,
  eu.fecha_viaje_completado,
  eu.observaciones_unidad,
  
  -- ESTADO CARGA
  ec.estado_carga,
  ec.fecha_planificacion,
  ec.fecha_documentacion_preparada,
  ec.fecha_cargado as fecha_carga_producto_ok,
  ec.fecha_documentacion_validada,
  ec.fecha_descargado,
  ec.fecha_completado,
  ec.producto,
  ec.peso_estimado_kg,
  ec.peso_real_kg,
  ec.remito_numero,
  ec.tiene_faltante,
  ec.tiene_rechazo,
  ec.observaciones_carga,
  
  -- DATOS RELACIONADOS
  emp_trans.nombre as transporte_nombre,
  c.patente as camion_patente,
  ch.nombre || ' ' || ch.apellido as chofer_nombre,
  ch.telefono as chofer_telefono,
  
  -- TIEMPO EN PLANTA (calculado)
  CASE 
    WHEN eu.fecha_egreso_origen IS NOT NULL AND eu.fecha_arribo_origen IS NOT NULL
    THEN EXTRACT(EPOCH FROM (eu.fecha_egreso_origen - eu.fecha_arribo_origen))/3600
    ELSE NULL
  END as horas_en_planta,
  
  vd.created_at,
  vd.updated_at

FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje eu ON eu.viaje_id = vd.id
LEFT JOIN estado_carga_viaje ec ON ec.viaje_id = vd.id
LEFT JOIN despachos d ON d.id = vd.despacho_id
LEFT JOIN empresas emp_trans ON emp_trans.id = vd.transport_id
LEFT JOIN camiones c ON c.id = vd.camion_id
LEFT JOIN choferes ch ON ch.id = vd.chofer_id;

COMMENT ON VIEW vista_estado_viaje_completo IS 
'Vista unificada con estados de UNIDAD y CARGA para reportes y dashboards';
```

---

## 👥 Acciones por Rol

### 🏭 Coordinador de Planta

**Permisos sobre CARGA:**
- ✅ Crear despacho → `estado_carga = 'pendiente'`
- ✅ Planificar producto → `estado_carga = 'planificado'`
- ✅ Asignar transporte → `estado_unidad = 'asignado'`
- ✅ Modificar viaje (mientras `estado_carga != 'cargado'`)
- ✅ Cancelar viaje → `estado_carga = 'cancelado_sin_carga'` / `estado_unidad = 'cancelado'`

**Puede VER:**
- Estados de CARGA completos
- Estados de UNIDAD (solo vista general)

---

### 🚚 Coordinador de Transporte

**Permisos sobre UNIDAD:**
- ✅ Aceptar viaje asignado
- ✅ Asignar camión + chofer → `estado_unidad = 'asignado'`
- ✅ Cancelar viaje aceptado → `estado_unidad = 'cancelado'` (vuelve a Coord. Planta)
- ✅ Ver estado de su flota en tiempo real

**Puede VER:**
- Estados de UNIDAD completos
- Estados de CARGA (solo vista general - qué producto, peso)

---

### 🚗 Chofer

**Permisos sobre UNIDAD:**
- ✅ Confirmar viaje asignado → `estado_unidad = 'confirmado_chofer'`
- ✅ Activar "Salgo a origen" → `estado_unidad = 'en_transito_origen'`
- ✅ Activar "Salgo a destino" → `estado_unidad = 'en_transito_destino'`
- ✅ Reportar incidencia → `estado_unidad = 'en_incidencia'`
- ✅ Confirmar llegada destino → `estado_unidad = 'arribado_destino'`
- ✅ Confirmar descarga → `estado_unidad = 'descarga_completada'`

**Permisos sobre CARGA:**
- 👁️ Solo LECTURA (ve qué producto lleva, peso, remito)

**NO puede:**
- ❌ Cambiar estados de CARGA
- ❌ Ver todos los viajes (solo los asignados a él)

---

### 🔐 Control de Acceso

**Permisos sobre UNIDAD:**
- ✅ Registrar ingreso → `estado_unidad = 'arribado_origen'`
- ✅ Asignar a playa de espera → `estado_unidad = 'en_playa_espera'`
- ✅ Registrar egreso → `estado_unidad = 'saliendo_origen'`

**Permisos sobre CARGA:**
- ✅ Validar documentación de salida → `estado_carga = 'documentacion_validada'`
- ✅ Bloquear egreso si docs faltantes

**Puede VER:**
- Estados de UNIDAD (arribos, egresos)
- Estados de CARGA (documentación, remitos)

---

### 📦 Supervisor de Carga

**Permisos sobre UNIDAD:**
- ✅ Llamar a carga → `estado_unidad = 'llamado_carga'`
- ✅ Posicionar camión → `estado_unidad = 'posicionado_carga'`
- ✅ Confirmar posicionamiento OK → `estado_unidad = 'carga_completada'`

**Permisos sobre CARGA:**
- ✅ Iniciar carga → `estado_carga = 'en_proceso_carga'`
- ✅ Confirmar carga → `estado_carga = 'cargado'`
- ✅ Adjuntar remito, peso real, fotos
- ✅ Reportar faltantes o rechazos → `estado_carga = 'con_faltante'`

**Puede VER:**
- Estados de UNIDAD (solo los que están en playa)
- Estados de CARGA completos

---

## 🛠️ Próximos Pasos de Implementación

### Fase 1: Preparación de Base de Datos ✅
- [x] Revisar estructura actual (`choferes`, `viajes_despacho`)
- [ ] Agregar campo `user_id` a tabla `choferes`
- [ ] Crear tabla `estado_unidad_viaje`
- [ ] Crear tabla `estado_carga_viaje`
- [ ] Crear vista `vista_estado_viaje_completo`
- [ ] Crear triggers para sincronización de estados

### Fase 2: Backend - APIs
- [ ] API para actualizar `estado_unidad` (por rol)
- [ ] API para actualizar `estado_carga` (por rol)
- [ ] API para consultar historial de estados
- [ ] Validaciones de transición de estados (FSM - Finite State Machine)

### Fase 3: Frontend - Interfaces por Rol
- [ ] **Chofer**: Dashboard móvil con acciones de UNIDAD
- [ ] **Control Acceso**: Panel de ingreso/egreso + validación docs
- [ ] **Supervisor Carga**: Panel de llamado y confirmación de carga
- [ ] **Coordinador Transporte**: Panel de asignación de flota
- [ ] **Coordinador Planta**: Panel de gestión de despachos

### Fase 4: Notificaciones y Tracking
- [ ] Notificaciones push para choferes
- [ ] Alertas de demoras (tiempo en playa > threshold)
- [ ] Dashboard en tiempo real (mapa de unidades)
- [ ] Reportes de KPIs (tiempo promedio en planta, etc.)

---

## 🔗 Vinculación Chofer - Usuario

### Problema Actual

La tabla `choferes` no tiene `user_id`:

```sql
-- ACTUAL (sin user_id)
CREATE TABLE choferes (
  id UUID PRIMARY KEY,
  nombre TEXT,
  apellido TEXT,
  dni TEXT UNIQUE,
  telefono TEXT,
  email TEXT,
  id_transporte UUID,  -- Empresa a la que pertenece
  ...
);
```

### Solución Propuesta

**Opción A: Agregar `user_id` (RECOMENDADO)**

```sql
-- Agregar campo user_id a choferes
ALTER TABLE choferes 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para búsquedas rápidas
CREATE INDEX idx_choferes_user_id ON choferes(user_id);

-- Constraint: Un usuario solo puede ser chofer de una empresa
CREATE UNIQUE INDEX idx_choferes_user_id_unico 
ON choferes(user_id) 
WHERE user_id IS NOT NULL;
```

**Ventajas:**
- ✅ Vínculo directo chofer ↔ usuario
- ✅ Query simple: `SELECT * FROM choferes WHERE user_id = auth.uid()`
- ✅ Consistencia: un chofer = un usuario

**Flujo de Creación de Usuario Chofer:**

1. Coordinador de transporte crea chofer en `/gestion-choferes`
   - Crea registro en `choferes` (nombre, DNI, etc.)
   - `user_id = NULL` inicialmente

2. Admin Nodexia (Super Admin) crea usuario para ese chofer
   - Desde panel admin → "Nuevo Usuario"
   - Email: `chofer@empresa.com`
   - Password temporal
   - Selecciona `empresa_id` (transporte)
   - Selecciona `rol_interno = 'chofer'`
   - **NUEVO:** Selecciona el chofer de la lista (por DNI/nombre)
   - Sistema actualiza `choferes.user_id` con el `auth.users.id` creado

3. Chofer recibe credenciales y puede loguear
   - Accede a `/chofer/viajes`
   - Query filtra por su `chofer_id` (usando `user_id`)

---

**Opción B: Tabla Intermedia (alternativa)**

```sql
CREATE TABLE usuarios_choferes (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  chofer_id UUID UNIQUE REFERENCES choferes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Desventajas:**
- ❌ Complejidad adicional
- ❌ Joins extra en queries
- ❌ Más mantenimiento

**Conclusión:** Usar **Opción A** es más limpio y eficiente.

---

## 📊 Ejemplo de Flujo Completo

### Caso: Viaje de Soja desde Planta Nodexia a Cliente CABA

**Actores:**
- Leandro (Coordinador Planta - Aceitera San Miguel)
- Gonzalo (Coordinador Transporte - Logística Express)
- Walter (Chofer - Logística Express)
- Portero (Control Acceso - Aceitera San Miguel)
- Supervisor (Supervisor Carga - Aceitera San Miguel)

**Timeline:**

| Hora | Actor | Acción | Estado UNIDAD | Estado CARGA |
|------|-------|--------|---------------|--------------|
| 08:00 | Leandro | Crea despacho "35 TN Soja" | - | `pendiente` |
| 08:05 | Leandro | Asigna a Logística Express | `asignado` | `planificado` |
| 08:10 | Gonzalo | Acepta viaje, asigna camión ABC123 + Walter | `asignado` | `planificado` |
| 08:15 | Walter | Confirma viaje desde móvil | `confirmado_chofer` | `planificado` |
| 09:00 | Walter | Presiona "Salgo a origen" | `en_transito_origen` | `planificado` |
| 10:30 | Portero | Registra ingreso de ABC123 | `arribado_origen` | `planificado` |
| 10:35 | Portero | Asigna a playa de espera | `en_playa_espera` | `documentacion_preparada` |
| 11:00 | Supervisor | Llama a carga a ABC123 | `llamado_carga` | `documentacion_preparada` |
| 11:05 | Supervisor | Posiciona camión | `posicionado_carga` | `en_proceso_carga` |
| 11:45 | Supervisor | Finaliza carga (34.8 TN) | `carga_completada` | `cargado` |
| 12:00 | Portero | Valida remito y docs | `carga_completada` | `documentacion_validada` |
| 12:10 | Portero | Registra egreso de ABC123 | `saliendo_origen` | `en_transito` |
| 12:15 | Walter | Presiona "Salgo a destino" | `en_transito_destino` | `en_transito` |
| 16:30 | Walter | Confirma llegada a CABA | `arribado_destino` | `en_transito` |
| 16:45 | Cliente | Inicia descarga | `arribado_destino` | `en_proceso_descarga` |
| 17:15 | Cliente | Confirma descarga OK | `descarga_completada` | `descargado` |
| 17:20 | Walter | Presiona "Viaje completado" | `viaje_completado` | `descargado` |
| 17:30 | Leandro | Cierra administrativamente | `viaje_completado` | `completado` |

**Resultado:**
- ⏱️ Tiempo en planta: 1h 40min (arribo → egreso)
- ⏱️ Tiempo de carga: 40min (llamado → carga OK)
- ⏱️ Tiempo de transito: 4h 15min (salida → llegada)
- ✅ Sin faltantes
- ✅ Documentación completa

---

## 📈 KPIs por Estado Dual

### Métricas de UNIDAD (Logística)

- **Tiempo promedio en planta** (arribo → egreso)
- **Tiempo de espera en playa** (arribo → llamado)
- **Tiempo de posicionamiento** (llamado → posicionado)
- **Tiempo de transito** (origen → destino)
- **Cantidad de incidencias por chofer**
- **Puntualidad de arribos** (real vs. planificado)

### Métricas de CARGA (Operativa)

- **Tiempo de carga** (inicio → cargado)
- **Diferencia peso estimado vs. real**
- **Tasa de faltantes**
- **Tasa de rechazos**
- **Tiempo de validación documentaria**
- **Cantidad de despachos por producto**

---

## 🎨 Componentes UI a Crear

### 1. `<EstadoUnidadBadge>`
Muestra estado visual de la unidad (colores, iconos)

### 2. `<EstadoCargaBadge>`
Muestra estado visual de la carga

### 3. `<TimelineViaje>`
Timeline con ambos estados en paralelo

### 4. `<ActualizarEstadoUnidadModal>`
Modal contextual por rol para actualizar estado de unidad

### 5. `<ActualizarEstadoCargaModal>`
Modal contextual por rol para actualizar estado de carga

### 6. `<DashboardEstadosViajes>`
Dashboard con filtros por estado de unidad y carga

---

## ✅ Decisiones Confirmadas

1. **Vincular Chofer - Usuario:**
   - ✅ Agregar `user_id` a tabla `choferes`
   - ✅ Admin Nodexia crea usuarios y vincula con chofer existente

2. **Estados Iniciales:**
   - ✅ Al crear viaje, se generan AMBOS registros automáticamente:
     - `estado_unidad_viaje` → `pendiente` (esperando asignación de transporte)
     - `estado_carga_viaje` → `pendiente` (esperando planificación de carga)

3. **Cancelaciones:**
   - ✅ Se pueden cancelar incluso después de confirmar
   - ✅ Cualquier estado puede ir a `cancelado`
   - ✅ Se registra quién canceló y motivo
   - ✅ Si cancela Coord. Transporte → viaje vuelve a pool de Coord. Planta

4. **GPS Tracking:**
   - ✅ **INCLUIDO EN MVP**
   - ✅ Actualización cada 30 segundos cuando `estado_unidad` es:
     - `en_transito_origen`
     - `en_transito_destino`
   - ✅ Histórico de ubicaciones en tabla separada

5. **Notificaciones (Fase MVP):**
   - ✅ Push notifications (usando FCM - Firebase Cloud Messaging)
   - ✅ In-app notifications (badge en menú)
   - ✅ Eventos que disparan:
     - Viaje asignado → Chofer
     - Llamado a carga → Chofer
     - Demora detectada → Coordinadores

6. **Destinos sin Nodexia:**
   - ✅ Chofer confirma descarga manualmente desde app
   - ✅ Adjunta foto de remito firmado (obligatorio)
   - ✅ Estado pasa a `descarga_completada`

---

## 🚀 Plan de Acción Inmediato

### Hoy (21 Nov 2025)

1. **Revisar este documento juntos** ✅ (estamos aquí)
2. **Confirmar arquitectura de estados duales**
3. **Decidir vinculación chofer-usuario** (agregar `user_id` a `choferes`)

### Próxima Sesión

4. **Ejecutar migration SQL:**
   - Agregar `user_id` a `choferes`
   - Crear `estado_unidad_viaje`
   - Crear `estado_carga_viaje`
   - Crear vista unificada

5. **Actualizar tipos TypeScript** (`lib/types.ts`)

6. **Crear API endpoints:**
   - `POST /api/viajes/[id]/estado-unidad`
   - `POST /api/viajes/[id]/estado-carga`

7. **Modificar interfaces existentes:**
   - `/chofer/viajes.tsx` → usar estados de UNIDAD
   - `/control-acceso.tsx` → usar ambos estados
   - Crear `/supervisor-carga.tsx` → usar ambos estados

---

**¿Estás de acuerdo con esta arquitectura? ¿Ajustamos algo antes de implementar?**
