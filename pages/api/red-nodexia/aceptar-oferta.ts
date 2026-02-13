// ============================================================================
// API: Aceptar oferta de Red Nodexia
// Ejecuta con service role para evitar problemas de RLS
// ============================================================================

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ofertaId, viajeRedId, transporteId } = req.body;
  const usuarioId = authCtx.userId;

  if (!ofertaId || !viajeRedId || !transporteId) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: ofertaId, viajeRedId, transporteId' });
  }

  try {
    // 1. Obtener datos del viaje en red
    const { data: viajeRed, error: viajeRedError } = await supabaseAdmin
      .from('viajes_red_nodexia')
      .select('viaje_id, empresa_solicitante_id')
      .eq('id', viajeRedId)
      .single();

    if (viajeRedError || !viajeRed) {
      return res.status(404).json({ error: 'No se encontró el viaje en Red Nodexia' });
    }

    // 2. Obtener despacho_id del viaje
    const { data: viajeDespacho, error: viajeDespachoError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('despacho_id, numero_viaje')
      .eq('id', viajeRed.viaje_id)
      .single();

    if (viajeDespachoError || !viajeDespacho) {
      return res.status(404).json({ error: 'No se encontró el viaje de despacho' });
    }

    // 3. Actualizar oferta aceptada
    const { error: ofertaError } = await supabaseAdmin
      .from('ofertas_red_nodexia')
      .update({
        estado_oferta: 'aceptada',
        fecha_respuesta: new Date().toISOString()
      })
      .eq('id', ofertaId);

    if (ofertaError) {
      return res.status(500).json({ error: 'Error al actualizar la oferta: ' + ofertaError.message });
    }

    // 4. Rechazar las demás ofertas
    const { error: rechazarError } = await supabaseAdmin
      .from('ofertas_red_nodexia')
      .update({
        estado_oferta: 'rechazada',
        fecha_respuesta: new Date().toISOString()
      })
      .eq('viaje_red_id', viajeRedId)
      .neq('id', ofertaId);

    if (rechazarError) {
      // No fatal — continuamos
    }

    // 5. Actualizar viaje en red
    const { error: updateRedError } = await supabaseAdmin
      .from('viajes_red_nodexia')
      .update({
        estado_red: 'asignado',
        transporte_asignado_id: transporteId,
        oferta_aceptada_id: ofertaId,
        fecha_asignacion: new Date().toISOString(),
        asignado_por: usuarioId
      })
      .eq('id', viajeRedId);

    if (updateRedError) {
      return res.status(500).json({ error: 'Error al actualizar viaje en red: ' + updateRedError.message });
    }

    // 6. Actualizar viaje_despacho con transporte asignado
    const { error: updateViajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .update({
        id_transporte: transporteId,
        estado: 'transporte_asignado',
        fecha_asignacion_transporte: new Date().toISOString(),
        origen_asignacion: 'red_nodexia'
      })
      .eq('id', viajeRed.viaje_id);

    if (updateViajeError) {
      return res.status(500).json({ error: 'Error al asignar transporte al viaje: ' + updateViajeError.message });
    }

    // 7. Actualizar despacho
    const { error: updateDespachoError } = await supabaseAdmin
      .from('despachos')
      .update({
        estado: 'asignado',
        origen_asignacion: 'red_nodexia'
      })
      .eq('id', viajeDespacho.despacho_id);

    if (updateDespachoError) {
      return res.status(500).json({ error: 'Error al actualizar despacho: ' + updateDespachoError.message });
    }

    // 8. Obtener nombre del transporte para mostrar en UI
    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('nombre')
      .eq('id', transporteId)
      .single();

    // 9. Registrar en historial
    await supabaseAdmin
      .from('historial_despachos')
      .insert({
        despacho_id: viajeDespacho.despacho_id,
        viaje_id: viajeRed.viaje_id,
        accion: 'oferta_aceptada',
        descripcion: `Oferta aceptada de ${empresa?.nombre || 'transporte'} vía Red Nodexia`,
        usuario_id: usuarioId,
        empresa_id: transporteId,
        metadata: { ofertaId, viajeRedId, origenAsignacion: 'red_nodexia' }
      })
      .then(() => { /* historial registrado */ });

    return res.status(200).json({
      success: true,
      message: 'Transporte asignado correctamente',
      transporteNombre: empresa?.nombre || 'Transporte',
      viajeId: viajeRed.viaje_id,
      despachoId: viajeDespacho.despacho_id
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error inesperado' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
