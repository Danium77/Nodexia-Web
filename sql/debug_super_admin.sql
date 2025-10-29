-- Verificar registros duplicados en super_admins
SELECT 
  user_id,
  email,
  activo,
  created_at,
  COUNT(*) as cantidad
FROM super_admins
WHERE email = 'admin.demo@nodexia.com'
GROUP BY user_id, email, activo, created_at
ORDER BY created_at DESC;

-- Si hay duplicados, ver todos
SELECT * FROM super_admins 
WHERE email = 'admin.demo@nodexia.com'
ORDER BY created_at DESC;
