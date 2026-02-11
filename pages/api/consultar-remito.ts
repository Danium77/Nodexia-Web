// pages/api/consultar-remito.ts
// API route to check if a remito exists for a viaje (uses service_role to bypass RLS)
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify auth
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

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
      console.error('Error querying remito:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      found: !!data,
      remito: data,
    });
  } catch (error: any) {
    console.error('consultar-remito error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
