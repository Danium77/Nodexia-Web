import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Eliminar constraint existente
    await supabaseAdmin.rpc('ejecutar_sql', {
      sql_query: 'ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_tipo_empresa_check;'
    });

    // Crear nuevo constraint
    await supabaseAdmin.rpc('ejecutar_sql', {
      sql_query: `ALTER TABLE public.empresas 
        ADD CONSTRAINT empresas_tipo_empresas_check 
        CHECK (tipo_empresa IN ('transporte', 'coordinador', 'Planta', 'Transporte', 'Cliente'));`
    });

    res.status(200).json({ 
      success: true, 
      message: 'Constraint actualizado correctamente' 
    });

  } catch (error) {
    console.error('Error ejecutando fix:', error);
    res.status(500).json({ 
      error: 'Error ejecutando fix', 
      details: error 
    });
  }
}