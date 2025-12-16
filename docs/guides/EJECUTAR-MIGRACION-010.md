# 🚀 INSTRUCCIONES: Ejecutar Migración 010

**Fecha:** 6 de Noviembre 2025  
**Migración:** 010_mejoras_cancelacion_viajes.sql

---

## 📋 QUÉ HACE ESTA MIGRACIÓN:

1. ✅ Crea tabla `viajes_auditoria` para tracking completo de cambios
2. ✅ Agrega columnas nuevas a `viajes_despacho`:
   - `id_transporte_cancelado` - Referencia al transporte que canceló
   - `fecha_cancelacion` - Timestamp de cancelación
   - `cancelado_por` - Usuario que canceló
   - `motivo_cancelacion` - Razón de la cancelación
3. ✅ Crea vista `viajes_pendientes_reasignacion` para coordinador
4. ✅ Implementa RLS policies para seguridad
5. ✅ Crea trigger automático para registrar cambios de estado

---

## 🔧 CÓMO EJECUTAR:

### Opción 1: Desde Supabase Dashboard (RECOMENDADO)

1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto Nodexia
3. Ir a **SQL Editor**
4. Crear **New Query**
5. Copiar todo el contenido de `sql/migrations/010_mejoras_cancelacion_viajes.sql`
6. Pegar en el editor
7. Hacer clic en **Run** o presionar Ctrl+Enter
8. Verificar que aparezca "Success. No rows returned"

### Opción 2: Desde la terminal con psql

```bash
# Conectar a Supabase (necesitas la connection string)
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# Ejecutar migración
\i sql/migrations/010_mejoras_cancelacion_viajes.sql

# Salir
\q
```

---

## ✅ VERIFICAR QUE FUNCIONA:

### 1. Verificar tabla viajes_auditoria
```sql
SELECT COUNT(*) FROM viajes_auditoria;
-- Debe retornar 0 (tabla vacía pero existente)
```

### 2. Verificar columnas nuevas
```sql
SELECT 
    id_transporte_cancelado,
    fecha_cancelacion,
    cancelado_por,
    motivo_cancelacion
FROM viajes_despacho
LIMIT 1;
-- Debe retornar las columnas (con valores NULL)
```

### 3. Verificar vista
```sql
SELECT * FROM viajes_pendientes_reasignacion;
-- Debe retornar 0 filas si no hay viajes cancelados
```

### 4. Verificar trigger
```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'trigger_auditoria_viajes';
-- Debe retornar 1 fila
```

---

## 🎯 NUEVOS ESTADOS DE VIAJES:

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Viaje creado, sin transporte asignado |
| `transporte_asignado` | Transporte asignado pero sin chofer/camión |
| `camion_asignado` | Chofer y camión asignados |
| `cancelado_por_transporte` | 🔥 **NUEVO** - Cancelado por transporte, vuelve a coordinador |
| `cancelado` | Cancelado definitivamente por coordinador |
| `en_transito` | Viaje en curso |
| `entregado` | Completado |

---

## 🔄 FLUJO DE CANCELACIÓN:

### Cancelación por Transporte:
1. Transporte hace clic en "Cancelar viaje"
2. Ingresa motivo
3. Estado → `cancelado_por_transporte`
4. Se libera: `id_transporte`, `id_chofer`, `id_camion`
5. Se guarda: `id_transporte_cancelado` (para historial)
6. **Viaje vuelve a coordinador de planta para reasignar**

### Cancelación por Coordinador:
1. Coordinador hace clic en "Cancelar" en viaje expandido
2. Ingresa motivo
3. Validación si está cerca de la fecha programada
4. Estado → `cancelado` (definitivo)
5. Se registra en auditoría
6. **Viaje NO vuelve a lista**

---

## 📊 TABLA DE AUDITORÍA - ESTRUCTURA:

```sql
viajes_auditoria:
- id: UUID
- viaje_id: UUID (FK a viajes_despacho)
- despacho_id: TEXT
- pedido_id: TEXT
- accion: TEXT (creado, asignado_transporte, cancelado_por_transporte, etc.)
- estado_anterior: TEXT
- estado_nuevo: TEXT
- usuario_id: UUID
- usuario_nombre: TEXT
- usuario_rol: TEXT
- motivo: TEXT
- recursos_antes: JSONB {transporte_id, chofer_id, camion_id}
- recursos_despues: JSONB
- metadata: JSONB
- timestamp: TIMESTAMPTZ
```

---

## 🚨 ROLLBACK (Si algo sale mal):

```sql
-- Eliminar trigger
DROP TRIGGER IF EXISTS trigger_auditoria_viajes ON viajes_despacho;
DROP FUNCTION IF EXISTS registrar_cambio_estado_viaje();

-- Eliminar vista
DROP VIEW IF EXISTS viajes_pendientes_reasignacion;

-- Eliminar tabla de auditoría
DROP TABLE IF EXISTS viajes_auditoria CASCADE;

-- Eliminar columnas nuevas
ALTER TABLE viajes_despacho 
    DROP COLUMN IF EXISTS id_transporte_cancelado,
    DROP COLUMN IF EXISTS fecha_cancelacion,
    DROP COLUMN IF EXISTS cancelado_por,
    DROP COLUMN IF EXISTS motivo_cancelacion;
```

---

## 📝 NOTAS IMPORTANTES:

1. ✅ La migración es **SEGURA** - no modifica datos existentes
2. ✅ El trigger se ejecuta **automáticamente** en cada cambio de estado
3. ✅ La auditoría funciona **retroactivamente** - registra desde que se ejecuta
4. ⚠️ Si tienes viajes existentes, NO se generará historial previo
5. ✅ Las RLS policies aseguran que cada usuario solo vea su información

---

## 🎉 DESPUÉS DE EJECUTAR:

1. **Hacer hard refresh** (Ctrl + Shift + R) en el navegador
2. **Probar flujo completo:**
   - Crear despacho de 1 viaje
   - Asignar transporte
   - Asignar chofer y camión
   - Cancelar desde transporte
   - Verificar que vuelve a coordinador con badge rojo parpadeante
3. **Verificar auditoría:**
   ```sql
   SELECT * FROM viajes_auditoria ORDER BY timestamp DESC LIMIT 10;
   ```

---

**Estado:** ✅ Lista para ejecutar  
**Prioridad:** ALTA  
**Tiempo estimado:** 2-3 minutos
