-- Verificar vista de disponibilidad de unidades
SELECT 
  codigo,
  nombre,
  chofer_nombre,
  camion_patente,
  acoplado_patente,
  activo,
  horas_conducidas_hoy,
  necesita_descanso_obligatorio,
  CASE 
    WHEN necesita_descanso_obligatorio THEN '🛑 Descanso obligatorio'
    WHEN horas_conducidas_hoy >= 7 THEN '⚠️ Cerca del límite'
    ELSE '✅ Disponible'
  END as estado_legible
FROM vista_disponibilidad_unidades
WHERE empresa_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY codigo;
