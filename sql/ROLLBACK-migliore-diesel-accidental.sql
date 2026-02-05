-- ============================================
-- SCRIPT DE ROLLBACK - ELIMINAR MIGLIORE DIESEL
-- ============================================
-- Este script elimina TODAS las tablas, funciones, tipos y objetos
-- creados accidentalmente del proyecto Migliore Diesel en Nodexia
-- ============================================
-- ⚠️ EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- ============================================

BEGIN;

-- ============================================
-- 1. ELIMINAR FUNCIONES RPC (en orden de dependencias)
-- ============================================

DROP FUNCTION IF EXISTS search_facturas(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_facturas_updated_at() CASCADE;
DROP FUNCTION IF EXISTS create_presupuesto_transaction(UUID, TEXT, NUMERIC, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS search_presupuestos(TEXT, TEXT, INTEGER, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS find_or_create_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_dni_normalized() CASCADE;
DROP FUNCTION IF EXISTS move_work_order(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_work_order_counts() CASCADE;

-- ============================================
-- 2. ELIMINAR POLÍTICAS RLS DE STORAGE
-- ============================================

DROP POLICY IF EXISTS "Public Access to presupuestos PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload presupuestos PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update presupuestos PDFs" ON storage.objects;

-- ============================================
-- 3. ELIMINAR STORAGE BUCKET
-- ============================================

DELETE FROM storage.buckets WHERE id = 'presupuestos-pdfs';

-- ============================================
-- 4. ELIMINAR TABLAS (en orden inverso de dependencias)
-- ============================================

-- Primero las tablas dependientes
DROP TABLE IF EXISTS public.facturas_items CASCADE;
DROP TABLE IF EXISTS public.facturas CASCADE;
DROP TABLE IF EXISTS public.presupuesto_items CASCADE;
DROP TABLE IF EXISTS public.presupuestos CASCADE;
DROP TABLE IF EXISTS public.work_order_events CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;

-- ⚠️ CUIDADO: customers puede ser una tabla real de Nodexia
-- Solo descomentá esta línea si estás SEGURO que la tabla "customers"
-- fue creada por el script de Migliore y NO existía antes
-- DROP TABLE IF EXISTS public.customers CASCADE;

-- ============================================
-- VERIFICACIÓN CRÍTICA: TABLA PROFILES
-- ============================================
-- Nodexia tiene una tabla "profiles" original con columnas: id, name, type, cuit
-- Migliore creó una tabla "profiles" con columnas: id, email, full_name, role
-- 
-- EJECUTÁ ESTA QUERY PRIMERO PARA VERIFICAR:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND table_schema = 'public'
-- ORDER BY column_name;
--
-- Si ves: "cuit", "name", "type" → ES LA TABLA ORIGINAL DE NODEXIA - NO BORRAR
-- Si ves: "email", "full_name", "role" → ES LA TABLA DE MIGLIORE - BORRAR
-- Si ves AMBAS → el script de Migliore AGREGÓ columnas - CRISIS MAYOR
--
-- ⚠️ PELIGRO: Si la tabla profiles tiene la columna "cuit", NO EJECUTES ESTE DROP
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- 5. ELIMINAR TIPO ENUM
-- ============================================

DROP TYPE IF EXISTS order_status CASCADE;

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================

-- Verificar que no queden tablas del taller
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('facturas', 'facturas_items', 'presupuestos', 'presupuesto_items', 
                     'work_orders', 'work_order_events')
ORDER BY tablename;

-- Si el resultado está vacío, el rollback fue exitoso

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 
-- ⚠️ TABLAS COMENTADAS (customers, profiles):
-- Estas tablas pueden existir en Nodexia originalmente.
-- Antes de eliminarlas, ejecutá esta query para verificar:
--
-- SELECT table_name, 
--        (SELECT COUNT(*) FROM information_schema.columns 
--         WHERE table_name = pt.tablename) as column_count
-- FROM pg_tables pt
-- WHERE schemaname = 'public' 
--   AND tablename IN ('customers', 'profiles');
--
-- Si "customers" tiene columnas relacionadas con transporte/empresas de Nodexia
-- (NO dni_normalized, cuit, address, city, zip, province), entonces NO LA BORRES.
--
-- Si "profiles" tiene columnas relacionadas con roles de Nodexia
-- (transportista, chofer, supervisor), entonces NO LA BORRES.
--
-- ============================================
