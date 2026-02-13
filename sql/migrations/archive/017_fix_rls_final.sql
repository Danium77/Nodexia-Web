-- Eliminar política anterior de viajes_red_nodexia
DROP POLICY IF EXISTS "Solo transportes sin vinculo ven viajes" ON viajes_red_nodexia;

-- Crear política correcta en viajes_red_nodexia

        CREATE POLICY "Solo transportes sin vinculo ven viajes"
        ON viajes_red_nodexia
        FOR SELECT
        TO authenticated
        USING (
          NOT EXISTS (
            SELECT 1 FROM relaciones_empresas re
            WHERE re.empresa_transporte_id = public.uid_empresa()
            AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
            AND re.estado = 'activo'
          )
        );

-- Habilitar RLS en relaciones_empresas
ALTER TABLE relaciones_empresas ENABLE ROW LEVEL SECURITY;

-- Eliminar política anterior de relaciones_empresas
DROP POLICY IF EXISTS "Transportes ven sus relaciones" ON relaciones_empresas;
             DROP POLICY IF EXISTS "Empresas ven sus relaciones" ON relaciones_empresas;

-- Crear política en relaciones_empresas (para debugging)

        CREATE POLICY "Empresas ven sus relaciones"
        ON relaciones_empresas FOR SELECT
        TO authenticated
        USING (
          empresa_transporte_id = public.uid_empresa()
          OR empresa_cliente_id = public.uid_empresa()
        );
