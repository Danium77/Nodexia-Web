-- Actualizar camiones y acoplados con id_transporte correcto
-- Gonzalo (gonzalo@logisticaexpres.com) - Logística Express SRL

-- Obtener el user_id de Gonzalo
-- Email: gonzalo@logisticaexpres.com
-- Empresa: Logística Express SRL (181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed)

-- Actualizar todos los camiones con id_transporte dummy al id correcto de Gonzalo
UPDATE camiones
SET id_transporte = (
  SELECT id FROM auth.users WHERE email = 'gonzalo@logisticaexpres.com'
),
usuario_alta = (
  SELECT id FROM auth.users WHERE email = 'gonzalo@logisticaexpres.com'
)
WHERE id_transporte = '00000000-0000-0000-0000-000000000000';

-- Actualizar todos los acoplados con id_transporte dummy al id correcto de Gonzalo
UPDATE acoplados
SET id_transporte = (
  SELECT id FROM auth.users WHERE email = 'gonzalo@logisticaexpres.com'
),
usuario_alta = (
  SELECT id FROM auth.users WHERE email = 'gonzalo@logisticaexpres.com'
)
WHERE id_transporte = '00000000-0000-0000-0000-000000000000';

-- Verificar los resultados
SELECT 'Camiones actualizados:' as tabla, COUNT(*) as total FROM camiones 
WHERE id_transporte = (SELECT id FROM auth.users WHERE email = 'gonzalo@logisticaexpres.com')
UNION ALL
SELECT 'Acoplados actualizados:' as tabla, COUNT(*) as total FROM acoplados 
WHERE id_transporte = (SELECT id FROM auth.users WHERE email = 'gonzalo@logisticaexpres.com');
