// pages/api/supervisor-carga/iniciar-carga.ts
// API para iniciar carga después de escanear QR del chofer

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
    const { qr_code, usuario_id, observaciones_inicio } = req.body;

    if (!qr_code || !usuario_id) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        required: ['qr_code', 'usuario_id']
      });
    }

    // 1. Buscar viaje por QR
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes')
      .select(`
        *,
        chofer:choferes(*),
        camion:camiones(*)
      `)
      .eq('qr_code', qr_code)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ 
        error: 'Viaje no encontrado',
        details: 'El código QR no corresponde a ningún viaje válido'
      });
    }

    // 2. Validar estado del viaje
    if (viaje.estado_viaje !== 'llamado_carga') {
      return res.status(400).json({
        error: `No se puede iniciar carga en estado: ${viaje.estado_viaje}`,
        details: 'El viaje debe estar en estado "llamado_carga" para poder iniciar la carga',
        estado_actual: viaje.estado_viaje,
        acciones_sugeridas: getAccionesSugeridas(viaje.estado_viaje)
      });
    }

    // 3. Actualizar estado a "iniciando_carga" y luego a "cargando"
    const updateData = {
      estado_viaje: 'cargando',
      fecha_inicio_carga: new Date().toISOString(),
      carga_iniciada_por: usuario_id,
      observaciones: observaciones_inicio ? 
        (viaje.observaciones ? viaje.observaciones + '\n' : '') + `[INICIO CARGA] ${observaciones_inicio}` :
        viaje.observaciones,
      updated_at: new Date().toISOString()
    };

    const { data: viajeActualizado, error: updateError } = await supabaseAdmin
      .from('viajes')
      .update(updateData)
      .eq('id', viaje.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 4. Enviar notificación al chofer
    await enviarNotificacionInicioCarga(viaje);

    // 5. Preparar datos de respuesta
    const response = {
      viaje: {
        id: viaje.id,
        numero_viaje: viaje.numero_viaje,
        tipo_operacion: viaje.tipo_operacion,
        producto: viaje.producto,
        peso_estimado: viaje.peso_estimado,
        estado_anterior: 'llamado_carga',
        estado_nuevo: 'cargando'
      },
      chofer: {
        nombre_completo: `${viaje.chofer.nombre} ${viaje.chofer.apellido}`,
        dni: viaje.chofer.dni,
        telefono: viaje.chofer.telefono
      },
      vehiculo: {
        patente: viaje.camion.patente,
        marca: viaje.camion.marca,
        modelo: viaje.camion.modelo
      },
      timestamps: {
        inicio_carga: updateData.fecha_inicio_carga,
        llamado_carga: viaje.fecha_llamado_carga
      },
      siguiente_paso: {
        accion: 'finalizar_carga',
        descripcion: 'Una vez completada la carga, suba la foto del remito y finalice el proceso'
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Carga iniciada exitosamente',
      data: response
    });

  } catch (error: any) {
    console.error('Error iniciando carga:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}

function getAccionesSugeridas(estadoActual: string) {
  const sugerencias: { [key: string]: string } = {
    'confirmado': 'El camión debe ingresar a planta primero (Control de Acceso)',
    'en_playa_esperando': 'Debe llamar al camión a carga antes de iniciar',
    'cargando': 'La carga ya está en proceso',
    'carga_finalizada': 'La carga ya fue finalizada',
    'egresado_planta': 'El viaje ya fue completado'
  };

  return sugerencias[estadoActual] || 'Consulte el estado del viaje';
}

async function enviarNotificacionInicioCarga(viaje: any) {
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

    const mensaje = viaje.tipo_operacion === 'carga' 
      ? `Ha iniciado la carga de ${viaje.producto}. Manténgase cerca del vehículo durante el proceso.`
      : `Ha iniciado la descarga de ${viaje.producto}. Supervise el proceso de descarga.`;

    await supabaseAdmin
      .from('notificaciones')
      .insert({
        usuario_id: usuarioChofer.id,
        tipo_notificacion: 'carga_iniciada',
        titulo: '⚡ Carga Iniciada',
        mensaje,
        viaje_id: viaje.id,
        enviada: true,
        fecha_envio: new Date().toISOString(),
        datos_extra: {
          numero_viaje: viaje.numero_viaje,
          tipo_operacion: viaje.tipo_operacion,
          producto: viaje.producto
        }
      });

    console.log('✅ Notificación de inicio de carga enviada al chofer:', viaje.chofer.email);

  } catch (error) {
    console.error('Error enviando notificación inicio carga:', error);
  }
}