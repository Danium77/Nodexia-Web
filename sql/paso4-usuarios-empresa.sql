-- 4. Vinculo en usuarios_empresa
SELECT *
FROM usuarios_empresa
WHERE email_interno = 'luis@centro.com.ar'
   OR nombre_completo ILIKE '%luis%martinez%';
