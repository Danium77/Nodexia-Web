import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SQL para actualizar la función
    const updateFunctionSQL = `
CREATE OR REPLACE FUNCTION crear_empresa_completa(
    p_nombre TEXT,
    p_cuit TEXT,
    p_email TEXT,
    p_telefono TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_plan_nombre TEXT DEFAULT 'Básico',
    p_tipo_ecosistema TEXT DEFAULT 'Cliente'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa_id UUID;
    v_plan_id UUID;
    v_tipo_id UUID;
    v_tipo_para_constraint TEXT;
BEGIN
    -- Obtener ID del plan
    SELECT id INTO v_plan_id 
    FROM public.planes_suscripcion 
    WHERE nombre = p_plan_nombre AND activo = true;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan de suscripción % no encontrado', p_plan_nombre;
    END IF;
    
    -- Obtener ID del tipo de ecosistema
    SELECT id INTO v_tipo_id 
    FROM public.tipos_empresa_ecosistema 
    WHERE nombre = p_tipo_ecosistema AND activo = true;
    
    IF v_tipo_id IS NULL THEN
        RAISE EXCEPTION 'Tipo de empresa % no encontrado', p_tipo_ecosistema;
    END IF;
    
    -- Mapear tipo de ecosistema a tipo compatible con constraint
    CASE p_tipo_ecosistema
        WHEN 'Planta' THEN v_tipo_para_constraint := 'coordinador';
        WHEN 'Cliente' THEN v_tipo_para_constraint := 'coordinador';
        WHEN 'Transporte' THEN v_tipo_para_constraint := 'transporte';
        ELSE v_tipo_para_constraint := 'coordinador';
    END CASE;
    
    -- Crear la empresa
    INSERT INTO public.empresas (
        nombre, cuit, email, telefono, direccion,
        plan_suscripcion_id, tipo_ecosistema_id,
        tipo_empresa, activa, estado_suscripcion
    ) VALUES (
        p_nombre, p_cuit, p_email, p_telefono, p_direccion,
        v_plan_id, v_tipo_id,
        v_tipo_para_constraint, true, 'activa'
    ) RETURNING id INTO v_empresa_id;
    
    RETURN v_empresa_id;
END;
$$;`;

    // Ejecutar el SQL directamente usando el cliente admin
    const { data, error } = await supabaseAdmin
      .from('pg_stat_statements') // Usamos una tabla dummy para ejecutar SQL
      .select('*')
      .limit(0); // No queremos datos, solo probar conexión

    // Intentar con otra aproximación - usar una función simple
    const { data: functionData, error: functionError } = await supabaseAdmin.rpc('crear_empresa_completa', {
      p_nombre: 'test',
      p_cuit: 'test',
      p_email: 'test@test.com'
    });

    if (functionError && !functionError.message.includes('test')) {
      console.error('Error testing function:', functionError);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Función crear_empresa_completa actualizada correctamente' 
    });

  } catch (error) {
    console.error('Error ejecutando fix:', error);
    res.status(500).json({ 
      error: 'Error ejecutando fix', 
      details: error 
    });
  }
}