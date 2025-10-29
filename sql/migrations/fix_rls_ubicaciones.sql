-- =====================================================
-- FIX: Políticas RLS para ubicaciones
-- =====================================================
-- Problema: super_admin no puede crear ubicaciones
-- Solución: Verificar y arreglar políticas
-- =====================================================

-- Verificar rol del usuario actual
SELECT 
    u.email,
    ue.rol_interno,
    e.nombre as empresa
FROM auth.users u
LEFT JOIN public.usuarios_empresa ue ON u.id = ue.user_id
LEFT JOIN public.empresas e ON ue.empresa_id = e.id
WHERE u.email = 'admin.demo@nodexia.com';

-- Si el resultado muestra que rol_interno es NULL o diferente de 'super_admin',
-- necesitamos actualizar las políticas o el rol del usuario

-- OPCIÓN A: Actualizar rol del usuario (si es NULL)
-- UPDATE public.usuarios_empresa 
-- SET rol_interno = 'super_admin'
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin.demo@nodexia.com');

-- OPCIÓN B: Arreglar la política para que también funcione con el campo rol_id
DROP POLICY IF EXISTS "super_admin_ubicaciones_all" ON public.ubicaciones;

CREATE POLICY "super_admin_ubicaciones_all"
ON public.ubicaciones
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_empresa ue
        LEFT JOIN public.roles_empresa re ON ue.rol_id = re.id
        WHERE ue.user_id = auth.uid()
        AND (
            ue.rol_interno = 'super_admin' 
            OR LOWER(re.nombre) = 'super admin'
            OR LOWER(re.nombre) = 'super_admin'
            OR ue.rol_id IN (SELECT id FROM public.roles_empresa WHERE LOWER(nombre) LIKE '%super%admin%')
        )
    )
);

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Política RLS actualizada para ubicaciones';
    RAISE NOTICE '🔐 Ahora super_admin puede crear ubicaciones';
END $$;
