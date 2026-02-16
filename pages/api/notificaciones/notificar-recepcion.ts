import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res, _authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { despacho_id } = req.body;

    if (!despacho_id) {
      return res.status(400).json({ error: 'despacho_id es requerido' });
    }

    // Obtener datos del despacho
    const { data: despacho, error: despachoError } = await supabaseAdmin
      .from('despachos')
      .select(
        `
        id,
        pedido_id,
        origen,
        destino,
        origen_id,
        destino_id,
        empresa_id,
        scheduled_local_date
      `
      )
      .eq('id', despacho_id)
      .single();

    if (despachoError || !despacho) {
      return res.status(404).json({ error: 'Despacho no encontrado' });
    }

    // Verificar si el destino corresponde a ubicaciones de otras empresas (recepción)
    if (!despacho.destino_id) {
      return res.status(200).json({
        message: 'Despacho sin destino_id, no se generan notificaciones de recepción'
      });
    }

    const { data: ubicacionDestino } = await supabaseAdmin
      .from('ubicaciones')
      .select('id, nombre, empresa_id')
      .eq('id', despacho.destino_id)
      .single();

    if (!ubicacionDestino) {
      return res.status(200).json({ message: 'Ubicación de destino no encontrada' });
    }

    // Si el destino pertenece a otra empresa, es una recepción
    if (ubicacionDestino.empresa_id !== despacho.empresa_id) {
      // Obtener coordinadores de la empresa receptora
      const { data: coordinadores, error: coordError } = await supabaseAdmin
        .from('relaciones_empresas')
        .select('user_id')
        .eq('empresa_cliente_id', ubicacionDestino.empresa_id)
        .eq('role_type', 'coordinador')
        .eq('activo', true);

      if (coordError) {
        console.error('Error al obtener coordinadores:', coordError);
        return res.status(500).json({ error: 'Error al obtener coordinadores' });
      }

      if (!coordinadores || coordinadores.length === 0) {
        return res.status(200).json({
          message: 'No hay coordinadores activos en la empresa receptora'
        });
      }

      // Crear notificaciones para cada coordinador
      const notificaciones = coordinadores.map((coord) => ({
        user_id: coord.user_id,
        tipo: 'recepcion_nueva',
        titulo: 'Nueva Recepción Programada',
        mensaje: `Tienes una nueva recepción programada para el ${new Date(
          despacho.scheduled_local_date
        ).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })} en ${ubicacionDestino.nombre}. Pedido: ${despacho.pedido_id}, Origen: ${despacho.origen}`,
        despacho_id: despacho.id,
        leida: false
      }));

      const { data: notifData, error: notifError } = await supabaseAdmin
        .from('notificaciones')
        .insert(notificaciones)
        .select();

      if (notifError) {
        console.error('Error al crear notificaciones:', notifError);
        return res.status(500).json({
          error: 'Error al crear notificaciones',
          details: notifError.message
        });
      }

      return res.status(200).json({
        success: true,
        message: `${notificaciones.length} notificaciones de recepción creadas`,
        data: notifData
      });
    } else {
      return res.status(200).json({
        message: 'Despacho interno (mismo empresa origen-destino), no genera recepción'
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
