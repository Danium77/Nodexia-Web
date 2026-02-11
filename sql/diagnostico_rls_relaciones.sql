-- Diagnóstico completo de RLS en relaciones_empresas
-- Ejecutar este SQL en Supabase SQL Editor

-- 1. Ver si RLS está habilitado
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'relaciones_empresas';

-- 2. Ver todas las políticas
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
WHERE tablename = 'relaciones_empresas'
ORDER BY policyname;

-- 3. Ver roles únicos en usuarios_empresa
SELECT DISTINCT rol_interno, COUNT(*) as cantidad
FROM usuarios_empresa
GROUP BY rol_interno
ORDER BY cantidad DESC;

-- 4. Verificar usuario específico
SELECT 
    u.email,
    ue.empresa_id,
    e.nombre as empresa_nombre,
    e.tipo_empresa,
    ue.rol_interno,
    ue.activo
FROM usuarios u
JOIN usuarios_empresa ue ON u.id = ue.user_id
LEFT JOIN empresas e ON ue.empresa_id = e.id
WHERE u.email = 'logistica@aceiterasanmiguel.com';
