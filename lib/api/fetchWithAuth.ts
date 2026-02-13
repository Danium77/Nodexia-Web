/**
 * Wrapper para fetch que agrega automáticamente el Bearer token.
 * Uso: importar y usar en lugar de fetch() directo en todo el frontend.
 *
 * Ejemplo:
 *   const res = await fetchWithAuth('/api/mi-ruta', { method: 'POST', body: JSON.stringify(data) });
 */

import { supabase } from '../supabaseClient';

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(options.headers);

  // Solo agregar Content-Type si no existe y no es FormData
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
