-- ============================================
-- AUDITORÍA DE ESQUEMA - Ejecutar en AMBAS BDs
-- Copiar el resultado completo para comparar
-- ============================================

-- 1. TABLAS: nombre, columnas, tipos
SELECT 
  '--- TABLAS ---' as seccion;

SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- 2. ÍNDICES
SELECT 
  '--- INDICES ---' as seccion;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. FUNCIONES
SELECT 
  '--- FUNCIONES ---' as seccion;

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. TRIGGERS
SELECT 
  '--- TRIGGERS ---' as seccion;

SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 5. POLÍTICAS RLS
SELECT 
  '--- POLITICAS RLS ---' as seccion;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. RESUMEN RÁPIDO: solo nombres de tablas
SELECT 
  '--- RESUMEN TABLAS ---' as seccion;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
