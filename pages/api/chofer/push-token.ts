// pages/api/chofer/push-token.ts
// API Route para gestionar push tokens de dispositivos móviles
// POST: registrar/actualizar token | DELETE: eliminar token (logout)
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

const VALID_PLATFORMS = ['ios', 'android', 'web'] as const;

export default withAuth(async (req, res, { user }) => {
  const userId = user.id;

  // ─── POST: Registrar o actualizar push token ───────────────
  if (req.method === 'POST') {
    const { token, platform, app_version } = req.body || {};

    // Validación
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ error: 'Token es requerido' });
    }
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Platform inválido. Valores permitidos: ${VALID_PLATFORMS.join(', ')}` });
    }

    try {
      // Upsert: si ya existe el par (user_id, token), actualiza platform/version
      const { data, error } = await supabaseAdmin
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            token: token.trim(),
            platform,
            app_version: app_version || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        )
        .select('id, token, platform, app_version, updated_at')
        .single();

      if (error) {
        // Conflict si el token ya pertenece a otro usuario → limpiar y reinsertar
        if (error.code === '23505') {
          // Eliminar token viejo de otro usuario
          await supabaseAdmin
            .from('push_tokens')
            .delete()
            .eq('token', token.trim())
            .neq('user_id', userId);

          // Reintentar insert
          const { data: retryData, error: retryError } = await supabaseAdmin
            .from('push_tokens')
            .upsert(
              {
                user_id: userId,
                token: token.trim(),
                platform,
                app_version: app_version || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,token' }
            )
            .select('id, token, platform, app_version, updated_at')
            .single();

          if (retryError) {
            return res.status(500).json({ error: 'Error registrando token', details: retryError.message });
          }

          return res.status(200).json({ success: true, push_token: retryData });
        }

        return res.status(500).json({ error: 'Error registrando token', details: error.message });
      }

      return res.status(200).json({ success: true, push_token: data });
    } catch (err: unknown) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // ─── DELETE: Eliminar push token (logout) ──────────────────
  if (req.method === 'DELETE') {
    const { token } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token es requerido' });
    }

    try {
      const { error } = await supabaseAdmin
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token.trim());

      if (error) {
        return res.status(500).json({ error: 'Error eliminando token', details: error.message });
      }

      return res.status(200).json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
});
