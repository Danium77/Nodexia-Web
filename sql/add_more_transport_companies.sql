-- Agregar más empresas de transporte para probar
INSERT INTO public.empresas (nombre, cuit, tipo_empresa, email, telefono, direccion, activo)
VALUES 
  ('Transporte Norte SA', '20-33333333-3', 'transporte', 'contacto@norte-sa.com', '+54-11-4000-4000', 'Ruta 40 Km 100, Córdoba', true),
  ('Logística Sur SRL', '20-44444444-4', 'transporte', 'info@logistica-sur.com', '+54-11-4000-5000', 'Av. Libertador 500, Rosario', true),
  ('Transportes Rápidos SA', '20-55555555-5', 'transporte', 'ventas@rapidos.com', '+54-11-4000-6000', 'Industrial Park, Mendoza', true)
ON CONFLICT (cuit) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = EXCLUDED.activo;

-- Verificar las nuevas empresas creadas
SELECT 
    'NUEVAS EMPRESAS CREADAS' as status,
    nombre,
    id,
    cuit,
    tipo_empresa,
    activo
FROM public.empresas
WHERE tipo_empresa = 'transporte'
ORDER BY created_at DESC;