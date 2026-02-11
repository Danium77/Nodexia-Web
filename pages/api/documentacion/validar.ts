// pages/api/documentacion/validar.ts
// API para aprobar o rechazar documentos pendientes de validación (solo Admin Nodexia / Super Admin)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Accion = 'aprobar' | 'rechazar';

interface ValidarBody {
  documento_id: string;
  accion: Accion;
  motivo_rechazo?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // ── Auth ──
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // ── Verificar rol: solo super_admin / admin_nodexia ──
    const { data: roles } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('rol_interno')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    const { data: isSuperAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    const esAdmin = !!isSuperAdmin || roles?.rol_interno === 'admin_nodexia';
    if (!esAdmin) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    // ── Validar body ──
    const { documento_id, accion, motivo_rechazo, fecha_emision, fecha_vencimiento } = req.body as ValidarBody;

    if (!documento_id || typeof documento_id !== 'string') {
      return res.status(400).json({
        error: 'Parámetro requerido faltante',
        details: 'Debe proporcionar documento_id (UUID)',
      });
    }

    const accionesValidas: Accion[] = ['aprobar', 'rechazar'];
    if (!accion || !accionesValidas.includes(accion)) {
      return res.status(400).json({
        error: 'Acción inválida',
        details: "accion debe ser 'aprobar' o 'rechazar'",
      });
    }

    if (accion === 'rechazar' && (!motivo_rechazo || motivo_rechazo.trim().length === 0)) {
      return res.status(400).json({
        error: 'Motivo requerido',
        details: 'Debe proporcionar motivo_rechazo al rechazar un documento',
      });
    }

    // ── Verificar que el documento existe y está pendiente ──
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

    if (documento.estado_vigencia !== 'pendiente_validacion') {
      return res.status(400).json({
        error: 'Estado no válido para validación',
        details: `El documento tiene estado '${documento.estado_vigencia}'. Solo se pueden validar documentos con estado 'pendiente_validacion'`,
      });
    }

    // ── Ejecutar la acción ──
    const ahora = new Date().toISOString();

    if (accion === 'aprobar') {
      const updateData: Record<string, any> = {
        estado_vigencia: 'vigente',
        validado_por: user.id,
        fecha_validacion: ahora,
        updated_at: ahora,
      };

      // Incluir fechas si el admin las proporcionó
      if (fecha_emision) {
        updateData.fecha_emision = fecha_emision;
      }
      if (fecha_vencimiento) {
        updateData.fecha_vencimiento = fecha_vencimiento;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('documentos_entidad')
        .update(updateData)
        .eq('id', documento_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error al aprobar documento:', updateError);
        return res.status(500).json({
          error: 'Error al aprobar documento',
          details: updateError.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Documento aprobado correctamente',
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

    // accion === 'rechazar'
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documentos_entidad')
      .update({
        estado_vigencia: 'rechazado',
        validado_por: user.id,
        fecha_validacion: ahora,
        motivo_rechazo: motivo_rechazo!.trim(),
        updated_at: ahora,
      })
      .eq('id', documento_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al rechazar documento:', updateError);
      return res.status(500).json({
        error: 'Error al rechazar documento',
        details: updateError.message,
      });
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
    console.error('Error en validación de documento:', message);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: message,
    });
  }
}
