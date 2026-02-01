-- Verificar nombre exacto de la empresa
SELECT id, nombre, tipo_empresa
FROM empresas
WHERE nombre ILIKE '%logistica%' OR nombre ILIKE '%express%'
ORDER BY nombre;
