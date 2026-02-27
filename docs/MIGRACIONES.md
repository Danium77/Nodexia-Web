# Sistema de Migraciones - Nodexia

## Resumen

Nodexia usa un sistema de tracking de migraciones basado en una tabla `schema_migrations` en PostgreSQL. Cada migración aplicada se registra con su versión, nombre, checksum SHA256 y timestamp. Soporta múltiples entornos (dev / production) con confirmación obligatoria para producción.

## Estructura

```
sql/migrations/
  001_migrar_coordinador_a_planta.sql
  002_migracion_arquitectura_completa.sql
  ...
  068_schema_migrations_tracking.sql    ← Esta crea el sistema de tracking
  069_nueva_feature.sql                 ← Futuras migraciones
```

## Comandos

### Desarrollo (default)

| Comando | Descripción |
|---------|-------------|
| `pnpm migrate` | Ejecutar pendientes en DEV |
| `pnpm migrate:status` | Ver estado en DEV |
| `pnpm migrate:run 069` | Ejecutar migración específica en DEV |
| `pnpm migrate:mark 065` | Marcar como aplicada sin ejecutar en DEV |

### Producción

| Comando | Descripción |
|---------|-------------|
| `pnpm migrate:prod` | Ejecutar pendientes en PROD (pide confirmación) |
| `pnpm migrate:status:prod` | Ver estado en PROD |
| `pnpm migrate:run:prod 069` | Ejecutar migración específica en PROD |
| `pnpm migrate:mark:prod 065` | Marcar como aplicada sin ejecutar en PROD |

> **Protección**: Los comandos `:prod` piden escribir "PROD" como confirmación antes de ejecutar.

## Configuración

### Opción A: Todo en `.env.local` (recomendado para un solo dev)

```env
# Dev database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-DEV].supabase.co:5432/postgres

# Prod database
DATABASE_URL_PRODUCTION=postgresql://postgres:[PASSWORD]@db.[PROJECT-PROD].supabase.co:5432/postgres
```

### Opción B: Archivos separados

```
.env.local              → DATABASE_URL (apunta a dev)
.env.production         → DATABASE_URL (apunta a prod)
```

### ¿De dónde saco el DATABASE_URL?

**Supabase Dashboard → Project Settings → Database → Connection string (URI)**

Reemplazar `[YOUR-PASSWORD]` con la contraseña del proyecto.

## Crear una nueva migración

### 1. Crear el archivo SQL

```bash
# Formato: NNN_descripcion_breve.sql
# NNN = número secuencial (siguiente al último)
```

Ejemplo: `sql/migrations/069_agregar_campo_telefono.sql`

```sql
-- ================================================================
-- Migración 069: Agregar campo teléfono a empresas
-- Fecha: 2025-XX-XX
-- Descripción: Agrega columna telefono a tabla empresas
-- ================================================================

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
```

### 2. Reglas para escribir migraciones

1. **Idempotentes**: Usar `IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`
2. **Una dirección**: No escribir rollback (la tabla no tiene down migrations)
3. **Defensivas**: Verificar existencia de tablas/columnas antes de modificar
4. **Con comentarios**: Header con número, fecha y descripción

```sql
-- ✅ CORRECTO: Idempotente
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- ❌ INCORRECTO: Falla si ya existe
ALTER TABLE empresas ADD COLUMN telefono VARCHAR(20);
```

### 3. Para schemas que pueden diferir en producción

Usar `information_schema` para detectar dinámicamente:

```sql
DO $$
DECLARE
  v_column TEXT;
BEGIN
  -- Detectar nombre real de columna
  SELECT column_name INTO v_column
  FROM information_schema.columns
  WHERE table_name = 'mi_tabla' 
    AND column_name IN ('nombre_esperado', 'nombre_alternativo')
  LIMIT 1;
  
  IF v_column IS NOT NULL THEN
    EXECUTE format('ALTER TABLE mi_tabla RENAME COLUMN %I TO nombre_nuevo', v_column);
  END IF;
END $$;
```

### 4. Ejecutar

```bash
pnpm migrate
```

### 5. Commit y push

```bash
git add sql/migrations/069_*.sql
git commit -m "feat: migration 069 - agregar campo telefono"
git push origin main
```

## Convenciones de numeración

- `001` - `099`: Arquitectura base y tablas core
- `100` - `199`: Futuras features (reservado)
- Saltos en numeración son OK (006, 012, 015 no existen — es legacy)
- Sufijos `a`/`b` para migraciones duplicadas del mismo número: `060a`, `064b`

## Tabla schema_migrations

```sql
CREATE TABLE schema_migrations (
  version      VARCHAR(10) PRIMARY KEY,   -- '068'
  name         TEXT NOT NULL,             -- 'schema_migrations_tracking'
  filename     TEXT NOT NULL,             -- '068_schema_migrations_tracking.sql'
  checksum     TEXT,                      -- SHA256 parcial del archivo
  applied_at   TIMESTAMPTZ DEFAULT now(), -- cuándo se ejecutó
  applied_by   TEXT DEFAULT current_user, -- quién la ejecutó
  execution_ms INTEGER                    -- duración en ms
);
```

### Ver estado desde SQL

```sql
-- Ver todas las migraciones aplicadas
SELECT * FROM v_migration_status;

-- Verificar si una migración específica fue aplicada
SELECT migration_applied('069');
```

## Troubleshooting

### "connection refused"
→ Verificar `DATABASE_URL` en `.env.local`

### Migración falla con "already exists"
→ Si la migración se ejecutó manualmente en Supabase SQL Editor, marcarla:
```bash
pnpm migrate:mark 069
```

### Migración falla por schema diferente
→ Usar patrón defensivo con `information_schema` (ver arriba)

### Ver qué migraciones faltan
```bash
pnpm migrate:status
```

## Migración desde sistema anterior

Las migraciones 001-067 se registraron como `historical` (aplicadas antes de que existiera el tracking). La migración 068 introduce el sistema de tracking.
