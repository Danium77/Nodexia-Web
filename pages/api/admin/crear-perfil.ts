// pages/api/admin/crear-perfil.ts
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, type, cuit } = req.body;
    if (!name || !type || !cuit) {
      return res.status(400).json({ error: 'El nombre, tipo y CUIT del perfil son requeridos.' });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({ name, type, cuit })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'El CUIT ingresado ya existe.' });
      }
      throw insertError;
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
