-- =============================================
-- SEED DATOS DEMO - NODEXIA
-- Fecha: 19 de Octubre 2025
-- Usuarios oficiales + datos de prueba
-- =============================================

-- =============================================
-- PASO 1: CREAR USUARIOS EN AUTH
-- =============================================
-- NOTA: Los usuarios en auth.users deben crearse desde Supabase Dashboard
-- o mediante la API de autenticación. Este script asume que ya existen.
-- Si no existen, crearlos manualmente en:
-- Authentication > Users > Add User

-- IDs de usuarios (estos se crearán en auth.users primero)
-- Luego ejecutar este script para vincularlos a empresas

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '👥 SEED DATOS DEMO - NODEXIA';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE:';
    RAISE NOTICE '   Los usuarios deben existir en auth.users primero.';
    RAISE NOTICE '   Créalos en Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '';
END $$;

-- =============================================
-- PASO 2: CREAR EMPRESAS DEMO
-- =============================================

-- PLANTAS
INSERT INTO public.empresas (id, nombre, cuit, tipo_empresa, direccion, localidad, provincia, activo)
VALUES 
    (gen_random_uuid(), 'Lácteos del Sur', '30-12345678-9', 'planta', 'Av. Industrial 1234', 'Rosario', 'Santa Fe', true),
    (gen_random_uuid(), 'Tecnoembalajes S.A.', '30-23456789-0', 'planta', 'Ruta 9 Km 45', 'Córdoba', 'Córdoba', true),
    (gen_random_uuid(), 'Distribuidora Central', '30-34567890-1', 'planta', 'Calle Comercio 567', 'Buenos Aires', 'Buenos Aires', true)
ON CONFLICT (cuit) DO NOTHING;

-- TRANSPORTES
INSERT INTO public.empresas (id, nombre, cuit, tipo_empresa, direccion, localidad, provincia, activo)
VALUES 
    (gen_random_uuid(), 'Rápido Express', '30-45678901-2', 'transporte', 'Av. Libertador 890', 'Rosario', 'Santa Fe', true),
    (gen_random_uuid(), 'Logística del Centro', '30-56789012-3', 'transporte', 'Ruta 8 Km 23', 'Córdoba', 'Córdoba', true),
    (gen_random_uuid(), 'Transporte Federal', '30-67890123-4', 'transporte', 'Av. Belgrano 1122', 'Buenos Aires', 'Buenos Aires', true)
ON CONFLICT (cuit) DO NOTHING;

-- CLIENTES
INSERT INTO public.empresas (id, nombre, cuit, tipo_empresa, direccion, localidad, provincia, activo)
VALUES 
    (gen_random_uuid(), 'MaxiConsumo', '30-78901234-5', 'cliente', 'Av. Principal 2000', 'Rosario', 'Santa Fe', true),
    (gen_random_uuid(), 'SuperMercado Norte', '30-89012345-6', 'cliente', 'Calle Norte 3456', 'Córdoba', 'Córdoba', true),
    (gen_random_uuid(), 'Distribuidora Minorista', '30-90123456-7', 'cliente', 'Av. Sur 7890', 'Buenos Aires', 'Buenos Aires', true)
ON CONFLICT (cuit) DO NOTHING;

DO $$
DECLARE
    v_empresas_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_empresas_count FROM public.empresas;
    RAISE NOTICE '✅ Paso 2: Empresas creadas (Total: %)', v_empresas_count;
END $$;

-- =============================================
-- PASO 3: CREAR ORÍGENES GLOBALES
-- =============================================

INSERT INTO public.origenes (codigo, tipo, nombre, direccion, localidad, provincia, activo)
VALUES 
    ('PLT-001', 'planta', 'Planta Principal Lácteos', 'Av. Industrial 1234', 'Rosario', 'Santa Fe', true),
    ('DEP-ROS', 'deposito', 'Depósito Rosario', 'Zona Franca Rosario', 'Rosario', 'Santa Fe', true),
    ('DEP-CBA', 'deposito', 'Depósito Córdoba', 'Parque Industrial', 'Córdoba', 'Córdoba', true),
    ('CDC-001', 'centro_distribucion', 'Centro de Distribución BA', 'Zona Logística', 'Buenos Aires', 'Buenos Aires', true)
ON CONFLICT (codigo) DO NOTHING;

DO $$
DECLARE
    v_origenes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_origenes_count FROM public.origenes;
    RAISE NOTICE '✅ Paso 3: Orígenes creados (Total: %)', v_origenes_count;
END $$;

-- =============================================
-- PASO 4: CREAR DESTINOS
-- =============================================

DO $$
DECLARE
    v_lacteos_id UUID;
    v_tecnoembalajes_id UUID;
    v_maxiconsumo_id UUID;
    v_supernorte_id UUID;
    v_distribuidora_id UUID;
BEGIN
    -- Obtener IDs de empresas cliente
    SELECT id INTO v_maxiconsumo_id FROM public.empresas WHERE cuit = '30-78901234-5';
    SELECT id INTO v_supernorte_id FROM public.empresas WHERE cuit = '30-89012345-6';
    SELECT id INTO v_distribuidora_id FROM public.empresas WHERE cuit = '30-90123456-7';
    
    -- Destinos vinculados a clientes
    INSERT INTO public.destinos (
        empresa_cliente_id, codigo, nombre, razon_social, cuit_destino,
        direccion, localidad, provincia, activo
    )
    VALUES 
        (v_maxiconsumo_id, 'MAXI-ROSARIO-01', 'MaxiConsumo Rosario', 'MaxiConsumo', '30-78901234-5',
         'Av. Principal 2000', 'Rosario', 'Santa Fe', true),
        (v_supernorte_id, 'SUPER-CBA-01', 'SuperMercado Norte Córdoba', 'SuperMercado Norte', '30-89012345-6',
         'Calle Norte 3456', 'Córdoba', 'Córdoba', true),
        (v_distribuidora_id, 'DIST-BA-01', 'Distribuidora BA', 'Distribuidora Minorista', '30-90123456-7',
         'Av. Sur 7890', 'Buenos Aires', 'Buenos Aires', true)
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Destinos sin login (solo direcciones)
    INSERT INTO public.destinos (
        empresa_cliente_id, codigo, nombre, direccion, localidad, provincia, activo
    )
    VALUES 
        (NULL, 'DEST-INDEP-001', 'Almacén Independiente 1', 'Calle Comercio 111', 'Rosario', 'Santa Fe', true),
        (NULL, 'DEST-INDEP-002', 'Minorista Sin Sistema', 'Av. Libertad 222', 'Córdoba', 'Córdoba', true)
    ON CONFLICT (codigo) DO NOTHING;
END $$;

DO $$
DECLARE
    v_destinos_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_destinos_count FROM public.destinos;
    RAISE NOTICE '✅ Paso 4: Destinos creados (Total: %)', v_destinos_count;
END $$;

-- =============================================
-- PASO 5: CREAR RELACIONES PLANTA-TRANSPORTE
-- =============================================

-- Lácteos del Sur → Rápido Express (preferido)
INSERT INTO public.planta_transportes (planta_id, transporte_id, estado, tarifa_acordada, es_preferido, prioridad)
SELECT 
    (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9'),
    (SELECT id FROM public.empresas WHERE cuit = '30-45678901-2'),
    'activo',
    15000.00,
    true,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.planta_transportes 
    WHERE planta_id = (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9')
    AND transporte_id = (SELECT id FROM public.empresas WHERE cuit = '30-45678901-2')
);

-- Lácteos del Sur → Logística del Centro
INSERT INTO public.planta_transportes (planta_id, transporte_id, estado, tarifa_acordada, es_preferido, prioridad)
SELECT 
    (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9'),
    (SELECT id FROM public.empresas WHERE cuit = '30-56789012-3'),
    'activo',
    16000.00,
    false,
    2
WHERE NOT EXISTS (
    SELECT 1 FROM public.planta_transportes 
    WHERE planta_id = (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9')
    AND transporte_id = (SELECT id FROM public.empresas WHERE cuit = '30-56789012-3')
);

-- Tecnoembalajes → Transporte Federal
INSERT INTO public.planta_transportes (planta_id, transporte_id, estado, tarifa_acordada, es_preferido, prioridad)
SELECT 
    (SELECT id FROM public.empresas WHERE cuit = '30-23456789-0'),
    (SELECT id FROM public.empresas WHERE cuit = '30-67890123-4'),
    'activo',
    14000.00,
    true,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.planta_transportes 
    WHERE planta_id = (SELECT id FROM public.empresas WHERE cuit = '30-23456789-0')
    AND transporte_id = (SELECT id FROM public.empresas WHERE cuit = '30-67890123-4')
);

DO $$
DECLARE
    v_relaciones_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_relaciones_count FROM public.planta_transportes;
    RAISE NOTICE '✅ Paso 5: Relaciones planta-transporte creadas (Total: %)', v_relaciones_count;
END $$;

-- =============================================
-- PASO 6: AGREGAR ORÍGENES A PLANTAS
-- =============================================

-- Lácteos del Sur → PLT-001 (principal)
INSERT INTO public.planta_origenes (planta_id, origen_id, alias, es_origen_principal)
SELECT 
    (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9'),
    (SELECT id FROM public.origenes WHERE codigo = 'PLT-001'),
    'Planta Principal',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.planta_origenes 
    WHERE planta_id = (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9')
    AND origen_id = (SELECT id FROM public.origenes WHERE codigo = 'PLT-001')
);

-- Lácteos del Sur → DEP-ROS
INSERT INTO public.planta_origenes (planta_id, origen_id, alias, es_origen_principal)
SELECT 
    (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9'),
    (SELECT id FROM public.origenes WHERE codigo = 'DEP-ROS'),
    'Depósito Rosario',
    false
WHERE NOT EXISTS (
    SELECT 1 FROM public.planta_origenes 
    WHERE planta_id = (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9')
    AND origen_id = (SELECT id FROM public.origenes WHERE codigo = 'DEP-ROS')
);

DO $$
DECLARE
    v_planta_origenes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_planta_origenes_count FROM public.planta_origenes;
    RAISE NOTICE '✅ Paso 6: Orígenes agregados a plantas (Total: %)', v_planta_origenes_count;
END $$;

-- =============================================
-- PASO 7: AGREGAR DESTINOS A PLANTAS
-- =============================================

-- Lácteos del Sur → MaxiConsumo (frecuente)
INSERT INTO public.planta_destinos (planta_id, destino_id, es_destino_frecuente)
SELECT 
    (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9'),
    (SELECT id FROM public.destinos WHERE codigo = 'MAXI-ROSARIO-01'),
    true
WHERE EXISTS (SELECT 1 FROM public.destinos WHERE codigo = 'MAXI-ROSARIO-01')
AND NOT EXISTS (
    SELECT 1 FROM public.planta_destinos 
    WHERE planta_id = (SELECT id FROM public.empresas WHERE cuit = '30-12345678-9')
    AND destino_id = (SELECT id FROM public.destinos WHERE codigo = 'MAXI-ROSARIO-01')
);

DO $$
DECLARE
    v_planta_destinos_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_planta_destinos_count FROM public.planta_destinos;
    RAISE NOTICE '✅ Paso 7: Destinos agregados a plantas (Total: %)', v_planta_destinos_count;
END $$;

-- =============================================
-- RESUMEN FINAL
-- =============================================

DO $$
DECLARE
    v_empresas INTEGER;
    v_plantas INTEGER;
    v_transportes INTEGER;
    v_clientes INTEGER;
    v_origenes INTEGER;
    v_destinos INTEGER;
    v_relaciones INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_empresas FROM public.empresas;
    SELECT COUNT(*) INTO v_plantas FROM public.empresas WHERE tipo_empresa = 'planta';
    SELECT COUNT(*) INTO v_transportes FROM public.empresas WHERE tipo_empresa = 'transporte';
    SELECT COUNT(*) INTO v_clientes FROM public.empresas WHERE tipo_empresa = 'cliente';
    SELECT COUNT(*) INTO v_origenes FROM public.origenes;
    SELECT COUNT(*) INTO v_destinos FROM public.destinos;
    SELECT COUNT(*) INTO v_relaciones FROM public.planta_transportes;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ SEED COMPLETADO';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN:';
    RAISE NOTICE '   • Total Empresas: %', v_empresas;
    RAISE NOTICE '     - Plantas: %', v_plantas;
    RAISE NOTICE '     - Transportes: %', v_transportes;
    RAISE NOTICE '     - Clientes: %', v_clientes;
    RAISE NOTICE '   • Orígenes: %', v_origenes;
    RAISE NOTICE '   • Destinos: %', v_destinos;
    RAISE NOTICE '   • Relaciones Planta-Transporte: %', v_relaciones;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  SIGUIENTE PASO:';
    RAISE NOTICE '   Crear usuarios en Authentication > Users con estos emails:';
    RAISE NOTICE '   • admin@nodexia.com (Password: Nodexia2025!)';
    RAISE NOTICE '   • coordinador@lacteos.com (Password: Demo2025!)';
    RAISE NOTICE '   • acceso@lacteos.com (Password: Demo2025!)';
    RAISE NOTICE '   • coordinador@rapidoexpress.com (Password: Demo2025!)';
    RAISE NOTICE '   • chofer@rapidoexpress.com (Password: Demo2025!)';
    RAISE NOTICE '   • visor@maxiconsumo.com (Password: Demo2025!)';
    RAISE NOTICE '';
    RAISE NOTICE '   Luego ejecutar: 006_vincular_usuarios_empresas.sql';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
