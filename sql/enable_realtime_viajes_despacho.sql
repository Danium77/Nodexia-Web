-- Habilitar Realtime en viajes_despacho para que las suscripciones funcionen

-- 1. Habilitar realtime en la tabla viajes_despacho
ALTER publication supabase_realtime ADD TABLE viajes_despacho;

-- 2. Verificar que RLS permite lectura para usuarios autenticados
-- (Ya debería estar configurado, pero verificamos)

-- Nota: Este comando debe ejecutarse en Supabase SQL Editor
-- Las suscripciones realtime solo funcionan si:
-- 1. La tabla está en la publicación supabase_realtime
-- 2. Las policies RLS permiten SELECT para el usuario
-- 3. El canal está correctamente configurado en el código

SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
