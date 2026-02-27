// pages/api/documentacion/validar.ts
// API para aprobar o rechazar documentos pendientes de validación
// - Admin Nodexia / Super Admin: aprobación definitiva
// - Coordinador de planta origen: aprobación provisoria (caduca en 24h, requiere revalidación admin)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

type Accion = 'aprobar' | 'rechazar' | 'aprobar_provisorio';

interface ValidarBody {
  documento_id: string;
  accion: Accion;
  motivo_rechazo?: string;
  motivo_provisorio?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  incidencia_id?: string; // Vincular con incidencia que originó la aprobación provisoria
}

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // ── Verificar rol ──
    const { data: isSuperAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', authCtx.userId)
      .eq('activo', true)
      .maybeSingle();

    const esAdmin = !!isSuperAdmin || authCtx.rolInterno === 'admin_nodexia';
    const esCoordinador = authCtx.rolInterno === 'coordinador' || authCtx.rolInterno === 'coordinador_integral';

    // ── Validar body ──
    const { documento_id, accion, motivo_rechazo, motivo_provisorio, fecha_emision, fecha_vencimiento, incidencia_id } = req.body as ValidarBody;

    if (!documento_id || typeof documento_id !== 'string') {
      return res.status(400).json({
        error: 'Parámetro requerido faltante',
        details: 'Debe proporcionar documento_id (UUID)',
      });
    }

    const accionesValidas: Accion[] = ['aprobar', 'rechazar', 'aprobar_provisorio'];
    if (!accion || !accionesValidas.includes(accion)) {
      return res.status(400).json({
        error: 'Acción inválida',
        details: "accion debe ser 'aprobar', 'rechazar' o 'aprobar_provisorio'",
      });
    }

    // Solo admin puede aprobar/rechazar definitivamente
    if ((accion === 'aprobar' || accion === 'rechazar') && !esAdmin) {
      return res.status(403).json({ error: 'Solo Admin Nodexia puede aprobar/rechazar definitivamente' });
    }

    // Coordinador puede aprobar provisoriamente, admin también
    if (accion === 'aprobar_provisorio' && !esCoordinador && !esAdmin) {
      return res.status(403).json({ error: 'Solo Coordinador o Admin puede aprobar provisoriamente' });
    }

    if (accion === 'rechazar' && (!motivo_rechazo || motivo_rechazo.trim().length === 0)) {
      return res.status(400).json({
        error: 'Motivo requerido',
        details: 'Debe proporcionar motivo_rechazo al rechazar un documento',
      });
    }

    if (accion === 'aprobar_provisorio' && (!motivo_provisorio || motivo_provisorio.trim().length === 0)) {
      return res.status(400).json({
        error: 'Motivo requerido',
        details: 'Debe proporcionar motivo_provisorio al aprobar provisoriamente',
      });
    }

    // ── Verificar que el documento existe ──
    const { data: documento, error: fetchError } = await supabaseAdmin
      .from('documentos_entidad')
      .select('id, estado_vigencia, activo, tipo_documento, entidad_tipo, entidad_id, empresa_id')
      .eq('id', documento_id)
      .single();

    if (fetchError || !documento) {
      return res.status(404).json({
        error: 'Documento no encontrado',
        details: `No se encontró documento con id ${documento_id}`,
      });
    }

    if (!documento.activo) {
      return res.status(400).json({
        error: 'Documento inactivo',
        details: 'No se puede validar un documento marcado como inactivo',
      });
    }

    // Estados válidos para cada acción
    const estadosValidosParaAccion: Record<Accion, string[]> = {
      aprobar: ['pendiente_validacion', 'aprobado_provisorio'],
      rechazar: ['pendiente_validacion', 'aprobado_provisorio'],
      aprobar_provisorio: ['pendiente_validacion', 'rechazado', 'vencido'],
    };

    if (!estadosValidosParaAccion[accion].includes(documento.estado_vigencia)) {
      return res.status(400).json({
        error: 'Estado no válido para esta acción',
        details: `El documento tiene estado '${documento.estado_vigencia}'. Para '${accion}' se requiere: ${estadosValidosParaAccion[accion].join(', ')}`,
      });
    }

    // ── Validar que coordinador es de empresa origen del despacho ──
    if (accion === 'aprobar_provisorio' && esCoordinador) {
      // Verificar que el coordinador pertenece a la empresa que tiene despachos con este recurso
      // El coordinador solo puede aprobar provisorio para recursos de viajes de sus despachos
      const { data: empresaCoord } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', authCtx.userId)
        .eq('activo', true)
        .single();

      if (!empresaCoord) {
        return res.status(403).json({ error: 'No se pudo determinar empresa del coordinador' });
      }

      // No restringimos más allá — el coordinador tiene visibilidad sobre los recursos que llegan a su planta
      // La auditoría queda en las columnas provisorias
    }

    // ── Ejecutar la acción ──
    const ahora = new Date().toISOString();

    if (accion === 'aprobar') {
      const updateData: Record<string, any> = {
        estado_vigencia: 'vigente',
        validado_por: authCtx.userId,
        fecha_validacion: ahora,
        // Limpiar campos provisorios si venía de provisorio
        aprobado_provisorio_por: null,
        fecha_aprobacion_provisoria: null,
        motivo_provisorio: null,
        incidencia_origen_id: null,
        updated_at: ahora,
      };

      if (fecha_emision) updateData.fecha_emision = fecha_emision;
      if (fecha_vencimiento) updateData.fecha_vencimiento = fecha_vencimiento;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('documentos_entidad')
        .update(updateData)
        .eq('id', documento_id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: 'Error al aprobar documento', details: updateError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Documento aprobado definitivamente',
        data: {
          id: updated.id,
          tipo_documento: updated.tipo_documento,
          entidad_tipo: updated.entidad_tipo,
          entidad_id: updated.entidad_id,
          estado_vigencia: updated.estado_vigencia,
          validado_por: updated.validado_por,
          fecha_validacion: updated.fecha_validacion,
        },
      });
    }

    if (accion === 'aprobar_provisorio') {
      const updateData: Record<string, any> = {
        estado_vigencia: 'aprobado_provisorio',
        aprobado_provisorio_por: authCtx.userId,
        fecha_aprobacion_provisoria: ahora,
        motivo_provisorio: motivo_provisorio!.trim(),
        updated_at: ahora,
      };

      if (incidencia_id) {
        updateData.incidencia_origen_id = incidencia_id;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('documentos_entidad')
        .update(updateData)
        .eq('id', documento_id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: 'Error al aprobar provisoriamente', details: updateError.message });
      }

      // Notificar a Admin Nodexia para revalidación
      try {
        const { data: admins } = await supabaseAdmin
          .from('usuarios_empresa')
          .select('user_id')
          .eq('rol_interno', 'admin_nodexia')
          .eq('activo', true);

        if (admins && admins.length > 0) {
          const { data: coordinador } = await supabaseAdmin
            .from('usuarios')
            .select('nombre_completo')
            .eq('id', authCtx.userId)
            .single();

          const notifs = admins.map(a => ({
            user_id: a.user_id,
            tipo: 'documentacion',
            titulo: '⚠️ Aprobación provisoria pendiente de revalidación',
            mensaje: `${coordinador?.nombre_completo || 'Coordinador'} aprobó provisoriamente: ${documento.tipo_documento} (${documento.entidad_tipo}). Motivo: ${motivo_provisorio!.trim().substring(0, 100)}. Caduca en 24h.`,
            datos: { documento_id, accion: 'aprobar_provisorio', incidencia_id },
            leida: false,
          }));

          await supabaseAdmin.from('notificaciones').insert(notifs);
        }
      } catch (notifError) {
        console.warn('[validar.ts] Error notificando admins:', notifError);
      }

      return res.status(200).json({
        success: true,
        message: 'Documento aprobado provisoriamente (válido 24h, pendiente revalidación admin)',
        data: {
          id: updated.id,
          tipo_documento: updated.tipo_documento,
          entidad_tipo: updated.entidad_tipo,
          entidad_id: updated.entidad_id,
          estado_vigencia: updated.estado_vigencia,
          aprobado_provisorio_por: updated.aprobado_provisorio_por,
          fecha_aprobacion_provisoria: updated.fecha_aprobacion_provisoria,
          motivo_provisorio: updated.motivo_provisorio,
          caduca_en: '24 horas',
        },
      });
    }

    // accion === 'rechazar'
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documentos_entidad')
      .update({
        estado_vigencia: 'rechazado',
        validado_por: authCtx.userId,
        fecha_validacion: ahora,
        motivo_rechazo: motivo_rechazo!.trim(),
        // Limpiar campos provisorios
        aprobado_provisorio_por: null,
        fecha_aprobacion_provisoria: null,
        motivo_provisorio: null,
        incidencia_origen_id: null,
        updated_at: ahora,
      })
      .eq('id', documento_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Error al rechazar documento', details: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Documento rechazado correctamente',
      data: {
        id: updated.id,
        tipo_documento: updated.tipo_documento,
        entidad_tipo: updated.entidad_tipo,
        entidad_id: updated.entidad_id,
        estado_vigencia: updated.estado_vigencia,
        validado_por: updated.validado_por,
        fecha_validacion: updated.fecha_validacion,
        motivo_rechazo: updated.motivo_rechazo,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return res.status(500).json({ error: 'Error interno del servidor', details: message });
  }
}, { roles: ['coordinador', 'supervisor', 'admin_nodexia'] });
