-- ============================================================================
-- SOLUCIÓN DRÁSTICA: Deshabilitar RLS y recrear desde cero
-- Fecha: 2025-11-02
-- ============================================================================

-- PASO 1: Deshabilitar RLS completamente en las 3 tablas
ALTER TABLE choferes DISABLE ROW LEVEL SECURITY;
ALTER TABLE camiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE acoplados DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar TODAS las políticas (esto debería funcionar ahora)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('choferes', 'camiones', 'acoplados')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- PASO 3: Habilitar RLS nuevamente
ALTER TABLE choferes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoplados ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas limpias y correctas

-- CHOFERES
CREATE POLICY "choferes_select" ON choferes
    FOR SELECT USING (id_transporte = auth.uid());

CREATE POLICY "choferes_insert" ON choferes
    FOR INSERT WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "choferes_update" ON choferes
    FOR UPDATE USING (id_transporte = auth.uid())
    WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "choferes_delete" ON choferes
    FOR DELETE USING (id_transporte = auth.uid());

-- CAMIONES
CREATE POLICY "camiones_select" ON camiones
    FOR SELECT USING (id_transporte = auth.uid());

CREATE POLICY "camiones_insert" ON camiones
    FOR INSERT WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "camiones_update" ON camiones
    FOR UPDATE USING (id_transporte = auth.uid())
    WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "camiones_delete" ON camiones
    FOR DELETE USING (id_transporte = auth.uid());

-- ACOPLADOS
CREATE POLICY "acoplados_select" ON acoplados
    FOR SELECT USING (id_transporte = auth.uid());

CREATE POLICY "acoplados_insert" ON acoplados
    FOR INSERT WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "acoplados_update" ON acoplados
    FOR UPDATE USING (id_transporte = auth.uid())
    WITH CHECK (id_transporte = auth.uid());

CREATE POLICY "acoplados_delete" ON acoplados
    FOR DELETE USING (id_transporte = auth.uid());

-- PASO 5: Verificar resultado final
SELECT 
    tablename,
    policyname,
    cmd,
    qual as condicion
FROM pg_policies
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;
