import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/admin/db-check — temporary diagnostic endpoint
 * Returns which database supabaseAdmin connects to and searches for a despacho
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
  
  // Try to find the despacho
  const { data: despacho, error } = await supabaseAdmin
    .from('despachos')
    .select('id, pedido_id, estado')
    .eq('pedido_id', 'DSP-20260321-002')
    .maybeSingle();

  // Also try ilike
  const { data: ilikeResult, error: ilikeError } = await supabaseAdmin
    .from('despachos')
    .select('id, pedido_id')
    .ilike('pedido_id', '%20260321%')
    .limit(5);

  // Count total despachos
  const { count } = await supabaseAdmin
    .from('despachos')
    .select('*', { count: 'exact', head: true });

  return res.status(200).json({
    supabase_url: supabaseUrl,
    total_despachos: count,
    exact_match: { data: despacho, error: error?.message || null },
    ilike_match: { data: ilikeResult, error: ilikeError?.message || null },
  });
}
