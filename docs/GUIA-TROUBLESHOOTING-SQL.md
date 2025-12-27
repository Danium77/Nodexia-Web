# 🔍 GUÍA DE TROUBLESHOOTING SQL - NODEXIA

**Última actualización:** 27-Dic-2025  
**Propósito:** Herramientas y queries para diagnosticar problemas en la base de datos

---

## 📚 ÍNDICE

1. [Problema de UUIDs Corruptos](#problema-de-uuids-corruptos)
2. [Verificación de Relaciones](#verificación-de-relaciones)
3. [Diagnóstico de Performance](#diagnóstico-de-performance)
4. [Validación de RLS](#validación-de-rls)
5. [Scripts de Debugging Existentes](#scripts-de-debugging-existentes)

---

## 🔴 Problema de UUIDs Corruptos

### Descripción
Algunos campos UUID en la tabla `viajes_despacho` almacenan valores de 37 caracteres en lugar de los 36 estándar. Esto causa fallos en queries con `.eq()` y relaciones automáticas.

### Script de Diagnóstico: `sql/debug-control-acceso.sql`

**Uso:**
```bash
# Ejecutar en Supabase SQL Editor
# Ver archivo: sql/debug-control-acceso.sql
```

**Queries incluidas:**

#### 1. Verificar existencia de tablas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('viajes_despacho', 'choferes', 'camiones', 'despachos', 'ubicaciones')
ORDER BY table_name;
```

#### 2. Verificar longitud de UUIDs
```sql
SELECT 
  id,
  id_chofer,
  id_camion,
  length(id_chofer::text) as len_chofer,
  length(id_camion::text) as len_camion,
  CASE 
    WHEN length(id_chofer::text) != 36 THEN '⚠️ CORRUPTO'
    ELSE '✅ OK'
  END as estado_chofer,
  CASE 
    WHEN length(id_camion::text) != 36 THEN '⚠️ CORRUPTO'
    ELSE '✅ OK'
  END as estado_camion
FROM viajes_despacho
WHERE despacho_id IN (
  SELECT id FROM despachos 
  WHERE codigo LIKE 'DSP-%' 
  LIMIT 5
);
```

#### 3. Test de JOIN con igualdad exacta
```sql
-- Este JOIN FALLA con UUIDs corruptos
SELECT 
  v.id as viaje_id,
  v.id_chofer,
  c.id as chofer_real_id,
  c.nombre,
  c.apellido
FROM viajes_despacho v
LEFT JOIN choferes c ON c.id = v.id_chofer::uuid
WHERE v.despacho_id IN (SELECT id FROM despachos LIMIT 5);
-- Si chofer_real_id es NULL pero id_chofer existe → UUID corrupto
```

#### 4. Test de JOIN con LIKE (workaround)
```sql
-- Este JOIN FUNCIONA con UUIDs corruptos
SELECT 
  v.id as viaje_id,
  v.id_chofer,
  c.id as chofer_real_id,
  c.nombre,
  c.apellido,
  'MATCH ✅' as estado
FROM viajes_despacho v
LEFT JOIN choferes c ON c.id::text LIKE v.id_chofer::text || '%'
WHERE v.despacho_id IN (SELECT id FROM despachos LIMIT 5);
-- Si chofer_real_id tiene valor → Workaround funciona
```

#### 5. Verificar datos de ejemplo
```sql
SELECT 
  d.codigo as despacho_codigo,
  v.id as viaje_id,
  v.id_chofer,
  v.id_camion,
  v.estado
FROM viajes_despacho v
JOIN despachos d ON d.id = v.despacho_id
WHERE d.codigo = 'DSP-20251226-001';
```

### Solución Temporal (Implementada)

**Función SQL:** `get_viaje_con_detalles`

```sql
CREATE OR REPLACE FUNCTION get_viaje_con_detalles(
  p_despacho_id uuid,
  p_empresa_id uuid
)
RETURNS TABLE (
  viaje_id uuid,
  estado text,
  chofer_nombre text,
  chofer_apellido text,
  chofer_dni text,
  -- ... más campos
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.estado,
    c.nombre,
    c.apellido,
    c.dni,
    -- ... más campos
  FROM viajes_despacho v
  LEFT JOIN choferes c ON c.id::text LIKE v.id_chofer::text || '%'  -- ← WORKAROUND
  LEFT JOIN camiones cam ON cam.id::text LIKE v.id_camion::text || '%'  -- ← WORKAROUND
  INNER JOIN despachos d ON d.id = v.despacho_id
  INNER JOIN usuarios_empresa ue ON ue.user_id = d.created_by
  WHERE v.despacho_id = p_despacho_id
    AND ue.empresa_id = p_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Uso desde TypeScript:**
```typescript
const { data: viajeConDetalles } = await supabase
  .rpc('get_viaje_con_detalles', {
    p_despacho_id: despacho.id,
    p_empresa_id: empresaId
  });
```

### Solución Definitiva (Pendiente)

**Script de migración:** `sql/migrations/fix-uuids-viajes-despacho.sql`

```sql
-- PASO 1: Backup
CREATE TABLE viajes_despacho_backup AS 
SELECT * FROM viajes_despacho;

-- PASO 2: Limpiar UUIDs
UPDATE viajes_despacho
SET id_chofer = left(id_chofer::text, 36)::uuid
WHERE length(id_chofer::text) > 36;

UPDATE viajes_despacho
SET id_camion = left(id_camion::text, 36)::uuid
WHERE length(id_camion::text) > 36;

-- PASO 3: Cambiar tipo de columna
ALTER TABLE viajes_despacho 
  ALTER COLUMN id_chofer TYPE uuid USING id_chofer::uuid;

ALTER TABLE viajes_despacho 
  ALTER COLUMN id_camion TYPE uuid USING id_camion::uuid;

-- PASO 4: Agregar constraints
ALTER TABLE viajes_despacho
  ADD CONSTRAINT fk_viajes_chofer 
  FOREIGN KEY (id_chofer) REFERENCES choferes(id);

ALTER TABLE viajes_despacho
  ADD CONSTRAINT fk_viajes_camion 
  FOREIGN KEY (id_camion) REFERENCES camiones(id);

-- PASO 5: Verificar
SELECT 
  COUNT(*) FILTER (WHERE length(id_chofer::text) = 36) as chofer_ok,
  COUNT(*) FILTER (WHERE length(id_camion::text) = 36) as camion_ok,
  COUNT(*) as total
FROM viajes_despacho;
```

---

## 🔗 Verificación de Relaciones

### Verificar relaciones entre tablas

```sql
-- Ver todas las foreign keys de una tabla
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'viajes_despacho';
```

### Verificar integridad referencial

```sql
-- Encontrar registros huérfanos (sin relación válida)
SELECT 
  v.id,
  v.id_chofer,
  v.id_camion,
  CASE 
    WHEN c.id IS NULL THEN '⚠️ Chofer no existe'
    ELSE '✅ Chofer OK'
  END as estado_chofer,
  CASE 
    WHEN cam.id IS NULL THEN '⚠️ Camión no existe'
    ELSE '✅ Camión OK'
  END as estado_camion
FROM viajes_despacho v
LEFT JOIN choferes c ON c.id::text LIKE v.id_chofer::text || '%'
LEFT JOIN camiones cam ON cam.id::text LIKE v.id_camion::text || '%'
WHERE c.id IS NULL OR cam.id IS NULL;
```

---

## ⚡ Diagnóstico de Performance

### Queries lentas en viajes_despacho

```sql
-- Ver queries activas
SELECT 
  pid,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;
```

### Índices faltantes

```sql
-- Verificar índices en viajes_despacho
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'viajes_despacho'
ORDER BY indexname;

-- Sugerencias de índices
-- Si hay muchas queries por despacho_id:
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id 
  ON viajes_despacho(despacho_id);

-- Si hay muchas queries por chofer:
CREATE INDEX IF NOT EXISTS idx_viajes_chofer 
  ON viajes_despacho(id_chofer);

-- Si hay muchas queries por estado:
CREATE INDEX IF NOT EXISTS idx_viajes_estado 
  ON viajes_despacho(estado);
```

### Estadísticas de tabla

```sql
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as rows_live,
  n_dead_tup as rows_dead,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename IN ('viajes_despacho', 'choferes', 'camiones', 'despachos');
```

---

## 🔒 Validación de RLS

### Verificar políticas RLS

```sql
-- Ver todas las políticas de una tabla
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'viajes_despacho';
```

### Test de políticas RLS

```sql
-- Test como usuario específico (ejecutar en SQL Editor)
-- 1. Verificar rol actual
SELECT current_user, current_role;

-- 2. Test de visibilidad
SET ROLE authenticated;
SELECT COUNT(*) FROM viajes_despacho;

-- 3. Volver a rol admin
RESET ROLE;
```

---

## 📁 Scripts de Debugging Existentes

### Ubicación de scripts

```
sql/
├── debug-control-acceso.sql     ← Diagnóstico de UUIDs y relaciones
├── funciones_estados.sql         ← Funciones de cambio de estado
├── migrations/                   ← Migraciones de schema
│   └── fix-uuids-viajes-despacho.sql (pendiente)
└── schema/                       ← Definiciones de tablas
```

### Cómo usar scripts de debug

```bash
# 1. Abrir Supabase Dashboard
# 2. Ir a SQL Editor
# 3. Copiar contenido de sql/debug-control-acceso.sql
# 4. Ejecutar query por query (no todo junto)
# 5. Analizar resultados

# Desde terminal (con psql):
psql $DATABASE_URL -f sql/debug-control-acceso.sql
```

---

## 🛠️ Herramientas Recomendadas

### Supabase Dashboard
- **SQL Editor:** Ejecutar queries ad-hoc
- **Table Editor:** Ver/editar datos manualmente
- **Database:** Ver schema y relaciones
- **Logs:** Ver queries ejecutadas

### VS Code Extensions
- **PostgreSQL:** Syntax highlighting para .sql
- **SQL Tools:** Ejecutar queries desde VS Code
- **Database Client:** Conexión directa a Supabase

### Command Line
```bash
# Conectar a base de datos
psql $DATABASE_URL

# Ver todas las tablas
\dt

# Describir tabla
\d viajes_despacho

# Ejecutar archivo SQL
\i sql/debug-control-acceso.sql

# Ver funciones
\df get_viaje_con_detalles
```

---

## 📞 Referencias

**Documentación relacionada:**
- [Sesión 26-Dic](.session/history/sesion-2025-12-26.md) - Resolución de UUIDs
- [PROBLEMAS-CONOCIDOS.md](PROBLEMAS-CONOCIDOS.md) - Lista completa de issues
- [ARQUITECTURA-OPERATIVA.md](ARQUITECTURA-OPERATIVA.md) - Schema de BD

**Scripts de debugging:**
- `sql/debug-control-acceso.sql` - Diagnóstico de UUIDs y relaciones
- `sql/funciones_estados.sql` - Funciones de cambio de estado

**Funciones SQL creadas:**
- `get_viaje_con_detalles(p_despacho_id, p_empresa_id)` - Control de Acceso

---

**Última actualización:** 27-Dic-2025  
**Mantenido por:** Equipo Nodexia
