// pages/api/documentacion/preview-url.ts
// API para generar URL firmada de documentos usando service role (bypasses storage RLS)
// Usado por: validacion-documentos.tsx modal preview

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar autenticación
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Verificar rol: solo admin_nodexia / super_admin / control_acceso
    const [{ data: isSuperAdmin }, { data: usuario }] = await Promise.all([
      supabaseAdmin
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .maybeSingle(),
      supabaseAdmin
        .from('usuarios_empresa')
        .select('rol_interno')
        .eq('user_id', user.id)
        .eq('activo', true)
        .maybeSingle(),
    ]);

    const rolesPermitidos = ['admin_nodexia', 'super_admin', 'control_acceso'];
    const tieneAcceso = !!isSuperAdmin || rolesPermitidos.includes(usuario?.rol_interno || '');
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
      console.error('Error generando signed URL:', error);
      return res.status(500).json({ error: 'Error al generar URL de vista previa', details: error.message });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error en preview-url:', message);
    return res.status(500).json({ error: 'Error interno', details: message });
  }
}
