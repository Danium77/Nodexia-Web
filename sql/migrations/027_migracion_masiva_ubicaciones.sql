-- Migración 027: Vinculación masiva de origen_id y destino_id en despachos antiguos
-- Fecha: 2026-02-01
-- Descripción: Actualiza despachos con origen/destino en texto a UUIDs de ubicaciones

-- Función para buscar ubicación por nombre (con similitud aproximada)
CREATE OR REPLACE FUNCTION buscar_ubicacion_por_nombre(p_nombre TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  ubicacion_id UUID;
  nombre_normalizado TEXT;
BEGIN
  -- Normalizar: trim, lowercase, remover caracteres especiales
  nombre_normalizado := LOWER(TRIM(p_nombre));
  nombre_normalizado := REGEXP_REPLACE(nombre_normalizado, '[^a-z0-9 ]', '', 'g');
  
  -- Buscar coincidencia exacta primero
  SELECT id INTO ubicacion_id
  FROM ubicaciones
  WHERE LOWER(TRIM(nombre)) = nombre_normalizado
  LIMIT 1;
  
  IF ubicacion_id IS NOT NULL THEN
    RETURN ubicacion_id;
  END IF;
  
  -- Buscar coincidencia con LIKE (contiene)
  SELECT id INTO ubicacion_id
  FROM ubicaciones
  WHERE LOWER(TRIM(nombre)) LIKE '%' || nombre_normalizado || '%'
     OR nombre_normalizado LIKE '%' || LOWER(TRIM(nombre)) || '%'
  LIMIT 1;
  
  IF ubicacion_id IS NOT NULL THEN
    RETURN ubicacion_id;
  END IF;
  
  -- Buscar con similitud de texto (extensión pg_trgm requerida)
  -- Si no está habilitada, comentar esta parte
  SELECT id INTO ubicacion_id
  FROM ubicaciones
  WHERE similarity(LOWER(TRIM(nombre)), nombre_normalizado) > 0.3
  ORDER BY similarity(LOWER(TRIM(nombre)), nombre_normalizado) DESC
  LIMIT 1;
  
  RETURN ubicacion_id;
END;
$$;

COMMENT ON FUNCTION buscar_ubicacion_por_nombre IS 'Busca una ubicación por nombre con matching aproximado';

-- Script de migración masiva
DO $$
DECLARE
  despacho_record RECORD;
  origen_uuid UUID;
  destino_uuid UUID;
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando migración masiva de despachos...';
  
  -- Iterar sobre despachos sin origen_id o destino_id
  FOR despacho_record IN
    SELECT id, origen, destino, empresa_id
    FROM despachos
    WHERE origen_id IS NULL OR destino_id IS NULL
    ORDER BY created_at DESC
  LOOP
    origen_uuid := NULL;
    destino_uuid := NULL;
    
    -- Buscar origen_id si no existe
    IF despacho_record.origen_id IS NULL AND despacho_record.origen IS NOT NULL THEN
      origen_uuid := buscar_ubicacion_por_nombre(despacho_record.origen);
      
      -- Si no se encuentra, intentar crear ubicación genérica
      IF origen_uuid IS NULL THEN
        BEGIN
          INSERT INTO ubicaciones (
            nombre,
            empresa_id,
            tipo,
            activo,
            created_at
          ) VALUES (
            despacho_record.origen,
            despacho_record.empresa_id,
            'planta',
            TRUE,
            NOW()
          )
          RETURNING id INTO origen_uuid;
          
          RAISE NOTICE 'Creada ubicación origen: % (ID: %)', despacho_record.origen, origen_uuid;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Error al crear origen "%" para despacho %: %', despacho_record.origen, despacho_record.id, SQLERRM;
        END;
      END IF;
    END IF;
    
    -- Buscar destino_id si no existe
    IF despacho_record.destino_id IS NULL AND despacho_record.destino IS NOT NULL THEN
      destino_uuid := buscar_ubicacion_por_nombre(despacho_record.destino);
      
      -- Si no se encuentra, intentar crear ubicación genérica
      IF destino_uuid IS NULL THEN
        BEGIN
          INSERT INTO ubicaciones (
            nombre,
            empresa_id,
            tipo,
            activo,
            created_at
          ) VALUES (
            despacho_record.destino,
            despacho_record.empresa_id,
            'cliente',
            TRUE,
            NOW()
          )
          RETURNING id INTO destino_uuid;
          
          RAISE NOTICE 'Creada ubicación destino: % (ID: %)', despacho_record.destino, destino_uuid;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Error al crear destino "%" para despacho %: %', despacho_record.destino, despacho_record.id, SQLERRM;
        END;
      END IF;
    END IF;
    
    -- Actualizar despacho con los UUIDs encontrados/creados
    IF origen_uuid IS NOT NULL OR destino_uuid IS NOT NULL THEN
      BEGIN
        UPDATE despachos
        SET 
          origen_id = COALESCE(origen_uuid, origen_id),
          destino_id = COALESCE(destino_uuid, destino_id),
          updated_at = NOW()
        WHERE id = despacho_record.id;
        
        updated_count := updated_count + 1;
        
        IF updated_count % 100 = 0 THEN
          RAISE NOTICE 'Procesados % despachos...', updated_count;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          failed_count := failed_count + 1;
          RAISE NOTICE 'Error al actualizar despacho %: %', despacho_record.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '  - Despachos actualizados: %', updated_count;
  RAISE NOTICE '  - Despachos fallidos: %', failed_count;
  RAISE NOTICE '==================================================';
END;
$$;

-- Verificación post-migración
SELECT 
  COUNT(*) FILTER (WHERE origen_id IS NULL) AS sin_origen_id,
  COUNT(*) FILTER (WHERE destino_id IS NULL) AS sin_destino_id,
  COUNT(*) FILTER (WHERE origen_id IS NOT NULL AND destino_id IS NOT NULL) AS con_ambos_ids,
  COUNT(*) AS total
FROM despachos;

-- Crear índices para mejorar búsquedas futuras
CREATE INDEX IF NOT EXISTS idx_ubicaciones_nombre_lower ON ubicaciones (LOWER(TRIM(nombre)));
CREATE INDEX IF NOT EXISTS idx_despachos_origen_destino ON despachos (origen_id, destino_id);

-- Habilitar extensión pg_trgm para similitud de texto (si no está habilitada)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_ubicaciones_nombre_trgm ON ubicaciones USING gin (LOWER(TRIM(nombre)) gin_trgm_ops);

COMMENT ON FUNCTION buscar_ubicacion_por_nombre IS 'Función auxiliar para migración de despachos';
