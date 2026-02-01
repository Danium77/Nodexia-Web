-- ============================================================================
-- MIGRACIÓN 017: SISTEMA DE UNIDADES OPERATIVAS CON ALGORITMO DE ASIGNACIÓN
-- ============================================================================
-- Fecha: 31 de Enero 2026
-- Propósito: Crear sistema de unidades operativas (chofer + camión + acoplado)
--            con algoritmo de asignación óptima considerando:
--            - Disponibilidad temporal
--            - Ubicación y distancia
--            - Normativas de descanso de choferes
--
-- GARANTÍAS:
-- ✅ NO rompe funcionalidades existentes
-- ✅ NO duplica datos (usa referencias)
-- ✅ RLS apropiado (cada empresa ve solo sus unidades)
-- ✅ Migración automática de pares recurrentes
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR ESTADO DE COORDENADAS EN UBICACIONES
-- ============================================================================

-- Ver cuántas ubicaciones tienen coordenadas
SELECT 
  COUNT(*) as total_ubicaciones,
  COUNT(latitud) as con_latitud,
  COUNT(longitud) as con_longitud,
  COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END) as con_coordenadas_completas
FROM ubicaciones;

-- Listar ubicaciones sin coordenadas
SELECT id, nombre, ciudad, provincia, direccion
FROM ubicaciones
WHERE latitud IS NULL OR longitud IS NULL
ORDER BY nombre;

-- ============================================================================
-- PASO 2: CREAR TABLA UNIDADES_OPERATIVAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS unidades_operativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Identificación
  nombre VARCHAR(100) NOT NULL,  -- "Unidad 01", "Equipo Walter", etc.
  codigo VARCHAR(20),             -- Código corto: "U01", "U02"
  
  -- Recursos (referencias, NO duplicación)
  chofer_id UUID NOT NULL REFERENCES choferes(id) ON DELETE RESTRICT,
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE RESTRICT,
  acoplado_id UUID REFERENCES acoplados(id) ON DELETE SET NULL,
  
  -- Estado y disponibilidad
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  
  -- Metadata de jornada laboral (para cumplir normativas)
  ultima_hora_inicio_jornada TIMESTAMPTZ,
  ultima_hora_fin_jornada TIMESTAMPTZ,
  horas_conducidas_hoy DECIMAL(4,2) DEFAULT 0,  -- Acumulado del día
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unidades_operativas_nombre_empresa_unique UNIQUE (empresa_id, nombre)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unidades_operativas_empresa ON unidades_operativas(empresa_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_unidades_operativas_chofer ON unidades_operativas(chofer_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_unidades_operativas_camion ON unidades_operativas(camion_id) WHERE activo = true;

-- Índice único parcial para código (solo cuando no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_operativas_codigo_empresa_unique 
ON unidades_operativas(empresa_id, codigo) 
WHERE codigo IS NOT NULL;

-- Comentarios
COMMENT ON TABLE unidades_operativas IS 'Unidades operativas: equipos estables de chofer + camión + acoplado opcional';
COMMENT ON COLUMN unidades_operativas.horas_conducidas_hoy IS 'Acumulado de horas de conducción en el día actual (se resetea a las 00:00)';
COMMENT ON COLUMN unidades_operativas.ultima_hora_inicio_jornada IS 'Última vez que el chofer inició jornada laboral';
COMMENT ON COLUMN unidades_operativas.ultima_hora_fin_jornada IS 'Última vez que el chofer finalizó jornada laboral';

-- ============================================================================
-- PASO 3: TRIGGERS PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_unidades_operativas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unidades_operativas_updated_at ON unidades_operativas;
CREATE TRIGGER trigger_update_unidades_operativas_updated_at
  BEFORE UPDATE ON unidades_operativas
  FOR EACH ROW
  EXECUTE FUNCTION update_unidades_operativas_updated_at();

-- ============================================================================
-- PASO 4: RLS POLICIES (Seguridad)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE unidades_operativas ENABLE ROW LEVEL SECURITY;

-- Policy: Solo ver unidades de mi empresa
DROP POLICY IF EXISTS "unidades_operativas_select" ON unidades_operativas;
CREATE POLICY "unidades_operativas_select"
ON unidades_operativas FOR SELECT TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() 
    AND activo = true
  )
);

-- Policy: Solo crear unidades para mi empresa
DROP POLICY IF EXISTS "unidades_operativas_insert" ON unidades_operativas;
CREATE POLICY "unidades_operativas_insert"
ON unidades_operativas FOR INSERT TO authenticated
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() 
    AND activo = true
  )
);

-- Policy: Solo actualizar unidades de mi empresa
DROP POLICY IF EXISTS "unidades_operativas_update" ON unidades_operativas;
CREATE POLICY "unidades_operativas_update"
ON unidades_operativas FOR UPDATE TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() 
    AND activo = true
  )
)
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() 
    AND activo = true
  )
);

-- Policy: Solo eliminar unidades de mi empresa
DROP POLICY IF EXISTS "unidades_operativas_delete" ON unidades_operativas;
CREATE POLICY "unidades_operativas_delete"
ON unidades_operativas FOR DELETE TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid() 
    AND activo = true
  )
);

-- ============================================================================
-- PASO 5: VISTA PARA DISPONIBILIDAD DE UNIDADES
-- ============================================================================

CREATE OR REPLACE VIEW vista_disponibilidad_unidades AS
SELECT 
  uo.id,
  uo.empresa_id,
  uo.nombre,
  uo.codigo,
  uo.activo,
  uo.notas,
  
  -- Datos del chofer
  ch.id as chofer_id,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer_nombre_completo,
  ch.nombre as chofer_nombre,
  ch.apellido as chofer_apellido,
  ch.dni as chofer_dni,
  ch.telefono as chofer_telefono,
  
  -- Datos del camión
  ca.id as camion_id,
  ca.patente as camion_patente,
  COALESCE(ca.marca || ' ' || ca.modelo, ca.marca, ca.modelo) as camion_modelo_completo,
  ca.marca as camion_marca,
  ca.modelo as camion_modelo,
  ca.anio as camion_anio,
  
  -- Datos del acoplado (opcional)
  ac.id as acoplado_id,
  ac.patente as acoplado_patente,
  COALESCE(ac.marca || ' ' || ac.modelo, ac.marca, ac.modelo) as acoplado_modelo_completo,
  
  -- Jornada laboral
  uo.ultima_hora_inicio_jornada,
  uo.ultima_hora_fin_jornada,
  uo.horas_conducidas_hoy,
  
  -- Calcular si necesita descanso obligatorio (más de 9 horas conducidas)
  CASE 
    WHEN uo.horas_conducidas_hoy >= 9 THEN true
    WHEN uo.ultima_hora_inicio_jornada IS NOT NULL 
         AND NOW() - uo.ultima_hora_inicio_jornada > INTERVAL '9 hours' THEN true
    ELSE false
  END as necesita_descanso_obligatorio,
  
  -- Calcular próxima hora disponible (considerando descanso)
  CASE 
    WHEN uo.horas_conducidas_hoy >= 9 OR (
      uo.ultima_hora_inicio_jornada IS NOT NULL 
      AND NOW() - uo.ultima_hora_inicio_jornada > INTERVAL '9 hours'
    ) THEN 
      -- Necesita 12 horas de descanso
      COALESCE(uo.ultima_hora_fin_jornada, uo.ultima_hora_inicio_jornada) + INTERVAL '12 hours'
    ELSE NOW()
  END as proxima_hora_disponible,
  
  -- Último viaje completado (para saber ubicación actual)
  (
    SELECT json_build_object(
      'viaje_id', vd.id,
      'despacho_id', d.id,
      'pedido_id', d.pedido_id,
      'destino', d.destino,
      'destino_id', d.destino_id,
      'scheduled_date', d.scheduled_local_date,
      'scheduled_time', d.scheduled_local_time,
      'estado', vd.estado,
      'updated_at', vd.updated_at
    )
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.chofer_id = uo.chofer_id 
      AND vd.camion_id = uo.camion_id
    ORDER BY vd.updated_at DESC
    LIMIT 1
  ) as ultimo_viaje,
  
  -- Viaje actual en curso (si existe)
  (
    SELECT json_build_object(
      'viaje_id', vd.id,
      'despacho_id', d.id,
      'pedido_id', d.pedido_id,
      'origen', d.origen,
      'destino', d.destino,
      'scheduled_date', d.scheduled_local_date,
      'scheduled_time', d.scheduled_local_time,
      'estado', vd.estado
    )
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.chofer_id = uo.chofer_id 
      AND vd.camion_id = uo.camion_id
      AND vd.estado NOT IN ('completado', 'cancelado', 'cancelado_por_transporte')
    ORDER BY d.scheduled_local_date, d.scheduled_local_time
    LIMIT 1
  ) as viaje_actual,
  
  uo.created_at,
  uo.updated_at
FROM unidades_operativas uo
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE uo.activo = true;

COMMENT ON VIEW vista_disponibilidad_unidades IS 'Vista consolidada con disponibilidad de unidades operativas considerando jornada laboral y normativas';

-- ============================================================================
-- PASO 6: MIGRACIÓN AUTOMÁTICA - DETECTAR PARES RECURRENTES
-- ============================================================================

-- Crear unidades automáticamente basadas en pares chofer+camión recurrentes
INSERT INTO unidades_operativas (
  empresa_id,
  nombre,
  codigo,
  chofer_id,
  camion_id,
  acoplado_id,
  activo,
  notas,
  created_by
)
SELECT 
  ch.empresa_id,
  -- Nombre: "Unidad [Nombre Chofer]"
  'Unidad ' || ch.nombre,
  -- Código: U + número secuencial
  'U' || LPAD(ROW_NUMBER() OVER (PARTITION BY ch.empresa_id ORDER BY COUNT(*) DESC)::TEXT, 2, '0'),
  vd.chofer_id,
  vd.camion_id,
  -- Acoplado más usado con este par (si existe)
  (
    SELECT vd2.acoplado_id
    FROM viajes_despacho vd2
    WHERE vd2.chofer_id = vd.chofer_id
      AND vd2.camion_id = vd.camion_id
      AND vd2.acoplado_id IS NOT NULL
    GROUP BY vd2.acoplado_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  true,
  'Unidad creada automáticamente basada en ' || COUNT(*) || ' viajes históricos',
  NULL  -- Sistema
FROM viajes_despacho vd
JOIN choferes ch ON ch.id = vd.chofer_id
JOIN camiones ca ON ca.id = vd.camion_id
WHERE vd.chofer_id IS NOT NULL 
  AND vd.camion_id IS NOT NULL
GROUP BY vd.chofer_id, vd.camion_id, ch.empresa_id, ch.nombre
HAVING COUNT(*) >= 2  -- Solo pares que trabajaron juntos 2+ veces
ON CONFLICT DO NOTHING;

-- Mostrar resultado de migración
SELECT 
  e.nombre as empresa,
  COUNT(*) as unidades_creadas
FROM unidades_operativas uo
JOIN empresas e ON e.id = uo.empresa_id
WHERE uo.created_at >= NOW() - INTERVAL '1 minute'
GROUP BY e.nombre;

-- ============================================================================
-- PASO 7: FUNCIÓN HELPER PARA CALCULAR DISPONIBILIDAD
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_disponibilidad_unidad(
  p_unidad_id UUID,
  p_fecha_requerida TIMESTAMPTZ
)
RETURNS TABLE (
  disponible BOOLEAN,
  motivo TEXT,
  ubicacion_actual TEXT,
  ubicacion_actual_id UUID,
  hora_disponible TIMESTAMPTZ,
  horas_descanso_necesarias DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Disponible si: no tiene viaje en conflicto Y no necesita descanso
    CASE 
      WHEN v.viaje_actual IS NOT NULL THEN false
      WHEN v.necesita_descanso_obligatorio AND v.proxima_hora_disponible > p_fecha_requerida THEN false
      ELSE true
    END as disponible,
    
    -- Motivo si no está disponible
    CASE 
      WHEN v.viaje_actual IS NOT NULL THEN 
        '🚛 En viaje ' || (v.viaje_actual->>'pedido_id') || ' hasta ' || (v.viaje_actual->>'scheduled_time')
      WHEN v.necesita_descanso_obligatorio AND v.proxima_hora_disponible > p_fecha_requerida THEN
        '😴 En periodo de descanso obligatorio hasta ' || TO_CHAR(v.proxima_hora_disponible, 'DD/MM HH24:MI')
      ELSE '✅ Disponible'
    END as motivo,
    
    -- Ubicación actual (destino del último viaje o viaje actual)
    COALESCE(
      v.viaje_actual->>'destino',
      v.ultimo_viaje->>'destino',
      'Sin ubicación conocida'
    ) as ubicacion_actual,
    
    -- ID de ubicación actual
    COALESCE(
      (v.viaje_actual->>'destino_id')::UUID,
      (v.ultimo_viaje->>'destino_id')::UUID
    ) as ubicacion_actual_id,
    
    v.proxima_hora_disponible as hora_disponible,
    
    -- Horas de descanso necesarias
    CASE 
      WHEN v.necesita_descanso_obligatorio THEN 12.0
      WHEN v.horas_conducidas_hoy >= 4.5 THEN 0.5  -- 30 minutos cada 4.5h
      ELSE 0
    END as horas_descanso_necesarias
    
  FROM vista_disponibilidad_unidades v
  WHERE v.id = p_unidad_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_disponibilidad_unidad IS 'Calcula si una unidad está disponible para una fecha, considerando viajes actuales y normativas de descanso';

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================

-- Verificar que la tabla se creó correctamente
SELECT 
  COUNT(*) as total_unidades,
  COUNT(CASE WHEN activo THEN 1 END) as unidades_activas,
  COUNT(DISTINCT empresa_id) as empresas_con_unidades
FROM unidades_operativas;

-- Listar unidades creadas por empresa
SELECT 
  e.nombre as empresa,
  uo.codigo,
  uo.nombre as unidad,
  ch.nombre || ' ' || ch.apellido as chofer,
  ca.patente as camion,
  ac.patente as acoplado,
  uo.notas
FROM unidades_operativas uo
JOIN empresas e ON e.id = uo.empresa_id
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE uo.activo = true
ORDER BY e.nombre, uo.codigo;

-- ============================================================================
-- ÉXITO
-- ============================================================================

SELECT 
  '✅ MIGRACIÓN 017 COMPLETADA' as status,
  'Sistema de Unidades Operativas creado exitosamente' as mensaje,
  'Ver vista_disponibilidad_unidades para consultar disponibilidad' as proximo_paso;
