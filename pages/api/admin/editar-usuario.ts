import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';
import { auditLog } from '@/lib/services/auditLog';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, profileId, roleId } = req.body;

    if (!userId || !profileId || !roleId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: userId, profileId, roleId.' });
    }

    // IDOR fix: verificar que el usuario objetivo pertenece a la empresa del caller
    if (authCtx.rolInterno !== 'admin_nodexia') {
      const { data: targetUe } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', userId)
        .eq('empresa_id', authCtx.empresaId!)
        .maybeSingle();

      if (!targetUe) {
        return res.status(403).json({ error: 'No tienes permiso para editar este usuario' });
      }
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('profile_users')
      .update({ profile_id: profileId, role_id: roleId })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({ error: 'El usuario a editar no fue encontrado.' });
      }
      throw updateError;
    }

    await auditLog(req, authCtx, {
      action: 'user.edit_role',
      targetType: 'user',
      targetId: userId,
      metadata: { profileId, roleId },
    });

    res.status(200).json({ message: 'Usuario actualizado exitosamente.', user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });