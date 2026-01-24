-- Verificar estructura de relaciones_empresas
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'relaciones_empresas'
ORDER BY ordinal_position;

-- Verificar estructura de empresas
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'empresas'
ORDER BY ordinal_position;

-- Verificar estructura de usuarios_empresa
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'usuarios_empresa'
ORDER BY ordinal_position;
