-- ===========================================
-- SCRIPT ÚNICO: Exportar TODO para DEV
-- ===========================================
-- INSTRUCCIONES:
-- 1. Copia este script COMPLETO
-- 2. Ejecútalo en Supabase PRODUCCIÓN → SQL Editor  
-- 3. Copia TODOS los resultados (cada celda tiene INSERTs)
-- 4. Pega en Supabase DEV → SQL Editor
-- 5. Ejecuta
-- ===========================================

-- =============================================
-- PARTE 1: EMPRESAS
-- =============================================
SELECT 
  '-- EMPRESAS (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.empresas (id, nombre, cuit, tipo, direccion, localidad, provincia, telefono, email, activo, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(COALESCE(nombre, '')) || ', ' ||
    quote_literal(COALESCE(cuit, '')) || ', ' ||
    quote_literal(COALESCE(tipo, 'planta')) || ', ' ||
    quote_literal(COALESCE(direccion, '')) || ', ' ||
    quote_literal(COALESCE(localidad, '')) || ', ' ||
    quote_literal(COALESCE(provincia, '')) || ', ' ||
    quote_literal(COALESCE(telefono, '')) || ', ' ||
    quote_literal(COALESCE(email, '')) || ', ' ||
    COALESCE(activo::text, 'true') || ', ' ||
    'now());',
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
    'now());',
    E'\n'
  ) as sql_relaciones
FROM public.relaciones_empresas;

-- =============================================
-- PARTE 3: CAMIONES
-- =============================================
SELECT 
  '-- CAMIONES (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.camiones (id, id_transporte, patente, marca, modelo, anio, capacidad_kg, tipo, estado, documentacion_ok, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(id_transporte::text) || '::uuid, ' ||
    quote_literal(COALESCE(patente, '')) || ', ' ||
    quote_literal(COALESCE(marca, '')) || ', ' ||
    quote_literal(COALESCE(modelo, '')) || ', ' ||
    COALESCE(anio::text, 'NULL') || ', ' ||
    COALESCE(capacidad_kg::text, 'NULL') || ', ' ||
    quote_literal(COALESCE(tipo, '')) || ', ' ||
    quote_literal(COALESCE(estado, 'disponible')) || ', ' ||
    COALESCE(documentacion_ok::text, 'false') || ', ' ||
    'now());',
    E'\n'
  ) as sql_camiones
FROM public.camiones;

-- =============================================
-- PARTE 4: ACOPLADOS
-- =============================================
SELECT 
  '-- ACOPLADOS (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.acoplados (id, id_transporte, patente, tipo, capacidad_kg, estado, documentacion_ok, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(id_transporte::text) || '::uuid, ' ||
    quote_literal(COALESCE(patente, '')) || ', ' ||
    quote_literal(COALESCE(tipo, '')) || ', ' ||
    COALESCE(capacidad_kg::text, 'NULL') || ', ' ||
    quote_literal(COALESCE(estado, 'disponible')) || ', ' ||
    COALESCE(documentacion_ok::text, 'false') || ', ' ||
    'now());',
    E'\n'
  ) as sql_acoplados
FROM public.acoplados;

-- =============================================
-- PARTE 5: CHOFERES (sin user_id - se vincula después)
-- =============================================
SELECT 
  '-- CHOFERES (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.choferes (id, id_transporte, nombre, apellido, dni, licencia, telefono, email, estado, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(id_transporte::text) || '::uuid, ' ||
    quote_literal(COALESCE(nombre, '')) || ', ' ||
    quote_literal(COALESCE(apellido, '')) || ', ' ||
    quote_literal(COALESCE(dni, '')) || ', ' ||
    quote_literal(COALESCE(licencia, '')) || ', ' ||
    quote_literal(COALESCE(telefono, '')) || ', ' ||
    quote_literal(COALESCE(email, '')) || ', ' ||
    quote_literal(COALESCE(estado, 'disponible')) || ', ' ||
    'now());',
    E'\n'
  ) as sql_choferes
FROM public.choferes;

-- =============================================
-- PARTE 6: VIAJES_DESPACHO
-- =============================================
SELECT 
  '-- VIAJES_DESPACHO (' || COUNT(*) || ' registros)' || E'\n' ||
  string_agg(
    'INSERT INTO public.viajes_despacho (id, codigo, empresa_id, transport_id, camion_id, acoplado_id, chofer_id, origen, destino, producto, cantidad, unidad, observaciones, fecha_carga, estado, estado_tracking, tipo, prioridad, created_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(COALESCE(codigo, 'DSP-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random()*1000)::text)) || ', ' ||
    quote_literal(empresa_id::text) || '::uuid, ' ||
    COALESCE(quote_literal(transport_id::text) || '::uuid', 'NULL') || ', ' ||
    COALESCE(quote_literal(camion_id::text) || '::uuid', 'NULL') || ', ' ||
    COALESCE(quote_literal(acoplado_id::text) || '::uuid', 'NULL') || ', ' ||
    COALESCE(quote_literal(chofer_id::text) || '::uuid', 'NULL') || ', ' ||
    quote_literal(COALESCE(origen, '')) || ', ' ||
    quote_literal(COALESCE(destino, '')) || ', ' ||
    quote_literal(COALESCE(producto, '')) || ', ' ||
    COALESCE(cantidad::text, 'NULL') || ', ' ||
    quote_literal(COALESCE(unidad, '')) || ', ' ||
    quote_literal(COALESCE(observaciones, '')) || ', ' ||
    quote_literal(COALESCE(fecha_carga::text, now()::date::text)) || '::date, ' ||
    quote_literal(COALESCE(estado, 'pendiente')) || ', ' ||
    quote_literal(COALESCE(estado_tracking, 'sin_iniciar')) || ', ' ||
    quote_literal(COALESCE(tipo, 'normal')) || ', ' ||
    quote_literal(COALESCE(prioridad, 'normal')) || ', ' ||
    'now());',
    E'\n'
  ) as sql_viajes
FROM public.viajes_despacho;
