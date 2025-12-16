-- Ver estructura de roles_empresa
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'roles_empresa'
ORDER BY ordinal_position;

-- Ver roles existentes
SELECT * FROM roles_empresa LIMIT 5;
