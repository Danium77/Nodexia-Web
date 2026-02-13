-- ============================================================================
-- SYNC PRODUCCIÓN - PARTE 3: Índices
-- ============================================================================
-- Ejecutar en: https://supabase.com/dashboard/project/lkdcofsfjnltuzzzwoir/sql/new
-- DESPUÉS de Parte 2
-- ============================================================================

-- === DESPACHOS ===
CREATE INDEX IF NOT EXISTS idx_despachos_delivery_scheduled ON despachos(delivery_scheduled_at) WHERE delivery_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_despachos_origen_id ON despachos(origen_id);
CREATE INDEX IF NOT EXISTS idx_despachos_destino_id ON despachos(destino_id);
CREATE INDEX IF NOT EXISTS idx_despachos_origen_ubicacion ON despachos(origen_ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_despachos_destino_ubicacion ON despachos(destino_ubicacion_id);

-- === VIAJES_DESPACHO ===
CREATE INDEX IF NOT EXISTS idx_viajes_fue_expirado ON viajes_despacho(fue_expirado) WHERE fue_expirado = true;
CREATE INDEX IF NOT EXISTS idx_viajes_reprogramaciones ON viajes_despacho(cantidad_reprogramaciones) WHERE cantidad_reprogramaciones > 0;
CREATE INDEX IF NOT EXISTS idx_viajes_despacho_documentacion ON viajes_despacho(documentacion_completa);

-- === USUARIOS_EMPRESA ===
CREATE INDEX IF NOT EXISTS usuarios_empresa_dni_idx ON usuarios_empresa(dni);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_ubicacion ON usuarios_empresa(ubicacion_actual_id) WHERE ubicacion_actual_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_empresa_id ON usuarios_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_activo ON usuarios_empresa(user_id) WHERE activo = true;

-- === UNIDADES_OPERATIVAS ===
CREATE INDEX IF NOT EXISTS idx_unidades_operativas_empresa ON unidades_operativas(empresa_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_unidades_operativas_chofer ON unidades_operativas(chofer_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_unidades_operativas_camion ON unidades_operativas(camion_id) WHERE activo = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_operativas_codigo_empresa_unique ON unidades_operativas(empresa_id, codigo) WHERE codigo IS NOT NULL;

-- === TRACKING_GPS ===
CREATE INDEX IF NOT EXISTS idx_tracking_gps_chofer ON tracking_gps(chofer_id);
CREATE INDEX IF NOT EXISTS idx_tracking_gps_timestamp ON tracking_gps(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_gps_chofer_timestamp ON tracking_gps(chofer_id, timestamp DESC);

-- === HISTORIAL_UNIDADES_OPERATIVAS ===
CREATE INDEX IF NOT EXISTS idx_historial_unidades_unidad ON historial_unidades_operativas(unidad_operativa_id);
CREATE INDEX IF NOT EXISTS idx_historial_unidades_fecha ON historial_unidades_operativas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_unidades_tipo ON historial_unidades_operativas(tipo_cambio);

-- === CANCELACIONES_DESPACHOS ===
CREATE INDEX IF NOT EXISTS idx_cancelaciones_despacho ON cancelaciones_despachos(despacho_id);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_empresa ON cancelaciones_despachos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_usuario ON cancelaciones_despachos(cancelado_por_user_id);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_fecha ON cancelaciones_despachos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_categoria ON cancelaciones_despachos(motivo_categoria);

-- === DOCUMENTOS_RECURSOS ===
CREATE INDEX IF NOT EXISTS idx_doc_recursos_recurso ON documentos_recursos(recurso_tipo, recurso_id);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_tipo ON documentos_recursos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_estado ON documentos_recursos(estado);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_vencimiento ON documentos_recursos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_doc_recursos_empresa ON documentos_recursos(empresa_id);

-- === HISTORIAL_DESPACHOS ===
CREATE INDEX IF NOT EXISTS idx_historial_despachos_despacho_id ON historial_despachos(despacho_id);
CREATE INDEX IF NOT EXISTS idx_historial_despachos_viaje_id ON historial_despachos(viaje_id);
CREATE INDEX IF NOT EXISTS idx_historial_despachos_created_at ON historial_despachos(created_at DESC);

-- === PARADAS ===
CREATE INDEX IF NOT EXISTS idx_paradas_viaje_id ON paradas(viaje_id);
CREATE INDEX IF NOT EXISTS idx_paradas_planta_id ON paradas(planta_id);

-- === AUDITORIA_ESTADOS ===
CREATE INDEX IF NOT EXISTS idx_auditoria_viaje ON auditoria_estados(viaje_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_estados(created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_estado_nuevo ON auditoria_estados(estado_nuevo);

-- === DOCUMENTOS_ENTIDAD ===
CREATE INDEX IF NOT EXISTS idx_doc_entidad_tipo_id ON documentos_entidad(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_doc_entidad_tipo_id_activo ON documentos_entidad(entidad_tipo, entidad_id, activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_tipo_documento ON documentos_entidad(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_doc_estado_vigencia ON documentos_entidad(estado_vigencia) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_fecha_vencimiento ON documentos_entidad(fecha_vencimiento) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_empresa ON documentos_entidad(empresa_id);
CREATE INDEX IF NOT EXISTS idx_doc_validacion_pendiente ON documentos_entidad(estado_vigencia) WHERE estado_vigencia = 'pendiente_validacion' AND activo = TRUE;

-- === AUDITORIA_DOCUMENTOS ===
CREATE INDEX IF NOT EXISTS idx_auditoria_documento ON auditoria_documentos(documento_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria_documentos(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_doc_fecha ON auditoria_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_documentos(usuario_id);

-- === DOCUMENTOS_VIAJE_SEGURO ===
CREATE INDEX IF NOT EXISTS idx_seguro_viaje ON documentos_viaje_seguro(viaje_id);
CREATE INDEX IF NOT EXISTS idx_seguro_estado ON documentos_viaje_seguro(estado_vigencia);

-- === VERIFICACIÓN ===
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_indexes WHERE schemaname = 'public';
  RAISE NOTICE 'PARTE 3 COMPLETADA: Total índices en public: %', v_count;
END $$;
