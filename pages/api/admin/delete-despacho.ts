import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type Data = { success: boolean; error?: string; deleted?: any };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  // Protected endpoint: require POST and secret header
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const headerSecret = req.headers['x-admin-secret'] || req.headers['x-admin-secret'.toLowerCase()];
  const envSecret = process.env.ADMIN_DELETE_SECRET;
  if (!envSecret) return res.status(500).json({ success: false, error: 'Server missing ADMIN_DELETE_SECRET env var' });
  if (!headerSecret || headerSecret !== envSecret) return res.status(401).json({ success: false, error: 'Unauthorized - missing or invalid secret' });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'Missing id in body' });

  try {
  } catch (e) {
    // ignore
  }

  const { data, error } = await supabaseAdmin.from('despachos').delete().eq('id', id).select('id');
  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({ success: true, deleted: data });
}
