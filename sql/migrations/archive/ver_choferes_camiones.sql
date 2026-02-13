-- Ver choferes disponibles
SELECT 
  ch.id as chofer_id,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer_completo,
  ch.dni,
  e.id as empresa_id,
  e.nombre as empresa
FROM choferes ch
JOIN empresas e ON e.id = ch.empresa_id
ORDER BY e.nombre, ch.nombre;

-- Ver camiones disponibles
SELECT 
  ca.id as camion_id,
  ca.patente,
  COALESCE(ca.marca || ' ' || ca.modelo, ca.marca, 'Sin modelo') as modelo,
  e.id as empresa_id,
  e.nombre as empresa
FROM camiones ca
JOIN empresas e ON e.id = ca.empresa_id
ORDER BY e.nombre, ca.patente;
