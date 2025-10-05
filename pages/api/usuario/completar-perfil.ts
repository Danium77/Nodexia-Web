import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { nombre, apellido, dni, localidad, telefono } = req.body;
    // El usuario debe estar autenticado para completar su perfil
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token de autorización no proporcionado.' });
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'No autorizado: Token inválido' });
    }
    console.log('👤 Completando perfil para usuario:', user.id);
    console.log('📧 Email del usuario:', user.email);
    console.log('🎭 Metadata del usuario:', user.user_metadata);

    // Obtener la metadata de la invitación que incluye empresa_id
    const metadata = user.user_metadata || {};
    const empresa_id = metadata.empresa_id;
    const rol_interno = metadata.rol_interno || 'usuario';
    const departamento = metadata.departamento || '';
    const empresa_nombre = metadata.empresa_nombre || 'Sin asignar';

    console.log('🏢 Datos de empresa desde metadata:', { empresa_id, empresa_nombre, rol_interno });

    if (!empresa_id) {
      return res.status(400).json({ 
        error: 'No se encontró información de empresa en la invitación',
        detalle: 'Contacte al administrador para resolver este problema'
      });
    }

    // Insertar en usuarios_empresa para asociar el usuario con la empresa
    const { error: insertError } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({
        user_id: user.id,
        empresa_id,
        nombre,
        apellido,
        email: user.email,
        telefono: telefono || '',
        dni: dni || '',
        localidad: localidad || '',
        rol_interno,
        departamento,
        fecha_vinculacion: new Date().toISOString(),
        activo: true
      });
    if (insertError) {
      console.error('❌ Error insertando en usuarios_empresa:', insertError);
      throw insertError;
    }

    console.log('✅ Usuario asociado exitosamente con empresa');

    // También actualizar el perfil del usuario si existe la tabla profile_users
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profile_users')
      .upsert({
        user_id: user.id,
        nombre,
        apellido,
        dni,
        localidad,
        telefono
      }, { onConflict: 'user_id' });

    // No fallar si profile_users no existe, solo logear
    if (profileUpdateError) {
      console.log('ℹ️ No se pudo actualizar profile_users (puede no existir):', profileUpdateError.message);
    }
    res.status(200).json({ 
      message: 'Perfil completado y usuario asociado a empresa exitosamente',
      detalles: {
        usuario: `${nombre} ${apellido}`,
        email: user.email,
        empresa: empresa_nombre,
        rol: rol_interno,
        departamento: departamento || 'No especificado'
      }
    });
  } catch (error: any) {
    console.error('Error al completar perfil:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}
