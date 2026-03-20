import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Find active reservations with a despacho_id set
  const { data: activas, error: fetchError } = await supabaseAdmin
    .from('turnos_reservados')
    .select('id, numero_turno, despacho_id')
    .in('estado', ['reservado', 'confirmado'])
    .not('despacho_id', 'is', null);

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  if (!activas || activas.length === 0) {
    return res.status(200).json({ message: 'No hay reservas con despacho_id', cancelled: 0 });
  }

  // Check which despachos still exist
  const despachoIds = [...new Set(activas.map((r: any) => r.despacho_id))];
  const { data: existingDespachos } = await supabaseAdmin
    .from('despachos')
    .select('id')
    .in('id', despachoIds);

  const existingSet = new Set((existingDespachos || []).map((d: any) => d.id));
  const orphaned = activas.filter((r: any) => !existingSet.has(r.despacho_id));

  if (orphaned.length === 0) {
    return res.status(200).json({ message: 'No hay reservas huerfanas', cancelled: 0 });
  }

  const orphanIds = orphaned.map((r: any) => r.id);
  const { error: updateError } = await supabaseAdmin
    .from('turnos_reservados')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .in('id', orphanIds);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({
    message: `Canceladas ${orphaned.length} reservas huerfanas`,
    cancelled: orphaned.length,
    turnos: orphaned.map((r: any) => r.numero_turno),
  });
}, { roles: ['admin_nodexia'] });
