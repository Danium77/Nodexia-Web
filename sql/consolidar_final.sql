-- CONSOLIDACION DE EMPRESAS DUPLICADAS: Transporte Nodexia S.R.L
-- UUID MAESTRO (de Walter): e3c56f6c-31a8-49e0-9cb2-4c94302c25a8
-- CUIT: 20-28848617-5

DO $consolidacion$
DECLARE
    uuid_maestro UUID := 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';
    uuid_duplicado1 UUID := '7963398f-a47d-418e-a2d5-d09414488318';
    uuid_duplicado2 UUID := '205f74a3-d170-4bd2-9c58-31a30de6e83c';
    uuid_duplicado3 UUID := '4b9d7656-fd07-41ee-a990-f1b20640a333';
    uuid_duplicado4 UUID := 'c7a88a4a-204c-42c0-9c5e-aa009b8e9b78';
    uuid_duplicado5 UUID := 'b253877d-4571-4390-ba5f-9b327de0a7a2';
    uuids_duplicados UUID[];
    total_viajes INT := 0;
    total_despachos INT := 0;
    total_relaciones INT := 0;
    total_usuarios INT := 0;
    total_choferes INT := 0;
    total_camiones INT := 0;
    total_acoplados INT := 0;
BEGIN
    RAISE NOTICE 'CONSOLIDACION INICIADA';
    RAISE NOTICE 'UUID Maestro: %', uuid_maestro;

    uuids_duplicados := ARRAY[
        uuid_duplicado1,
        uuid_duplicado2,
        uuid_duplicado3,
        uuid_duplicado4,
        uuid_duplicado5
    ];

    -- PASO 1: viajes_despacho
    UPDATE viajes_despacho
    SET id_transporte = uuid_maestro
    WHERE id_transporte = ANY(uuids_duplicados);
    GET DIAGNOSTICS total_viajes = ROW_COUNT;
    RAISE NOTICE 'Viajes migrados: %', total_viajes;
    
    -- PASO 2: despachos
    UPDATE despachos
    SET transport_id = uuid_maestro
    WHERE transport_id = ANY(uuids_duplicados);
    GET DIAGNOSTICS total_despachos = ROW_COUNT;
    RAISE NOTICE 'Despachos migrados: %', total_despachos;

    -- PASO 3: relaciones_empresas
    UPDATE relaciones_empresas
    SET empresa_transporte_id = uuid_maestro
    WHERE empresa_transporte_id = ANY(uuids_duplicados)
    AND empresa_transporte_id != uuid_maestro;
    GET DIAGNOSTICS total_relaciones = ROW_COUNT;
    
    DELETE FROM relaciones_empresas
    WHERE id IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (
                       PARTITION BY empresa_cliente_id, empresa_transporte_id 
                       ORDER BY fecha_inicio DESC
                   ) as rn
            FROM relaciones_empresas
            WHERE empresa_transporte_id = uuid_maestro
        ) t WHERE rn > 1
    );
    RAISE NOTICE 'Relaciones migradas: %', total_relaciones;

    -- PASO 4: usuarios_empresa
    DELETE FROM usuarios_empresa
    WHERE empresa_id = ANY(uuids_duplicados)
    AND user_id IN (
        SELECT user_id FROM usuarios_empresa WHERE empresa_id = uuid_maestro
    );
    
    UPDATE usuarios_empresa
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    GET DIAGNOSTICS total_usuarios = ROW_COUNT;
    RAISE NOTICE 'Usuarios migrados: %', total_usuarios;

    -- PASO 5: choferes
    UPDATE choferes
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    GET DIAGNOSTICS total_choferes = ROW_COUNT;
    RAISE NOTICE 'Choferes migrados: %', total_choferes;

    -- PASO 6: camiones
    UPDATE camiones
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    GET DIAGNOSTICS total_camiones = ROW_COUNT;
    RAISE NOTICE 'Camiones migrados: %', total_camiones;

    -- PASO 7: acoplados
    UPDATE acoplados
    SET empresa_id = uuid_maestro
    WHERE empresa_id = ANY(uuids_duplicados);
    GET DIAGNOSTICS total_acoplados = ROW_COUNT;
    RAISE NOTICE 'Acoplados migrados: %', total_acoplados;

    -- PASO 8: eliminar duplicados
    DELETE FROM empresas WHERE id = ANY(uuids_duplicados);
    
    RAISE NOTICE 'CONSOLIDACION COMPLETADA';
    RAISE NOTICE 'Total viajes: %, despachos: %, relaciones: %, usuarios: %', 
        total_viajes, total_despachos, total_relaciones, total_usuarios;
END $consolidacion$;

-- Verificacion
SELECT 'Empresas con CUIT' as info, COUNT(*) as total
FROM empresas WHERE cuit = '20-28848617-5';

SELECT 'Viajes con UUID maestro' as info, COUNT(*) as total
FROM viajes_despacho WHERE id_transporte = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';

SELECT 'Usuarios vinculados' as info, COUNT(*) as total
FROM usuarios_empresa WHERE empresa_id = 'e3c56f6c-31a8-49e0-9cb2-4c94302c25a8';
