-- ============================================================
-- 086: Fix turno_contadores RLS - trigger needs SECURITY DEFINER
-- The trigger fn_generar_numero_turno writes to turno_contadores
-- but only a SELECT policy exists. Making the function SECURITY
-- DEFINER lets it bypass RLS for the internal counter table.
-- Users cannot call this function directly (only via trigger).
-- ============================================================

-- Recreate function as SECURITY DEFINER so it can write to turno_contadores
CREATE OR REPLACE FUNCTION fn_generar_numero_turno()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_planta_id UUID;
  v_codigo TEXT;
  v_siguiente INT;
BEGIN
  SELECT vr.empresa_planta_id INTO v_planta_id
  FROM ventanas_recepcion vr WHERE vr.id = NEW.ventana_id;

  IF v_planta_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO turno_contadores (empresa_planta_id, ultimo_numero)
  VALUES (v_planta_id, 0)
  ON CONFLICT (empresa_planta_id) DO NOTHING;

  UPDATE turno_contadores
  SET ultimo_numero = ultimo_numero + 1
  WHERE empresa_planta_id = v_planta_id
  RETURNING ultimo_numero INTO v_siguiente;

  SELECT COALESCE(codigo_turno, UPPER(LEFT(REGEXP_REPLACE(nombre, '[^A-Za-z]', '', 'g'), 2)))
  INTO v_codigo
  FROM empresas WHERE id = v_planta_id;

  NEW.numero_turno := v_codigo || LPAD(v_siguiente::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Register migration
INSERT INTO schema_migrations (version, name, filename, checksum, applied_at)
VALUES (86, 'fix_turno_contadores_rls', '086_fix_turno_contadores_rls.sql', md5('086_fix_turno_contadores_rls')::text, now())
ON CONFLICT (version) DO NOTHING;
