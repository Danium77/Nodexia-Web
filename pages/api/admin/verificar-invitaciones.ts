// pages/api/admin/verificar-invitaciones.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Obtener usuarios pendientes de confirmación
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Error obteniendo usuarios: ${usersError.message}`);
    }

    // Filtrar usuarios con invitaciones pendientes
    const pendingUsers = users.users.filter((user: any) => 
      !user.email_confirmed_at && 
      user.invited_at &&
      !user.confirmed_at
    );

    // Estadísticas de invitaciones
    const stats = {
      total_usuarios: users.users.length,
      usuarios_confirmados: users.users.filter((u: any) => u.email_confirmed_at).length,
      invitaciones_pendientes: pendingUsers.length,
      usuarios_activos: users.users.filter((u: any) => u.last_sign_in_at).length
    };

    // Detalles de invitaciones pendientes
    const invitacionesPendientes = pendingUsers.map(user => ({
      id: user.id,
      email: user.email,
      invited_at: user.invited_at,
      created_at: user.created_at,
      dias_desde_invitacion: user.invited_at 
        ? Math.floor((Date.now() - new Date(user.invited_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    }));

    return res.status(200).json({
      success: true,
      estadisticas: stats,
      invitaciones_pendientes: invitacionesPendientes,
      recomendaciones: [
        'Si una invitación tiene más de 7 días, considera reenviarla',
        'Verifica que los emails no estén en spam',
        'Confirma que el dominio del email sea válido',
        'Revisa los logs de Supabase para errores de SMTP'
      ]
    });

  } catch (error: any) {
    console.error('Error verificando invitaciones:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}