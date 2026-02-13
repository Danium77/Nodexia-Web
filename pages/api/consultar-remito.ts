// pages/api/consultar-remito.ts
// API route to check if a remito exists for a viaje (uses service_role to bypass RLS)
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const viajeId = req.query.viaje_id as string;
    if (!viajeId) {
      return res.status(400).json({ error: 'Missing viaje_id' });
    }

    // Query documentos_viaje_seguro using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('documentos_viaje_seguro')
      .select('id, file_url, nombre_archivo, tipo, created_at')
      .eq('viaje_id', viajeId)
      .eq('tipo', 'remito')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      found: !!data,
      remito: data,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
