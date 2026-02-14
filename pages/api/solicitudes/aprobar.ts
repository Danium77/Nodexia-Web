import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface AprobarSolicitudRequest {
  solicitud_id: string;
  rol_inicial: string;
  password_temporal: string;
}

export default withAuth(async (req, res, _authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { solicitud_id, rol_inicial, password_temporal } = req.body as AprobarSolicitudRequest;

  if (!solicitud_id || !rol_inicial || !password_temporal) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  let empresaCreada: any = null;
  let usuarioCreado: any = null;
  let usuarioRegistroCreado = false;
  let relacionCreada = false;

  try {
    // PASO 1: Obtener datos de la solicitud
    const { data: solicitud, error: errorSolicitud } = await supabaseAdmin
      .from('solicitudes_registro')
      .select('*')
      .eq('id', solicitud_id)
      .single();

    if (errorSolicitud || !solicitud) {
      throw new Error(`Solicitud no encontrada: ${errorSolicitud?.message}`);
    }

    if (solicitud.estado !== 'pendiente') {
      throw new Error(`La solicitud ya fue procesada (estado: ${solicitud.estado})`);
    }

    // PASO 2: Crear empresa
    const { data: empresa, error: errorEmpresa } = await supabaseAdmin
      .from('empresas')
      .insert({
        nombre: solicitud.empresa_nombre,
        cuit: solicitud.empresa_cuit,
        tipo_empresa: solicitud.tipo_empresa_solicitado,
        activa: true
      })
      .select()
      .single();

    if (errorEmpresa || !empresa) {
      throw new Error(`Error creando empresa: ${errorEmpresa?.message}`);
    }

    empresaCreada = empresa;

    // PASO 3: Crear usuario en auth.users
    const { data: authUser, error: errorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: solicitud.email,
      password: password_temporal,
      email_confirm: true,
      user_metadata: {
        nombre_completo: solicitud.nombre_completo,
        empresa_id: empresa.id,
        rol_inicial: rol_inicial
      }
    });

    if (errorAuth || !authUser.user) {
      throw new Error(`Error creando usuario auth: ${errorAuth?.message}`);
    }

    usuarioCreado = authUser.user;

    // PASO 4: Crear registro en tabla usuarios
    const { error: errorUsuario } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUser.user.id,
        email: solicitud.email,
        nombre_completo: solicitud.nombre_completo,
        rol: 'user', // Rol general, el rol específico está en usuarios_empresa
        telefono: solicitud.telefono
      });

    if (errorUsuario) {
      throw new Error(`Error creando registro usuarios: ${errorUsuario.message}`);
    }

    usuarioRegistroCreado = true;

    // PASO 5: Crear relación usuarios_empresa
    const { error: errorRelacion } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({
        user_id: authUser.user.id,
        empresa_id: empresa.id,
        rol_interno: rol_inicial,
        activo: true
      });

    if (errorRelacion) {
      throw new Error(`Error creando relación usuarios_empresa: ${errorRelacion.message}`);
    }

    relacionCreada = true;

    // PASO 6: Actualizar solicitud a aprobada
    const notasAdmin = `APROBADA - Empresa: ${empresa.nombre} (ID: ${empresa.id}) | Usuario: ${solicitud.email} (ID: ${authUser.user.id}) | Rol: ${rol_inicial}`;

    const { error: errorUpdate } = await supabaseAdmin
      .from('solicitudes_registro')
      .update({
        estado: 'aprobada',
        notas_admin: notasAdmin
      })
      .eq('id', solicitud_id);

    if (errorUpdate) {
      throw new Error(`Error actualizando solicitud: ${errorUpdate.message}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitud aprobada exitosamente',
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
        cuit: empresa.cuit
      },
      usuario: {
        id: authUser.user.id,
        email: solicitud.email,
        nombre_completo: solicitud.nombre_completo
      },
      password_temporal
    });

  } catch (error: any) {
    // ROLLBACK: Intentar limpiar los registros creados

    if (relacionCreada && usuarioCreado) {
      await supabaseAdmin
        .from('usuarios_empresa')
        .delete()
        .eq('user_id', usuarioCreado.id);
    }

    if (usuarioRegistroCreado && usuarioCreado) {
      await supabaseAdmin
        .from('usuarios')
        .delete()
        .eq('id', usuarioCreado.id);
    }

    if (usuarioCreado) {
      await supabaseAdmin.auth.admin.deleteUser(usuarioCreado.id);
    }

    if (empresaCreada) {
      await supabaseAdmin
        .from('empresas')
        .delete()
        .eq('id', empresaCreada.id);
    }

    return res.status(500).json({
      error: error.message || 'Error al aprobar solicitud',
      details: error.toString()
    });
  }
}, { roles: ['admin_nodexia'] });
