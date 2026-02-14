import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware/withAuth';

type Data = { success: boolean; error?: string; deleted?: any };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'Missing id in body' });

  const { data, error } = await supabaseAdmin.from('despachos').delete().eq('id', id).select('id');
  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({ success: true, deleted: data });
}

export default withAuth(handler, { roles: ['admin_nodexia'] });
