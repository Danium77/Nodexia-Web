-- Migración 080: Rol gerente + vista KPIs reportes
-- Bloque B2: Reportes Gerenciales
-- Fecha: 2026-03-18

-- 1. Agregar 'gerente' como valor válido de rol_interno
-- (No hay CHECK constraint en usuarios_empresa.rol_interno, es text libre)
-- Solo documentamos el nuevo rol aquí y lo habilitamos en el código.

-- 2. Activar el feature flag de reportes (ahora que lo estamos implementando)
UPDATE funciones_sistema 
SET activo = true 
WHERE clave = 'reportes';

-- 3. Vista de KPIs operacionales por empresa
CREATE OR REPLACE VIEW vista_kpis_operacionales AS
SELECT 
  d.empresa_id,
  COUNT(CASE WHEN d.scheduled_local_date = CURRENT_DATE THEN 1 END) AS despachos_hoy,
  COUNT(CASE WHEN d.scheduled_local_date = CURRENT_DATE AND d.estado = 'completado' THEN 1 END) AS completados_hoy,
  COUNT(CASE WHEN d.scheduled_local_date = CURRENT_DATE AND d.estado = 'cancelado' THEN 1 END) AS cancelados_hoy,
  COUNT(CASE WHEN d.estado IN ('en_transito', 'confirmado', 'pendiente') THEN 1 END) AS en_transito,
  COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS despachos_7d,
  COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '7 days' AND d.estado = 'completado' THEN 1 END) AS completados_7d,
  COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '7 days' AND d.estado = 'cancelado' THEN 1 END) AS cancelados_7d,
  COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS despachos_30d,
  COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '30 days' AND d.estado = 'completado' THEN 1 END) AS completados_30d,
  COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '30 days' AND d.estado = 'cancelado' THEN 1 END) AS cancelados_30d
FROM despachos d
WHERE d.empresa_id IS NOT NULL
GROUP BY d.empresa_id;

-- 4. Vista de incidencias agregadas por empresa
CREATE OR REPLACE VIEW vista_incidencias_agregadas AS
SELECT
  d.empresa_id,
  COUNT(CASE WHEN iv.estado = 'abierta' THEN 1 END) AS incidencias_abiertas,
  COUNT(CASE WHEN iv.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS incidencias_7d,
  COUNT(CASE WHEN iv.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS incidencias_30d,
  COUNT(iv.id) AS incidencias_total
FROM incidencias_viaje iv
JOIN viajes_despacho vd ON vd.id = iv.viaje_id
JOIN despachos d ON d.id = vd.despacho_id
WHERE d.empresa_id IS NOT NULL
GROUP BY d.empresa_id;

-- 5. Vista de dwell time (tiempo en planta) por empresa
-- registros_acceso: id, viaje_id, tipo (ingreso/egreso), timestamp, usuario_id
CREATE OR REPLACE VIEW vista_dwell_time AS
SELECT
  d.empresa_id,
  AVG(EXTRACT(EPOCH FROM (egreso.timestamp - ingreso.timestamp)) / 60)::numeric(10,1) AS dwell_avg_minutos,
  AVG(CASE WHEN ingreso.timestamp >= NOW() - INTERVAL '7 days' 
    THEN EXTRACT(EPOCH FROM (egreso.timestamp - ingreso.timestamp)) / 60 END)::numeric(10,1) AS dwell_avg_7d,
  AVG(CASE WHEN ingreso.timestamp >= NOW() - INTERVAL '30 days' 
    THEN EXTRACT(EPOCH FROM (egreso.timestamp - ingreso.timestamp)) / 60 END)::numeric(10,1) AS dwell_avg_30d,
  COUNT(DISTINCT ingreso.viaje_id) AS total_registros
FROM registros_acceso ingreso
JOIN registros_acceso egreso 
  ON ingreso.viaje_id = egreso.viaje_id 
  AND egreso.tipo = 'egreso'
JOIN viajes_despacho vd ON vd.id = ingreso.viaje_id
JOIN despachos d ON d.id = vd.despacho_id
WHERE ingreso.tipo = 'ingreso'
  AND egreso.timestamp > ingreso.timestamp
  AND d.empresa_id IS NOT NULL
GROUP BY d.empresa_id;

-- 6. Grants
GRANT SELECT ON vista_kpis_operacionales TO authenticated;
GRANT SELECT ON vista_incidencias_agregadas TO authenticated;
GRANT SELECT ON vista_dwell_time TO authenticated;

-- 7. Indices para performance
CREATE INDEX IF NOT EXISTS idx_despachos_empresa_fecha 
  ON despachos(empresa_id, scheduled_local_date);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje_estado_created 
  ON incidencias_viaje(estado, created_at);
