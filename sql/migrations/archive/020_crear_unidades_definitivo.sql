-- ============================================================================
-- CREAR 3 UNIDADES COMPLETAMENTE AUTOMÁTICO
-- ============================================================================
-- No usa IDs hardcodeados, selecciona recursos automáticamente
-- ============================================================================

DO $$
DECLARE
  v_empresa_id uuid := '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed';
  v_chofer1_id uuid;
  v_chofer2_id uuid;
  v_chofer3_id uuid;
  v_camion1_id uuid;
  v_camion2_id uuid;
  v_camion3_id uuid;
  v_acoplado1_id uuid;
  v_acoplado2_id uuid;
  v_acoplado3_id uuid;
BEGIN
  -- Obtener 3 choferes
  SELECT id INTO v_chofer1_id FROM choferes WHERE empresa_id = v_empresa_id ORDER BY nombre LIMIT 1 OFFSET 0;
  SELECT id INTO v_chofer2_id FROM choferes WHERE empresa_id = v_empresa_id ORDER BY nombre LIMIT 1 OFFSET 1;
  SELECT id INTO v_chofer3_id FROM choferes WHERE empresa_id = v_empresa_id ORDER BY nombre LIMIT 1 OFFSET 2;
  
  -- Obtener 3 camiones
  SELECT id INTO v_camion1_id FROM camiones WHERE empresa_id = v_empresa_id ORDER BY patente LIMIT 1 OFFSET 0;
  SELECT id INTO v_camion2_id FROM camiones WHERE empresa_id = v_empresa_id ORDER BY patente LIMIT 1 OFFSET 1;
  SELECT id INTO v_camion3_id FROM camiones WHERE empresa_id = v_empresa_id ORDER BY patente LIMIT 1 OFFSET 2;
  
  -- Obtener 3 acoplados
  SELECT id INTO v_acoplado1_id FROM acoplados WHERE empresa_id = v_empresa_id ORDER BY patente LIMIT 1 OFFSET 0;
  SELECT id INTO v_acoplado2_id FROM acoplados WHERE empresa_id = v_empresa_id ORDER BY patente LIMIT 1 OFFSET 1;
  SELECT id INTO v_acoplado3_id FROM acoplados WHERE empresa_id = v_empresa_id ORDER BY patente LIMIT 1 OFFSET 2;
  
  -- Crear Unidad 1
  INSERT INTO unidades_operativas (
    empresa_id, nombre, codigo, chofer_id, camion_id, acoplado_id, activo, notas
  ) VALUES (
    v_empresa_id,
    'Unidad 01',
    'U01',
    v_chofer1_id,
    v_camion1_id,
    v_acoplado1_id,
    true,
    'Primera unidad operativa - Logística Express'
  );
  
  -- Crear Unidad 2
  INSERT INTO unidades_operativas (
    empresa_id, nombre, codigo, chofer_id, camion_id, acoplado_id, activo, notas
  ) VALUES (
    v_empresa_id,
    'Unidad 02',
    'U02',
    v_chofer2_id,
    v_camion2_id,
    v_acoplado2_id,
    true,
    'Segunda unidad operativa - Logística Express'
  );
  
  -- Crear Unidad 3
  INSERT INTO unidades_operativas (
    empresa_id, nombre, codigo, chofer_id, camion_id, acoplado_id, activo, notas
  ) VALUES (
    v_empresa_id,
    'Unidad 03',
    'U03',
    v_chofer3_id,
    v_camion3_id,
    v_acoplado3_id,
    true,
    'Tercera unidad operativa - Logística Express'
  );
  
  RAISE NOTICE '✅ 3 unidades creadas exitosamente';
END $$;

-- Verificar unidades creadas
SELECT 
  uo.codigo,
  uo.nombre as unidad,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer,
  ca.patente as camion,
  ca.marca || ' ' || ca.modelo as modelo_camion,
  COALESCE(ac.patente, 'Sin acoplado') as acoplado,
  uo.activo
FROM unidades_operativas uo
JOIN empresas e ON e.id = uo.empresa_id
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE e.id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
ORDER BY uo.codigo;
