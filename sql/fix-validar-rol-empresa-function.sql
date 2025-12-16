-- Función para validar que un rol sea válido para un tipo de empresa
CREATE OR REPLACE FUNCTION public.validar_rol_empresa(p_rol TEXT, p_tipo_empresa TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.roles_empresa 
        WHERE nombre_rol = p_rol 
        AND (tipo_empresa = p_tipo_empresa OR tipo_empresa = 'ambos')
        AND activo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario explicativo
COMMENT ON FUNCTION public.validar_rol_empresa(TEXT, TEXT) IS 
'Valida que un rol específico sea aplicable para un tipo de empresa dado. Retorna true si el rol existe y está activo para ese tipo de empresa o para "ambos".';
