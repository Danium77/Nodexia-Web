// pages/api/test-auth.ts
// Endpoint de prueba para verificar autenticación

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabase = createServerSupabaseClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return res.status(200).json({
      authenticated: !!session,
      user: session?.user ? {
        email: session.user.email,
        id: session.user.id,
        role: session.user.role
      } : null,
      cookies: {
        hasCookies: !!req.headers.cookie,
        cookieNames: req.headers.cookie?.split(';').map(c => c.trim().split('=')[0]) || []
      },
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']
      }
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Error verificando autenticación', 
      details: error.message 
    });
  }
}
