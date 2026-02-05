-- ============================================
-- VERIFICACIÓN PRE-ROLLBACK
-- ============================================
-- Ejecutá estas queries ANTES de ejecutar el rollback
-- para determinar qué es seguro eliminar
-- ============================================

-- ============================================
-- 1. VERIFICAR ESTRUCTURA DE TABLA PROFILES
-- ============================================

SELECT 
  'profiles' as tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- INTERPRETACIÓN:
-- Si ves columnas: id, name, type, cuit, created_at 
--   → ES LA TABLA ORIGINAL DE NODEXIA - NO BORRAR
--
-- Si ves columnas: id, email, full_name, role, created_at
--   → ES LA TABLA DE MIGLIORE (el script hizo IF NOT EXISTS y la creó) - SEGURO BORRAR
--
-- Si ves AMBAS MEZCLADAS:
--   → CRISIS: el script agregó columnas a tabla existente - necesitás recovery manual

-- ============================================
-- 2. VERIFICAR SI EXISTE TABLA CUSTOMERS Y SU CONTENIDO
-- ============================================

-- Ver estructura de customers
SELECT 
  'customers' as tabla,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver cuántos registros tiene
SELECT 
  'customers' as tabla,
  COUNT(*) as cantidad_registros
FROM customers;

-- INTERPRETACIÓN:
-- Si tiene columnas: dni_normalized, cuit, address, city, zip, province
--   → ES DE MIGLIORE - SEGURO BORRAR
--
-- Si tiene datos importantes de Nodexia:
--   → NO BORRAR - verificar manualmente

-- ============================================
-- 3. LISTAR TODAS LAS TABLAS SOSPECHOSAS
-- ============================================

SELECT 
  tablename,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_name = pt.tablename 
     AND table_schema = 'public') as cantidad_columnas
FROM pg_tables pt
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles',
    'customers',
    'work_orders',
    'work_order_events',
    'presupuestos',
    'presupuesto_items',
    'facturas',
    'facturas_items'
  )
ORDER BY tablename;

-- RESULTADO ESPERADO:
-- work_orders, work_order_events, presupuestos, presupuesto_items, 
-- facturas, facturas_items → DEFINITIVAMENTE DE MIGLIORE - SEGURO BORRAR

-- ============================================
-- 4. VERIFICAR FUNCIONES RPC CREADAS
-- ============================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'search_facturas',
    'update_facturas_updated_at',
    'create_presupuesto_transaction',
    'search_presupuestos',
    'find_or_create_customer',
    'set_dni_normalized',
    'move_work_order',
    'get_work_order_counts'
  )
ORDER BY routine_name;

-- Todas estas funciones son de Migliore - seguro eliminar

-- ============================================
-- 5. VERIFICAR TIPO ENUM order_status
-- ============================================

SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Si existe, es de Migliore - seguro eliminar

-- ============================================
-- DECISIÓN FINAL:
-- ============================================
-- 
-- ✅ SEGURO ELIMINAR (100% de Migliore):
--    - work_orders
--    - work_order_events
--    - presupuestos
--    - presupuesto_items
--    - facturas
--    - facturas_items
--    - order_status (tipo enum)
--    - Todas las funciones RPC listadas arriba
--
-- ⚠️ VERIFICAR MANUALMENTE:
--    - profiles (puede ser original de Nodexia)
--    - customers (puede ser original de Nodexia)
--
-- Una vez verificado, ejecutá el script:
-- ROLLBACK-migliore-diesel-accidental.sql
-- ============================================
