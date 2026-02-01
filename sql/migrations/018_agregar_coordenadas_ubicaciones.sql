-- ============================================================================
-- AGREGAR COORDENADAS A UBICACIONES PRINCIPALES
-- ============================================================================
-- Fecha: 31 de Enero 2026
-- Propósito: Agregar coordenadas geográficas a ubicaciones existentes
--            para permitir cálculo de distancias en algoritmo de asignación
-- ============================================================================

-- Actualizar ubicaciones con coordenadas conocidas
UPDATE ubicaciones
SET 
  latitud = CASE nombre
    WHEN 'Aceitera San Miguel S.A' THEN -34.5779  -- San Martin, Buenos Aires
    WHEN 'Planta Rosario' THEN -32.9442            -- Rosario, Santa Fe
    WHEN 'Planta San Miguel' THEN -34.5779         -- San Miguel, Buenos Aires
    WHEN 'Puerto Buenos Aires' THEN -34.6037       -- Puerto Buenos Aires
    WHEN 'Tecnopack Zayas S.A' THEN -32.9442       -- Rosario, Santa Fe
    WHEN 'Terminal Zárate' THEN -34.0970           -- Zárate, Buenos Aires
    ELSE latitud
  END,
  longitud = CASE nombre
    WHEN 'Aceitera San Miguel S.A' THEN -58.7089
    WHEN 'Planta Rosario' THEN -60.6505
    WHEN 'Planta San Miguel' THEN -58.7089
    WHEN 'Puerto Buenos Aires' THEN -58.3816
    WHEN 'Tecnopack Zayas S.A' THEN -60.6505
    WHEN 'Terminal Zárate' THEN -59.0261
    ELSE longitud
  END,
  ciudad = CASE 
    WHEN ciudad IS NULL AND nombre LIKE '%Rosario%' THEN 'Rosario'
    WHEN ciudad IS NULL AND nombre LIKE '%San Miguel%' THEN 'San Miguel'
    WHEN ciudad IS NULL AND nombre LIKE '%Buenos Aires%' THEN 'Buenos Aires'
    WHEN ciudad IS NULL AND nombre LIKE '%Zárate%' THEN 'Zárate'
    ELSE ciudad
  END,
  updated_at = NOW()
WHERE nombre IN (
  'Aceitera San Miguel S.A',
  'Planta Rosario',
  'Planta San Miguel',
  'Puerto Buenos Aires',
  'Tecnopack Zayas S.A',
  'Terminal Zárate'
);

-- Verificar actualización
SELECT 
  nombre,
  ciudad,
  provincia,
  latitud,
  longitud,
  CASE 
    WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN '✅ Con coordenadas'
    ELSE '❌ Sin coordenadas'
  END as estado
FROM ubicaciones
ORDER BY nombre;

-- Resumen
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END) as con_coordenadas,
  COUNT(CASE WHEN latitud IS NULL OR longitud IS NULL THEN 1 END) as sin_coordenadas,
  ROUND(
    COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as porcentaje_completado
FROM ubicaciones;
