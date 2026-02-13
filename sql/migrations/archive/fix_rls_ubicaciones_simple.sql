-- =====================================================
-- FIX SIMPLE: Políticas RLS para ubicaciones
-- =====================================================
-- Usar solo rol_interno (sin rol_id)
-- =====================================================

-- Primero: verificar qué valor tiene rol_interno
SELECT 
    u.email,
    ue.rol_interno,
    e.nombre as empresa,
    e.tipo_empresa
FROM auth.users u
LEFT JOIN public.usuarios_empresa ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE u.email = 'admin.demo@nodexia.com';

-- Si el resultado muestra rol_interno como NULL o vacío,
-- ejecutá esto para actualizarlo:
/*
UPDATE public.usuarios_empresa 
SET rol_interno = 'super_admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin.demo@nodexia.com');
*/

-- Ahora arreglamos la política (sin usar rol_id)
DROP POLICY IF EXISTS "super_admin_ubicaciones_all" ON public.ubicaciones;

CREATE POLICY "super_admin_ubicaciones_all"
ON public.ubicaciones
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'super_admin'
    )
);

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Política RLS actualizada (solo rol_interno)';
    RAISE NOTICE '🔐 Verificá que admin.demo@nodexia.com tenga rol_interno = super_admin';
END $$;
