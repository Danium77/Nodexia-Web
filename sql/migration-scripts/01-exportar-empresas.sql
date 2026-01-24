-- ===========================================
-- MIGRACIÓN COMPLETA: PROD → DEV
-- ===========================================
-- EJECUTAR EN SUPABASE PRODUCCIÓN
-- Genera INSERTs para copiar a DEV
-- ===========================================

-- =====================
-- 1. EMPRESAS (30 registros)
-- =====================
SELECT string_agg(
  'INSERT INTO public.empresas (id, nombre, cuit, tipo, direccion, localidad, provincia, telefono, email, activo, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(COALESCE(nombre, '')) || ', ' ||
  quote_literal(COALESCE(cuit, '')) || ', ' ||
  quote_literal(COALESCE(tipo, '')) || ', ' ||
  quote_literal(COALESCE(direccion, '')) || ', ' ||
  quote_literal(COALESCE(localidad, '')) || ', ' ||
  quote_literal(COALESCE(provincia, '')) || ', ' ||
  quote_literal(COALESCE(telefono, '')) || ', ' ||
  quote_literal(COALESCE(email, '')) || ', ' ||
  COALESCE(activo::text, 'true') || ', ' ||
  quote_literal(COALESCE(created_at::text, now()::text)) || '::timestamptz);',
  E'\n'
) as empresas_inserts
FROM public.empresas;
