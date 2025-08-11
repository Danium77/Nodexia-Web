// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificación robusta de variables de entorno para asegurar que no falten.
if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Error crítico: Faltan las variables de entorno de Supabase. Revisa tu archivo .env.local y reinicia el servidor.");
}

// Cliente de Supabase con privilegios de administrador para usar en el backend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
