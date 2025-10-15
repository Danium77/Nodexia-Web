-- PASO 3: Verificar asociaciones usuario-empresa
SELECT 
    'usuarios_empresa' as tabla,
    ue.user_id,
    u.email,
    u.nombre_completo,
    ue.empresa_id,
    e.nombre as empresa_nombre,
    e.tipo_empresa,
    ue.rol_interno,
    ue.activo
FROM public.usuarios_empresa ue
JOIN public.usuarios u ON u.id = ue.user_id
JOIN public.empresas e ON e.id = ue.empresa_id
WHERE u.email IN (
    'coordinador.demo@nodexia.com',
    'coord_demo@example.com'
)
ORDER BY u.email;