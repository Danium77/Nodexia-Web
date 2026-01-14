# Migración 023: Sistema de Recepciones con Ubicaciones

## Descripción
Esta migración agrega las columnas `origen_id` y `destino_id` a la tabla `despachos` para permitir:
- Vincular despachos con ubicaciones específicas
- Detectar automáticamente recepciones para empresas destino
- Mejorar la trazabilidad de los despachos

## ¿Qué hace?

1. **Agrega columnas nuevas** (nullable para no romper datos existentes):
   - `origen_id` → Referencia a ubicaciones (origen del despacho)
   - `destino_id` → Referencia a ubicaciones (destino del despacho)

2. **Crea foreign keys** hacia la tabla `ubicaciones`

3. **Crea índices** para mejorar performance de búsquedas

4. **Intenta vincular automáticamente** despachos existentes con ubicaciones (por coincidencia de nombres)

## Cómo ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)
1. Ir a Supabase Dashboard → SQL Editor
2. Copiar el contenido de `023_agregar_destino_id_despachos.sql`
3. Pegar y ejecutar

### Opción 2: Desde línea de comandos
```bash
# Si tienes Supabase CLI instalado
supabase db reset --db-url "tu-connection-string"
```

### Opción 3: Desde pgAdmin o cliente PostgreSQL
```bash
psql -h your-db-host -U postgres -d postgres -f 023_agregar_destino_id_despachos.sql
```

## Verificación post-migración

Ejecuta esta query para verificar que todo funcionó:

```sql
-- Ver la estructura actualizada
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'despachos' 
  AND column_name IN ('origen_id', 'destino_id')
ORDER BY column_name;

-- Ver cuántos despachos se vincularon automáticamente
SELECT 
  COUNT(*) FILTER (WHERE origen_id IS NOT NULL) as con_origen_id,
  COUNT(*) FILTER (WHERE destino_id IS NOT NULL) as con_destino_id,
  COUNT(*) as total
FROM despachos;
```

## Compatibilidad

✅ **Totalmente compatible** con datos existentes:
- Columnas son `nullable` - no afecta registros antiguos
- Los campos `origen` y `destino` (texto) siguen funcionando
- Sistema usa ambos métodos: ID si está disponible, texto como fallback

⚠️ **Importante**: 
- Los despachos antiguos mantendrán solo el texto (origen/destino)
- Los nuevos despachos guardarán tanto el texto como el ID
- El sistema detectará automáticamente cuál usar

## Impacto en el código

### Archivos modificados:
1. `pages/planificacion.tsx` - Búsqueda de recepciones usa destino_id
2. `pages/crear-despacho.tsx` - Guarda origen_id y destino_id al crear
3. `components/Modals/AssignTransportModal.tsx` - (futuro) Puede usar ubicaciones

### Nuevo flujo de recepciones:
```
Usuario crea despacho
  → Selecciona "Aceitera San Miguel S.A" del autocomplete
  → Se guarda: destino = "Aceitera San Miguel S.A", destino_id = 123
  → Sistema busca: ¿Existe empresa con ubicación id=123?
  → Marca automáticamente como recepción para esa empresa
```

## Rollback (si es necesario)

Si necesitas revertir los cambios:

```sql
-- Eliminar columnas y constraints
ALTER TABLE despachos DROP CONSTRAINT IF EXISTS fk_despachos_origen_ubicacion;
ALTER TABLE despachos DROP CONSTRAINT IF EXISTS fk_despachos_destino_ubicacion;
ALTER TABLE despachos DROP COLUMN IF EXISTS origen_id;
ALTER TABLE despachos DROP COLUMN IF EXISTS destino_id;

-- Eliminar índices
DROP INDEX IF EXISTS idx_despachos_origen_id;
DROP INDEX IF EXISTS idx_despachos_destino_id;
```

## Próximos pasos

Después de ejecutar esta migración:

1. ✅ Las recepciones funcionarán automáticamente
2. ✅ Los nuevos despachos se vincularán correctamente
3. 📋 Considera ejecutar un script para vincular despachos antiguos manualmente
4. 📋 Actualizar otros componentes para aprovechar las nuevas relaciones

## Autor
- Fecha: 2026-01-05
- Testing: Ejecutar en desarrollo primero
- Producción: Después de validar en dev
