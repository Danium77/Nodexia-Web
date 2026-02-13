import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, profileId, roleId } = req.body;

    if (!userId || !profileId || !roleId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: userId, profileId, roleId.' });
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('profile_users')
      .update({ profile_id: profileId, role_id: roleId })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({ error: 'El usuario a editar no fue encontrado.' });
      }
      throw updateError;
    }

    res.status(200).json({ message: 'Usuario actualizado exitosamente.', user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });