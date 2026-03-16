/**
 * API Route: /api/despachos/reprogramar
 * 
 * Reprograma un despacho expirado con nueva fecha/hora.
 * Permite mantener o limpiar recursos asignados (transporte, chofer, camión).
 * 
 * Método: POST
 * Auth: Coordinador/Admin
 * 
 * Body:
 * {
 *   despacho_id: string,
 *   nueva_fecha: string,      // YYYY-MM-DD
 *   nueva_hora: string,        // HH:MM
 *   mantener_recursos: boolean,
 *   motivo?: string
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(
  async (req, res, { userId, empresaId }) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { despacho_id, nueva_fecha, nueva_hora, mantener_recursos, motivo } = req.body;

    // Validaciones
    if (!despacho_id || !nueva_fecha || !nueva_hora) {
      return res.status(400).json({ error: 'Faltan campos requeridos: despacho_id, nueva_fecha, nueva_hora' });
    }

    if (typeof mantener_recursos !== 'boolean') {
      return res.status(400).json({ error: 'mantener_recursos debe ser boolean' });
    }

    try {
      // 1. Validar que el despacho existe y pertenece a la empresa del usuario
      const { data: despacho, error: despachoError } = await supabaseAdmin
        .from('despachos')
        .select('id, pedido_id, empresa_id, created_by, scheduled_local_date, scheduled_local_time')
        .eq('id', despacho_id)
        .maybeSingle();

      if (despachoError || !despacho) {
        return res.status(404).json({ error: 'Despacho no encontrado' });
      }

      // Verificar que pertenece a la empresa del usuario
      if (!empresaId) {
        return res.status(403).json({ error: 'Usuario sin empresa asignada' });
      }

      if (despacho.empresa_id !== empresaId) {
        return res.status(403).json({ error: 'No tienes permiso para reprogramar este despacho' });
      }

      // 2. Validar que la fecha/hora nueva sea futura
      const fechaHoraNueva = new Date(`${nueva_fecha}T${nueva_hora}`);
      const ahora = new Date();

      if (fechaHoraNueva <= ahora) {
        return res.status(400).json({ error: 'La fecha y hora deben ser futuras' });
      }

      // 3. Obtener todos los viajes del despacho
      const { data: viajes, error: viajesError } = await supabaseAdmin
        .from('viajes_despacho')
        .select('id, estado, estado_unidad, chofer_id, camion_id, acoplado_id, id_transporte')
        .eq('despacho_id', despacho_id);

      if (viajesError) {
        console.error('Error al obtener viajes:', viajesError);
        return res.status(500).json({ error: 'Error al obtener viajes del despacho' });
      }

      if (!viajes || viajes.length === 0) {
        return res.status(400).json({ error: 'No se encontraron viajes para este despacho' });
      }

      console.log(`🔄 Reprogramando ${viajes.length} viaje(s)...`);
      console.log(`📦 Mantener recursos: ${mantener_recursos}`);

      // 4. Actualizar cada viaje
      const scheduledAt = fechaHoraNueva.toISOString();
      let notificacionesEnviadas = 0;

      for (const viaje of viajes) {
        const updateData: any = {
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString()
        };

        // Si MANTENER recursos: mantener estado actual (o asignar si tiene recursos)
        if (mantener_recursos && (viaje.chofer_id || viaje.camion_id)) {
          // Si el viaje estaba en tránsito, volver a estado confirmado para que el chofer pueda reiniciar
          if (viaje.estado_unidad === 'en_transito_origen' || viaje.estado_unidad === 'en_transito_destino') {
            updateData.estado_unidad = 'confirmado_chofer';
            updateData.estado = 'confirmado_chofer';
          } else {
            // Mantener el estado que tenía (probablemente camion_asignado o confirmado_chofer)
            updateData.estado_unidad = viaje.estado_unidad === 'expirado' ? 'camion_asignado' : viaje.estado_unidad;
            updateData.estado = viaje.estado === 'expirado' ? 'transporte_asignado' : viaje.estado;
          }
        } else {
          // Si NO mantener recursos, limpiar asignaciones y volver a pendiente
          updateData.chofer_id = null;
          updateData.camion_id = null;
          updateData.acoplado_id = null;
          updateData.id_transporte = null;
          updateData.fecha_asignacion_transporte = null;
          updateData.estado_unidad = null;
          updateData.estado = 'pendiente';
        }

        const { error: updateError } = await supabaseAdmin
          .from('viajes_despacho')
          .update(updateData)
          .eq('id', viaje.id);

        if (updateError) {
          console.error('❌ Error actualizando viaje:', viaje.id, updateError);
          return res.status(500).json({ error: 'Error al actualizar viajes' });
        }

        // 🔔 NOTIFICACIONES: Enviar notificación al chofer si tiene chofer asignado
        if (viaje.chofer_id) {
          const { data: choferData } = await supabaseAdmin
            .from('choferes')
            .select('usuario_id, nombre, apellido')
            .eq('id', viaje.chofer_id)
            .maybeSingle();

          if (choferData?.usuario_id) {
            console.log(`📧 Enviando notificación a chofer: ${choferData.nombre}`);
            
            await supabaseAdmin.from('notificaciones').insert({
              usuario_id: choferData.usuario_id,
              tipo_notificacion: 'cambio_estado',
              titulo: '🔄 Viaje Reprogramado',
              mensaje: `El viaje ${despacho.pedido_id} ha sido reprogramado para ${nueva_fecha} a las ${nueva_hora}`,
              viaje_id: viaje.id,
              datos_extra: {
                pedido_id: despacho.pedido_id,
                fecha_original: despacho.scheduled_local_date,
                hora_original: despacho.scheduled_local_time,
                nueva_fecha: nueva_fecha,
                nueva_hora: nueva_hora,
                motivo: motivo || null
              },
              enviada: false,
              leida: false
            });
            
            notificacionesEnviadas++;
          }
        }

        // 🔔 NOTIFICACIONES: Enviar notificación a la empresa de transporte
        if (viaje.id_transporte && mantener_recursos) {
          const { data: coordinadores } = await supabaseAdmin
            .from('usuarios_empresa')
            .select('usuario_id')
            .eq('empresa_id', viaje.id_transporte)
            .in('rol_interno', ['coordinador', 'coordinador_integral']);

          if (coordinadores && coordinadores.length > 0) {
            console.log(`📧 Enviando notificaciones a empresa transporte: ${coordinadores.length} coordinador(es)`);
            
            for (const coordinador of coordinadores) {
              await supabaseAdmin.from('notificaciones').insert({
                usuario_id: coordinador.usuario_id,
                tipo_notificacion: 'cambio_estado',
                titulo: '🔄 Viaje Reprogramado',
                mensaje: `El viaje ${despacho.pedido_id} ha sido reprogramado para ${nueva_fecha} a las ${nueva_hora}`,
                viaje_id: viaje.id,
                datos_extra: {
                  pedido_id: despacho.pedido_id,
                  fecha_original: despacho.scheduled_local_date,
                  hora_original: despacho.scheduled_local_time,
                  nueva_fecha: nueva_fecha,
                  nueva_hora: nueva_hora,
                  motivo: motivo || null
                },
                enviada: false,
                leida: false
              });
              
              notificacionesEnviadas++;
            }
          }
        }
      }

      // 5. Actualizar despacho
      const despachoUpdate: any = {
        scheduled_local_date: nueva_fecha,
        scheduled_local_time: nueva_hora,
        estado: mantener_recursos ? 'asignado' : 'pendiente',
        updated_at: new Date().toISOString()
      };

      // Si no mantener recursos, limpiar transport_id
      if (!mantener_recursos) {
        despachoUpdate.transport_id = null;
      }

      const { error: updateDespachoError } = await supabaseAdmin
        .from('despachos')
        .update(despachoUpdate)
        .eq('id', despacho_id);

      if (updateDespachoError) {
        console.error('Error actualizando despacho:', updateDespachoError);
        return res.status(500).json({ error: 'Viajes reprogramados pero error al actualizar despacho' });
      }

      // 6. Registrar en historial
      const recursos = mantener_recursos ? 'manteniendo recursos' : 'limpiando asignaciones';
      const motivoTexto = motivo ? ` (${motivo})` : '';
      const { error: historialError } = await supabaseAdmin
        .from('historial_despachos')
        .insert({
          despacho_id: despacho_id,
          accion: 'despacho_reprogramado',
          descripcion: `${despacho.scheduled_local_date} ${despacho.scheduled_local_time} → ${nueva_fecha} ${nueva_hora} (${recursos})${motivoTexto}`,
          usuario_id: userId,
          metadata: {
            fecha_anterior: despacho.scheduled_local_date,
            hora_anterior: despacho.scheduled_local_time,
            fecha_nueva: nueva_fecha,
            hora_nueva: nueva_hora,
            mantener_recursos: mantener_recursos,
            motivo: motivo || null,
            viajes_afectados: viajes.length
          }
        });

      if (historialError) {
        console.error('⚠️ Error al registrar en historial:', historialError);
        // No es crítico, continuar
      } else {
        console.log('✅ Evento despacho_reprogramado registrado en historial');
      }

      console.log(`✅ Despacho ${despacho.pedido_id} reprogramado exitosamente`);
      console.log(`📅 Nueva fecha/hora: ${nueva_fecha} ${nueva_hora}`);

      return res.status(200).json({
        success: true,
        mensaje: 'Despacho reprogramado exitosamente',
        viajes_actualizados: viajes.length,
        notificaciones_enviadas: notificacionesEnviadas
      });

    } catch (error: any) {
      console.error('Error inesperado en reprogramar despacho:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
  { roles: ['coordinador', 'admin_nodexia'] }
);
