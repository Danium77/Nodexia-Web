// pages/api/admin/listar-empresas.ts
// API para obtener lista de empresas con sus IDs

import { withAuth } from '../../../lib/middleware/withAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('📋 Obteniendo lista de empresas...');

    const { data: empresas, error } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre, cuit')
      .order('nombre');

    if (error) {
      throw error;
    }

    console.log(`✅ Encontradas ${empresas.length} empresas`);

    return res.status(200).json({
      success: true,
      empresas: empresas,
      count: empresas.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo empresas:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });