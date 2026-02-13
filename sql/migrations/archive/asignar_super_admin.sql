-- =====================================================
-- REVISIÓN: Asignar super_admin a admin.demo@nodexia.com
-- =====================================================

-- Paso 1: Verificar si existe la empresa Nodexia (sistema)
SELECT id, nombre, tipo_empresa 
FROM public.empresas 
WHERE LOWER(nombre) LIKE '%nodexia%' 
   OR tipo_empresa = 'sistema'
LIMIT 1;

-- Si NO existe, crear empresa Nodexia:
INSERT INTO public.empresas (nombre, cuit, tipo_empresa, direccion, activo)
VALUES ('Nodexia', '30-12345678-0', 'sistema', 'Sistema Central', true)
ON CONFLICT DO NOTHING
RETURNING id, nombre;

-- Paso 2: Asignar usuario a empresa Nodexia como super_admin
INSERT INTO public.usuarios_empresa (user_id, empresa_id, rol_interno, activo)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin.demo@nodexia.com'),
    (SELECT id FROM public.empresas WHERE tipo_empresa = 'sistema' OR LOWER(nombre) LIKE '%nodexia%' LIMIT 1),
    'Super Admin',
    true
)
ON CONFLICT (user_id, empresa_id) 
DO UPDATE SET 
    rol_interno = 'Super Admin',
    activo = true;

-- Paso 3: Verificar que quedó bien
SELECT 
    u.email,
    ue.rol_interno,
    e.nombre as empresa,
    e.tipo_empresa
FROM auth.users u
INNER JOIN public.usuarios_empresa ue ON u.id = ue.user_id
INNER JOIN public.empresas e ON ue.empresa_id = e.id
WHERE u.email = 'admin.demo@nodexia.com';

-- Verificación final
DO $$
BEGIN
    RAISE NOTICE '✅ Usuario admin.demo@nodexia.com configurado como super_admin';
    RAISE NOTICE '🏢 Asignado a empresa Nodexia (sistema)';
END $$;
