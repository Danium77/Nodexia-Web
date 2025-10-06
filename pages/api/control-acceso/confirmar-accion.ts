// pages/api/control-acceso/confirmar-accion.ts
// API para confirmar ingreso o egreso después de validar QR

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
    const { qr_code, accion, usuario_id, observaciones } = req.body;

    if (!qr_code || !accion || !usuario_id) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        required: ['qr_code', 'accion', 'usuario_id']
      });
    }

    // 1. Obtener el viaje
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes')
      .select('*')
      .eq('qr_code', qr_code)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    let nuevoEstado;
    let campoFecha;
    let campoUsuario;

    if (accion === 'ingreso') {
      // Validar que está en estado correcto
      if (viaje.estado_viaje !== 'confirmado') {
        return res.status(400).json({
          error: `No se puede ingresar un viaje en estado: ${viaje.estado_viaje}`
        });
      }
      
      nuevoEstado = 'ingresado_planta';
      campoFecha = 'fecha_ingreso_planta';
      campoUsuario = 'ingreso_por';
      
    } else if (accion === 'egreso') {
      // Validar que está listo para egresar
      if (!['carga_finalizada', 'listo_egreso'].includes(viaje.estado_viaje)) {
        return res.status(400).json({
          error: `No se puede egresar un viaje en estado: ${viaje.estado_viaje}`
        });
      }
      
      nuevoEstado = 'egresado_planta';
      campoFecha = 'fecha_egreso_planta';
      campoUsuario = 'egreso_por';
    }

    // 2. Actualizar el viaje con el nuevo estado
    const updateData: any = {
      estado_viaje: nuevoEstado,
      [campoFecha]: new Date().toISOString(),
      [campoUsuario]: usuario_id,
      updated_at: new Date().toISOString()
    };

    if (observaciones) {
      updateData.observaciones = (viaje.observaciones ? viaje.observaciones + '\n' : '') + 
        `[${accion.toUpperCase()}] ${observaciones}`;
    }

    const { data: viajeActualizado, error: updateError } = await supabaseAdmin
      .from('viajes')
      .update(updateData)
      .eq('id', viaje.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 3. Si es ingreso, cambiar automáticamente a "en_playa_esperando"
    if (accion === 'ingreso') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa
      
      await supabaseAdmin
        .from('viajes')
        .update({ 
          estado_viaje: 'en_playa_esperando',
          updated_at: new Date().toISOString()
        })
        .eq('id', viaje.id);
    }

    // 4. Crear notificación para el chofer
    await crearNotificacionChofer(viaje, accion, nuevoEstado);

    // 5. Crear log de auditoría (opcional)
    await crearLogAuditoria(viaje.id, accion, usuario_id, nuevoEstado);

    return res.status(200).json({
      success: true,
      message: `${accion === 'ingreso' ? 'Ingreso' : 'Egreso'} confirmado exitosamente`,
      data: {
        viaje_id: viaje.id,
        numero_viaje: viaje.numero_viaje,
        estado_anterior: viaje.estado_viaje,
        estado_nuevo: accion === 'ingreso' ? 'en_playa_esperando' : nuevoEstado,
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

async function crearNotificacionChofer(viaje: any, accion: string, nuevoEstado: string) {
  try {
    // Buscar el usuario chofer asociado al viaje
    const { data: chofer } = await supabaseAdmin
      .from('choferes')
      .select('email')
      .eq('id', viaje.chofer_id)
      .single();

    if (!chofer?.email) return;

    const { data: usuarioChofer } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', chofer.email)
      .single();

    if (!usuarioChofer) return;

    let titulo, mensaje;
    if (accion === 'ingreso') {
      titulo = 'Ingreso Confirmado';
      mensaje = `Su camión ha ingresado a la planta. Viaje: ${viaje.numero_viaje}. Diríjase a la playa de estacionamiento.`;
    } else {
      titulo = 'Egreso Autorizado';
      mensaje = `Puede egresar de la planta. Viaje: ${viaje.numero_viaje} completado exitosamente.`;
    }

    await supabaseAdmin
      .from('notificaciones')
      .insert({
        usuario_id: usuarioChofer.id,
        tipo_notificacion: accion === 'ingreso' ? 'estado_actualizado' : 'estado_actualizado',
        titulo,
        mensaje,
        viaje_id: viaje.id,
        enviada: true,
        fecha_envio: new Date().toISOString(),
        datos_extra: {
          estado_nuevo: nuevoEstado,
          accion: accion
        }
      });

  } catch (error) {
    console.error('Error creando notificación chofer:', error);
    // No fallar la operación principal por esto
  }
}

async function crearLogAuditoria(viajeId: string, accion: string, usuarioId: string, nuevoEstado: string) {
  try {
    // En una implementación completa, tendríamos una tabla de logs
    console.log('LOG AUDITORÍA:', {
      viaje_id: viajeId,
      accion,
      usuario_id: usuarioId,
      nuevo_estado: nuevoEstado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creando log auditoría:', error);
  }
}