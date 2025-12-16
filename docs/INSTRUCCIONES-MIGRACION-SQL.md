# Instrucciones para Ejecutar Migración SQL - Sistema de Estados Duales

## ⚠️ IMPORTANTE - LEE ESTO PRIMERO

Esta migración implementa el sistema de estados duales (UNIDAD + CARGA) diseñado para gestionar el flujo operativo completo de Nodexia. La migración es **irreversible** una vez ejecutada.

## 📋 Pre-requisitos

Antes de ejecutar la migración, verifica que existan las siguientes tablas:
- `viajes_despacho`
- `choferes`
- `despachos`
- `empresas`
- `usuarios_empresa`

## 🔧 Pasos de Ejecución

### Paso 1: Verificar Pre-requisitos

Ejecuta el siguiente script en **Supabase SQL Editor**:

```sql
-- Archivo: sql/000_verificar_prerequisitos.sql

-- Verificar que existen las tablas necesarias
SELECT 
  COUNT(*) FILTER (WHERE table_name = 'viajes_despacho') as tiene_viajes,
  COUNT(*) FILTER (WHERE table_name = 'choferes') as tiene_choferes,
  COUNT(*) FILTER (WHERE table_name = 'despachos') as tiene_despachos
FROM information_schema.tables
WHERE table_schema = 'public';

-- Debe retornar: tiene_viajes=1, tiene_choferes=1, tiene_despachos=1
```

**Resultado esperado:**
```
tiene_viajes | tiene_choferes | tiene_despachos
     1       |       1        |       1
```

Si algún valor es `0`, **DETENTE** - faltan tablas.

---

### Paso 2: Ejecutar Migración Principal

⚠️ **BACKUP RECOMENDADO**: Si tienes datos importantes en producción, haz un backup antes de continuar.

1. Abre **Supabase Dashboard** → Tu proyecto → SQL Editor
2. Crea una nueva query
3. Copia y pega el contenido completo de: `sql/migrations/011_sistema_estados_duales.sql`
4. Ejecuta (Click en "Run")

**Duración estimada**: 30-60 segundos

**Qué hace esta migración:**
- ✅ Crea tabla `estado_unidad_viaje` (16 estados)
- ✅ Crea tabla `estado_carga_viaje` (14 estados)
- ✅ Crea tabla `historial_ubicaciones` (GPS tracking)
- ✅ Crea tabla `notificaciones` (push + in-app)
- ✅ Añade `user_id UUID` a tabla `choferes`
- ✅ Crea triggers para auto-inicializar estados
- ✅ Crea vista `vista_estado_viaje_completo`
- ✅ Migra datos existentes de `viajes_despacho`
- ✅ Implementa RLS policies

**Errores comunes:**
- "relation already exists" → Ya ejecutaste la migración antes
- "column already exists" → user_id ya estaba en choferes
- "permission denied" → Usa Service Role Key o ejecuta como postgres user

---

### Paso 3: Ejecutar Funciones Auxiliares

1. En SQL Editor, crea una nueva query
2. Copia y pega el contenido completo de: `sql/funciones_estados.sql`
3. Ejecuta (Click en "Run")

**Duración estimada**: 10-20 segundos

**Qué hace este script:**
- ✅ Crea función `obtener_proximos_estados_unidad()`
- ✅ Crea función `obtener_proximos_estados_carga()`
- ✅ Crea función `validar_transicion_estado_unidad()` con validación de roles
- ✅ Crea función `actualizar_estado_unidad()` con logs
- ✅ Crea función `actualizar_estado_carga()` con validación de autoridad
- ✅ Crea función `registrar_ubicacion_gps()`
- ✅ Crea función `detectar_demoras_viajes()`
- ✅ Crea función `calcular_kpis_viaje()`

---

### Paso 4: Verificar Instalación

Ejecuta las siguientes queries de verificación:

```sql
-- 1. Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'estado_unidad_viaje', 
    'estado_carga_viaje', 
    'historial_ubicaciones', 
    'notificaciones'
  );
-- Debe retornar 4 filas

-- 2. Verificar que user_id fue añadido a choferes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'choferes' 
  AND column_name = 'user_id';
-- Debe retornar: user_id | uuid

-- 3. Verificar que se crearon estados iniciales
SELECT COUNT(*) as total_estados_unidad FROM estado_unidad_viaje;
SELECT COUNT(*) as total_estados_carga FROM estado_carga_viaje;
-- Debe retornar número igual a viajes existentes

-- 4. Verificar que las funciones existen
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%estado%';
-- Debe retornar 8 funciones

-- 5. Probar la vista completa
SELECT 
  viaje_id,
  numero_viaje,
  estado_unidad,
  estado_carga
FROM vista_estado_viaje_completo 
LIMIT 5;
-- Debe retornar datos sin error
```

**Resultado esperado**: Todas las queries retornan datos correctos sin errores.

---

### Paso 5: Asociar Choferes con Usuarios

Si ya tienes choferes en el sistema, necesitas asociarlos con usuarios de `auth.users`:

```sql
-- Ver choferes sin user_id
SELECT id, nombre, email, telefono, user_id
FROM choferes
WHERE user_id IS NULL;

-- Asociar manualmente (ejemplo)
UPDATE choferes
SET user_id = (
  SELECT id FROM auth.users WHERE email = 'chofer@example.com'
)
WHERE email = 'chofer@example.com';

-- Verificar
SELECT 
  c.nombre,
  c.email,
  u.email as user_email
FROM choferes c
LEFT JOIN auth.users u ON c.user_id = u.id;
```

---

## 🧪 Pruebas Post-Migración

### Test 1: Crear Estado Manualmente

```sql
INSERT INTO estado_unidad_viaje (
  viaje_id,
  estado,
  observaciones
) VALUES (
  'TU_VIAJE_ID_AQUI',
  'asignado',
  'Test manual'
);
```

### Test 2: Actualizar Estado con Validación

```sql
SELECT actualizar_estado_unidad(
  'TU_VIAJE_ID_AQUI',
  'confirmado_chofer',
  'TU_USER_ID_AQUI',
  'Confirmado desde test'
);
-- Debe retornar: exitoso=true
```

### Test 3: Registrar Ubicación GPS

```sql
SELECT registrar_ubicacion_gps(
  'TU_VIAJE_ID_AQUI',
  'TU_CHOFER_ID_AQUI',
  -34.603722,  -- Latitud ejemplo
  -58.381592,  -- Longitud ejemplo
  60.5,        -- Velocidad km/h
  10.0,        -- Precisión metros
  180.0,       -- Rumbo grados
  '{"app": "Nodexia PWA", "version": "1.0"}'::jsonb
);
-- Debe retornar: ID de ubicación
```

### Test 4: Obtener Próximos Estados

```sql
SELECT * FROM obtener_proximos_estados_unidad('asignado');
-- Debe retornar: confirmado_chofer, cancelado

SELECT * FROM obtener_proximos_estados_carga('pendiente');
-- Debe retornar: documentacion_preparada, cancelado
```

---

## 🚨 Rollback (Solo si es necesario)

**⚠️ ADVERTENCIA**: Esto eliminará TODAS las tablas y funciones creadas.

```sql
-- SOLO EJECUTAR SI NECESITAS DESHACER LA MIGRACIÓN

-- Eliminar funciones
DROP FUNCTION IF EXISTS obtener_proximos_estados_unidad CASCADE;
DROP FUNCTION IF EXISTS obtener_proximos_estados_carga CASCADE;
DROP FUNCTION IF EXISTS validar_transicion_estado_unidad CASCADE;
DROP FUNCTION IF EXISTS actualizar_estado_unidad CASCADE;
DROP FUNCTION IF EXISTS actualizar_estado_carga CASCADE;
DROP FUNCTION IF EXISTS registrar_ubicacion_gps CASCADE;
DROP FUNCTION IF EXISTS detectar_demoras_viajes CASCADE;
DROP FUNCTION IF EXISTS calcular_kpis_viaje CASCADE;

-- Eliminar vista
DROP VIEW IF EXISTS vista_estado_viaje_completo CASCADE;

-- Eliminar triggers
DROP TRIGGER IF EXISTS trigger_crear_estados_viaje ON viajes_despacho;
DROP FUNCTION IF EXISTS crear_estados_iniciales_viaje CASCADE;

-- Eliminar tablas
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS historial_ubicaciones CASCADE;
DROP TABLE IF EXISTS estado_carga_viaje CASCADE;
DROP TABLE IF EXISTS estado_unidad_viaje CASCADE;

-- Remover user_id de choferes (opcional)
ALTER TABLE choferes DROP COLUMN IF EXISTS user_id;
```

---

## 📊 Métricas de Éxito

Después de ejecutar la migración, deberías ver:

- ✅ 4 nuevas tablas en Supabase → Table Editor
- ✅ 1 nueva vista: `vista_estado_viaje_completo`
- ✅ 8 nuevas funciones en Database → Functions
- ✅ Políticas RLS activas en cada tabla
- ✅ Estados iniciales creados para viajes existentes
- ✅ Columna `user_id` en tabla `choferes`

---

## 🔗 Próximos Pasos

Una vez completada la migración:

1. **Actualizar frontend**: Las páginas de chofer, control acceso y supervisor ya están listas
2. **Configurar Firebase**: Para notificaciones push (opcional para MVP)
3. **Asociar choferes**: Vincular choferes existentes con usuarios auth
4. **Probar flujo completo**: Crear un viaje de prueba y avanzarlo por todos los estados

---

## 📞 Soporte

Si encuentras errores:

1. Revisa los logs en Supabase → Logs → Postgres Logs
2. Verifica que tienes permisos de admin en Supabase
3. Consulta `docs/FLUJO-ESTADOS-OPERACIONES.md` para entender el diseño
4. Revisa `docs/MATRIZ-AUTORIDAD-ESTADOS.md` para validaciones de roles

---

## 📝 Notas Importantes

- **Producción**: Ejecuta en horario de baja actividad
- **Backup**: Aunque la migración incluye `IF NOT EXISTS`, haz backup si tienes datos críticos
- **Testing**: Prueba primero en un proyecto Supabase de desarrollo
- **RLS**: Las políticas RLS protegen los datos según el rol del usuario
- **Reversibilidad**: Usa el script de rollback solo en emergencia

---

**Migración diseñada para**: Nodexia-Web v1.0  
**Fecha de creación**: 22 Nov 2025  
**Autor**: Sistema de IA Copilot  
**Revisión**: Pendiente
