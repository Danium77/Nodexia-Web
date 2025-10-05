-- PASO 2: Insertar datos básicos
-- Ejecutar después del PASO 1

-- Insertar planes de suscripción por defecto
INSERT INTO public.planes_suscripcion (nombre, descripcion, precio_mensual, caracteristicas) VALUES
('Básico', 'Plan básico para empresas pequeñas', 99.99, '{"usuarios_max": 5, "despachos_mes": 100, "reportes": false, "soporte": "email"}'),
('Profesional', 'Plan profesional para empresas medianas', 199.99, '{"usuarios_max": 20, "despachos_mes": 500, "reportes": true, "soporte": "telefono", "api_access": true}'),
('Empresarial', 'Plan empresarial para grandes empresas', 399.99, '{"usuarios_max": -1, "despachos_mes": -1, "reportes": true, "soporte": "dedicado", "api_access": true, "integraciones": true}')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar tipos de empresa del ecosistema
INSERT INTO public.tipos_empresa_ecosistema (nombre, descripcion, permisos_base) VALUES
('Planta', 'Empresa de producción/fabricación que genera cargas', '{"crear_despachos": true, "ver_transportes": true, "gestionar_cargas": true, "reportes_produccion": true}'),
('Transporte', 'Empresa de transporte que ejecuta los despachos', '{"aceptar_despachos": true, "gestionar_flota": true, "ver_rutas": true, "reportes_transporte": true}'),
('Cliente', 'Empresa cliente que recibe productos/servicios', '{"ver_despachos": true, "tracking": true, "reportes_recepcion": true, "feedback": true}')
ON CONFLICT (nombre) DO NOTHING;