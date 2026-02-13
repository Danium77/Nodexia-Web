// pages/api/notificaciones/marcar-leida.ts
import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { notificacion_id, marcar_todas } = req.body;
    const user_id = authCtx.userId;

    if (!marcar_todas && !notificacion_id) {
      return res.status(400).json({ error: 'notificacion_id es requerido o usar marcar_todas' });
    }

    // Si es marcar todas como leídas
    if (marcar_todas) {
      const { data, error } = await supabaseAdmin
        .from('notificaciones')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('leida', false);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Todas las notificaciones marcadas como leídas',
        data 
      });
    }

    // Marcar una notificación específica
    const { data, error } = await supabaseAdmin
      .from('notificaciones')
      .update({ 
        leida: true,
        leida_at: new Date().toISOString()
      })
      .eq('id', notificacion_id)
      .eq('user_id', user_id) // Seguridad: solo puede marcar sus propias notificaciones
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Notificación marcada como leída',
      data 
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});
