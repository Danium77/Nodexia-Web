-- Fix: Crear relación correcta entre Aceitera San Miguel y Demo de Transportes Nodexia
-- Empresa del usuario: 3cc1979e-1672-48b8-a5e5-2675f5cac527
-- Transporte: 2f869cfe-d395-4d9d-9d02-b21040266ffd (Demo de Transportes Nodexia)

-- Primero verificar si ya existe para evitar duplicados
DO $$
BEGIN
  -- Insertar solo si no existe
  IF NOT EXISTS (
    SELECT 1 FROM relaciones_empresas 
    WHERE empresa_cliente_id = '3cc1979e-1672-48b8-a5e5-2675f5cac527'
    AND empresa_transporte_id = '2f869cfe-d395-4d9d-9d02-b21040266ffd'
  ) THEN
    INSERT INTO relaciones_empresas (
      empresa_cliente_id,
      empresa_transporte_id,
      estado,
      fecha_inicio
    ) VALUES (
      '3cc1979e-1672-48b8-a5e5-2675f5cac527', -- Aceitera San Miguel (tu empresa)
      '2f869cfe-d395-4d9d-9d02-b21040266ffd', -- Demo de Transportes Nodexia
      'activa',
      NOW()
    );
    
    RAISE NOTICE 'Relación creada exitosamente';
  ELSE
    RAISE NOTICE 'La relación ya existe';
  END IF;
END $$;

-- Verificar el resultado
SELECT 
  id,
  empresa_cliente_id,
  empresa_transporte_id,
  estado,
  fecha_inicio
FROM relaciones_empresas
WHERE empresa_cliente_id = '3cc1979e-1672-48b8-a5e5-2675f5cac527';
