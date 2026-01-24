-- Verificar tablas que contienen "relacion" en el nombre
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE '%relacion%'
ORDER BY table_name;

-- Ver todas las tablas principales
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
