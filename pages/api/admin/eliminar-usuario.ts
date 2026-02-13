// pages/api/admin/eliminar-usuario.ts
import { withAuth } from '../../../lib/middleware/withAuth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

interface EliminarUsuarioRequest {
  email?: string;
  userId?: string;
  deleteAll?: boolean; // Si es true, elimina TODOS los registros asociados
}

interface EliminarUsuarioResponse {
  success: boolean;
  message: string;
  details?: {
    authUserDeleted: boolean;
    profileUserDeleted: boolean;
    usuariosDeleted: boolean;
    usuariosEmpresaDeleted: boolean;
    otherReferencesDeleted: string[];
  };
  error?: string;
}

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido. Usar POST.'
    });
  }

  try {
    const { email, userId, deleteAll = false }: EliminarUsuarioRequest = req.body;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar email o userId'
      });
    }

    let targetUserId = userId;

    // Si se proporciona email, buscar el userId
    if (email && !userId) {
      const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (getUserError) {
        throw new Error(`Error al buscar usuario: ${getUserError.message}`);
      }

      const user = users.users.find((u: any) => u.email === email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `Usuario con email ${email} no encontrado`
        });
      }
      
      targetUserId = user.id;
    }

    console.log(`🗑️ Eliminando usuario ${email || targetUserId}...`);

    const details = {
      authUserDeleted: false,
      profileUserDeleted: false,
      usuariosDeleted: false,
      usuariosEmpresaDeleted: false,
      otherReferencesDeleted: [] as string[]
    };

    // 1. Eliminar de profile_users
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profile_users')
        .delete()
        .eq('user_id', targetUserId);
      
      if (!profileError) {
        details.profileUserDeleted = true;
        console.log('✅ Eliminado de profile_users');
      } else {
        console.log('⚠️ Error al eliminar de profile_users:', profileError.message);
      }
    } catch (error) {
      console.log('⚠️ profile_users no existe o error:', error);
    }

    // 2. Eliminar de tabla usuarios
    try {
      const { error: usuariosError } = await supabaseAdmin
        .from('usuarios')
        .delete()
        .eq('id', targetUserId);
      
      if (!usuariosError) {
        details.usuariosDeleted = true;
        console.log('✅ Eliminado de usuarios');
      } else {
        console.log('⚠️ Error al eliminar de usuarios:', usuariosError.message);
      }
    } catch (error) {
      console.log('⚠️ tabla usuarios no existe o error:', error);
    }

    // 3. Eliminar de usuarios_empresa
    try {
      const { error: usuariosEmpresaError } = await supabaseAdmin
        .from('usuarios_empresa')
        .delete()
        .eq('user_id', targetUserId);
      
      if (!usuariosEmpresaError) {
        details.usuariosEmpresaDeleted = true;
        console.log('✅ Eliminado de usuarios_empresa');
      } else {
        console.log('⚠️ Error al eliminar de usuarios_empresa:', usuariosEmpresaError.message);
      }
    } catch (error) {
      console.log('⚠️ tabla usuarios_empresa no existe o error:', error);
    }

    // 4. Si deleteAll es true, eliminar de otras tablas que pudieran tener referencia
    if (deleteAll) {
      const tablasAdicionales = [
        'documentos',
        'despachos', 
        'camiones',
        'choferes',
        'acoplados',
        'transportes',
        'super_admins'
      ];

      for (const tabla of tablasAdicionales) {
        try {
          // Intentar eliminar por user_id
          const { error: deleteError1 } = await supabaseAdmin
            .from(tabla)
            .delete()
            .eq('user_id', targetUserId);
          
          if (!deleteError1) {
            details.otherReferencesDeleted.push(`${tabla} (user_id)`);
            console.log(`✅ Eliminado de ${tabla} por user_id`);
          }

          // Intentar eliminar por created_by si es diferente
          const { error: deleteError2 } = await supabaseAdmin
            .from(tabla)
            .delete()
            .eq('created_by', targetUserId);
          
          if (!deleteError2) {
            details.otherReferencesDeleted.push(`${tabla} (created_by)`);
            console.log(`✅ Eliminado de ${tabla} por created_by`);
          }

        } catch (error) {
          console.log(`⚠️ tabla ${tabla} no existe o no tiene referencias:`, error);
        }
      }
    }

    // 5. Finalmente, eliminar de auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId!);
    
    if (authError) {
      console.log('⚠️ Error al eliminar de auth.users:', authError.message);
    } else {
      details.authUserDeleted = true;
      console.log('✅ Eliminado de auth.users');
    }

    const message = details.authUserDeleted 
      ? `Usuario ${email || targetUserId} eliminado completamente del sistema`
      : `Usuario ${email || targetUserId} eliminado parcialmente (referencias limpiadas)`;

    return res.status(200).json({
      success: true,
      message,
      details
    });

  } catch (error: any) {
    console.error('❌ Error al eliminar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });