-- ============================================
-- POLÍTICAS RLS CORRECTAS PARA CHOFERES Y CAMIONES
-- ============================================
-- 
-- LÓGICA:
-- 1. El coordinador de transporte (dueño) puede ver/editar todos sus recursos
-- 2. Otros usuarios pueden ver los recursos cuando están asignados a viajes
--    de despachos que crearon
--
-- ============================================

-- ============================================
-- CHOFERES
-- ============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Choferes: acceso por transporte" ON choferes;
DROP POLICY IF EXISTS "Choferes: insertar si es dueño" ON choferes;
DROP POLICY IF EXISTS "Choferes: actualizar si es dueño" ON choferes;
DROP POLICY IF EXISTS "Choferes: borrar si es dueño" ON choferes;
DROP POLICY IF EXISTS "choferes_select_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_insert_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_update_policy" ON choferes;
DROP POLICY IF EXISTS "choferes_delete_policy" ON choferes;

-- Política de LECTURA: Ver si eres dueño O si está asignado a un viaje visible
CREATE POLICY "choferes_select_policy" ON choferes
  FOR SELECT USING (
    -- Eres el transporte dueño del chofer
    id_transporte IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
    OR
    -- El chofer está asignado a un viaje de un despacho que creaste
    id IN (
      SELECT DISTINCT vd.id_chofer
      FROM viajes_despacho vd
      INNER JOIN despachos d ON vd.despacho_id = d.id
      WHERE vd.id_chofer IS NOT NULL
        AND d.created_by = auth.uid()
    )
    OR
    -- El chofer está asignado a un viaje donde tu empresa es el transporte
    id IN (
      SELECT DISTINCT vd.id_chofer
      FROM viajes_despacho vd
      WHERE vd.id_chofer IS NOT NULL
        AND vd.id_transporte IN (
          SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
        )
    )
  );

-- Política de INSERCIÓN: Solo si eres coordinador de la empresa dueña
CREATE POLICY "choferes_insert_policy" ON choferes
  FOR INSERT WITH CHECK (
    id_transporte IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- Política de ACTUALIZACIÓN: Solo si eres coordinador de la empresa dueña
CREATE POLICY "choferes_update_policy" ON choferes
  FOR UPDATE USING (
    id_transporte IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- Política de ELIMINACIÓN: Solo si eres coordinador de la empresa dueña
CREATE POLICY "choferes_delete_policy" ON choferes
  FOR DELETE USING (
    id_transporte IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- ============================================
-- CAMIONES
-- ============================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Camiones: acceso por transporte" ON camiones;
DROP POLICY IF EXISTS "Camiones: insertar si es dueño" ON camiones;
DROP POLICY IF EXISTS "Camiones: actualizar si es dueño" ON camiones;
DROP POLICY IF EXISTS "Camiones: borrar si es dueño" ON camiones;
DROP POLICY IF EXISTS "camiones_select_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_insert_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_update_policy" ON camiones;
DROP POLICY IF EXISTS "camiones_delete_policy" ON camiones;

-- Habilitar RLS si no está habilitado
ALTER TABLE camiones ENABLE ROW LEVEL SECURITY;

-- Política de LECTURA: Ver si eres dueño O si está asignado a un viaje visible
CREATE POLICY "camiones_select_policy" ON camiones
  FOR SELECT USING (
    -- Eres el transporte dueño del camión
    id_transporte IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
    OR
    -- El camión está asignado a un viaje de un despacho que creaste
    id IN (
      SELECT DISTINCT vd.id_camion
      FROM viajes_despacho vd
      INNER JOIN despachos d ON vd.despacho_id = d.id
      WHERE vd.id_camion IS NOT NULL
        AND d.created_by = auth.uid()
    )
    OR
    -- El camión está asignado a un viaje donde tu empresa es el transporte
    id IN (
      SELECT DISTINCT vd.id_camion
      FROM viajes_despacho vd
      WHERE vd.id_camion IS NOT NULL
        AND vd.id_transporte IN (
          SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
        )
    )
  );

-- Política de INSERCIÓN: Solo si eres coordinador de la empresa dueña
CREATE POLICY "camiones_insert_policy" ON camiones
  FOR INSERT WITH CHECK (
    id_transporte IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- Política de ACTUALIZACIÓN: Solo si eres coordinador de la empresa dueña
CREATE POLICY "camiones_update_policy" ON camiones
  FOR UPDATE USING (
    id_transporte IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- Política de ELIMINACIÓN: Solo si eres coordinador de la empresa dueña
CREATE POLICY "camiones_delete_policy" ON camiones
  FOR DELETE USING (
    id_transporte IN (
      SELECT ue.empresa_id 
      FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid()
        AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- ============================================
-- ACOPLADOS (opcional, por si también los usas)
-- ============================================

ALTER TABLE acoplados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acoplados: acceso por transporte" ON acoplados;
DROP POLICY IF EXISTS "Acoplados: insertar si es dueño" ON acoplados;
DROP POLICY IF EXISTS "Acoplados: actualizar si es dueño" ON acoplados;
DROP POLICY IF EXISTS "Acoplados: borrar si es dueño" ON acoplados;
DROP POLICY IF EXISTS "acoplados_select_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_insert_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_update_policy" ON acoplados;
DROP POLICY IF EXISTS "acoplados_delete_policy" ON acoplados;

CREATE POLICY "acoplados_select_policy" ON acoplados
  FOR SELECT USING (
    id_transporte IN (
      SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid()
    )
    OR
    id IN (
      SELECT DISTINCT vd.id_acoplado
      FROM viajes_despacho vd
      INNER JOIN despachos d ON vd.despacho_id = d.id
      WHERE vd.id_acoplado IS NOT NULL
        AND d.created_by = auth.uid()
    )
    OR
    id IN (
      SELECT DISTINCT vd.id_acoplado
      FROM viajes_despacho vd
      WHERE vd.id_acoplado IS NOT NULL
        AND vd.id_transporte IN (SELECT empresa_id FROM usuarios_empresa WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "acoplados_insert_policy" ON acoplados
  FOR INSERT WITH CHECK (
    id_transporte IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

CREATE POLICY "acoplados_update_policy" ON acoplados
  FOR UPDATE USING (
    id_transporte IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

CREATE POLICY "acoplados_delete_policy" ON acoplados
  FOR DELETE USING (
    id_transporte IN (
      SELECT ue.empresa_id FROM usuarios_empresa ue
      WHERE ue.user_id = auth.uid() AND ue.rol_interno IN ('coordinador_transporte', 'admin_transporte')
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('choferes', 'camiones', 'acoplados')
ORDER BY tablename, policyname;
