-- Migración 028: Sistema de auditoría de cancelaciones de despachos
-- Fecha: 2026-02-02
-- Descripción: Trazabilidad completa de cancelaciones con motivos y preparado para sistema de calificaciones

-- Crear tabla de auditoría de cancelaciones
CREATE TABLE IF NOT EXISTS cancelaciones_despachos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relaciones
  despacho_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cancelado_por_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos del despacho cancelado (snapshot)
  pedido_id VARCHAR(50) NOT NULL,
  cliente_nombre VARCHAR(255),
  origen_nombre VARCHAR(255),
  destino_nombre VARCHAR(255),
  scheduled_date DATE,
  scheduled_time TIME,
  estado_al_cancelar VARCHAR(50),
  
  -- Información de auditoría
  motivo_cancelacion TEXT NOT NULL,
  motivo_categoria VARCHAR(50), -- Para futuro: 'sin_recursos', 'cliente_cancela', 'clima', 'otro'
  
  -- Impacto operativo
  tenia_chofer_asignado BOOLEAN DEFAULT FALSE,
  tenia_camion_asignado BOOLEAN DEFAULT FALSE,
  tenia_acoplado_asignado BOOLEAN DEFAULT FALSE,
  fue_reprogramado_previamente BOOLEAN DEFAULT FALSE,
  cantidad_reprogramaciones_previas INT DEFAULT 0,
  
  -- Sistema de calificaciones futuro
  afecta_calificacion_planta BOOLEAN DEFAULT FALSE,
  afecta_calificacion_transporte BOOLEAN DEFAULT FALSE,
  calificacion_impacto DECIMAL(2,1), -- NULL hasta implementar sistema de calificaciones
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_cancelaciones_despacho ON cancelaciones_despachos(despacho_id);
CREATE INDEX idx_cancelaciones_empresa ON cancelaciones_despachos(empresa_id);
CREATE INDEX idx_cancelaciones_usuario ON cancelaciones_despachos(cancelado_por_user_id);
CREATE INDEX idx_cancelaciones_fecha ON cancelaciones_despachos(created_at DESC);
CREATE INDEX idx_cancelaciones_categoria ON cancelaciones_despachos(motivo_categoria);
CREATE INDEX idx_cancelaciones_con_recursos ON cancelaciones_despachos(tenia_chofer_asignado, tenia_camion_asignado);

-- Comentarios
COMMENT ON TABLE cancelaciones_despachos IS 'Auditoría completa de cancelaciones de despachos con trazabilidad';
COMMENT ON COLUMN cancelaciones_despachos.despacho_id IS 'UUID del despacho cancelado (puede no existir ya en despachos)';
COMMENT ON COLUMN cancelaciones_despachos.motivo_cancelacion IS 'Motivo detallado ingresado por el usuario';
COMMENT ON COLUMN cancelaciones_despachos.motivo_categoria IS 'Categoría del motivo para analytics (futuro)';
COMMENT ON COLUMN cancelaciones_despachos.tenia_chofer_asignado IS 'Indica si se perdió asignación de chofer';
COMMENT ON COLUMN cancelaciones_despachos.tenia_camion_asignado IS 'Indica si se perdió asignación de camión';
COMMENT ON COLUMN cancelaciones_despachos.afecta_calificacion_planta IS 'Si la cancelación debería afectar rating de la planta (futuro)';
COMMENT ON COLUMN cancelaciones_despachos.afecta_calificacion_transporte IS 'Si la cancelación debería afectar rating del transporte (futuro)';
COMMENT ON COLUMN cancelaciones_despachos.calificacion_impacto IS 'Impacto en calificación: +X/-X puntos (futuro sistema de ratings)';

-- RLS (Row Level Security)
ALTER TABLE cancelaciones_despachos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios pueden ver cancelaciones de su empresa
CREATE POLICY select_cancelaciones_empresa ON cancelaciones_despachos
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
    )
  );

-- Policy: Solo coordinadores+ pueden insertar registros de cancelación
CREATE POLICY insert_cancelaciones_coordinadores ON cancelaciones_despachos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.empresa_id = cancelaciones_despachos.empresa_id
        AND ue.rol_interno IN ('coordinador', 'admin_empresa', 'super_admin')
    )
  );

-- Policy: Solo admins pueden ver todas las cancelaciones (cross-empresa)
CREATE POLICY select_cancelaciones_admin ON cancelaciones_despachos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno = 'super_admin'
    )
  );

-- Vista para analytics de cancelaciones
CREATE OR REPLACE VIEW vista_analytics_cancelaciones AS
SELECT 
  c.*,
  e.nombre_comercial as empresa_nombre,
  e.tipo_empresa,
  u.email as cancelado_por_email,
  EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 AS horas_desde_cancelacion,
  CASE 
    WHEN c.tenia_chofer_asignado AND c.tenia_camion_asignado THEN 'recursos_completos'
    WHEN c.tenia_chofer_asignado OR c.tenia_camion_asignado THEN 'recursos_parciales'
    ELSE 'sin_recursos'
  END as nivel_asignacion,
  CASE
    WHEN c.fue_reprogramado_previamente THEN 'reprogramado_previamente'
    ELSE 'primer_intento'
  END as historial_despacho
FROM cancelaciones_despachos c
JOIN empresas e ON c.empresa_id = e.id
JOIN auth.users u ON c.cancelado_por_user_id = u.id;

-- Comentarios en la vista
COMMENT ON VIEW vista_analytics_cancelaciones IS 'Vista enriquecida para análisis de patrones de cancelación';

-- Vista para KPIs de cancelaciones por empresa
CREATE OR REPLACE VIEW vista_kpis_cancelaciones_empresa AS
SELECT 
  empresa_id,
  COUNT(*) as total_cancelaciones,
  COUNT(CASE WHEN tenia_chofer_asignado AND tenia_camion_asignado THEN 1 END) as cancelaciones_con_recursos,
  COUNT(CASE WHEN fue_reprogramado_previamente THEN 1 END) as cancelaciones_reprogramados,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as cancelaciones_ultimos_7_dias,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as cancelaciones_ultimos_30_dias,
  ROUND(
    COUNT(CASE WHEN tenia_chofer_asignado AND tenia_camion_asignado THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as porcentaje_con_recursos
FROM cancelaciones_despachos
GROUP BY empresa_id;

-- Comentarios en la vista KPIs
COMMENT ON VIEW vista_kpis_cancelaciones_empresa IS 'Métricas agregadas de cancelaciones por empresa';

-- Función para limpiar cancelaciones antiguas (retención: 2 años)
CREATE OR REPLACE FUNCTION limpiar_cancelaciones_antiguas()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  registros_eliminados INTEGER;
BEGIN
  DELETE FROM cancelaciones_despachos
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
  
  RAISE NOTICE 'Cancelaciones antiguas eliminadas: %', registros_eliminados;
  RETURN registros_eliminados;
END;
$$;

-- Comentarios en la función
COMMENT ON FUNCTION limpiar_cancelaciones_antiguas() IS 'Elimina registros de cancelaciones con más de 2 años (política de retención)';

-- Grant permissions
GRANT SELECT ON vista_analytics_cancelaciones TO authenticated;
GRANT SELECT ON vista_kpis_cancelaciones_empresa TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 028 completada exitosamente';
  RAISE NOTICE '📊 Tabla: cancelaciones_despachos';
  RAISE NOTICE '🔍 Vistas: vista_analytics_cancelaciones, vista_kpis_cancelaciones_empresa';
  RAISE NOTICE '🔐 RLS habilitado con 3 policies';
  RAISE NOTICE '🌟 Sistema preparado para calificaciones futuras';
END $$;
