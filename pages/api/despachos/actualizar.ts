/**
 * API Route: /api/despachos/actualizar
 * 
 * Actualiza un despacho (solo fecha, hora y observaciones).
 * Solo permite actualizar si TODOS los viajes están en estado pendiente o transporte_asignado.
 * 
 * Método: PUT
 * Auth: Coordinador/Admin
 * 
 * Body:
 * {
 *   despacho_id: string,
 *   fecha_despacho: string,  // YYYY-MM-DD
 *   hora_despacho: string,   // HH:MM
 *   observaciones?: string
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/middleware/withAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default withAuth(
  async (req, res, { userId, empresaId }) => {
    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { despacho_id, fecha_despacho, hora_despacho, observaciones } = req.body;

    // Validaciones
    if (!despacho_id || !fecha_despacho || !hora_despacho) {
      return res.status(400).json({ error: 'Faltan campos requeridos: despacho_id, fecha_despacho, hora_despacho' });
    }

    try {
      // 1. Validar que el despacho existe y pertenece a la empresa del usuario
      const { data: despacho, error: despachoError } = await supabaseAdmin
        .from('despachos')
        .select('id, pedido_id, empresa_id, created_by, scheduled_local_date, scheduled_local_time')
        .eq('id', despacho_id)
        .single();

      if (despachoError || !despacho) {
        return res.status(404).json({ error: 'Despacho no encontrado' });
      }

      // Verificar que pertenece a la empresa del usuario
      if (!empresaId) {
        return res.status(403).json({ error: 'Usuario sin empresa asignada' });
      }

      if (despacho.empresa_id !== empresaId) {
        return res.status(403).json({ error: 'No tienes permiso para actualizar este despacho' });
      }

      // 2. Obtener todos los viajes del despacho y validar estados
      const { data: viajes, error: viajesError } = await supabaseAdmin
        .from('viajes_despacho')
        .select('id, estado, chofer_id, camion_id')
        .eq('despacho_id', despacho_id);

      if (viajesError) {
        console.error('Error al obtener viajes:', viajesError);
        return res.status(500).json({ error: 'Error al verificar viajes del despacho' });
      }

      // Validar que NINGÚN viaje esté en estado confirmado o superior
      const estadosNoEditables = [
        'confirmado_chofer',
        'en_transito_origen',
        'ingresado_origen',
        'llamado_carga',
        'cargando',
        'cargado',
        'egreso_origen',
        'en_transito_destino',
        'ingresado_destino',
        'llamado_descarga',
        'descargando',
        'descargado',
        'egreso_destino',
        'completado'
      ];

      const viajesNoEditables = viajes?.filter(v => estadosNoEditables.includes(v.estado)) || [];

      if (viajesNoEditables.length > 0) {
        return res.status(400).json({
          error: 'No se puede editar el despacho porque tiene viajes confirmados o en proceso',
          viajes_bloqueados: viajesNoEditables.length,
          mensaje: `${viajesNoEditables.length} viaje(s) ya fueron confirmados por el chofer o están en proceso. Solo puedes editar despachos con viajes pendientes o asignados.`
        });
      }

      // 3. Validar que la fecha/hora sea futura
      const fechaHoraNueva = new Date(`${fecha_despacho}T${hora_despacho}`);
      const ahora = new Date();

      if (fechaHoraNueva <= ahora) {
        return res.status(400).json({ error: 'La fecha y hora deben ser futuras' });
      }

      // 4. Actualizar el despacho
      const updateData: any = {
        scheduled_local_date: fecha_despacho,
        scheduled_local_time: hora_despacho,
        updated_at: new Date().toISOString()
      };

      if (observaciones !== undefined) {
        updateData.comentarios = observaciones;
      }

      const { error: updateError } = await supabaseAdmin
        .from('despachos')
        .update(updateData)
        .eq('id', despacho_id);

      if (updateError) {
        console.error('Error al actualizar despacho:', updateError);
        return res.status(500).json({ error: 'Error al actualizar el despacho' });
      }

      // 5. Actualizar scheduled_at en todos los viajes
      const scheduledAt = fechaHoraNueva.toISOString();
      
      const { error: updateViajesError } = await supabaseAdmin
        .from('viajes_despacho')
        .update({
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString()
        })
        .eq('despacho_id', despacho_id);

      if (updateViajesError) {
        console.error('Error al actualizar scheduled_at de viajes:', updateViajesError);
        // No es crítico, continuar
      }

      // 6. Registrar en historial
      const { error: historialError } = await supabaseAdmin
        .from('historial_despachos')
        .insert({
          despacho_id: despacho_id,
          accion: 'despacho_editado',
          descripcion: `Fecha actualizada: ${despacho.scheduled_local_date} ${despacho.scheduled_local_time} → ${fecha_despacho} ${hora_despacho}`,
          usuario_id: userId,
          metadata: {
            fecha_anterior: despacho.scheduled_local_date,
            hora_anterior: despacho.scheduled_local_time,
            fecha_nueva: fecha_despacho,
            hora_nueva: hora_despacho,
            observaciones_nuevas: observaciones || null
          }
        });

      if (historialError) {
        console.error('⚠️ Error al registrar en historial:', historialError);
        // No es crítico, continuar
      } else {
        console.log('✅ Evento despacho_editado registrado en historial');
      }

      // 7. Notificar a transportes si hay viajes asignados
      const viajesAsignados = viajes?.filter(v => v.chofer_id) || [];
      
      if (viajesAsignados.length > 0) {
        console.log(`📧 Enviando notificaciones a ${viajesAsignados.length} chofer(es)...`);
        
        for (const viaje of viajesAsignados) {
          // Obtener usuario_id del chofer
          const { data: choferData } = await supabaseAdmin
            .from('choferes')
            .select('usuario_id, nombre, apellido')
            .eq('id', viaje.chofer_id)
            .single();

          if (choferData?.usuario_id) {
            await supabaseAdmin.from('notificaciones').insert({
              usuario_id: choferData.usuario_id,
              tipo_notificacion: 'cambio_estado',
              titulo: '📝 Despacho Actualizado',
              mensaje: `El despacho ${despacho.pedido_id} fue reprogramado para ${fecha_despacho} a las ${hora_despacho}`,
              viaje_id: viaje.id,
              datos_extra: {
                pedido_id: despacho.pedido_id,
                fecha_anterior: despacho.scheduled_local_date,
                hora_anterior: despacho.scheduled_local_time,
                fecha_nueva: fecha_despacho,
                hora_nueva: hora_despacho
              },
              enviada: false,
              leida: false
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        mensaje: 'Despacho actualizado exitosamente',
        notificaciones_enviadas: viajesAsignados.length
      });

    } catch (error: any) {
      console.error('Error inesperado en actualizar despacho:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
  { roles: ['coordinador', 'admin_nodexia'] }
);
