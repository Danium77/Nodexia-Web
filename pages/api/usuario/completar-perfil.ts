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
    // Actualizar los datos en profile_users
    const { error: updateError } = await supabaseAdmin
      .from('profile_users')
      .update({
        nombre,
        apellido,
        dni,
        localidad,
        telefono
      })
      .eq('user_id', user.id);
    if (updateError) {
      throw updateError;
    }
    res.status(200).json({ message: 'Perfil actualizado correctamente.' });
  } catch (error: any) {
    console.error('Error al completar perfil:', error);
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}
