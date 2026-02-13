// pages/api/documentacion/preview-url.ts
// API para generar URL firmada de documentos usando service role (bypasses storage RLS)
// Usado por: validacion-documentos.tsx modal preview

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar rol: solo admin_nodexia / super_admin / control_acceso
    const { data: isSuperAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', authCtx.userId)
      .eq('activo', true)
      .maybeSingle();

    const rolesPermitidos = ['admin_nodexia', 'super_admin', 'control_acceso'];
    const tieneAcceso = !!isSuperAdmin || rolesPermitidos.includes(authCtx.rolInterno || '');
    if (!tieneAcceso) {
      return res.status(403).json({ error: 'Sin permisos para ver documentos' });
    }

    const { file_url } = req.body as { file_url: string };

    if (!file_url || typeof file_url !== 'string') {
      return res.status(400).json({ error: 'file_url es requerido' });
    }

    // Generar signed URL con service role (bypasses storage RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('documentacion-entidades')
      .createSignedUrl(file_url, 600); // 10 minutos

    if (error) {
      return res.status(500).json({ error: 'Error al generar URL de vista previa', details: error.message });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ error: 'Error interno', details: message });
  }
});
