-- ============================================================================
-- VERIFICAR Y CORREGIR POLÍTICAS RLS PARA TABLA CHOFERES
-- ============================================================================
-- Fecha: 2024-12-29
-- Propósito: Asegurar que coordinadores puedan ver choferes de su empresa
--
-- PROBLEMA:
-- - Camiones y acoplados se cargan OK en AceptarDespachoModal
-- - Choferes NO se cargan (mensaje: "No tienes choferes registrados")
-- - Query usa: .eq('id_transporte', empId) igual que camiones/acoplados
-- - Probable causa: Falta política RLS para SELECT en choferes
-- ============================================================================

-- 1. Ver políticas actuales de choferes
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
WHERE tablename = 'choferes'
ORDER BY cmd, policyname;

-- 2. Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'choferes';

-- ============================================================================
-- CREAR POLÍTICA SELECT SI NO EXISTE
-- ============================================================================
-- Esto permite que coordinadores vean choferes de su empresa

-- Si ya existe, primero eliminarla:
-- DROP POLICY IF EXISTS "coordinador_select_choferes" ON choferes;

CREATE POLICY "coordinador_select_choferes"
ON choferes
FOR SELECT
TO authenticated
USING (
    id_transporte IN (
        SELECT empresa_id 
        FROM usuarios_empresa 
        WHERE user_id = auth.uid() 
        AND activo = true
    )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Volver a ejecutar query 1 para confirmar que la política se creó
