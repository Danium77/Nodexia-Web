-- ====================================================================
-- ASIGNAR CHOFER Y CAMIÓN A VIAJES EXISTENTES
-- ====================================================================
-- Este script asigna chofer y camión a los viajes de los despachos de prueba

-- PASO 1: Verificar si hay choferes y camiones disponibles
-- ====================================================================
SELECT 'CHOFERES DISPONIBLES:' as info;
SELECT id, nombre, apellido, dni, telefono, id_transporte
FROM choferes
WHERE activo = true OR activo IS NULL
LIMIT 10;

SELECT 'CAMIONES DISPONIBLES:' as info;
SELECT id, patente, marca, modelo, anio, id_transporte
FROM camiones  
WHERE activo = true OR activo IS NULL
LIMIT 10;

-- PASO 2: Ver los viajes actuales y sus asignaciones
-- ====================================================================
SELECT 'VIAJES ACTUALES:' as info;
SELECT 
  v.id as viaje_id,
  v.numero_viaje,
  d.pedido_id as despacho,
  v.chofer_id,
  v.camion_id,
  v.estado_unidad,
  v.empresa_id
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE d.pedido_id IN ('DSP-20260203-001', 'DSP-20260130-004', 'DSP-20260206-001')
ORDER BY v.created_at;

-- PASO 3: Si NO existen choferes/camiones, crearlos
-- ====================================================================
-- (Solo ejecutar si el PASO 1 mostró tablas vacías)

-- Obtener una empresa de transporte para asignar
DO $$
DECLARE
  v_transporte_id UUID;
BEGIN
  -- Buscar primera empresa de transporte
  SELECT id INTO v_transporte_id 
  FROM empresas 
  WHERE tipo = 'transporte' 
  LIMIT 1;

  -- Si no hay, usar cualquier empresa
  IF v_transporte_id IS NULL THEN
    SELECT id INTO v_transporte_id 
    FROM empresas 
    LIMIT 1;
  END IF;

  -- Crear chofer de prueba si no existe ninguno
  IF NOT EXISTS (SELECT 1 FROM choferes LIMIT 1) THEN
    INSERT INTO choferes (nombre, apellido, dni, telefono, email, id_transporte, activo)
    VALUES 
      ('Juan', 'Pérez', '12345678', '+54911111111', 'juan.perez@test.com', v_transporte_id, true),
      ('Carlos', 'González', '87654321', '+54922222222', 'carlos.gonzalez@test.com', v_transporte_id, true),
      ('Miguel', 'Rodriguez', '11223344', '+54933333333', 'miguel.rodriguez@test.com', v_transporte_id, true);
    
    RAISE NOTICE 'Choferes de prueba creados';
  END IF;

  -- Crear camiones de prueba si no existe ninguno
  IF NOT EXISTS (SELECT 1 FROM camiones LIMIT 1) THEN
    INSERT INTO camiones (patente, marca, modelo, anio, tipo, id_transporte, activo)
    VALUES 
      ('AA123BB', 'Mercedes Benz', 'Actros 2546', 2020, 'Tractora 6x2', v_transporte_id, true),
      ('CC456DD', 'Scania', 'R450', 2019, 'Tractora 6x4', v_transporte_id, true),
      ('EE789FF', 'Iveco', 'Stralis 460', 2021, 'Tractora 6x2', v_transporte_id, true);
    
    RAISE NOTICE 'Camiones de prueba creados';
  END IF;
END $$;

-- PASO 4: Asignar chofer y camión a los viajes
-- ====================================================================
-- Esto asigna el primer chofer y primer camión disponibles a cada viaje

WITH 
  primer_chofer AS (
    SELECT id FROM choferes WHERE activo = true OR activo IS NULL LIMIT 1
  ),
  primer_camion AS (
    SELECT id FROM camiones WHERE activo = true OR activo IS NULL LIMIT 1
  ),
  viajes_despachos AS (
    SELECT v.id as viaje_id
    FROM viajes_despacho v
    JOIN despachos d ON v.despacho_id = d.id
    WHERE d.pedido_id IN ('DSP-20260203-001', 'DSP-20260130-004', 'DSP-20260206-001')
  )
UPDATE viajes_despacho v
SET 
  chofer_id = (SELECT id FROM primer_chofer),
  camion_id = (SELECT id FROM primer_camion),
  estado_unidad = CASE 
    WHEN estado_unidad = 'expirado' OR estado_unidad IS NULL 
    THEN 'en_transito_origen' 
    ELSE estado_unidad 
  END,
  updated_at = NOW()
FROM viajes_despachos vd
WHERE v.id = vd.viaje_id;

-- PASO 5: Verificar resultados
-- ====================================================================
SELECT 'VIAJES DESPUÉS DE ASIGNACIÓN:' as info;
SELECT 
  v.id as viaje_id,
  v.numero_viaje,
  d.pedido_id as despacho,
  v.chofer_id,
  ch.nombre || ' ' || ch.apellido as chofer,
  v.camion_id,
  ca.patente as camion,
  v.estado_unidad
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN choferes ch ON v.chofer_id = ch.id
LEFT JOIN camiones ca ON v.camion_id = ca.id
WHERE d.pedido_id IN ('DSP-20260203-001', 'DSP-20260130-004', 'DSP-20260206-001')
ORDER BY v.created_at;

-- ====================================================================
-- RESULTADO ESPERADO:
-- Los 3 viajes deben tener chofer_id, camion_id y estado_unidad asignados
-- ====================================================================
