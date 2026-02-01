-- Ver camiones de Logística Express con IDs reales
SELECT 
  ca.id,
  ca.patente,
  ca.marca || ' ' || ca.modelo as modelo
FROM camiones ca
WHERE ca.empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY ca.patente;
