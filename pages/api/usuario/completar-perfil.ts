import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware/withAuth';

export default withAuth(async (req, res, { user, userId }) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { nombre, apellido, dni, localidad, telefono } = req.body;

    // Obtener la metadata de la invitación que incluye empresa_id
    const metadata = user.user_metadata || {};
    const empresa_id = metadata.empresa_id;
    const rol_interno = metadata.rol_interno || 'usuario';
    const departamento = metadata.departamento || '';
    const empresa_nombre = metadata.empresa_nombre || 'Sin asignar';

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
        user_id: userId,
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
      throw insertError;
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
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
});
