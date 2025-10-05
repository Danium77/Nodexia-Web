-- PASO 3: Insertar roles por tipo de empresa
-- Ejecutar después del PASO 2

DO $$
DECLARE
    planta_id UUID;
    transporte_id UUID;
    cliente_id UUID;
BEGIN
    -- Obtener IDs de tipos de empresa
    SELECT id INTO planta_id FROM public.tipos_empresa_ecosistema WHERE nombre = 'Planta';
    SELECT id INTO transporte_id FROM public.tipos_empresa_ecosistema WHERE nombre = 'Transporte';
    SELECT id INTO cliente_id FROM public.tipos_empresa_ecosistema WHERE nombre = 'Cliente';
    
    -- Roles para Planta
    INSERT INTO public.roles_empresa (nombre, descripcion, permisos, tipo_ecosistema_id) VALUES
    ('Gerente de Producción', 'Gestiona toda la producción y despachos', '{"full_access": true, "crear_despachos": true, "gestionar_produccion": true, "reportes_completos": true}', planta_id),
    ('Coordinador de Despachos', 'Coordina los despachos de la planta', '{"crear_despachos": true, "ver_transportes": true, "gestionar_cargas": true}', planta_id),
    ('Operador de Planta', 'Operario con acceso limitado', '{"ver_despachos": true, "actualizar_estado_carga": true}', planta_id)
    ON CONFLICT (nombre, tipo_ecosistema_id) DO NOTHING;
    
    -- Roles para Transporte
    INSERT INTO public.roles_empresa (nombre, descripcion, permisos, tipo_ecosistema_id) VALUES
    ('Gerente de Flota', 'Gestiona toda la flota y operaciones', '{"full_access": true, "gestionar_flota": true, "aceptar_despachos": true, "reportes_completos": true}', transporte_id),
    ('Despachador', 'Coordina rutas y asignaciones', '{"aceptar_despachos": true, "gestionar_rutas": true, "asignar_choferes": true}', transporte_id),
    ('Chofer', 'Conductor con acceso a sus viajes', '{"ver_mis_viajes": true, "actualizar_estado_viaje": true, "comunicar_incidencias": true}', transporte_id)
    ON CONFLICT (nombre, tipo_ecosistema_id) DO NOTHING;
    
    -- Roles para Cliente
    INSERT INTO public.roles_empresa (nombre, descripcion, permisos, tipo_ecosistema_id) VALUES
    ('Gerente de Logística', 'Gestiona recepción y logística', '{"full_access": true, "ver_despachos": true, "gestionar_recepciones": true, "reportes_completos": true}', cliente_id),
    ('Coordinador de Recepción', 'Coordina las recepciones', '{"ver_despachos": true, "actualizar_recepciones": true, "comunicar_incidencias": true}', cliente_id),
    ('Operador de Almacén', 'Operario de almacén', '{"ver_mis_recepciones": true, "confirmar_entregas": true}', cliente_id)
    ON CONFLICT (nombre, tipo_ecosistema_id) DO NOTHING;
END $$;