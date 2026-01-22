import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * API endpoint para que transportes obtengan información de despachos
 * Bypasea RLS usando supabaseAdmin
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { despacho_ids } = req.body;

    if (!despacho_ids || !Array.isArray(despacho_ids)) {
      return res.status(400).json({ error: 'despacho_ids array is required' });
    }

    if (despacho_ids.length === 0) {
      return res.status(200).json({ data: [] });
    }

    // Obtener información de despachos con supabaseAdmin (bypasea RLS)
    const { data, error } = await supabaseAdmin
      .from('despachos')
      .select('id, pedido_id, origen, destino, scheduled_local_date, scheduled_local_time, prioridad, created_at')
      .in('id', despacho_ids);

    if (error) {
      console.error('Error obteniendo despachos:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });

  } catch (error: any) {
    console.error('Error en despachos-info:', error);
    return res.status(500).json({ error: error.message });
  }
}
