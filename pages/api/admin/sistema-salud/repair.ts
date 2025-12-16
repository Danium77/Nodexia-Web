import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { repairOrphanUsers } from '@/lib/scripts/verificar-sincronizacion';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo POST permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar autenticación
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar que sea admin o super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol_primario')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.rol_primario)) {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    // Ejecutar reparación
    const repairs = await repairOrphanUsers();

    return res.status(200).json({
      success: true,
      repairs,
      count: repairs.length,
      message: `Se repararon ${repairs.length} usuario(s)`
    });

  } catch (error) {
    console.error('Error en repair API:', error);
    return res.status(500).json({ 
      error: 'Error al reparar usuarios' 
    });
  }
}
