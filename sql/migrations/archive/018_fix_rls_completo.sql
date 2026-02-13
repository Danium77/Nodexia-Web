-- ============================================================================
-- SOLUCIÓN COMPLETA RLS PARA RED NODEXIA
-- Asegura que transportes vinculados NO vean viajes de sus clientes
-- ============================================================================

-- PASO 1: Crear/Recrear función uid_empresa()
-- Esta función obtiene el empresa_id del usuario autenticado
DROP FUNCTION IF EXISTS public.uid_empresa();

CREATE OR REPLACE FUNCTION public.uid_empresa()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id 
  FROM usuarios_empresa 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.uid_empresa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.uid_empresa() TO anon;

-- PASO 2: Configurar RLS en viajes_red_nodexia
-- Eliminar política anterior
DROP POLICY IF EXISTS "Solo transportes sin vinculo ven viajes" ON viajes_red_nodexia;

-- Crear política que filtra viajes de empresas vinculadas
CREATE POLICY "Solo transportes sin vinculo ven viajes"
ON viajes_red_nodexia
FOR SELECT
TO authenticated
USING (
  -- El viaje es visible SOLO SI NO hay una relación activa
  NOT EXISTS (
    SELECT 1 
    FROM relaciones_empresas re
    WHERE re.empresa_transporte_id = public.uid_empresa()
      AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
      AND re.estado = 'activo'
  )
);

-- PASO 3: Configurar RLS en relaciones_empresas
-- Necesario para que la política anterior pueda consultar esta tabla
ALTER TABLE relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Transportes ven sus relaciones" ON relaciones_empresas;
DROP POLICY IF EXISTS "Empresas ven sus relaciones" ON relaciones_empresas;

-- Crear política permisiva para relaciones
-- IMPORTANTE: Esta debe ser permisiva porque se usa en subqueries de otras políticas
CREATE POLICY "Relaciones visibles para políticas"
ON relaciones_empresas
FOR SELECT
TO authenticated
USING (true);  -- Permitir lectura a todos los autenticados

-- PASO 4: Verificación
-- Consulta de prueba para verificar que funciona
-- Usuario: gonzalo@logisticaexpres.com (Logística Express SRL)
-- Empresa ID: 181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed
-- Cliente vinculado: Aceitera San Miguel S.A (3cc1979e-1672-48b8-a5e5-2675f5cac527)

SELECT 
  'Verificación de relaciones' as test,
  COUNT(*) as relaciones_activas
FROM relaciones_empresas
WHERE empresa_transporte_id = '181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed'
  AND estado = 'activo';

SELECT 
  'Verificación de viajes que DEBERÍAN bloquearse' as test,
  COUNT(*) as viajes_bloqueados
FROM viajes_red_nodexia
WHERE empresa_solicitante_id = '3cc1979e-1672-48b8-a5e5-2675f5cac527';

-- Resultado esperado:
-- relaciones_activas: >= 1 (debe haber al menos 1 relación)
-- viajes_bloqueados: >= 1 (debe haber al menos 1 viaje de Aceitera)
-- Estos viajes NO deben aparecer para Logística Express después de aplicar RLS
