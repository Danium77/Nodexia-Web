// pages/api/supervisor-carga/llamar-carga.ts
// API para que el supervisor llame a un camión a cargar

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
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
        required: ['viaje_id', 'usuario_id']
      });
    }

    // 1. Validar que el viaje está en estado correcto
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes')
      .select(`
        *,
        chofer:choferes(*)
      `)
      .eq('id', viaje_id)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    if (viaje.estado_viaje !== 'en_playa_esperando') {
      return res.status(400).json({
        error: `No se puede llamar a carga un viaje en estado: ${viaje.estado_viaje}`,
        details: 'Solo se pueden llamar viajes que estén en playa esperando'
      });
    }

    // 2. Actualizar estado del viaje
    const updateData = {
      estado_viaje: 'llamado_carga',
      fecha_llamado_carga: new Date().toISOString(),
      llamado_por: usuario_id,
      observaciones: observaciones ? 
        (viaje.observaciones ? viaje.observaciones + '\n' : '') + `[LLAMADO CARGA] ${observaciones}${posicion_carga ? ` - Posición: ${posicion_carga}` : ''}` :
        viaje.observaciones,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('viajes')
      .update(updateData)
      .eq('id', viaje_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 3. Enviar notificación push al chofer
    await enviarNotificacionLlamadoCarga(viaje, posicion_carga);

    return res.status(200).json({
      success: true,
      message: 'Llamado a carga realizado exitosamente',
      data: {
        viaje_id: viaje.id,
        numero_viaje: viaje.numero_viaje,
        estado_anterior: 'en_playa_esperando',
        estado_nuevo: 'llamado_carga',
        posicion_carga: posicion_carga,
        chofer: `${viaje.chofer.nombre} ${viaje.chofer.apellido}`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error en llamado a carga:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}

async function enviarNotificacionLlamadoCarga(viaje: any, posicionCarga?: string) {
  try {
    // Buscar usuario del chofer
    const { data: usuarioChofer } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', viaje.chofer.email)
      .single();

    if (!usuarioChofer) {
      console.log('No se encontró usuario para el chofer:', viaje.chofer.email);
      return;
    }

    const mensaje = posicionCarga 
      ? `Su camión ha sido llamado a cargar. Diríjase a la posición ${posicionCarga} del sector de carga.`
      : `Su camión ha sido llamado a cargar. Diríjase al sector de carga y consulte la posición asignada.`;

    await supabaseAdmin
      .from('notificaciones')
      .insert({
        user_id: usuarioChofer.id,
        tipo: 'mensaje_sistema',
        titulo: '🚛 Llamado a Carga',
        mensaje,
        viaje_id: viaje.id,
        metadata: {
          numero_viaje: viaje.numero_viaje,
          posicion_carga: posicionCarga,
          tipo_operacion: viaje.tipo_operacion
        }
      });

    console.log('✅ Notificación de llamado a carga enviada al chofer:', viaje.chofer.email);

  } catch (error) {
    console.error('Error enviando notificación llamado a carga:', error);
    // No fallar la operación principal
  }
}