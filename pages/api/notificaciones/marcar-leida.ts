// pages/api/notificaciones/marcar-leida.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { notificacion_id, user_id, marcar_todas } = req.body;

    // Validaciones
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }

    if (!marcar_todas && !notificacion_id) {
      return res.status(400).json({ error: 'notificacion_id es requerido o usar marcar_todas' });
    }

    // Si es marcar todas como leídas
    if (marcar_todas) {
      const { data, error } = await supabase
        .from('notificaciones')
        .update({ 
          leida: true,
          leida_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('leida', false);

      if (error) {
        console.error('Error marcando todas como leídas:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Todas las notificaciones marcadas como leídas',
        data 
      });
    }

    // Marcar una notificación específica
    const { data, error } = await supabase
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
      console.error('Error marcando notificación:', error);
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
    console.error('Error en API marcar-leida:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
