// ============================================================================
// API: Aceptar oferta de Red Nodexia
// Usa transacción PostgreSQL (pg) para atomicidad — si falla un paso,
// todos se revierten con ROLLBACK.
// Auth sigue vía withAuth (Supabase JWT). Datos vía pg directo.
// ============================================================================

import { withAuth } from '@/lib/middleware/withAuth';
import { Client } from 'pg';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ofertaId, viajeRedId, transporteId } = req.body;
  const usuarioId = authCtx.userId;

  if (!ofertaId || !viajeRedId || !transporteId) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: ofertaId, viajeRedId, transporteId' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    // 1. Obtener datos del viaje en red (FOR UPDATE = lock para evitar race condition)
    const viajeRedResult = await client.query(
      `SELECT viaje_id, empresa_solicitante_id
       FROM viajes_red_nodexia
       WHERE id = $1
       FOR UPDATE`,
      [viajeRedId]
    );

    if (viajeRedResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el viaje en Red Nodexia' });
    }

    const viajeRed = viajeRedResult.rows[0];

    // 2. Obtener despacho_id del viaje (FOR UPDATE = lock)
    const viajeDespachoResult = await client.query(
      `SELECT despacho_id, numero_viaje
       FROM viajes_despacho
       WHERE id = $1
       FOR UPDATE`,
      [viajeRed.viaje_id]
    );

    if (viajeDespachoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el viaje de despacho' });
    }

    const viajeDespacho = viajeDespachoResult.rows[0];
    const ahora = new Date().toISOString();

    // 3. Actualizar oferta aceptada
    const ofertaResult = await client.query(
      `UPDATE ofertas_red_nodexia
       SET estado_oferta = 'aceptada', fecha_respuesta = $1
       WHERE id = $2`,
      [ahora, ofertaId]
    );

    if (ofertaResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'No se pudo actualizar la oferta' });
    }

    // 4. Rechazar las demás ofertas
    await client.query(
      `UPDATE ofertas_red_nodexia
       SET estado_oferta = 'rechazada', fecha_respuesta = $1
       WHERE viaje_red_id = $2 AND id != $3`,
      [ahora, viajeRedId, ofertaId]
    );

    // 5. Actualizar viaje en red
    const updateRedResult = await client.query(
      `UPDATE viajes_red_nodexia
       SET estado_red = 'asignado',
           transporte_asignado_id = $1,
           oferta_aceptada_id = $2,
           fecha_asignacion = $3,
           asignado_por = $4
       WHERE id = $5`,
      [transporteId, ofertaId, ahora, usuarioId, viajeRedId]
    );

    if (updateRedResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Error al actualizar viaje en red' });
    }

    // 6. Actualizar viaje_despacho con transporte asignado
    const updateViajeResult = await client.query(
      `UPDATE viajes_despacho
       SET id_transporte = $1,
           estado = 'transporte_asignado',
           fecha_asignacion_transporte = $2,
           origen_asignacion = 'red_nodexia'
       WHERE id = $3`,
      [transporteId, ahora, viajeRed.viaje_id]
    );

    if (updateViajeResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Error al asignar transporte al viaje' });
    }

    // 7. Actualizar despacho (transport_id para visibilidad RLS)
    const updateDespachoResult = await client.query(
      `UPDATE despachos
       SET estado = 'asignado',
           transport_id = $1,
           origen_asignacion = 'red_nodexia'
       WHERE id = $2`,
      [transporteId, viajeDespacho.despacho_id]
    );

    if (updateDespachoResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Error al actualizar despacho' });
    }

    // 8. Obtener nombre del transporte para la respuesta
    const empresaResult = await client.query(
      `SELECT nombre FROM empresas WHERE id = $1`,
      [transporteId]
    );

    const empresaNombre = empresaResult.rows[0]?.nombre || 'Transporte';

    // 9. Registrar en historial
    await client.query(
      `INSERT INTO historial_despachos
       (despacho_id, viaje_id, accion, descripcion, usuario_id, empresa_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        viajeDespacho.despacho_id,
        viajeRed.viaje_id,
        'oferta_aceptada',
        `Oferta aceptada de ${empresaNombre} vía Red Nodexia`,
        usuarioId,
        transporteId,
        JSON.stringify({ ofertaId, viajeRedId, origenAsignacion: 'red_nodexia' }),
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Transporte asignado correctamente',
      transporteNombre: empresaNombre,
      viajeId: viajeRed.viaje_id,
      despachoId: viajeDespacho.despacho_id,
    });

  } catch (error: any) {
    try { await client.query('ROLLBACK'); } catch (_) { /* connection may be closed */ }
    return res.status(500).json({ error: error.message || 'Error inesperado' });
  } finally {
    try { await client.end(); } catch (_) { /* ignore */ }
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
