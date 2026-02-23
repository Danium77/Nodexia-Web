// ============================================================================
// API: Timeline de eventos de un despacho
// Construye timeline híbrido: timestamps existentes + historial_despachos
// ============================================================================

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface TimelineEvent {
  id: string;
  timestamp: string;
  tipo: 'estado' | 'asignacion' | 'documento' | 'incidencia' | 'nota' | 'sistema';
  accion: string;
  descripcion: string;
  usuario?: string;
  icono: string;
  color: string;
  metadata?: any;
}

export default withAuth(async (req, res, _authCtx) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { despachoId } = req.query;

  if (!despachoId || typeof despachoId !== 'string') {
    return res.status(400).json({ error: 'despachoId es requerido' });
  }

  try {
    // 1. Obtener datos del despacho
    const { data: despacho, error: despachoError } = await supabaseAdmin
      .from('despachos')
      .select('id, pedido_id, estado, created_at, origen, destino, origen_asignacion, empresa_id')
      .eq('id', despachoId)
      .single();

    if (despachoError || !despacho) {
      return res.status(404).json({ error: 'Despacho no encontrado' });
    }

    // Verificar que el despacho pertenece a la empresa del usuario
    if (_authCtx.empresaId && _authCtx.rolInterno !== 'admin_nodexia') {
      // Obtener transporte del viaje asociado
      const { data: viaje } = await supabaseAdmin
        .from('viajes_despacho')
        .select('id_transporte')
        .eq('despacho_id', despachoId)
        .limit(1)
        .maybeSingle();

      const empresaTransporte = viaje?.id_transporte;
      if (despacho.empresa_id !== _authCtx.empresaId && empresaTransporte !== _authCtx.empresaId) {
        return res.status(403).json({ error: 'No tiene acceso a este despacho' });
      }
    }

    // 2. Obtener viajes del despacho con timestamps
    const { data: viajes } = await supabaseAdmin
      .from('viajes_despacho')
      .select(`
        id, numero_viaje, estado, id_transporte,
        chofer_id, camion_id, acoplado_id,
        created_at,
        fecha_asignacion_transporte,
        fecha_confirmacion_chofer,
        fecha_ingreso_planta,
        fecha_llamado_carga,
        fecha_inicio_carga,
        fecha_fin_carga,
        fecha_salida_planta,
        fecha_llegada_destino,
        fecha_confirmacion_entrega,
        fecha_cancelacion,
        motivo_cancelacion,
        origen_asignacion
      `)
      .eq('despacho_id', despachoId)
      .order('numero_viaje', { ascending: true });

    // 3. Obtener eventos del historial
    const { data: historialEvents } = await supabaseAdmin
      .from('historial_despachos')
      .select('*')
      .eq('despacho_id', despachoId)
      .order('created_at', { ascending: true });

    // 4. Obtener nombres de usuarios e empresas referenciados
    const userIds = new Set<string>();
    const empresaIds = new Set<string>();
    
    historialEvents?.forEach(e => {
      if (e.usuario_id) userIds.add(e.usuario_id);
      if (e.empresa_id) empresaIds.add(e.empresa_id);
    });
    viajes?.forEach(v => {
      if (v.id_transporte) empresaIds.add(v.id_transporte);
    });

    const [usersResult, empresasResult] = await Promise.all([
      userIds.size > 0
        ? supabaseAdmin.from('usuarios').select('id, nombre_completo').in('id', [...userIds])
        : Promise.resolve({ data: [] }),
      empresaIds.size > 0
        ? supabaseAdmin.from('empresas').select('id, nombre').in('id', [...empresaIds])
        : Promise.resolve({ data: [] })
    ]);

    const usersMap = new Map((usersResult.data || []).map((u: any) => [u.id, u.nombre_completo]));
    const empresasMap = new Map((empresasResult.data || []).map((e: any) => [e.id, e.nombre]));

    // 5. Construir timeline de timestamps existentes
    const events: TimelineEvent[] = [];

    // Evento: Despacho creado
    if (despacho.created_at) {
      events.push({
        id: `despacho-created`,
        timestamp: despacho.created_at,
        tipo: 'sistema',
        accion: 'Despacho creado',
        descripcion: `${despacho.pedido_id} — ${despacho.origen} → ${despacho.destino}`,
        icono: '📋',
        color: 'blue'
      });
    }

    // Eventos por cada viaje (desde timestamps)
    viajes?.forEach(viaje => {
      const prefix = viajes.length > 1 ? `Viaje #${viaje.numero_viaje}: ` : '';
      const transporteNombre = viaje.id_transporte ? empresasMap.get(viaje.id_transporte) || 'Transporte' : '';

      if (viaje.created_at && viaje.created_at !== despacho.created_at) {
        events.push({
          id: `viaje-${viaje.id}-created`,
          timestamp: viaje.created_at,
          tipo: 'sistema',
          accion: `${prefix}Viaje generado`,
          descripcion: `Viaje #${viaje.numero_viaje} creado`,
          icono: '🔄',
          color: 'gray'
        });
      }

      if (viaje.fecha_asignacion_transporte) {
        const viaRedNodexia = viaje.origen_asignacion === 'red_nodexia';
        events.push({
          id: `viaje-${viaje.id}-transporte`,
          timestamp: viaje.fecha_asignacion_transporte,
          tipo: 'asignacion',
          accion: `${prefix}Transporte asignado`,
          descripcion: viaRedNodexia
            ? `🌐 ${transporteNombre} (Red Nodexia)`
            : `${transporteNombre} (asignación directa)`,
          icono: '🚛',
          color: 'green'
        });
      }

      if (viaje.fecha_confirmacion_chofer) {
        events.push({
          id: `viaje-${viaje.id}-chofer`,
          timestamp: viaje.fecha_confirmacion_chofer,
          tipo: 'asignacion',
          accion: `${prefix}Chofer confirmó`,
          descripcion: 'El chofer aceptó el viaje asignado',
          icono: '👤',
          color: 'cyan'
        });
      }

      if (viaje.fecha_ingreso_planta) {
        events.push({
          id: `viaje-${viaje.id}-ingreso`,
          timestamp: viaje.fecha_ingreso_planta,
          tipo: 'estado',
          accion: `${prefix}Ingreso a planta`,
          descripcion: 'Control de acceso registró ingreso',
          icono: '🏭',
          color: 'teal'
        });
      }

      if (viaje.fecha_llamado_carga) {
        events.push({
          id: `viaje-${viaje.id}-llamado`,
          timestamp: viaje.fecha_llamado_carga,
          tipo: 'estado',
          accion: `${prefix}Llamado a carga`,
          descripcion: 'Supervisor llamó al camión para carga',
          icono: '📢',
          color: 'amber'
        });
      }

      if (viaje.fecha_inicio_carga) {
        events.push({
          id: `viaje-${viaje.id}-carga`,
          timestamp: viaje.fecha_inicio_carga,
          tipo: 'estado',
          accion: `${prefix}Inicio de carga`,
          descripcion: 'Carga iniciada',
          icono: '⬆️',
          color: 'orange'
        });
      }

      if (viaje.fecha_fin_carga) {
        events.push({
          id: `viaje-${viaje.id}-fin-carga`,
          timestamp: viaje.fecha_fin_carga,
          tipo: 'estado',
          accion: `${prefix}Carga completada`,
          descripcion: 'Carga finalizada, listo para egreso',
          icono: '✅',
          color: 'green'
        });
      }

      if (viaje.fecha_salida_planta) {
        events.push({
          id: `viaje-${viaje.id}-salida`,
          timestamp: viaje.fecha_salida_planta,
          tipo: 'estado',
          accion: `${prefix}Egreso de planta`,
          descripcion: 'Control de acceso registró salida',
          icono: '🚪',
          color: 'indigo'
        });
      }

      if (viaje.fecha_llegada_destino) {
        events.push({
          id: `viaje-${viaje.id}-destino`,
          timestamp: viaje.fecha_llegada_destino,
          tipo: 'estado',
          accion: `${prefix}Arribo a destino`,
          descripcion: 'El camión llegó al destino',
          icono: '📍',
          color: 'purple'
        });
      }

      if (viaje.fecha_confirmacion_entrega) {
        events.push({
          id: `viaje-${viaje.id}-entrega`,
          timestamp: viaje.fecha_confirmacion_entrega,
          tipo: 'estado',
          accion: `${prefix}Entrega confirmada`,
          descripcion: 'La entrega fue confirmada en destino',
          icono: '🏁',
          color: 'green'
        });
      }

      if (viaje.fecha_cancelacion) {
        events.push({
          id: `viaje-${viaje.id}-cancelado`,
          timestamp: viaje.fecha_cancelacion,
          tipo: 'sistema',
          accion: `${prefix}Viaje cancelado`,
          descripcion: viaje.motivo_cancelacion || 'Sin motivo especificado',
          icono: '❌',
          color: 'red'
        });
      }
    });

    // 6. Agregar eventos del historial
    historialEvents?.forEach(event => {
      const ACCION_CONFIG: Record<string, { icono: string; color: string; tipo: TimelineEvent['tipo'] }> = {
        'despacho_creado': { icono: '📋', color: 'blue', tipo: 'sistema' },
        'despacho_editado': { icono: '✏️', color: 'blue', tipo: 'sistema' },
        'despacho_reprogramado': { icono: '🔄', color: 'amber', tipo: 'sistema' },
        'transporte_asignado': { icono: '🚛', color: 'green', tipo: 'asignacion' },
        'transporte_desvinculado': { icono: '🔗', color: 'orange', tipo: 'asignacion' },
        'unidad_asignada': { icono: '🚚', color: 'cyan', tipo: 'asignacion' },
        'viaje_cancelado': { icono: '❌', color: 'red', tipo: 'sistema' },
        'viaje_reasignado': { icono: '🔄', color: 'amber', tipo: 'asignacion' },
        'oferta_recibida': { icono: '📩', color: 'cyan', tipo: 'sistema' },
        'oferta_aceptada': { icono: '✅', color: 'green', tipo: 'asignacion' },
        'oferta_rechazada': { icono: '❌', color: 'red', tipo: 'sistema' },
        'documento_subido': { icono: '📄', color: 'blue', tipo: 'documento' },
        'incidencia_creada': { icono: '⚠️', color: 'red', tipo: 'incidencia' },
        'nota_manual': { icono: '💬', color: 'gray', tipo: 'nota' },
        'estado_cambiado': { icono: '🔄', color: 'indigo', tipo: 'estado' },
      };

      const config = ACCION_CONFIG[event.accion] || { icono: '📌', color: 'gray', tipo: 'sistema' as const };
      const usuario = event.usuario_id ? usersMap.get(event.usuario_id) : undefined;

      // Construir descripción basada en el tipo de evento
      let descripcion = event.descripcion || '';
      
      // Para eventos de edición/reprogramación, si no hay descripción, construir desde metadata
      if (!descripcion) {
        if (event.accion === 'despacho_editado' && event.metadata) {
          const { fecha_anterior, hora_anterior, fecha_nueva, hora_nueva } = event.metadata;
          descripcion = `Fecha actualizada: ${fecha_anterior} ${hora_anterior} → ${fecha_nueva} ${hora_nueva}`;
        } else if (event.accion === 'despacho_reprogramado' && event.metadata) {
          const { fecha_anterior, hora_anterior, fecha_nueva, hora_nueva, mantener_recursos, motivo } = event.metadata;
          const recursos = mantener_recursos ? 'manteniendo recursos' : 'limpiando asignaciones';
          const motivoTexto = motivo ? ` (${motivo})` : '';
          descripcion = `${fecha_anterior} ${hora_anterior} → ${fecha_nueva} ${hora_nueva} (${recursos})${motivoTexto}`;
        }
      }

      events.push({
        id: `hist-${event.id}`,
        timestamp: event.created_at,
        tipo: config.tipo,
        accion: event.accion.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        descripcion,
        usuario,
        icono: config.icono,
        color: config.color,
        metadata: event.metadata
      });
    });

    // 7. Ordenar por timestamp descendente (más reciente primero)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.status(200).json({
      despachoId,
      pedidoId: despacho.pedido_id,
      totalEvents: events.length,
      events
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});
