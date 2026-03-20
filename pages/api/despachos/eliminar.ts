import type { NextApiRequest, NextApiResponse } from 'next';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse, authCtx: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ids } = req.body || {};
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids (array) requerido' });
  }

  if (ids.length > 50) {
    return res.status(400).json({ error: 'Maximo 50 despachos por operacion' });
  }

  const supabase = createUserSupabaseClient(authCtx.token);

  // Eliminar despachos — RLS policy "Solo coordinadores eliminan sus despachos"
  // viajes_despacho se eliminan automáticamente por ON DELETE CASCADE
  // filtra automáticamente por empresa_id + rol del usuario
  const { data, error } = await supabase
    .from('despachos')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const deletedCount = data?.length ?? 0;

  if (deletedCount === 0) {
    return res.status(403).json({
      error: 'No tiene permiso para eliminar estos despachos',
    });
  }

  // Cancel linked turno reservations (cascade)
  const deletedIds = data.map((d: any) => d.id);
  await supabaseAdmin
    .from('turnos_reservados')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .in('despacho_id', deletedIds)
    .in('estado', ['reservado', 'confirmado']);

  return res.status(200).json({
    deleted: deletedCount,
    ids: deletedIds,
  });
}

export default withAuth(handler, {
  roles: [
    'admin_nodexia',
    'coordinador',
    'coordinador_integral',
  ],
});
