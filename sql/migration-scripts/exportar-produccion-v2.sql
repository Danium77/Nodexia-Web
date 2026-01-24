-- ===========================================
-- EXPORTAR DATOS DE PRODUCCIÓN (CORREGIDO)
-- ===========================================
-- Ejecutar en Supabase PRODUCCIÓN
-- Copia los resultados y ejecútalos en DEV
-- ===========================================

-- =============================================
-- PARTE 1: EMPRESAS
-- =============================================
SELECT 
  '-- EMPRESAS (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.empresas (id, nombre, cuit, email, telefono, direccion, activo, tipo_empresa, localidad, provincia, notas, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(COALESCE(nombre, '')) || ', ' ||
    quote_literal(COALESCE(cuit, '')) || ', ' ||
    quote_literal(COALESCE(email, '')) || ', ' ||
    quote_literal(COALESCE(telefono, '')) || ', ' ||
    quote_literal(COALESCE(direccion, '')) || ', ' ||
    COALESCE(activo::text, 'true') || ', ' ||
    quote_literal(COALESCE(tipo_empresa, 'planta')) || ', ' ||
    quote_literal(COALESCE(localidad, '')) || ', ' ||
    quote_literal(COALESCE(provincia, '')) || ', ' ||
    quote_literal(COALESCE(notas, '')) || ', ' ||
    'now()) ON CONFLICT (id) DO NOTHING;',
    E'\n'
  ) as sql_empresas
FROM public.empresas;

-- =============================================
-- PARTE 2: RELACIONES EMPRESAS
-- =============================================
SELECT 
  '-- RELACIONES_EMPRESAS (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.relaciones_empresas (id, empresa_origen_id, empresa_destino_id, tipo_relacion, estado, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(empresa_origen_id::text) || '::uuid, ' ||
    quote_literal(empresa_destino_id::text) || '::uuid, ' ||
    quote_literal(COALESCE(tipo_relacion, 'cliente')) || ', ' ||
    quote_literal(COALESCE(estado, 'activa')) || ', ' ||
    'now()) ON CONFLICT (id) DO NOTHING;',
    E'\n'
  ) as sql_relaciones
FROM public.relaciones_empresas;

-- =============================================
-- PARTE 3: CAMIONES - Primero ver estructura
-- =============================================
SELECT column_name FROM information_schema.columns WHERE table_name = 'camiones' ORDER BY ordinal_position;

-- =============================================
-- PARTE 4: ACOPLADOS - Primero ver estructura  
-- =============================================
SELECT column_name FROM information_schema.columns WHERE table_name = 'acoplados' ORDER BY ordinal_position;

-- =============================================
-- PARTE 5: CHOFERES - Primero ver estructura
-- =============================================
SELECT column_name FROM information_schema.columns WHERE table_name = 'choferes' ORDER BY ordinal_position;

-- =============================================
-- PARTE 6: VIAJES_DESPACHO - Primero ver estructura
-- =============================================
SELECT column_name FROM information_schema.columns WHERE table_name = 'viajes_despacho' ORDER BY ordinal_position;
