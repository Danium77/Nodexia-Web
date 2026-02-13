-- ============================================================================
-- CONSULTAS DE VERIFICACIÓN - MIGRACIÓN 017
-- ============================================================================

-- 1️⃣ Ver cuántas unidades se crearon
SELECT 
  COUNT(*) as total_unidades,
  COUNT(CASE WHEN activo THEN 1 END) as activas,
  COUNT(DISTINCT empresa_id) as empresas_con_unidades
FROM unidades_operativas;

-- 2️⃣ Listar unidades creadas con detalles
SELECT 
  e.nombre as empresa,
  uo.codigo,
  uo.nombre as unidad,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer,
  ca.patente as camion,
  COALESCE(ac.patente, 'Sin acoplado') as acoplado,
  uo.notas
FROM unidades_operativas uo
JOIN empresas e ON e.id = uo.empresa_id
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE uo.activo = true
ORDER BY e.nombre, uo.codigo;

-- 3️⃣ Ver disponibilidad de unidades
SELECT 
  codigo,
  nombre,
  chofer_nombre_completo,
  camion_patente,
  necesita_descanso_obligatorio,
  TO_CHAR(proxima_hora_disponible, 'DD/MM/YYYY HH24:MI') as disponible_desde,
  COALESCE((ultimo_viaje->>'destino')::TEXT, 'Sin ubicación conocida') as ultima_ubicacion
FROM vista_disponibilidad_unidades
ORDER BY codigo;

-- 4️⃣ Estado de coordenadas en ubicaciones
SELECT 
  COUNT(*) as total_ubicaciones,
  COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END) as con_coordenadas_completas,
  COUNT(CASE WHEN latitud IS NULL OR longitud IS NULL THEN 1 END) as sin_coordenadas,
  ROUND(
    COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as porcentaje_con_coordenadas
FROM ubicaciones;

-- 5️⃣ Ubicaciones sin coordenadas (primeras 20)
SELECT 
  id, 
  nombre, 
  COALESCE(ciudad, 'Sin ciudad') as ciudad,
  COALESCE(provincia, 'Sin provincia') as provincia,
  COALESCE(direccion, 'Sin dirección') as direccion
FROM ubicaciones
WHERE latitud IS NULL OR longitud IS NULL
ORDER BY nombre
LIMIT 20;

-- 6️⃣ Verificar RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'unidades_operativas'
ORDER BY policyname;
