-- FIX CORRECTO: Políticas RLS para relaciones_empresas
-- Este script reemplaza las políticas problemáticas con versiones case-insensitive

-- 1. Eliminar políticas existentes (si existen)
DROP POLICY IF EXISTS "Ver relaciones de mis empresas" ON public.relaciones_empresas;
DROP POLICY IF EXISTS "Coordinadores crean relaciones" ON public.relaciones_empresas;
DROP POLICY IF EXISTS "Coordinadores actualizan relaciones" ON public.relaciones_empresas;

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE public.relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- 3. Política SELECT: Los usuarios pueden ver relaciones donde participan sus empresas
CREATE POLICY "Ver relaciones de mis empresas" 
ON public.relaciones_empresas
FOR SELECT 
USING (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    ) 
    OR
    empresa_transporte_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- 4. Política INSERT: Coordinadores/Admins pueden crear relaciones
-- ✅ CASE-INSENSITIVE: Acepta 'admin', 'Admin', 'coordinador', 'Coordinador', etc.
CREATE POLICY "Coordinadores crean relaciones" 
ON public.relaciones_empresas
FOR INSERT 
WITH CHECK (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
        AND LOWER(rol_interno) IN ('admin', 'coordinador', 'super_admin', 'superadmin')
    )
);

-- 5. Política UPDATE: Coordinadores/Admins pueden actualizar relaciones de su empresa
CREATE POLICY "Coordinadores actualizan relaciones" 
ON public.relaciones_empresas
FOR UPDATE 
USING (
    empresa_cliente_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
        AND LOWER(rol_interno) IN ('admin', 'coordinador', 'super_admin', 'superadmin')
    )
);

-- 6. Verificación
SELECT 
    'Políticas creadas correctamente' as resultado,
    COUNT(*) as cantidad_politicas
FROM pg_policies 
WHERE tablename = 'relaciones_empresas';

-- 7. Test: Ver qué puede hacer el usuario actual
SELECT 
    'Test de permisos para usuario actual' as info,
    auth.uid() as user_id,
    (
        SELECT COUNT(*) 
        FROM public.relaciones_empresas 
        WHERE empresa_cliente_id IN (
            SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
        )
    ) as relaciones_visibles;
