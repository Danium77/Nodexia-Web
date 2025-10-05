-- Verificar qué tablas existen en el esquema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar específicamente las tablas del sistema de empresas
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as empresas_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_empresa' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as usuarios_empresa_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles_empresa' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as roles_empresa_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relaciones_empresas' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as relaciones_empresas_table;

-- Si las tablas existen, verificar algunos datos
SELECT 'Verificando datos existentes...' as info;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabla empresas existe. Cantidad de registros: %', (SELECT count(*) FROM public.empresas);
    ELSE
        RAISE NOTICE 'Tabla empresas NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_empresa' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabla usuarios_empresa existe. Cantidad de registros: %', (SELECT count(*) FROM public.usuarios_empresa);
    ELSE
        RAISE NOTICE 'Tabla usuarios_empresa NO existe';
    END IF;
END $$;