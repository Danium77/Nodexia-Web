-- =============================================
-- VERIFICACIÓN DE TABLAS NUEVAS
-- =============================================

-- Ver todas las tablas del schema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Ver columnas de destinos (si existe)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'destinos' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver columnas de origenes (si existe)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'origenes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver columnas de planta_transportes (si existe)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'planta_transportes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver columnas de ofertas_red_nodexia (si existe)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ofertas_red_nodexia' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
