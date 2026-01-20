-- ===========================================
-- SCRIPT: Exportar Datos de Producción
-- Para importar en entorno DEV
-- ===========================================
-- PASO 1: Ejecuta este script en PRODUCCIÓN (Supabase actual)
-- PASO 2: Copia los resultados
-- PASO 3: Ejecuta en el proyecto DEV
-- ===========================================

-- ========================================
-- INSTRUCCIONES:
-- ========================================
-- 1. Ve a Supabase PRODUCCIÓN → SQL Editor
-- 2. Ejecuta la query de la sección que necesites
-- 3. Click en "Export" → "CSV" o copia los INSERT generados
-- 4. Pega en Supabase DEV
-- ========================================

-- ========================================
-- EXPORTAR: EMPRESAS
-- ========================================
SELECT 
  'INSERT INTO public.empresas (id, nombre, cuit, tipo, direccion, localidad, provincia, telefono, email, activo, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(nombre) || ', ' ||
  quote_literal(COALESCE(cuit, '')) || ', ' ||
  quote_literal(tipo) || ', ' ||
  quote_literal(COALESCE(direccion, '')) || ', ' ||
  quote_literal(COALESCE(localidad, '')) || ', ' ||
  quote_literal(COALESCE(provincia, '')) || ', ' ||
  quote_literal(COALESCE(telefono, '')) || ', ' ||
  quote_literal(COALESCE(email, '')) || ', ' ||
  activo || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.empresas;

-- ========================================
-- EXPORTAR: ROLES_EMPRESA
-- ========================================
SELECT 
  'INSERT INTO public.roles_empresa (id, nombre, descripcion, permisos) VALUES (' ||
  id || ', ' ||
  quote_literal(nombre) || ', ' ||
  quote_literal(COALESCE(descripcion, '')) || ', ' ||
  quote_literal(COALESCE(permisos::text, '{}')) || '::jsonb) ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.roles_empresa;

-- ========================================
-- EXPORTAR: RELACIONES_EMPRESAS
-- ========================================
SELECT 
  'INSERT INTO public.relaciones_empresas (id, empresa_origen_id, empresa_destino_id, tipo_relacion, estado, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(empresa_origen_id) || ', ' ||
  quote_literal(empresa_destino_id) || ', ' ||
  quote_literal(tipo_relacion) || ', ' ||
  quote_literal(estado) || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.relaciones_empresas;

-- ========================================
-- EXPORTAR: CAMIONES
-- ========================================
SELECT 
  'INSERT INTO public.camiones (id, id_transporte, patente, marca, modelo, anio, capacidad_kg, tipo, estado, documentacion_ok, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(id_transporte) || ', ' ||
  quote_literal(patente) || ', ' ||
  quote_literal(COALESCE(marca, '')) || ', ' ||
  quote_literal(COALESCE(modelo, '')) || ', ' ||
  COALESCE(anio::text, 'NULL') || ', ' ||
  COALESCE(capacidad_kg::text, 'NULL') || ', ' ||
  quote_literal(COALESCE(tipo, '')) || ', ' ||
  quote_literal(COALESCE(estado, 'disponible')) || ', ' ||
  COALESCE(documentacion_ok::text, 'false') || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.camiones;

-- ========================================
-- EXPORTAR: ACOPLADOS
-- ========================================
SELECT 
  'INSERT INTO public.acoplados (id, id_transporte, patente, tipo, capacidad_kg, estado, documentacion_ok, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(id_transporte) || ', ' ||
  quote_literal(patente) || ', ' ||
  quote_literal(COALESCE(tipo, '')) || ', ' ||
  COALESCE(capacidad_kg::text, 'NULL') || ', ' ||
  quote_literal(COALESCE(estado, 'disponible')) || ', ' ||
  COALESCE(documentacion_ok::text, 'false') || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.acoplados;

-- ========================================
-- EXPORTAR: CHOFERES (sin user_id - se vinculará después)
-- ========================================
SELECT 
  'INSERT INTO public.choferes (id, id_transporte, nombre, apellido, dni, licencia, telefono, email, estado, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(id_transporte) || ', ' ||
  quote_literal(nombre) || ', ' ||
  quote_literal(apellido) || ', ' ||
  quote_literal(dni) || ', ' ||
  quote_literal(COALESCE(licencia, '')) || ', ' ||
  quote_literal(COALESCE(telefono, '')) || ', ' ||
  quote_literal(COALESCE(email, '')) || ', ' ||
  quote_literal(COALESCE(estado, 'disponible')) || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.choferes;

-- ========================================
-- EXPORTAR: UBICACIONES (si existe la tabla)
-- ========================================
-- SELECT 
--   'INSERT INTO public.ubicaciones ...' 
-- FROM public.ubicaciones;

-- ========================================
-- EXPORTAR: VIAJES_DESPACHO
-- ========================================
SELECT 
  'INSERT INTO public.viajes_despacho (id, codigo, empresa_id, transport_id, camion_id, acoplado_id, chofer_id, origen, destino, producto, cantidad, unidad, observaciones, fecha_carga, fecha_entrega, estado, estado_tracking, tipo, prioridad, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(codigo) || ', ' ||
  quote_literal(empresa_id) || ', ' ||
  COALESCE(quote_literal(transport_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(camion_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(acoplado_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(chofer_id), 'NULL') || ', ' ||
  quote_literal(COALESCE(origen, '')) || ', ' ||
  quote_literal(COALESCE(destino, '')) || ', ' ||
  quote_literal(COALESCE(producto, '')) || ', ' ||
  COALESCE(cantidad::text, 'NULL') || ', ' ||
  quote_literal(COALESCE(unidad, '')) || ', ' ||
  quote_literal(COALESCE(observaciones, '')) || ', ' ||
  quote_literal(fecha_carga) || ', ' ||
  COALESCE(quote_literal(fecha_entrega), 'NULL') || ', ' ||
  quote_literal(COALESCE(estado, 'pendiente')) || ', ' ||
  quote_literal(COALESCE(estado_tracking, 'sin_iniciar')) || ', ' ||
  quote_literal(COALESCE(tipo, 'normal')) || ', ' ||
  quote_literal(COALESCE(prioridad, 'normal')) || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.viajes_despacho;

-- ========================================
-- EXPORTAR: OFERTAS_VIAJE
-- ========================================
SELECT 
  'INSERT INTO public.ofertas_viaje (id, viaje_id, transporte_id, estado, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(viaje_id) || ', ' ||
  quote_literal(transporte_id) || ', ' ||
  quote_literal(estado) || ', ' ||
  quote_literal(created_at) || ') ON CONFLICT (id) DO NOTHING;' as sql_insert
FROM public.ofertas_viaje;
