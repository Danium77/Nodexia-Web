import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Usar SERVICE_ROLE_KEY para crear usuarios
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AprobarSolicitudRequest {
  solicitud_id: string;
  rol_inicial: string;
  password_temporal: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { solicitud_id, rol_inicial, password_temporal } = req.body as AprobarSolicitudRequest;

  if (!solicitud_id || !rol_inicial || !password_temporal) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  console.log('[Aprobar] Iniciando proceso para solicitud:', solicitud_id);

  let empresaCreada: any = null;
  let usuarioCreado: any = null;
  let usuarioRegistroCreado = false;
  let relacionCreada = false;

  try {
    // PASO 1: Obtener datos de la solicitud
    console.log('[Aprobar] PASO 1: Obteniendo solicitud...');
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

    console.log('[Aprobar] Solicitud encontrada:', solicitud.nombre_completo);

    // PASO 2: Crear empresa
    console.log('[Aprobar] PASO 2: Creando empresa...');
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
    console.log('[Aprobar] Empresa creada con ID:', empresa.id);

    // PASO 3: Crear usuario en auth.users
    console.log('[Aprobar] PASO 3: Creando usuario en auth...');
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
    console.log('[Aprobar] Usuario auth creado con ID:', authUser.user.id);

    // PASO 4: Crear registro en tabla usuarios
    console.log('[Aprobar] PASO 4: Creando registro en usuarios...');
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
    console.log('[Aprobar] Registro usuarios creado');

    // PASO 5: Crear relación usuarios_empresa
    console.log('[Aprobar] PASO 5: Creando relación usuarios_empresa...');
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
    console.log('[Aprobar] Relación usuarios_empresa creada');

    // PASO 6: Actualizar solicitud a aprobada
    console.log('[Aprobar] PASO 6: Actualizando solicitud a aprobada...');
    const notasAdmin = `APROBADA - Empresa: ${empresa.nombre} (ID: ${empresa.id}) | Usuario: ${solicitud.email} (ID: ${authUser.user.id}) | Rol: ${rol_inicial} | Password temporal: ${password_temporal}`;

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

    console.log('[Aprobar] ✅ Proceso completado exitosamente');

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
    console.error('[Aprobar] ❌ Error en el proceso:', error.message);

    // ROLLBACK: Intentar limpiar los registros creados
    console.log('[Aprobar] Iniciando rollback...');

    if (relacionCreada && usuarioCreado) {
      console.log('[Aprobar] Eliminando relación usuarios_empresa...');
      await supabaseAdmin
        .from('usuarios_empresa')
        .delete()
        .eq('user_id', usuarioCreado.id);
    }

    if (usuarioRegistroCreado && usuarioCreado) {
      console.log('[Aprobar] Eliminando registro usuarios...');
      await supabaseAdmin
        .from('usuarios')
        .delete()
        .eq('id', usuarioCreado.id);
    }

    if (usuarioCreado) {
      console.log('[Aprobar] Eliminando usuario auth...');
      await supabaseAdmin.auth.admin.deleteUser(usuarioCreado.id);
    }

    if (empresaCreada) {
      console.log('[Aprobar] Eliminando empresa...');
      await supabaseAdmin
        .from('empresas')
        .delete()
        .eq('id', empresaCreada.id);
    }

    console.log('[Aprobar] Rollback completado');

    return res.status(500).json({
      error: error.message || 'Error al aprobar solicitud',
      details: error.toString()
    });
  }
}
