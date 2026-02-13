// pages/api/control-acceso/confirmar-accion.ts
// API thin route: confirmar ingreso o egreso después de validar QR
// Usa: cambiarEstadoViaje() + notificarCambioEstado() — fuente de verdad centralizada

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cambiarEstadoViaje } from '../../../lib/services/viajeEstado';
import { notificarCambioEstado } from '../../../lib/services/notificaciones';
import type { EstadoViajeType } from '../../../lib/estados';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { viaje_id, accion, usuario_id, observaciones } = req.body;

    if (!viaje_id || !accion || !usuario_id) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        required: ['viaje_id', 'accion', 'usuario_id']
      });
    }

    // 1. Obtener estado actual del viaje
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id, estado, estado_unidad, numero_viaje, chofer_id, despacho_id')
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const estadoActual = viaje.estado || viaje.estado_unidad;

    // 2. Determinar el nuevo estado según acción + estado actual
    let nuevoEstado: EstadoViajeType;

    if (accion === 'ingreso') {
      if (estadoActual === 'en_transito_origen') {
        nuevoEstado = 'ingresado_origen';
      } else if (estadoActual === 'en_transito_destino') {
        nuevoEstado = 'ingresado_destino';
      } else {
        return res.status(400).json({
          error: `No se puede ingresar un viaje en estado: ${estadoActual}`
        });
      }
    } else if (accion === 'egreso') {
      if (estadoActual === 'egreso_origen') {
        nuevoEstado = 'en_transito_destino';
      } else if (estadoActual === 'egreso_destino') {
        nuevoEstado = 'completado';
      } else {
        return res.status(400).json({
          error: `No se puede egresar un viaje en estado: ${estadoActual}`
        });
      }
    } else {
      return res.status(400).json({
        error: 'Acción no válida. Use "ingreso" o "egreso"'
      });
    }

    // 3. Cambiar estado via servicio centralizado (valida + sync despacho)
    const obs = observaciones || `${accion === 'ingreso' ? 'Ingreso' : 'Egreso'} confirmado por Control de Acceso`;
    const resultado = await cambiarEstadoViaje(supabaseAdmin, {
      viaje_id,
      nuevo_estado: nuevoEstado,
      user_id: usuario_id,
      observaciones: obs,
    });

    if (!resultado.exitoso) {
      return res.status(400).json({
        error: resultado.mensaje,
        details: `${estadoActual} → ${nuevoEstado}`
      });
    }

    // 4. Crear registro de acceso (auditoría)
    await supabaseAdmin
      .from('registros_acceso')
      .insert({
        viaje_id,
        tipo: accion as 'ingreso' | 'egreso',
        usuario_id,
        observaciones: obs,
        timestamp: new Date().toISOString()
      })
      .then(({ error }) => {
        if (error) console.error('Error creando registro de acceso:', error);
      });

    // 5. Notificar al chofer
    await notificarCambioEstado(supabaseAdmin, viaje_id, nuevoEstado).catch(err => {
      console.error('Error notificando chofer:', err);
    });

    return res.status(200).json({
      success: true,
      message: `${accion === 'ingreso' ? 'Ingreso' : 'Egreso'} confirmado exitosamente`,
      data: {
        viaje_id: viaje.id,
        numero_viaje: viaje.numero_viaje,
        estado_anterior: estadoActual,
        estado_nuevo: nuevoEstado,
        timestamp: new Date().toISOString(),
        usuario_responsable: usuario_id
      }
    });

  } catch (error: any) {
    console.error('Error confirmando acción:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}