-- Fix: Renombrar columna peso_real a peso_real_kg en estado_carga_viaje
ALTER TABLE estado_carga_viaje 
RENAME COLUMN peso_real TO peso_real_kg;

-- Recrear vista con los nombres de columnas reales
DROP VIEW IF EXISTS vista_estado_viaje_completo CASCADE;

CREATE OR REPLACE VIEW vista_estado_viaje_completo AS
SELECT 
  vd.id as viaje_id,
  vd.despacho_id,
  vd.numero_viaje,
  d.id as numero_despacho,
  
  -- ESTADO UNIDAD (usando nombres reales de columnas)
  eu.estado_unidad,
  eu.fecha_asignacion,
  eu.fecha_confirmacion_chofer,
  eu.fecha_inicio_transito_origen,
  eu.fecha_arribo_origen,
  eu.fecha_ingreso_planta,
  eu.fecha_egreso_planta,
  eu.fecha_inicio_transito_destino,
  eu.fecha_arribo_destino,
  eu.fecha_viaje_completado,
  eu.ubicacion_actual_lat,
  eu.ubicacion_actual_lon,
  eu.ultima_actualizacion_gps,
  eu.observaciones_unidad,
  
  -- ESTADO CARGA (usando nombres reales de columnas)
  ec.estado_carga,
  ec.fecha_planificacion,
  ec.fecha_documentacion_preparada,
  ec.fecha_cargando,
  ec.fecha_carga_completada,
  ec.fecha_documentacion_validada,
  ec.fecha_en_transito,
  ec.fecha_arribado_destino,
  ec.fecha_descargado,
  ec.fecha_entregado,
  ec.fecha_completado,
  ec.peso_real_kg,
  ec.cantidad_bultos,
  ec.numero_remito,
  ec.observaciones,
  
  -- DATOS RELACIONADOS
  emp_trans.nombre as transporte_nombre,
  c.patente as camion_patente,
  c.marca as camion_marca,
  c.modelo as camion_modelo,
  a.patente as acoplado_patente,
  ch.nombre || ' ' || COALESCE(ch.apellido, '') as chofer_nombre,
  ch.telefono as chofer_telefono,
  ch.user_id as chofer_user_id,
  
  -- CALCULO: Tiempo en planta
  CASE 
    WHEN eu.fecha_egreso_planta IS NOT NULL AND eu.fecha_ingreso_planta IS NOT NULL
    THEN EXTRACT(EPOCH FROM (eu.fecha_egreso_planta - eu.fecha_ingreso_planta))/3600
    ELSE NULL
  END as horas_en_planta,
  
  -- CALCULO: Tiempo de carga (si existe fecha_iniciando_carga y fecha_carga_completada)
  CASE 
    WHEN ec.fecha_carga_completada IS NOT NULL AND ec.fecha_iniciando_carga IS NOT NULL
    THEN EXTRACT(EPOCH FROM (ec.fecha_carga_completada - ec.fecha_iniciando_carga))/60
    ELSE NULL
  END as minutos_de_carga,
  
  vd.created_at,
  vd.updated_at

FROM viajes_despacho vd
LEFT JOIN estado_unidad_viaje eu ON eu.viaje_id = vd.id
LEFT JOIN estado_carga_viaje ec ON ec.viaje_id = vd.id
LEFT JOIN despachos d ON d.id = vd.despacho_id
LEFT JOIN empresas emp_trans ON emp_trans.id = vd.id_transporte
LEFT JOIN camiones c ON c.id = vd.camion_id
LEFT JOIN acoplados a ON a.id = vd.acoplado_id
LEFT JOIN choferes ch ON ch.id = vd.chofer_id;

COMMENT ON VIEW vista_estado_viaje_completo IS 
'Vista unificada con estados de UNIDAD y CARGA para dashboards y reportes';

-- Verificar que funciona
SELECT 
    viaje_id, 
    numero_viaje, 
    estado_unidad, 
    estado_carga,
    peso_real_kg,
    chofer_nombre
FROM vista_estado_viaje_completo
LIMIT 5;
