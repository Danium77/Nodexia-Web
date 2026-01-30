-- ============================================================================
-- SCRIPT MAESTRO: SINCRONIZAR DEV CON PRODUCCIÓN
-- ============================================================================
-- Fecha: 27-Enero-2026
-- Propósito: Aplicar TODAS las migraciones de producción a DEV
-- 
-- ADVERTENCIA: Este script hace cambios MASIVOS
-- RECOMENDACIÓN: Hacer backup de DEV antes de ejecutar
-- ============================================================================

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================

/*
PASOS ANTES DE EJECUTAR:

1. BACKUP DE DEV (OBLIGATORIO):
   - Ve a Supabase Dashboard → Database → Backups
   - Crea un backup manual
   - Anota la fecha/hora del backup

2. VERIFICAR CONEXIÓN:
   - Asegúrate de estar en Nodexia-Dev (NO PRODUCCIÓN)
   - URL debe ser: lkdcofsfjnltuzzzwoir.supabase.co

3. EJECUTAR EN PARTES:
   - NO ejecutes todo de una vez
   - Ve sección por sección
   - Verifica cada resultado antes de continuar

4. SI ALGO FALLA:
   - DETENTE inmediatamente
   - Restaura el backup
   - Reporta el error

============================================================================
ORDEN DE EJECUCIÓN:
============================================================================

PARTE 1: Nomenclatura y Estructura Base (EJECUTAR PRIMERO)
   - sql/unificacion-nomenclatura-empresa-id-SAFE.sql
   
PARTE 2: Pilar 2 - Identidades Encastrables
   - sql/pilar2-identidades-encastrables.sql
   
PARTE 3: Seguridad RLS Enterprise
   - sql/SEGURIDAD-RLS-ENTERPRISE-COMPLETA.sql
   
PARTE 4: Sistema de Viajes Expirados
   - Ver script específico abajo
   
============================================================================
*/

-- ============================================================================
-- VERIFICACIÓN INICIAL: ¿Estamos en DEV?
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICACIÓN DE ENTORNO';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Verifica que estás en DEV';
    RAISE NOTICE '   URL esperada: lkdcofsfjnltuzzzwoir.supabase.co';
    RAISE NOTICE '';
    RAISE NOTICE '¿Creaste un backup? (Obligatorio)';
    RAISE NOTICE '';
    RAISE NOTICE 'Si NO estás seguro, DETENTE AHORA';
    RAISE NOTICE '============================================';
END $$;

-- PAUSA AQUÍ - Verifica que estás en DEV antes de continuar

-- ============================================================================
-- PARTE 1: NOMENCLATURA BASE
-- ============================================================================

/*
EJECUTA MANUALMENTE:

1. Abre archivo: sql/unificacion-nomenclatura-empresa-id-SAFE.sql
2. Copia todo el contenido
3. Pégalo en SQL Editor
4. Ejecuta
5. Verifica que completó sin errores

RESULTADO ESPERADO:
✅ Columna scheduled_date_time existe en despachos
✅ Índices de nomenclatura creados
✅ Columnas renombradas a empresa_id
*/

-- ============================================================================
-- PARTE 2: PILAR 2 - IDENTIDADES ENCASTRABLES
-- ============================================================================

/*
EJECUTA MANUALMENTE:

1. Abre archivo: sql/pilar2-identidades-encastrables.sql
2. Copia todo el contenido
3. Pégalo en SQL Editor
4. Ejecuta
5. Verifica resultado

RESULTADO ESPERADO:
✅ Tabla recurso_asignaciones creada
✅ Constraints UNIQUE eliminados
✅ Índices compuestos creados
✅ Función asignar_recurso_a_empresa() creada
✅ Políticas RLS en recurso_asignaciones
*/

-- ============================================================================
-- PARTE 3: SEGURIDAD RLS ENTERPRISE
-- ============================================================================

/*
EJECUTA MANUALMENTE:

1. Abre archivo: sql/SEGURIDAD-RLS-ENTERPRISE-COMPLETA.sql
2. Copia todo el contenido
3. Pégalo en SQL Editor
4. Ejecuta
5. Verifica resultado

RESULTADO ESPERADO:
✅ RLS habilitado en todas las tablas críticas
✅ Políticas securizadas (sin USING true)
✅ Multi-tenant correctamente aislado
✅ Admin Nodexia con acceso total
*/

-- ============================================================================
-- PARTE 4: SISTEMA DE VIAJES EXPIRADOS
-- ============================================================================

-- Esta parte SÍ se puede ejecutar directamente aquí

BEGIN;

-- 1. Verificar y crear enum estado_unidad_viaje si no existe
DO $$
BEGIN
    -- Verificar si el tipo existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_unidad_viaje') THEN
        -- Primero verificar el tipo actual de la columna estado
        RAISE NOTICE 'Enum estado_unidad_viaje NO existe. Creando desde cero...';
        
        -- Crear el enum con todos los estados conocidos
        CREATE TYPE estado_unidad_viaje AS ENUM (
            'pendiente',
            'asignado',
            'confirmado',
            'en_camino',
            'en_planta',
            'cargando',
            'en_ruta',
            'descargando',
            'completado',
            'cancelado',
            'expirado'
        );
        
        RAISE NOTICE '✅ Enum estado_unidad_viaje creado';
        
        -- Ahora cambiar el tipo de la columna si existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'viajes_despacho' AND column_name = 'estado'
        ) THEN
            -- Primero alterar la columna a usar el enum
            ALTER TABLE viajes_despacho 
            ALTER COLUMN estado TYPE estado_unidad_viaje 
            USING estado::estado_unidad_viaje;
            
            RAISE NOTICE '✅ Columna viajes_despacho.estado convertida a enum';
        END IF;
    ELSE
        -- El enum existe, agregar 'expirado' si falta
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'estado_unidad_viaje'::regtype 
            AND enumlabel = 'expirado'
        ) THEN
            ALTER TYPE estado_unidad_viaje ADD VALUE 'expirado';
            RAISE NOTICE '✅ Estado "expirado" agregado al enum existente';
        ELSE
            RAISE NOTICE '⚠️  Estado "expirado" ya existe';
        END IF;
    END IF;
END $$;

-- 2. Verificar/crear columna scheduled_date_time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'despachos' AND column_name = 'scheduled_date_time'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'despachos' AND column_name = 'scheduled_at'
        ) THEN
            ALTER TABLE despachos RENAME COLUMN scheduled_at TO scheduled_date_time;
            RAISE NOTICE '✅ Columna scheduled_at renombrada a scheduled_date_time';
        ELSE
            ALTER TABLE despachos ADD COLUMN scheduled_date_time timestamptz;
            RAISE NOTICE '✅ Columna scheduled_date_time creada';
        END IF;
    ELSE
        RAISE NOTICE '✅ Columna scheduled_date_time ya existe';
    END IF;
END $$;

-- 3. Crear funciones del sistema de expiración
CREATE OR REPLACE FUNCTION marcar_viajes_expirados()
RETURNS TABLE (
    viajes_expirados integer,
    viajes_revisados integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_revisados integer := 0;
    v_now timestamptz := NOW();
BEGIN
    SELECT COUNT(*) INTO v_revisados
    FROM viajes_despacho v
    INNER JOIN despachos d ON d.id = v.despacho_id
    WHERE 
        v.estado IN ('pendiente', 'asignado')
        AND d.scheduled_date_time < v_now
        AND (v.chofer_id IS NULL OR v.camion_id IS NULL);
    
    WITH viajes_actualizados AS (
        UPDATE viajes_despacho v
        SET 
            estado = 'expirado',
            updated_at = v_now
        FROM despachos d
        WHERE 
            v.despacho_id = d.id
            AND v.estado IN ('pendiente', 'asignado')
            AND d.scheduled_date_time < v_now
            AND (v.chofer_id IS NULL OR v.camion_id IS NULL)
        RETURNING v.id
    )
    SELECT COUNT(*) INTO v_count FROM viajes_actualizados;
    
    RETURN QUERY SELECT v_count, v_revisados;
END;
$$;

CREATE OR REPLACE FUNCTION ejecutar_expiracion_viajes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM marcar_viajes_expirados();
    
    RETURN jsonb_build_object(
        'success', true,
        'viajes_expirados', v_result.viajes_expirados,
        'viajes_revisados', v_result.viajes_revisados,
        'timestamp', NOW()
    );
END;
$$;

-- 4. Crear vista de viajes expirados
CREATE OR REPLACE VIEW vista_viajes_expirados AS
SELECT 
    v.id AS viaje_id,
    v.despacho_id,
    d.pedido_id,
    d.scheduled_date_time AS fecha_programada,
    v.updated_at AS fecha_expiracion,
    EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_date_time))/3600 AS horas_despues_programado,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin chofer ni camión'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
        ELSE 'Recursos incompletos'
    END AS razon_expiracion,
    v.transport_id,
    v.chofer_id,
    v.camion_id,
    d.created_by AS coordinador_responsable
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
WHERE v.estado = 'expirado'
ORDER BY v.updated_at DESC;

-- 5. Ejecutar primera vez
DO $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT ejecutar_expiracion_viajes() INTO v_result;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SISTEMA DE EXPIRACIÓN INSTALADO';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Resultado: %', v_result;
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
    '✅ SINCRONIZACIÓN COMPLETADA' AS estado,
    (SELECT COUNT(*) FROM viajes_despacho WHERE estado = 'expirado') AS viajes_expirados,
    (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%expir%') AS funciones_expiradas,
    (SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'recurso_asignaciones')) AS tiene_pilar2,
    (SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE '%admin%') AS politicas_rls;

-- ============================================================================
-- TESTING RECOMENDADO DESPUÉS DE COMPLETAR
-- ============================================================================

/*
1. Login como Coordinador Transporte
2. Crear camión de prueba
3. Crear chofer de prueba
4. Crear despacho
5. Asignar viaje
6. Verificar en planificación

Si TODO funciona correctamente, la sincronización fue exitosa.
*/
