-- =====================================================
-- VERIFICACIÓN PRE-MIGRACIÓN
-- =====================================================
-- Ejecutar este script ANTES de 011_sistema_estados_duales.sql
-- para confirmar que todo está listo
-- =====================================================

\echo '🔍 VERIFICANDO PREREQUISITOS...'
\echo ''

-- =====================================================
-- 1. Verificar que existe tabla viajes_despacho
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'viajes_despacho'
  ) THEN
    RAISE NOTICE '✅ Tabla viajes_despacho existe';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tabla viajes_despacho NO existe. Ejecutar primero create-viajes-despacho-system.sql';
  END IF;
END $$;

-- =====================================================
-- 2. Verificar que existe tabla choferes
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'choferes'
  ) THEN
    RAISE NOTICE '✅ Tabla choferes existe';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tabla choferes NO existe. Ejecutar primero fix_choferes_table.sql';
  END IF;
END $$;

-- =====================================================
-- 3. Verificar que existe tabla despachos
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'despachos'
  ) THEN
    RAISE NOTICE '✅ Tabla despachos existe';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tabla despachos NO existe';
  END IF;
END $$;

-- =====================================================
-- 4. Verificar que existe tabla usuarios_empresa
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'usuarios_empresa'
  ) THEN
    RAISE NOTICE '✅ Tabla usuarios_empresa existe';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Tabla usuarios_empresa NO existe';
  END IF;
END $$;

-- =====================================================
-- 5. Contar registros existentes
-- =====================================================

DO $$
DECLARE
  v_count_viajes INTEGER;
  v_count_choferes INTEGER;
  v_count_despachos INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_viajes FROM viajes_despacho;
  SELECT COUNT(*) INTO v_count_choferes FROM choferes;
  SELECT COUNT(*) INTO v_count_despachos FROM despachos;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 CONTEO DE REGISTROS ACTUALES:';
  RAISE NOTICE '   - Despachos: %', v_count_despachos;
  RAISE NOTICE '   - Viajes: %', v_count_viajes;
  RAISE NOTICE '   - Choferes: %', v_count_choferes;
  RAISE NOTICE '';
  
  IF v_count_viajes > 0 THEN
    RAISE NOTICE '⚠️  ATENCIÓN: Existen % viajes. La migración creará estados para todos ellos.', v_count_viajes;
  END IF;
END $$;

-- =====================================================
-- 6. Verificar extensiones necesarias
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_extension WHERE extname = 'uuid-ossp'
  ) THEN
    RAISE NOTICE '✅ Extensión uuid-ossp instalada';
  ELSE
    RAISE WARNING '⚠️  Extensión uuid-ossp NO instalada (opcional)';
  END IF;
END $$;

-- =====================================================
-- 7. Verificar que NO existen las nuevas tablas
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'estado_unidad_viaje'
  ) THEN
    RAISE WARNING '⚠️  Tabla estado_unidad_viaje YA EXISTE - la migración la recreará';
  ELSE
    RAISE NOTICE '✅ Tabla estado_unidad_viaje no existe (correcto)';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'estado_carga_viaje'
  ) THEN
    RAISE WARNING '⚠️  Tabla estado_carga_viaje YA EXISTE - la migración la recreará';
  ELSE
    RAISE NOTICE '✅ Tabla estado_carga_viaje no existe (correcto)';
  END IF;
END $$;

-- =====================================================
-- 8. Verificar estructura de choferes
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'choferes'
    AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE '✅ Campo user_id YA EXISTE en choferes';
  ELSE
    RAISE NOTICE '📝 Campo user_id NO existe en choferes - será agregado por la migración';
  END IF;
END $$;

-- =====================================================
-- 9. Verificar permisos RLS
-- =====================================================

DO $$
DECLARE
  v_rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'viajes_despacho';
  
  IF v_rls_enabled THEN
    RAISE NOTICE '✅ RLS habilitado en viajes_despacho';
  ELSE
    RAISE NOTICE '📝 RLS NO habilitado en viajes_despacho - se configurará';
  END IF;
END $$;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICACIÓN COMPLETADA';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '   1. Revisar advertencias arriba (si las hay)';
  RAISE NOTICE '   2. Ejecutar: sql/migrations/011_sistema_estados_duales.sql';
  RAISE NOTICE '   3. Ejecutar: sql/funciones_estados.sql';
  RAISE NOTICE '   4. Verificar con: SELECT * FROM vista_estado_viaje_completo LIMIT 5;';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Hacer backup de la base de datos antes de migrar';
  RAISE NOTICE '';
END $$;
