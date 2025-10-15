-- =============================================
-- Script para Verificar Configuración de Usuario
-- Ejecutar en Supabase SQL Editor para diagnosticar
-- =============================================

-- 1. Verificar usuarios en auth.users
SELECT 
    'auth.users' as tabla,
    email,
    id as user_id,
    created_at
FROM auth.users 
WHERE email IN (
    'coordinador.demo@nodexia.com',
    'coord_demo@example.com'
)
ORDER BY email;

-- 2. Verificar usuarios en public.usuarios
SELECT 
    'public.usuarios' as tabla,
    email,
    id as user_id,
    nombre_completo,
    created_at
FROM public.usuarios 
WHERE email IN (
    'coordinador.demo@nodexia.com',
    'coord_demo@example.com'
)
ORDER BY email;

-- 3. Verificar empresas coordinadoras
SELECT 
    'empresas' as tabla,
    nombre,
    cuit,
    tipo_empresa,
    activo,
    id as empresa_id
FROM public.empresas 
WHERE tipo_empresa = 'coordinador'
ORDER BY nombre;

-- 4. Verificar asociaciones usuario-empresa para coordinadores
SELECT 
    'usuarios_empresa' as tabla,
    ue.user_id,
    u.email,
    u.nombre_completo,
    ue.empresa_id,
    e.nombre as empresa_nombre,
    e.tipo_empresa,
    ue.rol_interno,
    ue.activo
FROM public.usuarios_empresa ue
JOIN public.usuarios u ON u.id = ue.user_id
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email IN (
    'coordinador.demo@nodexia.com',
    'coord_demo@example.com'
)
ORDER BY u.email;

-- 5. Verificar empresas de transporte disponibles
SELECT 
    'transportes_disponibles' as tabla,
    nombre,
    cuit,
    tipo_empresa,
    activo,
    id as empresa_id
FROM public.empresas 
WHERE tipo_empresa = 'transporte' AND activo = true
ORDER BY nombre;

-- 6. Verificar relaciones existentes
SELECT 
    'relaciones_existentes' as tabla,
    re.id,
    ec.nombre as empresa_coordinadora,
    et.nombre as empresa_transporte,
    re.estado,
    re.fecha_inicio,
    re.activo
FROM public.relaciones_empresa re
JOIN public.empresas ec ON ec.id = re.empresa_coordinadora_id
JOIN public.empresas et ON et.id = re.empresa_transporte_id
ORDER BY re.created_at DESC;

-- 7. Verificar permisos RLS (si existen problemas de acceso)
SELECT 
    'permisos_verificacion' as info,
    'Verificar que el usuario tenga los permisos correctos para ver y crear relaciones' as mensaje;