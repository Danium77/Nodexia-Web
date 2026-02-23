// pages/api/incidencias/[id].ts
// GET: Detalle de incidencia | PATCH: Actualizar estado/resolución
// Usa RLS via createUserSupabaseClient

import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TRANSICIONES_ESTADO: Record<string, string[]> = {
  abierta: ['en_proceso', 'cerrada'],
  en_proceso: ['resuelta', 'cerrada'],
  resuelta: ['cerrada'],
  cerrada: [], // estado final
};

// Roles que pueden cambiar estado
const ROLES_RESOLVER: string[] = ['control_acceso', 'supervisor', 'coordinador', 'admin_nodexia'];
const ROLES_CERRAR: string[] = ['supervisor', 'coordinador', 'admin_nodexia'];

export default withAuth(async (req, res, { userId, token, rolInterno }) => {
  const supabase = createUserSupabaseClient(token);
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de incidencia requerido' });
  }

  // ── GET: Detalle de incidencia ──
  if (req.method === 'GET') {
    try {
      const { data: incidencia, error } = await supabase
        .from('incidencias_viaje')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !incidencia) {
        return res.status(404).json({ error: 'Incidencia no encontrada' });
      }

      // Enriquecer con datos de viaje
      const { data: viaje } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, despacho_id, chofer_id, camion_id, acoplado_id, despachos:despacho_id(pedido_id, producto, empresa_id)')
        .eq('id', incidencia.viaje_id)
        .single();

      // Nombres de usuarios
      const userIds = [incidencia.reportado_por, incidencia.resuelto_por].filter(Boolean);
      let usersMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: usuarios } = await supabaseAdmin
          .from('usuarios')
          .select('id, nombre_completo')
          .in('id', userIds);
        if (usuarios) {
          usersMap = Object.fromEntries(usuarios.map(u => [u.id, u.nombre_completo || 'Usuario']));
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          ...incidencia,
          viaje: viaje || null,
          numero_viaje: viaje?.numero_viaje || null,
          despacho_pedido_id: (viaje?.despachos as any)?.pedido_id || null,
          producto: (viaje?.despachos as any)?.producto || null,
          reportado_por_nombre: usersMap[incidencia.reportado_por] || null,
          resuelto_por_nombre: incidencia.resuelto_por ? (usersMap[incidencia.resuelto_por] || null) : null,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ── PATCH: Actualizar incidencia ──
  if (req.method === 'PATCH') {
    try {
      // Obtener incidencia actual
      const { data: incActual, error: fetchError } = await supabase
        .from('incidencias_viaje')
        .select('id, estado, viaje_id, tipo_incidencia, reportado_por')
        .eq('id', id)
        .single();

      if (fetchError || !incActual) {
        return res.status(404).json({ error: 'Incidencia no encontrada' });
      }

      const { estado: nuevoEstado, resolucion } = req.body;

      // Validar transición de estado
      if (nuevoEstado) {
        const transicionesValidas = TRANSICIONES_ESTADO[incActual.estado] || [];
        if (!transicionesValidas.includes(nuevoEstado)) {
          return res.status(400).json({
            error: `Transición no válida: ${incActual.estado} → ${nuevoEstado}`,
            transiciones_validas: transicionesValidas,
          });
        }

        // Verificar permisos de rol
        if (nuevoEstado === 'cerrada' && !ROLES_CERRAR.includes(rolInterno || '')) {
          return res.status(403).json({ error: 'Sin permisos para cerrar incidencias' });
        }
        if (['en_proceso', 'resuelta'].includes(nuevoEstado) && !ROLES_RESOLVER.includes(rolInterno || '')) {
          return res.status(403).json({ error: 'Sin permisos para resolver incidencias' });
        }
      }

      // Construir update
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (nuevoEstado) {
        updateData.estado = nuevoEstado;
      }
      if (resolucion) {
        updateData.resolucion = resolucion.trim();
      }
      if (nuevoEstado === 'resuelta' || nuevoEstado === 'cerrada') {
        updateData.resuelto_por = userId;
        updateData.fecha_resolucion = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await supabase
        .from('incidencias_viaje')
        .update(updateData)
        .eq('id', id)
        .select('id, estado, resolucion, resuelto_por, fecha_resolucion')
        .single();

      if (updateError) {
        console.error('[PATCH /api/incidencias/[id]] Error:', updateError);
        return res.status(500).json({ error: 'Error al actualizar incidencia' });
      }

      // Notificar al reportante cuando se resuelve/cierra
      if (nuevoEstado === 'resuelta' || nuevoEstado === 'cerrada') {
        try {
          const { data: viaje } = await supabase
            .from('viajes_despacho')
            .select('numero_viaje')
            .eq('id', incActual.viaje_id)
            .single();

          await supabaseAdmin.from('notificaciones').insert({
            user_id: incActual.reportado_por,
            tipo: 'incidencia',
            titulo: `Incidencia ${nuevoEstado}: ${incActual.tipo_incidencia.replace(/_/g, ' ')}`,
            mensaje: `Viaje ${viaje?.numero_viaje || '?'}: ${resolucion || 'Sin detalle de resolución'}`.substring(0, 200),
            datos: { incidencia_id: id, viaje_id: incActual.viaje_id, nuevo_estado: nuevoEstado },
            leida: false,
          });
        } catch (notifError) {
          console.warn('[PATCH /api/incidencias/[id]] Error notificando:', notifError);
        }
      }

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
});
