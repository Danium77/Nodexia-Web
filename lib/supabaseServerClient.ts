// lib/supabaseServerClient.ts
// Cliente Supabase con contexto de usuario para API routes.
// Respeta RLS evaluando queries con el auth.uid() del token JWT.
// NUNCA usar supabaseAdmin para queries de datos de usuario autenticado.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Crea un cliente Supabase autenticado como el usuario del token.
 * RLS se evalúa con auth.uid() del JWT → seguridad a nivel de fila.
 *
 * Uso en API routes (dentro de withAuth):
 *   const supabaseUser = createUserSupabaseClient(auth.token);
 *   const { data } = await supabaseUser.from('tabla').select('*');
 */
export function createUserSupabaseClient(token: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
