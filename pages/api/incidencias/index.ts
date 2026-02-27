// pages/api/incidencias/index.ts
// GET: Listar incidencias (con filtros) | POST: Crear incidencia
// Usa RLS via createUserSupabaseClient — visibilidad cross-empresa automática

import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TIPOS_VALIDOS = [
  'retraso', 'averia_camion', 'documentacion_faltante',
  'producto_danado', 'accidente', 'demora', 'problema_mecanico',
  'problema_carga', 'ruta_bloqueada', 'clima_adverso', 'otro',
] as const;

type Severidad = 'baja' | 'media' | 'alta' | 'critica';

function determinarSeveridad(tipo: string): Severidad {
  const map: Record<string, Severidad> = {
    retraso: 'baja',
    demora: 'baja',
    averia_camion: 'alta',
    problema_mecanico: 'alta',
    documentacion_faltante: 'media',
    producto_danado: 'alta',
    problema_carga: 'media',
    accidente: 'critica',
    ruta_bloqueada: 'media',
    clima_adverso: 'media',
    otro: 'media',
  };
  return map[tipo] || 'media';
}

export default withAuth(async (req, res, { userId, token }) => {
  const supabase = createUserSupabaseClient(token);

  // ── GET: Listar incidencias ──
  if (req.method === 'GET') {
    try {
      const { estado, viaje_id, tipo_incidencia, severidad, limit: limitStr } = req.query;
      const limit = parseInt(limitStr as string) || 100;

      let query = supabase
        .from('incidencias_viaje')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filtros opcionales
      if (viaje_id) {
        query = query.eq('viaje_id', viaje_id as string);
      }
      if (estado) {
        const estados = Array.isArray(estado) ? estado : [estado];
        query = query.in('estado', estados as string[]);
      }
      if (tipo_incidencia) {
        query = query.eq('tipo_incidencia', tipo_incidencia as string);
      }
      if (severidad) {
        query = query.eq('severidad', severidad as string);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[GET /api/incidencias] Error:', error);
        return res.status(500).json({ error: 'Error al obtener incidencias' });
      }

      const incidencias = data || [];

      // Enriquecer con datos de viaje y usuario (batch)
      const viajeIds = [...new Set(incidencias.map(i => i.viaje_id).filter(Boolean))];
      const userIds = [...new Set([
        ...incidencias.map(i => i.reportado_por),
        ...incidencias.map(i => i.resuelto_por),
      ].filter(Boolean))];

      // Fetch viajes (para numero_viaje y despacho_pedido_id)
      let viajesMap: Record<string, any> = {};
      if (viajeIds.length > 0) {
        const { data: viajes } = await supabase
          .from('viajes_despacho')
          .select('id, numero_viaje, despacho_id, despachos:despacho_id(pedido_id)')
          .in('id', viajeIds);
        if (viajes) {
          viajesMap = Object.fromEntries(viajes.map(v => [v.id, v]));
        }
      }

      // Fetch nombres de usuarios (via supabaseAdmin para bypass RLS en tabla usuarios)
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

      // Enriquecer datos
      const enriched = incidencias.map(inc => ({
        ...inc,
        numero_viaje: viajesMap[inc.viaje_id]?.numero_viaje || null,
        despacho_pedido_id: (viajesMap[inc.viaje_id]?.despachos as any)?.pedido_id || null,
        reportado_por_nombre: usersMap[inc.reportado_por] || null,
        resuelto_por_nombre: inc.resuelto_por ? (usersMap[inc.resuelto_por] || null) : null,
      }));

      // Contadores
      const counts = {
        abiertas: incidencias.filter(i => i.estado === 'abierta').length,
        en_proceso: incidencias.filter(i => i.estado === 'en_proceso').length,
        resueltas: incidencias.filter(i => i.estado === 'resuelta').length,
        cerradas: incidencias.filter(i => i.estado === 'cerrada').length,
        total: incidencias.length,
      };

      return res.status(200).json({ success: true, data: enriched, counts });
    } catch (error: any) {
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ── POST: Crear incidencia ──
  if (req.method === 'POST') {
    try {
      const { viaje_id, tipo_incidencia, descripcion, severidad, documentos_afectados } = req.body;

      console.log('[POST /api/incidencias] Body:', JSON.stringify({ viaje_id, tipo_incidencia, severidad, userId }));

      // Validar campos requeridos
      if (!viaje_id || !tipo_incidencia || !descripcion) {
        return res.status(400).json({
          error: 'Datos requeridos faltantes',
          required: ['viaje_id', 'tipo_incidencia', 'descripcion'],
        });
      }

      if (!TIPOS_VALIDOS.includes(tipo_incidencia)) {
        return res.status(400).json({
          error: 'Tipo de incidencia inválido',
          tipos_validos: TIPOS_VALIDOS,
        });
      }

      // Validar que el viaje existe (via user client — RLS enforced)
      const supabase = createUserSupabaseClient(token);
      const { data: viaje, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje')
        .eq('id', viaje_id)
        .single();

      if (viajeError || !viaje) {
        console.error('[POST /api/incidencias] Viaje not found:', viaje_id, JSON.stringify(viajeError));
        return res.status(404).json({ error: 'Viaje no encontrado', detail: viajeError?.message });
      }

      const severidadFinal: Severidad =
        severidad && ['baja', 'media', 'alta', 'critica'].includes(severidad)
          ? severidad
          : determinarSeveridad(tipo_incidencia);

      // Asegurar que el usuario exista en la tabla 'usuarios' (FK puede requerirlo)
      const { data: existeUsuario } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existeUsuario) {
        console.log('[POST /api/incidencias] Usuario no existe en tabla usuarios, creando:', userId);
        const { error: upsertErr } = await supabaseAdmin
          .from('usuarios')
          .upsert({
            id: userId,
            email: req.body._userEmail || null,
            nombre_completo: null,
          }, { onConflict: 'id' });
        if (upsertErr) {
          console.warn('[POST /api/incidencias] No se pudo crear usuario en tabla usuarios:', JSON.stringify(upsertErr));
          // No fallar — podría no tener FK
        }
      }

      const insertData: Record<string, any> = {
        viaje_id,
        tipo_incidencia,
        descripcion: descripcion.trim(),
        severidad: severidadFinal,
        estado: 'abierta',
        fecha_incidencia: new Date().toISOString(),
        reportado_por: userId,
      };

      // documentos_afectados: JSONB (requiere migration 064)
      // Se intenta con la columna; si falla con PGRST204 se reintenta sin ella
      if (documentos_afectados && Array.isArray(documentos_afectados) && documentos_afectados.length > 0) {
        insertData.documentos_afectados = documentos_afectados;
      }

      console.log('[POST /api/incidencias] Inserting:', JSON.stringify(insertData));

      let incidencia: any = null;
      let insertError: any = null;

      const result1 = await supabase
        .from('incidencias_viaje')
        .insert(insertData)
        .select('id, tipo_incidencia, estado, severidad')
        .single();

      if (!result1.error) {
        incidencia = result1.data;
      } else if (result1.error.code === 'PGRST204' || result1.error.message?.includes('documentos_afectados')) {
        // Columna documentos_afectados no existe en PROD — reintentar sin ella
        console.warn('[POST /api/incidencias] Columna documentos_afectados no existe, reintentando sin ella');
        delete insertData.documentos_afectados;
        const result2 = await supabase
          .from('incidencias_viaje')
          .insert(insertData)
          .select('id, tipo_incidencia, estado, severidad')
          .single();
        if (!result2.error) {
          incidencia = result2.data;
        } else {
          insertError = result2.error;
        }
      } else {
        insertError = result1.error;
      }

      if (insertError || !incidencia) {
        console.error('[POST /api/incidencias] Insert error:', JSON.stringify(insertError));
        return res.status(500).json({
          error: `Error al crear incidencia: ${insertError?.message || 'desconocido'}`,
          code: insertError?.code,
          details: insertError?.details,
          hint: insertError?.hint,
        });
      }

      // Crear notificación para coordinador/supervisor de empresa origen
      try {
        const { data: viajeData } = await supabaseAdmin
          .from('viajes_despacho')
          .select('despacho_id, despachos:despacho_id(empresa_id, pedido_id)')
          .eq('id', viaje_id)
          .single();

        const empresaOrigenId = (viajeData?.despachos as any)?.empresa_id;
        if (empresaOrigenId) {
          // Notificar coordinadores/supervisores de empresa origen
          const { data: destinatarios } = await supabaseAdmin
            .from('usuarios_empresa')
            .select('user_id')
            .eq('empresa_id', empresaOrigenId)
            .in('rol_interno', ['coordinador', 'coordinador_integral', 'supervisor'])
            .eq('activo', true);

          if (destinatarios && destinatarios.length > 0) {
            const notificaciones = destinatarios.map(d => ({
              user_id: d.user_id,
              tipo: 'incidencia',
              titulo: `Nueva incidencia: ${tipo_incidencia.replace(/_/g, ' ')}`,
              mensaje: `Viaje ${viaje.numero_viaje}: ${descripcion.trim().substring(0, 100)}`,
              datos: { incidencia_id: incidencia.id, viaje_id, tipo_incidencia, severidad: severidadFinal },
              leida: false,
            }));

            await supabaseAdmin.from('notificaciones').insert(notificaciones);
          }
        }
      } catch (notifError) {
        // No fallar por notificaciones
        console.warn('[POST /api/incidencias] Error notificando:', notifError);
      }

      return res.status(201).json({
        success: true,
        data: incidencia,
      });
    } catch (error: any) {
      console.error('[POST /api/incidencias] Catch error:', error?.message || error);
      return res.status(500).json({ error: `Error interno: ${error?.message || 'desconocido'}` });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
});
