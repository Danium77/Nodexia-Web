-- ============================================================================
-- CONSOLIDACION DE EMPRESAS DUPLICADAS: Transporte Nodexia S.R.L
-- ============================================================================
-- UUID MAESTRO (de Walter): e3c56f6c-31a8-49e0-9cb2-4c94302c25a8
-- CUIT: 20-28848617-5
-- 
-- Este script:
-- 1. Identifica todos los duplicados
-- 2. Migra referencias a UUID maestro
-- 3. Elimina duplicados
-- 4. Verifica integridad
-- ============================================================================

DO $$
DECLARE
    uuid_maestro UUID := 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';
    uuid_duplicado1 UUID := '7963398f-a47d-418e-a2d5-d09414488318';
    uuid_duplicado2 UUID := '205f74a3-d170-4bd2-9c58-31a30de6e83c';
    uuid_duplicado3 UUID := '4b9d7656-fd07-41ee-a990-f1b20640a333';
    uuid_duplicado4 UUID := 'c7a88a4a-204c-42c0-9c5e-aa009b8e9b78';
    uuid_duplicado5 UUID := 'b253877d-4571-4390-ba5f-9b327de0a7a2';
    uuids_duplicados UUID[];
    total_viajes_migrados INT := 0;
    total_despachos_migrados INT := 0;
    total_relaciones_migradas INT := 0;
    total_usuarios_migrados INT := 0;
    total_choferes_migrados INT := 0;
    total_camiones_migrados INT := 0;
    total_acoplados_migrados INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===============================================================';
    RAISE NOTICE 'CONSOLIDACION DE TRANSPORTE NODEXIA S.R.L';
    RAISE NOTICE '===============================================================';
    RAISE NOTICE 'UUID Maestro (Walter): %', uuid_maestro;
    RAISE NOTICE '';

    -- Array con todos los UUIDs duplicados
    uuids_duplicados := ARRAY[
        uuid_duplicado1,
        uuid_duplicado2,
        uuid_duplicado3,
        uuid_duplicado4,
        uuid_duplicado5
    ];

    -- PASO 1: MIGRAR VIAJES_DESPACHO
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 1: Migrando viajes_despacho...';
    
    UPDATE viajes_despacho
    SET id_transporte = uuid_maestro
    WHERE id_transporte = ANY(uuids_duplicados);
    
    GET DIAGNOSTICS total_viajes_migrados = ROW_COUNT;
    RAISE NOTICE '   OK - % viajes migrados', total_viajes_migrados;
    
    -- PASO 2: MIGRAR DESPACHOS (tabla principal)
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 2: Migrando despachos.transport_id...';
    
    UPDATE despachos
    SET transport_id = uuid_maestro
    WHERE transport_id = ANY(uuids_duplicados);
    
    GET DIAGNOSTICS total_despachos_migrados = ROW_COUNT;
    RAISE NOTICE '   OK - % despachos migrados', total_despachos_migrados;

    -- PASO 3: MIGRAR RELACIONES_EMPRESAS
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 3: Migrando relaciones_empresas...';
    
    -- Actualizar donde la empresa es el transporte
    UPDATE relaciones_empresas
    SET empresa_transporte_id = uuid_maestro
    WHERE empresa_transporte_id = ANY(uuids_duplicados)
    AND empresa_transporte_id != uuid_maestro;
    
    GET DIAGNOSTICS total_relaciones_migradas = ROW_COUNT;
    RAISE NOTICE '   OK - % relaciones migradas', total_relaciones_migradas;
    
    -- Eliminar duplicados (si existen relaciones duplicadas)
    DELETE FROM relaciones_empresas
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (
                       PARTITION BY empresa_cliente_id, empresa_transporte_id 
                       ORDER BY fecha_inicio DESC
                   ) as rn
            FROM relaciones_empresas
            WHERE empresa_transporte_id = uuid_maestro
        ) t
        WHERE rn > 1
    );

    -- PASO 4: MIGRAR USUARIOS_EMPRESA
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 4: Migrando usuarios_empresa...';
    
    -- Primero, eliminar duplicados si existen
    DELETE FROM usuarios_empresa
    WHERE empresa_id = ANY(uuids_duplicados)
    AND user_id IN (
        SELECT user_id 
        FROM usuarios_empresa 
        WHERE empresa_id = uuid_maestro
    );
    
    -- Luego migrar los que no existen en maestro
    UPDATE usuarios_empresa
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    
    GET DIAGNOSTICS total_usuarios_migrados = ROW_COUNT;
    RAISE NOTICE '   OK - % usuarios migrados', total_usuarios_migrados;

    -- PASO 5: MIGRAR CHOFERES
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 5: Migrando choferes...';
    
    UPDATE choferes
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    
    GET DIAGNOSTICS total_choferes_migrados = ROW_COUNT;
    RAISE NOTICE '   OK - % choferes migrados', total_choferes_migrados;

    -- PASO 6: MIGRAR CAMIONES
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 6: Migrando camiones...';
    
    UPDATE camiones
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    
    GET DIAGNOSTICS total_camiones_migrados = ROW_COUNT;
    RAISE NOTICE '   OK - % camiones migrados', total_camiones_migrados;

    -- PASO 7: MIGRAR ACOPLADOS
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 7: Migrando acoplados...';
    
    UPDATE acoplados
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    
    GET DIAGNOSTICS total_acoplados_migrados = ROW_COUNT;
    RAISE NOTICE '   OK - % acoplados migrados', total_acoplados_migrados;

    -- PASO 8: ELIMINAR EMPRESAS DUPLICADAS
    RAISE NOTICE '';
    RAISE NOTICE 'PASO 8: Eliminando empresas duplicadas...';
    
    DELETE FROM empresas
    WHERE id = ANY(uuids_duplicados);
    
    RAISE NOTICE '   OK - 5 empresas duplicadas eliminadas';

    -- RESUMEN FINAL
    RAISE NOTICE '';
    RAISE NOTICE '===============================================================';
    RAISE NOTICE 'CONSOLIDACION COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '===============================================================';
    RAISE NOTICE 'Registros migrados:';
    RAISE NOTICE '  - Viajes: %', total_viajes_migrados;
    RAISE NOTICE '  - Despachos: %', total_despachos_migrados;
    RAISE NOTICE '  - Relaciones: %', total_relaciones_migradas;
    RAISE NOTICE '  - Usuarios: %', total_usuarios_migrados;
    RAISE NOTICE '  - Choferes: %', total_choferes_migrados;
    RAISE NOTICE '  - Camiones: %', total_camiones_migrados;
    RAISE NOTICE '  - Acoplados: %', total_acoplados_migrados;
    RAISE NOTICE '';
    RAISE NOTICE 'UUID Maestro (unico): %', uuid_maestro;
    RAISE NOTICE '';
END $$;

-- VERIFICACION POST-CONSOLIDACION
SELECT 
    'Verificacion final' as resultado,
    COUNT(CASE WHEN cuit = '20-28848617-5' THEN 1 END) as empresas_con_cuit,
    COUNT(CASE WHEN cuit = '20-28848617-5' AND id = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8' THEN 1 END) as uuid_maestro_existe
FROM empresas;

SELECT 
    'Viajes con Transporte Nodexia' as info,
    COUNT(*) as total,
    COUNT(DISTINCT id_transporte) as empresas_distintas
FROM viajes_despacho
WHERE id_transporte = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';

SELECT 
    'Usuarios vinculados a Transporte Nodexia' as info,
    COUNT(*) as total
FROM usuarios_empresa
WHERE empresa_id = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';
