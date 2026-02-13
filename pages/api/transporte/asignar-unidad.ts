// ============================================================================
// API: Asignar unidad operativa (chofer + camión + acoplado) a viaje
// Delega a ViajeEstadoService
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { asignarUnidad } from '../../../lib/services/viajeEstado';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      user_id: '', // No requerido para asignación
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
    console.error('💥 [API asignar-unidad] Error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno del servidor'
    });
  }
}
