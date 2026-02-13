-- ============================================================================
-- SYNC PRODUCCIÓN - PARTE 5: Vistas
-- ============================================================================
-- Ejecutar en: https://supabase.com/dashboard/project/lkdcofsfjnltuzzzwoir/sql/new
-- DESPUÉS de Parte 4 (funciones)
-- ============================================================================

-- ============================================================================
-- VISTA 1: vista_viajes_expirados (013) — adaptada a estados 058
-- ============================================================================

CREATE OR REPLACE VIEW vista_viajes_expirados AS
SELECT 
    v.id AS viaje_id,
    v.despacho_id,
    d.pedido_id,
    d.origen,
    d.destino,
    d.scheduled_at AS fecha_programada,
    v.transport_id,
    t.nombre AS transporte_nombre,
    v.chofer_id,
    ch.nombre || ' ' || COALESCE(ch.apellido, '') AS chofer_nombre,
    v.camion_id,
    cam.patente AS camion_patente,
    v.estado,
    v.fecha_creacion,
    v.updated_at AS fecha_expiracion,
    EXTRACT(EPOCH FROM (v.updated_at - d.scheduled_at))/3600 AS horas_despues_programado,
    CASE
        WHEN v.chofer_id IS NULL AND v.camion_id IS NULL THEN 'Sin recursos'
        WHEN v.chofer_id IS NULL THEN 'Sin chofer'
        WHEN v.camion_id IS NULL THEN 'Sin camión'
        ELSE 'Recursos incompletos'
    END AS razon_expiracion,
    d.created_by AS coordinador_responsable
FROM viajes_despacho v
INNER JOIN despachos d ON d.id = v.despacho_id
LEFT JOIN empresas t ON t.id = v.transport_id
LEFT JOIN choferes ch ON ch.id = v.chofer_id
LEFT JOIN camiones cam ON cam.id = v.camion_id
WHERE v.fue_expirado = true
ORDER BY v.updated_at DESC;

-- ============================================================================
-- VISTA 2: vista_despachos_con_descarga (014)
-- ============================================================================

CREATE OR REPLACE VIEW vista_despachos_con_descarga AS
SELECT 
  d.*,
  CASE
    WHEN d.delivery_scheduled_at IS NULL THEN NULL
    WHEN NOW() < d.delivery_scheduled_at - (d.delivery_window_hours || ' hours')::INTERVAL THEN 'anticipado'
    WHEN esta_en_ventana_descarga(d.delivery_scheduled_at, d.delivery_window_hours) THEN 'en_ventana'
    WHEN NOW() > d.delivery_scheduled_at + (d.delivery_window_hours || ' hours')::INTERVAL THEN 'retrasado'
    ELSE 'pendiente'
  END AS delivery_status,
  CASE
    WHEN d.delivery_scheduled_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (d.delivery_scheduled_at - NOW())) / 3600
    ELSE NULL
  END AS horas_hasta_descarga
FROM despachos d;

-- ============================================================================
-- VISTA 3: vista_kpis_expiracion (016) — adaptada a estados 058
-- ============================================================================

CREATE OR REPLACE VIEW vista_kpis_expiracion AS
SELECT 
  COUNT(*) FILTER (WHERE fue_expirado = true) AS total_expirados_historico,
  COUNT(*) FILTER (WHERE estado = 'cancelado' AND fue_expirado = true) AS expirados_actuales,
  COUNT(*) FILTER (WHERE fue_expirado = true AND estado NOT IN ('cancelado')) AS recuperados,
  ROUND(
    COUNT(*) FILTER (WHERE fue_expirado = true AND estado = 'completado') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE fue_expirado = true), 0),
    2
  ) AS tasa_recuperacion_pct,
  COUNT(*) FILTER (WHERE cantidad_reprogramaciones > 0) AS total_reprogramados,
  COUNT(*) FILTER (WHERE cantidad_reprogramaciones > 1) AS con_multiples_reprogramaciones,
  AVG(cantidad_reprogramaciones) FILTER (WHERE cantidad_reprogramaciones > 0) AS promedio_reprogramaciones,
  COUNT(*) FILTER (WHERE fue_expirado = true AND chofer_id IS NULL AND camion_id IS NULL) AS sin_recursos,
  COUNT(*) FILTER (WHERE fue_expirado = true AND chofer_id IS NULL AND camion_id IS NOT NULL) AS sin_chofer,
  COUNT(*) FILTER (WHERE fue_expirado = true AND chofer_id IS NOT NULL AND camion_id IS NULL) AS sin_camion
FROM viajes_despacho;

-- ============================================================================
-- VISTA 4: vista_disponibilidad_unidades (017)
-- ============================================================================

CREATE OR REPLACE VIEW vista_disponibilidad_unidades AS
SELECT 
  uo.id,
  uo.empresa_id,
  uo.nombre,
  uo.codigo,
  uo.activo,
  uo.notas,
  ch.id as chofer_id,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer_nombre_completo,
  ch.nombre as chofer_nombre,
  ch.apellido as chofer_apellido,
  ch.dni as chofer_dni,
  ch.telefono as chofer_telefono,
  ca.id as camion_id,
  ca.patente as camion_patente,
  COALESCE(ca.marca || ' ' || ca.modelo, ca.marca, ca.modelo) as camion_modelo_completo,
  ca.marca as camion_marca,
  ca.modelo as camion_modelo,
  ca.anio as camion_anio,
  ac.id as acoplado_id,
  ac.patente as acoplado_patente,
  COALESCE(ac.marca || ' ' || ac.modelo, ac.marca, ac.modelo) as acoplado_modelo_completo,
  uo.ultima_hora_inicio_jornada,
  uo.ultima_hora_fin_jornada,
  uo.horas_conducidas_hoy,
  CASE 
    WHEN uo.horas_conducidas_hoy >= 9 THEN true
    WHEN uo.ultima_hora_inicio_jornada IS NOT NULL 
         AND NOW() - uo.ultima_hora_inicio_jornada > INTERVAL '9 hours' THEN true
    ELSE false
  END as necesita_descanso_obligatorio,
  CASE 
    WHEN uo.horas_conducidas_hoy >= 9 OR (
      uo.ultima_hora_inicio_jornada IS NOT NULL 
      AND NOW() - uo.ultima_hora_inicio_jornada > INTERVAL '9 hours'
    ) THEN 
      COALESCE(uo.ultima_hora_fin_jornada, uo.ultima_hora_inicio_jornada) + INTERVAL '12 hours'
    ELSE NOW()
  END as proxima_hora_disponible,
  (
    SELECT json_build_object(
      'viaje_id', vd.id, 'despacho_id', d.id, 'pedido_id', d.pedido_id,
      'destino', d.destino, 'destino_id', d.destino_id,
      'scheduled_date', d.scheduled_local_date, 'scheduled_time', d.scheduled_local_time,
      'estado', vd.estado, 'updated_at', vd.updated_at
    )
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.chofer_id = uo.chofer_id AND vd.camion_id = uo.camion_id
    ORDER BY vd.updated_at DESC LIMIT 1
  ) as ultimo_viaje,
  (
    SELECT json_build_object(
      'viaje_id', vd.id, 'despacho_id', d.id, 'pedido_id', d.pedido_id,
      'origen', d.origen, 'destino', d.destino,
      'scheduled_date', d.scheduled_local_date, 'scheduled_time', d.scheduled_local_time,
      'estado', vd.estado
    )
    FROM viajes_despacho vd
    JOIN despachos d ON d.id = vd.despacho_id
    WHERE vd.chofer_id = uo.chofer_id AND vd.camion_id = uo.camion_id
      AND vd.estado NOT IN ('completado', 'cancelado')
    ORDER BY d.scheduled_local_date, d.scheduled_local_time LIMIT 1
  ) as viaje_actual,
  uo.created_at,
  uo.updated_at
FROM unidades_operativas uo
JOIN choferes ch ON ch.id = uo.chofer_id
JOIN camiones ca ON ca.id = uo.camion_id
LEFT JOIN acoplados ac ON ac.id = uo.acoplado_id
WHERE uo.activo = true;

-- ============================================================================
-- VISTA 5: ultima_ubicacion_choferes (024)
-- ============================================================================

CREATE OR REPLACE VIEW ultima_ubicacion_choferes AS
SELECT DISTINCT ON (chofer_id)
  chofer_id,
  latitud,
  longitud,
  timestamp,
  velocidad,
  rumbo,
  precision_metros
FROM tracking_gps
ORDER BY chofer_id, timestamp DESC;

-- ============================================================================
-- VISTA 6: vista_historial_unidades (025)
-- ============================================================================

CREATE OR REPLACE VIEW vista_historial_unidades AS
SELECT 
  h.id,
  h.unidad_operativa_id,
  uo.nombre AS unidad_nombre,
  uo.codigo AS unidad_codigo,
  h.tipo_cambio,
  h.valor_anterior,
  h.valor_nuevo,
  h.modificado_por,
  u.email AS modificado_por_email,
  h.motivo,
  h.created_at,
  CASE 
    WHEN h.tipo_cambio = 'chofer' THEN (SELECT CONCAT(c.apellido, ', ', c.nombre) FROM choferes c WHERE c.id::TEXT = h.valor_nuevo)
    WHEN h.tipo_cambio = 'camion' THEN (SELECT patente FROM camiones cam WHERE cam.id::TEXT = h.valor_nuevo)
    WHEN h.tipo_cambio = 'acoplado' THEN (SELECT patente FROM acoplados ac WHERE ac.id::TEXT = h.valor_nuevo)
    ELSE h.valor_nuevo
  END AS valor_nuevo_legible,
  CASE 
    WHEN h.tipo_cambio = 'chofer' THEN (SELECT CONCAT(c.apellido, ', ', c.nombre) FROM choferes c WHERE c.id::TEXT = h.valor_anterior)
    WHEN h.tipo_cambio = 'camion' THEN (SELECT patente FROM camiones cam WHERE cam.id::TEXT = h.valor_anterior)
    WHEN h.tipo_cambio = 'acoplado' THEN (SELECT patente FROM acoplados ac WHERE ac.id::TEXT = h.valor_anterior)
    ELSE h.valor_anterior
  END AS valor_anterior_legible
FROM historial_unidades_operativas h
JOIN unidades_operativas uo ON h.unidad_operativa_id = uo.id
LEFT JOIN auth.users u ON h.modificado_por = u.id
ORDER BY h.created_at DESC;

-- ============================================================================
-- VISTA 7: vista_notificaciones_pendientes (026)
-- ============================================================================

CREATE OR REPLACE VIEW vista_notificaciones_pendientes AS
SELECT 
  n.id, n.user_id, n.tipo, n.titulo, n.mensaje,
  n.viaje_id, n.despacho_id, n.unidad_operativa_id, n.created_at,
  vd.estado AS viaje_estado,
  d.pedido_id, d.origen, d.destino,
  uo.nombre AS unidad_nombre
FROM notificaciones n
LEFT JOIN viajes_despacho vd ON n.viaje_id = vd.id
LEFT JOIN despachos d ON n.despacho_id = d.id
LEFT JOIN unidades_operativas uo ON n.unidad_operativa_id = uo.id
WHERE n.leida = FALSE
ORDER BY n.created_at DESC;

-- ============================================================================
-- VISTA 8: vista_analytics_cancelaciones (028)
-- ============================================================================

CREATE OR REPLACE VIEW vista_analytics_cancelaciones AS
SELECT 
  c.*,
  e.nombre as empresa_nombre,
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

-- ============================================================================
-- VISTA 9: vista_kpis_cancelaciones_empresa (028)
-- ============================================================================

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

-- ============================================================================
-- VISTA 10: documentos_proximos_vencer (archive/046_CORREGIDO)
-- ============================================================================

CREATE OR REPLACE VIEW documentos_proximos_vencer AS
SELECT 
  de.*,
  (de.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer,
  CASE
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 5 THEN 'urgente'
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 10 THEN 'alerta'
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 20 THEN 'aviso'
  END AS nivel_alerta,
  CASE de.entidad_tipo
    WHEN 'chofer' THEN (SELECT row_to_json(c) FROM (SELECT nombre, apellido, dni FROM choferes WHERE id = de.entidad_id) c)
    WHEN 'camion' THEN (SELECT row_to_json(cam) FROM (SELECT patente, marca, modelo FROM camiones WHERE id = de.entidad_id) cam)
    WHEN 'acoplado' THEN (SELECT row_to_json(a) FROM (SELECT patente, marca, modelo FROM acoplados WHERE id = de.entidad_id) a)
    ELSE NULL
  END AS entidad_datos
FROM documentos_entidad de
WHERE de.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
  AND de.estado_vigencia IN ('vigente', 'por_vencer')
  AND de.activo = TRUE
ORDER BY de.fecha_vencimiento ASC;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM information_schema.views WHERE table_schema = 'public';
  RAISE NOTICE 'PARTE 5 COMPLETADA: Total vistas en public: %', v_count;
END $$;
