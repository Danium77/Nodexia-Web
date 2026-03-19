import type { NextApiRequest, NextApiResponse } from 'next';
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

  // Validar que todos los despachos pertenezcan al usuario (o sea admin_nodexia)
  if (authCtx.rolInterno !== 'admin_nodexia') {
    const { data: despachos, error: checkError } = await supabaseAdmin
      .from('despachos')
      .select('id, created_by')
      .in('id', ids);

    if (checkError) {
      return res.status(500).json({ error: checkError.message });
    }

    const noAutorizados = (despachos || []).filter(
      (d: any) => d.created_by !== authCtx.userId
    );

    if (noAutorizados.length > 0) {
      return res.status(403).json({
        error: 'No tiene permiso para eliminar despachos que no le pertenecen',
      });
    }
  }

  // Eliminar viajes asociados primero (cascade debería manejar, pero por seguridad)
  const { error: viajesError } = await supabaseAdmin
    .from('viajes_despacho')
    .delete()
    .in('despacho_id', ids);

  if (viajesError) {
    console.error('Error eliminando viajes asociados:', viajesError);
  }

  // Eliminar despachos
  const { data, error } = await supabaseAdmin
    .from('despachos')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    deleted: data?.length || 0,
    ids: (data || []).map((d: any) => d.id),
  });
}

export default withAuth(handler, {
  roles: [
    'admin_nodexia',
    'coordinador',
    'coordinador_integral',
    'administrativo',
    'gerente',
    'supervisor',
  ],
});
