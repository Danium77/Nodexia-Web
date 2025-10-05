-- Script para verificar y ejecutar la configuración paso a paso
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si las funciones se crearon
SELECT 
    routine_name,
    routine_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('configurar_estructura_empresas', 'vincular_usuarios_demo');

-- 2. Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('empresas', 'usuarios_empresa', 'roles_empresa', 'relaciones_empresas', 'despachos_red')
ORDER BY table_name;

-- 3. Ejecutar configuración de estructura
SELECT configurar_estructura_empresas() as resultado_estructura;

-- 4. Ejecutar vinculación de usuarios
SELECT vincular_usuarios_demo() as resultado_usuarios;

-- 5. Verificar que las tablas se crearon con datos
SELECT 'empresas' as tabla, count(*) as cantidad FROM empresas
UNION ALL
SELECT 'usuarios_empresa' as tabla, count(*) as cantidad FROM usuarios_empresa
UNION ALL
SELECT 'roles_empresa' as tabla, count(*) as cantidad FROM roles_empresa
UNION ALL
SELECT 'relaciones_empresas' as tabla, count(*) as cantidad FROM relaciones_empresas;

-- 6. Ver datos específicos
SELECT 'EMPRESAS CREADAS:' as info;
SELECT id, nombre, tipo_empresa, cuit FROM empresas;

SELECT 'USUARIOS VINCULADOS:' as info;
SELECT 
    ue.user_id,
    ue.nombre_completo,
    ue.rol_interno,
    e.nombre as empresa,
    au.email
FROM usuarios_empresa ue
JOIN empresas e ON ue.empresa_id = e.id
JOIN auth.users au ON ue.user_id = au.id;

-- 7. Verificar permisos de las tablas (RLS)
SELECT 
    tablename,
    rowsecurity,
    (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policies_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'usuarios_empresa', 'roles_empresa', 'relaciones_empresas', 'despachos_red');