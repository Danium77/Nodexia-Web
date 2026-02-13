// pages/api/supervisor-carga/llamar-carga.ts
// API para que el supervisor llame a un camión a cargar
// ─── Ruta thin: delega lógica a servicios ───

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cambiarEstadoViaje } from '@/lib/services/viajeEstado';
import { notificarCambioEstado } from '@/lib/services/notificaciones';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { viaje_id, usuario_id, posicion_carga, observaciones } = req.body;

    if (!viaje_id || !usuario_id) {
      return res.status(400).json({
        error: 'Datos requeridos faltantes',
        required: ['viaje_id', 'usuario_id'],
      });
    }

    // 1. Cambiar estado vía servicio (valida transición + sincroniza despacho)
    const obs = observaciones
      ? `[LLAMADO CARGA] ${observaciones}${posicion_carga ? ` - Posición: ${posicion_carga}` : ''}`
      : undefined;

    const resultado = await cambiarEstadoViaje(supabaseAdmin, {
      viaje_id,
      nuevo_estado: 'llamado_carga',
      user_id: usuario_id,
      observaciones: obs,
    });

    if (!resultado.exitoso) {
      return res.status(400).json({
        error: resultado.mensaje,
        estado_anterior: resultado.estado_anterior,
      });
    }

    // 2. Notificar chofer (vía servicio)
    await notificarCambioEstado(supabaseAdmin, viaje_id, 'llamado_carga');

    return res.status(200).json({
      success: true,
      message: 'Llamado a carga realizado exitosamente',
      data: {
        viaje_id,
        estado_anterior: resultado.estado_anterior,
        estado_nuevo: 'llamado_carga',
        posicion_carga,
        proximos_estados: resultado.proximos_estados,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error en llamado a carga:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
}