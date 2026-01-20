-- ===========================================
-- SCRIPT COMPLETO: Exportar TODOS los datos
-- Ejecutar en Supabase PRODUCCIÓN
-- ===========================================
-- Este script genera INSERTs listos para ejecutar
-- en el proyecto de desarrollo
-- ===========================================

DO $$
DECLARE
  r RECORD;
  sql_output TEXT := '';
BEGIN
  RAISE NOTICE '-- ===========================================';
  RAISE NOTICE '-- DATOS EXPORTADOS DE PRODUCCIÓN';
  RAISE NOTICE '-- Fecha: %', NOW();
  RAISE NOTICE '-- ===========================================';
  RAISE NOTICE '';
  
  -- EMPRESAS
  RAISE NOTICE '-- ========== EMPRESAS ==========';
  FOR r IN SELECT * FROM public.empresas LOOP
    RAISE NOTICE 'INSERT INTO public.empresas (id, nombre, cuit, tipo, direccion, localidad, provincia, telefono, email, activo, created_at) VALUES (%, %, %, %, %, %, %, %, %, %, %) ON CONFLICT (id) DO NOTHING;',
      quote_literal(r.id),
      quote_literal(r.nombre),
      quote_literal(COALESCE(r.cuit, '')),
      quote_literal(r.tipo),
      quote_literal(COALESCE(r.direccion, '')),
      quote_literal(COALESCE(r.localidad, '')),
      quote_literal(COALESCE(r.provincia, '')),
      quote_literal(COALESCE(r.telefono, '')),
      quote_literal(COALESCE(r.email, '')),
      r.activo,
      quote_literal(r.created_at);
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '-- ========== RELACIONES EMPRESAS ==========';
  FOR r IN SELECT * FROM public.relaciones_empresas LOOP
    RAISE NOTICE 'INSERT INTO public.relaciones_empresas (id, empresa_origen_id, empresa_destino_id, tipo_relacion, estado, created_at) VALUES (%, %, %, %, %, %) ON CONFLICT (id) DO NOTHING;',
      quote_literal(r.id),
      quote_literal(r.empresa_origen_id),
      quote_literal(r.empresa_destino_id),
      quote_literal(r.tipo_relacion),
      quote_literal(r.estado),
      quote_literal(r.created_at);
  END LOOP;
  
END $$;

-- Alternativa más simple: Exportar como JSON
SELECT jsonb_pretty(jsonb_agg(to_jsonb(e))) as empresas_json FROM public.empresas e;
SELECT jsonb_pretty(jsonb_agg(to_jsonb(r))) as relaciones_json FROM public.relaciones_empresas r;
SELECT jsonb_pretty(jsonb_agg(to_jsonb(c))) as camiones_json FROM public.camiones c;
SELECT jsonb_pretty(jsonb_agg(to_jsonb(a))) as acoplados_json FROM public.acoplados a;
SELECT jsonb_pretty(jsonb_agg(to_jsonb(ch))) as choferes_json FROM public.choferes ch;
SELECT jsonb_pretty(jsonb_agg(to_jsonb(v))) as viajes_json FROM public.viajes_despacho v;
