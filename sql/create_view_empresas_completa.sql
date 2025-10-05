-- Vista completa de empresas con información de planes
CREATE OR REPLACE VIEW view_empresas_completa AS
SELECT 
    e.id,
    e.nombre,
    e.cuit,
    e.email,
    e.activa,
    e.created_at,
    e.updated_at,
    tee.nombre AS tipo_ecosistema,
    ps.nombre AS plan_nombre,
    ps.precio_mensual,
    ps.limite_usuarios,
    ps.limite_vehiculos,
    ps.limite_choferes
FROM empresas e
LEFT JOIN tipos_empresa_ecosistema tee ON e.tipo_empresa_id = tee.id
LEFT JOIN planes_suscripcion ps ON e.plan_id = ps.id
ORDER BY e.created_at DESC;

-- Dar permisos para la vista
GRANT SELECT ON view_empresas_completa TO anon, authenticated;

-- RLS para la vista (solo super admins pueden ver todas las empresas)
ALTER VIEW view_empresas_completa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo super admins pueden ver todas las empresas" ON view_empresas_completa
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND u.raw_user_meta_data ->> 'role' = 'super_admin'
        )
    );