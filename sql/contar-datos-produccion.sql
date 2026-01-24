-- ===========================================
-- EXPORTAR DATOS DE PRODUCCIÓN A DEV
-- ===========================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase PRODUCCIÓN
-- 2. Por cada tabla, haz click en "Export" → "Download CSV"
-- 3. En Supabase DEV, ve a Table Editor → Import CSV
-- ===========================================

-- PASO 1: Ver qué datos tienes
SELECT 'empresas' as tabla, COUNT(*) as registros FROM public.empresas
UNION ALL SELECT 'relaciones_empresas', COUNT(*) FROM public.relaciones_empresas
UNION ALL SELECT 'usuarios_empresa', COUNT(*) FROM public.usuarios_empresa
UNION ALL SELECT 'camiones', COUNT(*) FROM public.camiones
UNION ALL SELECT 'acoplados', COUNT(*) FROM public.acoplados
UNION ALL SELECT 'choferes', COUNT(*) FROM public.choferes
UNION ALL SELECT 'viajes_despacho', COUNT(*) FROM public.viajes_despacho
UNION ALL SELECT 'ofertas_viaje', COUNT(*) FROM public.ofertas_viaje
ORDER BY registros DESC;
