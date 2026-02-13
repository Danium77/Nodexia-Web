// ============================================================================
// API: Asignar unidad operativa (chofer + camión + acoplado) a viaje
// Delega a ViajeEstadoService
// ============================================================================

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { asignarUnidad } from '../../../lib/services/viajeEstado';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { viajeId, despachoId, choferId, camionId, acopladoId, unidadNombre, pedidoId } = req.body;

  if (!viajeId || !choferId || !camionId) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: viajeId, choferId, camionId' });
  }

  try {
    const result = await asignarUnidad(supabaseAdmin, {
      viaje_id: viajeId,
      despacho_id: despachoId,
      chofer_id: choferId,
      camion_id: camionId,
      acoplado_id: acopladoId,
      user_id: authCtx.userId,
      unidad_nombre: unidadNombre,
      pedido_id: pedidoId,
    });

    if (!result.exitoso) {
      return res.status(400).json({ error: result.mensaje });
    }

    return res.status(200).json({
      success: true,
      message: result.mensaje,
      viajeId,
      despachoId: result.data?.despacho_id,
    });

  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno del servidor'
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
