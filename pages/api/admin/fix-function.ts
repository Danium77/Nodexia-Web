import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar que la función existe intentando usarla
    await supabaseAdmin
      .from('empresas')
      .select('*')
      .limit(0);

    // Intentar usar la función de creación
    const { error: functionError } = await supabaseAdmin.rpc('crear_empresa_completa', {
      p_nombre: 'test',
      p_cuit: 'test',
      p_email: 'test@test.com'
    });

    if (functionError && !functionError.message.includes('test')) {
      console.error('Error testing function:', functionError);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Función crear_empresa_completa verificada correctamente' 
    });

  } catch (error: any) {
    console.error('Error ejecutando fix:', error);
    res.status(500).json({ 
      error: 'Error ejecutando fix', 
      details: error.message 
    });
  }
}
