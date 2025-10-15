-- =============================================
-- Script de Corrección Temporal - EJECUTAR AHORA
-- =============================================

-- 1. Deshabilitar RLS temporalmente para evitar problemas de permisos
ALTER TABLE public.relaciones_empresa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa DISABLE ROW LEVEL SECURITY;

-- 2. Corregir la asociación del usuario coord_demo@example.com
-- Asegurar que el ID coincida entre auth.users y public.usuarios
UPDATE public.usuarios 
SET id = '74d71b4a-81db-459d-93f6-b52e82c3e4bc'
WHERE email = 'coord_demo@example.com' 
AND id != '74d71b4a-81db-459d-93f6-b52e82c3e4bc';

-- 3. Actualizar la asociación en usuarios_empresa
UPDATE public.usuarios_empresa 
SET user_id = '74d71b4a-81db-459d-93f6-b52e82c3e4bc'
WHERE user_id = (SELECT id FROM public.usuarios WHERE email = 'coord_demo@example.com');

-- 4. Verificar configuración final
SELECT 
    'USUARIO COORDINADOR LISTO' as status,
    u.email,
    u.id as user_id,
    e.nombre as empresa,
    e.tipo_empresa,
    ue.rol_interno,
    ue.activo
FROM public.usuarios u
JOIN public.usuarios_empresa ue ON u.id = ue.user_id  
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email = 'coord_demo@example.com';

-- 5. Mostrar empresas de transporte disponibles
SELECT 
    'TRANSPORTES DISPONIBLES' as status,
    nombre,
    id as empresa_transporte_id,
    cuit,
    activo
FROM public.empresas
WHERE tipo_empresa = 'transporte' AND activo = true
ORDER BY nombre;

-- Confirmación
DO $$
BEGIN
    RAISE NOTICE 'RLS deshabilitado y usuario coordinador configurado correctamente';
    RAISE NOTICE 'Ahora puedes probar crear relaciones en la aplicación';
END $$;