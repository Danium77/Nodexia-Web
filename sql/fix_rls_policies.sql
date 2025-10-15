-- =============================================
-- Script para Ajustar Políticas RLS
-- Si hay problemas de permisos
-- =============================================

-- Temporalmente deshabilitar RLS para debugging (NO usar en producción)
-- ALTER TABLE public.relaciones_empresa DISABLE ROW LEVEL SECURITY;

-- O crear una política más permisiva para coordinadores
DROP POLICY IF EXISTS "coordinadores_pueden_crear_relaciones" ON public.relaciones_empresa;
CREATE POLICY "coordinadores_pueden_crear_relaciones" ON public.relaciones_empresa
    FOR INSERT
    WITH CHECK (
        -- El usuario debe pertenecer a la empresa coordinadora
        empresa_coordinadora_id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            JOIN public.empresas e ON e.id = ue.empresa_id
            WHERE ue.user_id = auth.uid() 
            AND e.tipo_empresa = 'coordinador'
            AND ue.activo = true
        )
    );

-- Política para que coordinadores puedan ver sus relaciones
DROP POLICY IF EXISTS "coordinadores_pueden_ver_sus_relaciones" ON public.relaciones_empresa;
CREATE POLICY "coordinadores_pueden_ver_sus_relaciones" ON public.relaciones_empresa
    FOR SELECT
    USING (
        empresa_coordinadora_id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            WHERE ue.user_id = auth.uid()
        )
        OR
        empresa_transporte_id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            WHERE ue.user_id = auth.uid()
        )
    );

-- Política para actualizar relaciones
DROP POLICY IF EXISTS "coordinadores_pueden_actualizar_relaciones" ON public.relaciones_empresa;
CREATE POLICY "coordinadores_pueden_actualizar_relaciones" ON public.relaciones_empresa
    FOR UPDATE
    USING (
        empresa_coordinadora_id IN (
            SELECT ue.empresa_id 
            FROM public.usuarios_empresa ue 
            WHERE ue.user_id = auth.uid()
        )
    );

-- Verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'relaciones_empresa'
ORDER BY policyname;