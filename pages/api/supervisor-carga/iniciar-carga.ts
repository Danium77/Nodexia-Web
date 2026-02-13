// pages/api/supervisor-carga/iniciar-carga.ts
// API para iniciar carga después de escanear QR del chofer
// ─── Ruta thin: delega lógica a servicios ───

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cambiarEstadoViaje } from '@/lib/services/viajeEstado';
import { notificarCambioEstado } from '@/lib/services/notificaciones';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { qr_code, observaciones_inicio } = req.body;
    const usuario_id = authCtx.userId;

    if (!qr_code) {
      return res.status(400).json({
        error: 'Datos requeridos faltantes',
        required: ['qr_code'],
      });
    }

    // 1. Buscar viaje por QR
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id, estado, numero_viaje, tipo_operacion, producto, peso_estimado, fecha_llamado_carga, chofer_id, camion_id')
      .eq('qr_code', qr_code)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({
        error: 'Viaje no encontrado',
        details: 'El código QR no corresponde a ningún viaje válido',
      });
    }

    // 2. Cambiar estado vía servicio (valida transición + sincroniza despacho)
    const obs = observaciones_inicio
      ? `[INICIO CARGA] ${observaciones_inicio}`
      : undefined;

    const resultado = await cambiarEstadoViaje(supabaseAdmin, {
      viaje_id: viaje.id,
      nuevo_estado: 'cargando',
      user_id: usuario_id,
      observaciones: obs,
    });

    if (!resultado.exitoso) {
      return res.status(400).json({
        error: resultado.mensaje,
        estado_actual: resultado.estado_anterior,
        acciones_sugeridas: getAccionesSugeridas(viaje.estado),
      });
    }

    // 3. Notificar chofer (vía servicio)
    await notificarCambioEstado(supabaseAdmin, viaje.id, 'cargando');

    return res.status(200).json({
      success: true,
      message: 'Carga iniciada exitosamente',
      data: {
        viaje: {
          id: viaje.id,
          numero_viaje: viaje.numero_viaje,
          tipo_operacion: viaje.tipo_operacion,
          producto: viaje.producto,
          peso_estimado: viaje.peso_estimado,
          estado_anterior: resultado.estado_anterior,
          estado_nuevo: 'cargando',
        },
        timestamps: {
          inicio_carga: new Date().toISOString(),
          llamado_carga: viaje.fecha_llamado_carga,
        },
        proximos_estados: resultado.proximos_estados,
        siguiente_paso: {
          accion: 'finalizar_carga',
          descripcion: 'Una vez completada la carga, suba la foto del remito y finalice el proceso',
        },
      },
    });
  } catch (error: any) {
    console.error('Error iniciando carga:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
}, { roles: ['supervisor', 'coordinador', 'control_acceso'] });

function getAccionesSugeridas(estadoActual: string) {
  const sugerencias: Record<string, string> = {
    confirmado_chofer: 'El camión debe ingresar a planta primero (Control de Acceso)',
    ingresado_origen: 'Debe llamar al camión a carga antes de iniciar',
    cargando: 'La carga ya está en proceso',
    cargado: 'La carga ya fue finalizada',
    egreso_origen: 'El viaje ya fue completado en esta planta',
  };
  return sugerencias[estadoActual] || 'Consulte el estado del viaje';
}