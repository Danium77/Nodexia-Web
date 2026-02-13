// pages/api/admin/eliminar-usuario.ts
import { withAuth } from '../../../lib/middleware/withAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido. Usar POST.' });
  }

  try {
    const { email, userId, deleteAll = false } = req.body;

    if (!email && !userId) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar email o userId' });
    }

    let targetUserId = userId;

    if (email && !userId) {
      const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      if (getUserError) throw new Error(`Error al buscar usuario: ${getUserError.message}`);

      const user = users.users.find((u: any) => u.email === email);
      if (!user) {
        return res.status(404).json({ success: false, message: `Usuario con email ${email} no encontrado` });
      }
      targetUserId = user.id;
    }

    const details = {
      authUserDeleted: false,
      profileUserDeleted: false,
      usuariosDeleted: false,
      usuariosEmpresaDeleted: false,
      otherReferencesDeleted: [] as string[]
    };

    // Eliminar de profile_users (legacy cleanup)
    try {
      const { error } = await supabaseAdmin.from('profile_users').delete().eq('user_id', targetUserId);
      if (!error) details.profileUserDeleted = true;
    } catch { /* tabla puede no existir */ }

    // Eliminar de tabla usuarios
    try {
      const { error } = await supabaseAdmin.from('usuarios').delete().eq('id', targetUserId);
      if (!error) details.usuariosDeleted = true;
    } catch { /* tabla puede no existir */ }

    // Eliminar de usuarios_empresa
    try {
      const { error } = await supabaseAdmin.from('usuarios_empresa').delete().eq('user_id', targetUserId);
      if (!error) details.usuariosEmpresaDeleted = true;
    } catch { /* tabla puede no existir */ }

    // Si deleteAll, eliminar de tablas adicionales
    if (deleteAll) {
      const tablas = ['documentos', 'despachos', 'camiones', 'choferes', 'acoplados', 'transportes', 'super_admins'];
      for (const tabla of tablas) {
        try {
          const { error: e1 } = await supabaseAdmin.from(tabla).delete().eq('user_id', targetUserId);
          if (!e1) details.otherReferencesDeleted.push(`${tabla} (user_id)`);
          const { error: e2 } = await supabaseAdmin.from(tabla).delete().eq('created_by', targetUserId);
          if (!e2) details.otherReferencesDeleted.push(`${tabla} (created_by)`);
        } catch { /* tabla puede no existir */ }
      }
    }

    // Eliminar de auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId!);
    if (!authError) details.authUserDeleted = true;

    const message = details.authUserDeleted
      ? `Usuario ${email || targetUserId} eliminado completamente del sistema`
      : `Usuario ${email || targetUserId} eliminado parcialmente (referencias limpiadas)`;

    return res.status(200).json({ success: true, message, details });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });