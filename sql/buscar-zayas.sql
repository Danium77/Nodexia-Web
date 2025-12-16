-- Ver usuarios en usuarios_empresa que contengan "zayas"
SELECT 
  user_id,
  nombre_completo,
  rol_interno,
  activo,
  telefono_interno,
  empresa_id
FROM usuarios_empresa
WHERE LOWER(nombre_completo) LIKE '%zayas%';
