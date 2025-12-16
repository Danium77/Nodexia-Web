-- ============================================
-- ÍNDICES DE PERFORMANCE PARA RLS
-- ============================================
-- 
-- Estos índices optimizan las políticas RLS que creamos
-- para choferes, camiones y acoplados.
--
-- IMPORTANTE: Las políticas RLS hacen queries complejos
-- con JOINs y subqueries. Sin índices, pueden ser lentos
-- en producción con muchos datos.
--
-- ============================================

-- ============================================
-- ÍNDICES PARA VIAJES_DESPACHO
-- ============================================
-- Estos son críticos porque las políticas RLS los usan constantemente

-- Índice en id_chofer (usado en política SELECT de choferes)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id_chofer 
ON viajes_despacho(id_chofer) 
WHERE id_chofer IS NOT NULL;

-- Índice en id_camion (usado en política SELECT de camiones)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id_camion 
ON viajes_despacho(id_camion) 
WHERE id_camion IS NOT NULL;

-- Índice en id_acoplado (usado en política SELECT de acoplados)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id_acoplado 
ON viajes_despacho(id_acoplado) 
WHERE id_acoplado IS NOT NULL;

-- Índice en id_transporte (usado en política SELECT)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_id_transporte 
ON viajes_despacho(id_transporte) 
WHERE id_transporte IS NOT NULL;

-- Índice en despacho_id (usado en JOINs de las políticas RLS)
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_despacho_id 
ON viajes_despacho(despacho_id);

-- ============================================
-- ÍNDICES PARA DESPACHOS
-- ============================================
-- Usado en las políticas RLS para verificar permisos

-- Índice en created_by (usado en política SELECT)
CREATE INDEX IF NOT EXISTS idx_despachos_created_by 
ON despachos(created_by);

-- Índice en transport_id (para queries de transportes)
CREATE INDEX IF NOT EXISTS idx_despachos_transport_id 
ON despachos(transport_id) 
WHERE transport_id IS NOT NULL;

-- ============================================
-- ÍNDICES PARA CHOFERES
-- ============================================

-- Índice en id_transporte (usado en política SELECT)
CREATE INDEX IF NOT EXISTS idx_choferes_id_transporte 
ON choferes(id_transporte);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_choferes_transporte_nombre 
ON choferes(id_transporte, nombre, apellido);

-- ============================================
-- ÍNDICES PARA CAMIONES
-- ============================================

-- Índice en id_transporte (usado en política SELECT)
CREATE INDEX IF NOT EXISTS idx_camiones_id_transporte 
ON camiones(id_transporte);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_camiones_transporte_patente 
ON camiones(id_transporte, patente);

-- ============================================
-- ÍNDICES PARA ACOPLADOS
-- ============================================

-- Índice en id_transporte (usado en política SELECT)
CREATE INDEX IF NOT EXISTS idx_acoplados_id_transporte 
ON acoplados(id_transporte);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_acoplados_transporte_patente 
ON acoplados(id_transporte, patente);

-- ============================================
-- ÍNDICES PARA USUARIOS_EMPRESA
-- ============================================
-- Crítico: Esta tabla se usa en TODAS las políticas RLS

-- Índice en user_id (usado en auth.uid() comparisons)
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_id 
ON usuarios_empresa(user_id);

-- Índice en empresa_id (usado en subqueries de políticas)
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_empresa_id 
ON usuarios_empresa(empresa_id);

-- Índice compuesto para políticas que verifican rol
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_rol 
ON usuarios_empresa(user_id, empresa_id, rol_interno);

-- ============================================
-- ANÁLISIS DE PERFORMANCE
-- ============================================

-- Ver tamaño de las tablas principales
SELECT 
  schemaname,
  relname as tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE relname IN ('choferes', 'camiones', 'acoplados', 'viajes_despacho', 'despachos', 'usuarios_empresa')
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- Ver índices creados
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname IN ('choferes', 'camiones', 'acoplados', 'viajes_despacho', 'despachos', 'usuarios_empresa')
ORDER BY relname, indexrelname;

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('choferes', 'camiones', 'acoplados', 'viajes_despacho', 'despachos', 'usuarios_empresa')
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE '✅ Total de índices de performance creados: %', index_count;
  
  IF index_count >= 15 THEN
    RAISE NOTICE '✅ Todos los índices críticos están creados';
  ELSE
    RAISE WARNING '⚠️ Faltan algunos índices. Verificar manualmente.';
  END IF;
END $$;
