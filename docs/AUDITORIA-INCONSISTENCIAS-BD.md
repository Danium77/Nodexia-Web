# AUDITORÍA: Inconsistencias y Duplicaciones en Base de Datos
**Fecha:** 4 de febrero de 2026  
**Objetivo:** Identificar y documentar todas las inconsistencias de nomenclatura y duplicaciones

---

## 🔴 PROBLEMA 1: Nombres de Campos Inconsistentes

### viajes_despacho
- ❌ **INCONSISTENTE**: Usa `chofer_id`, `camion_id`, `acoplado_id` (con _id al final)
- ⚠️ **PROBLEMA**: El código antiguo busca `id_chofer`, `id_camion` (con id_ al inicio)

**Ubicaciones afectadas:**
- `pages/api/gps/registrar-ubicacion.ts` línea 89 (CORREGIDO a chofer_id)
- Posiblemente otros archivos usen la convención antigua

**Solución recomendada:** 
- ✅ La BD usa `chofer_id` (correcto, estándar SQL)
- ✅ Todo el código debe usar `chofer_id`, `camion_id`, `acoplado_id`

---

## 🔴 PROBLEMA 2: Duplicación de Tablas GPS

### Dos tablas para lo mismo:
1. **tracking_gps** - Tabla antigua/alternativa
2. **ubicaciones_choferes** - Tabla nueva/principal

**Diferencias:**
- `tracking_gps`: Puede tener estructura diferente, menos usada
- `ubicaciones_choferes`: Estructura moderna con foreign keys correctas

**Código afectado:**
- `pages/api/gps/registrar-ubicacion.ts` - Inserta en `ubicaciones_choferes`
- `pages/api/tracking/actualizar-ubicacion.ts` - Inserta en AMBAS tablas
- `pages/transporte/viajes-activos.tsx` - Lee de `ubicaciones_choferes`
- `pages/chofer/tracking-gps.tsx` - Envía datos a API

**Solución recomendada:**
- ✅ Mantener solo `ubicaciones_choferes`
- ⚠️ Migrar datos históricos de `tracking_gps` → `ubicaciones_choferes`
- ❌ Deprecar y eliminar `tracking_gps`

---

## 🔴 PROBLEMA 3: Posibles Otras Inconsistencias

### Convenciones mezcladas:
- Algunas tablas usan `id_tabla` (convención vieja PHP)
- Otras tablas usan `tabla_id` (convención moderna SQL)

### Acciones pendientes:
1. Revisar TODAS las tablas de la BD
2. Identificar qué usa cada convención
3. Estandarizar a `tabla_id` (foreign keys al final)

---

## 📋 ESTRATEGIA DE MIGRACIÓN PROPUESTA

### Fase 1: Sin Downtime - Compatibilidad Dual
```sql
-- Crear VIEWS con alias para compatibilidad
CREATE VIEW tracking_gps_legacy AS 
SELECT * FROM ubicaciones_choferes;

-- O añadir columnas alias temporales si son campos
-- ALTER TABLE viajes_despacho ADD COLUMN id_chofer UUID GENERATED ALWAYS AS (chofer_id) STORED;
```

### Fase 2: Actualizar Código
- Buscar TODOS los usos de `id_chofer`, `id_camion`, etc.
- Reemplazar por `chofer_id`, `camion_id`
- Testing exhaustivo

### Fase 3: Migración de Datos
```sql
-- Migrar tracking_gps → ubicaciones_choferes
INSERT INTO ubicaciones_choferes (...)
SELECT ... FROM tracking_gps
WHERE NOT EXISTS (SELECT 1 FROM ubicaciones_choferes WHERE ...);
```

### Fase 4: Cleanup
- Eliminar views temporales
- Eliminar columnas alias
- Eliminar tabla `tracking_gps`
- Actualizar documentación

---

## 🎯 PRIORIDAD INMEDIATA

1. ✅ **HECHO**: Corregir `pages/api/gps/registrar-ubicacion.ts` (id_chofer → chofer_id)
2. ✅ **HECHO**: Crear tabla `ubicaciones_choferes` en BD
3. ✅ **HECHO**: GPS tracking funcionando correctamente
4. ⏳ **EN CURSO**: Fix indicadores de estado en viajes-activos (falta registro en estado_unidad_viaje)
5. ⏳ **PENDIENTE**: Auditar TODOS los archivos que usan id_chofer/id_camion
6. ⏳ **PENDIENTE**: Decidir estrategia para tracking_gps (eliminar o migrar)
7. ⏳ **PENDIENTE**: Crear scripts de migración SQL completos

---

## 📝 ARCHIVOS QUE NECESITAN CORRECCIÓN

### Usan convención antigua (id_chofer, id_camion, id_acoplado):
1. ✅ `pages/api/gps/registrar-ubicacion.ts` - **CORREGIDO**
2. ❌ `lib/hooks/useRedNodexia.tsx` - Líneas 194, 198
3. ❌ `types/red-nodexia.ts` - Líneas 248-249
4. ❌ `types/missing-types.ts` - Líneas 98-100
5. ❌ `pages/transporte/cargas-en-red.tsx` - Línea 444
6. ❌ `pages/crear-despacho.tsx` - Líneas 1180, 1183-1185
7. ❌ `pages/chofer/viajes.tsx` - Línea 97
8. ❌ `components/Transporte/AceptarDespachoModal.tsx` - Líneas 159, 200

**Acción:** Reemplazar gradualmente con camion_id, chofer_id, acoplado_id

---

## 🔴 PROBLEMA DETECTADO: Indicadores de Estado en Viajes Activos

**Síntoma:** Los badges de estado (Asignado, Confirmado, En Ruta, etc.) no se muestran debajo del mapa en `/transporte/viajes-activos`

**Causa Raíz:** El viaje actual (numero_viaje=1, id=90c20bb4-198a-428a-b240-32c34e597e2b) **NO tiene registro** en la tabla `estado_unidad_viaje`.

**Por qué ocurre:**
- La tabla `estado_unidad_viaje` se crea automáticamente con triggers/functions
- Si el viaje se creó antes de implementar ese sistema, NO tiene registro
- El código en viajes-activos.tsx (línea 512) hace: `{viajeDetalle.estado_unidad && (...)}` 
- Como `estado_unidad` es `null`, el bloque completo no se renderiza

**Solución:**
1. Ejecutar `sql/fix-estado-unidad-viaje-faltante.sql` en Supabase
2. Este script crea el registro basado en el estado actual del viaje
3. Recargar la página de viajes-activos

**Solución permanente:**
- Crear trigger/function que asegure que SIEMPRE exista un registro en estado_unidad_viaje al crear un viaje
- O modificar el código para manejar caso `null` y mostrar estado basado en `viaje.estado`

---

## ⚠️ RIESGOS

- **Alto**: Cambiar campos puede romper queries existentes
- **Medio**: Migración de datos puede tomar tiempo en producción
- **Bajo**: Views temporales pueden impactar performance

## ✅ BENEFICIOS

- Código más limpio y consistente
- Menos confusión para desarrolladores
- Mejor performance (una sola tabla GPS)
- Más fácil de mantener
