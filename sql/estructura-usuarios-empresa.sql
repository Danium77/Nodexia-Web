-- Ver estructura real de usuarios_empresa
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios_empresa'
ORDER BY ordinal_position;
