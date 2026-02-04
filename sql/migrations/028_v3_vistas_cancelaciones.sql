-- Migración 028 v3: Vistas para análisis de cancelaciones
-- Fecha: 2026-02-02
-- EJECUTAR DESPUÉS de 028_v2_auditoria_cancelaciones_simplificado.sql

-- Vista para analytics (simplificada)
CREATE OR REPLACE VIEW vista_analytics_cancelaciones AS
SELECT 
  c.*,
  e.nombre AS empresa_nombre,
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
LEFT JOIN auth.users u ON c.cancelado_por_user_id = u.id;

-- Vista para KPIs por empresa
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

-- Función de limpieza
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

-- Grant permissions
GRANT SELECT ON vista_analytics_cancelaciones TO authenticated;
GRANT SELECT ON vista_kpis_cancelaciones_empresa TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Vistas de cancelaciones creadas exitosamente';
  RAISE NOTICE '🔍 Vista: vista_analytics_cancelaciones';
  RAISE NOTICE '📊 Vista: vista_kpis_cancelaciones_empresa';
  RAISE NOTICE '🧹 Función: limpiar_cancelaciones_antiguas()';
END $$;
