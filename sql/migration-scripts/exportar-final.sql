-- ===========================================
-- EXPORTAR DATOS PRODUCCIÓN → DEV (FINAL)
-- ===========================================
-- Ejecutar en Supabase PRODUCCIÓN
-- Copia cada resultado y ejecútalo en DEV
-- ===========================================

-- =============================================
-- 1. EMPRESAS (30 registros)
-- =============================================
SELECT string_agg(
  'INSERT INTO public.empresas (id, nombre, cuit, email, telefono, direccion, activa, tipo_empresa, localidad, provincia, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(COALESCE(nombre, '')) || ', ' ||
  quote_literal(COALESCE(cuit, '')) || ', ' ||
  quote_literal(COALESCE(email, '')) || ', ' ||
  quote_literal(COALESCE(telefono, '')) || ', ' ||
  quote_literal(COALESCE(direccion, '')) || ', ' ||
  COALESCE(activa::text, 'true') || ', ' ||
  quote_literal(COALESCE(tipo_empresa, 'planta')) || ', ' ||
  quote_literal(COALESCE(localidad, '')) || ', ' ||
  quote_literal(COALESCE(provincia, '')) || ', ' ||
  'now()) ON CONFLICT (id) DO NOTHING;',
  E'\n'
) as empresas_sql
FROM public.empresas;

-- =============================================
-- 2. RELACIONES_EMPRESAS (15 registros)
-- =============================================
SELECT string_agg(
  'INSERT INTO public.relaciones_empresas (id, empresa_cliente_id, empresa_transporte_id, estado, fecha_inicio, condiciones) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(empresa_cliente_id::text) || '::uuid, ' ||
  quote_literal(empresa_transporte_id::text) || '::uuid, ' ||
  quote_literal(COALESCE(estado, 'activa')) || ', ' ||
  COALESCE(quote_literal(fecha_inicio::text) || '::timestamp', 'now()') || ', ' ||
  quote_literal(COALESCE(condiciones, '')) || ') ON CONFLICT (id) DO NOTHING;',
  E'\n'
) as relaciones_sql
FROM public.relaciones_empresas;

-- =============================================
-- 3. CAMIONES (11 registros)
-- =============================================
SELECT string_agg(
  'INSERT INTO public.camiones (id, patente, marca, modelo, anio, foto_url, id_transporte, fecha_alta) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(COALESCE(patente, '')) || ', ' ||
  quote_literal(COALESCE(marca, '')) || ', ' ||
  quote_literal(COALESCE(modelo, '')) || ', ' ||
  COALESCE(anio::text, 'NULL') || ', ' ||
  quote_literal(COALESCE(foto_url, '')) || ', ' ||
  quote_literal(id_transporte::text) || '::uuid, ' ||
  'now()) ON CONFLICT (id) DO NOTHING;',
  E'\n'
) as camiones_sql
FROM public.camiones;

-- =============================================
-- 4. ACOPLADOS (8 registros)
-- =============================================
SELECT string_agg(
  'INSERT INTO public.acoplados (id, patente, marca, modelo, anio, foto_url, id_transporte, fecha_alta) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(COALESCE(patente, '')) || ', ' ||
  quote_literal(COALESCE(marca, '')) || ', ' ||
  quote_literal(COALESCE(modelo, '')) || ', ' ||
  COALESCE(anio::text, 'NULL') || ', ' ||
  quote_literal(COALESCE(foto_url, '')) || ', ' ||
  quote_literal(id_transporte::text) || '::uuid, ' ||
  'now()) ON CONFLICT (id) DO NOTHING;',
  E'\n'
) as acoplados_sql
FROM public.acoplados;

-- =============================================
-- 5. CHOFERES (30 registros)
-- =============================================
SELECT string_agg(
  'INSERT INTO public.choferes (id, nombre, apellido, dni, telefono, email, foto_url, id_transporte, fecha_alta) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(COALESCE(nombre, '')) || ', ' ||
  quote_literal(COALESCE(apellido, '')) || ', ' ||
  quote_literal(COALESCE(dni, '')) || ', ' ||
  quote_literal(COALESCE(telefono, '')) || ', ' ||
  quote_literal(COALESCE(email, '')) || ', ' ||
  quote_literal(COALESCE(foto_url, '')) || ', ' ||
  quote_literal(id_transporte::text) || '::uuid, ' ||
  'now()) ON CONFLICT (id) DO NOTHING;',
  E'\n'
) as choferes_sql
FROM public.choferes;

-- =============================================
-- 6. VIAJES_DESPACHO (4 registros)
-- =============================================
SELECT string_agg(
  'INSERT INTO public.viajes_despacho (id, despacho_id, numero_viaje, id_transporte, id_camion, id_acoplado, id_chofer, estado, fecha_creacion) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  COALESCE(quote_literal(despacho_id::text) || '::uuid', 'NULL') || ', ' ||
  COALESCE(numero_viaje::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(id_transporte::text) || '::uuid', 'NULL') || ', ' ||
  COALESCE(quote_literal(id_camion::text) || '::uuid', 'NULL') || ', ' ||
  COALESCE(quote_literal(id_acoplado::text) || '::uuid', 'NULL') || ', ' ||
  COALESCE(quote_literal(id_chofer::text) || '::uuid', 'NULL') || ', ' ||
  quote_literal(COALESCE(estado, 'pendiente')) || ', ' ||
  'now()) ON CONFLICT (id) DO NOTHING;',
  E'\n'
) as viajes_sql
FROM public.viajes_despacho;
