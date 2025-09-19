// scripts/create_admin.js
// Script para crear un usuario admin en Supabase y asociarlo a un perfil y rol.
// Usage (described in README-DB-restore.md):
// 1) npm install @supabase/supabase-js dotenv
// 2) Create a .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME
// 3) node scripts/create_admin.js

// Load environment variables from .env and then .env.local (if present).
// This ensures users who created a .env.local file (Next.js convention) are supported.
const dotenv = require('dotenv');
dotenv.config(); // load .env if exists
dotenv.config({ path: '.env.local' }); // load .env.local and override
const { createClient } = require('@supabase/supabase-js');

// DEBUG: print presence of important env vars (mask secret values)
function mask(s) {
  if (!s) return 'NOT SET';
  if (s.length <= 12) return s;
  return s.slice(0,6) + '...' + s.slice(-6);
}
console.log('env debug:', {
  SUPABASE_URL: mask(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'NOT SET'
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'Admin User';
const PROFILE_ID = process.env.PROFILE_ID; // optional: if not provided, a demo profile will be created
const ROLE_NAME = process.env.ROLE_NAME || 'admin';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Faltan variables de entorno. Revisa SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to add a timeout to async calls (rejects if the promise doesn't settle in ms)
function withTimeout(promise, ms, label) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms));
  return Promise.race([promise, timeout]);
}

async function ensureRole(roleName) {
  const { data, error } = await supabaseAdmin.from('roles').select('id').eq('name', roleName).limit(1).single();
  if (error && error.code !== 'PGRST116') {
    // PGRST116 es "no rows", manejamos creando
    console.error('Error al buscar rol:', error.message || error);
    throw error;
  }
  if (data && data.id) return data.id;
  const { data: insertData, error: insertError } = await supabaseAdmin.from('roles').insert({ name: roleName }).select().single();
  if (insertError) throw insertError;
  return insertData.id;
}

async function ensureProfile(profileId) {
  if (profileId) return profileId;
  // Crear perfil demo
  const cuitVal = '00000000000';
  try {
    const { data: insertData, error: insertError } = await supabaseAdmin.from('profiles').insert({ name: 'Empresa Admin', type: 'admin', cuit: cuitVal }).select().single();
    if (insertError) throw insertError;
    return insertData.id;
  } catch (err) {
    // Si ya existe por constraint de CUIT, recuperar la fila existente
    if (err && (err.code === '23505' || (err.message && err.message.includes('already exists')))) {
      const { data: existing, error: getErr } = await supabaseAdmin.from('profiles').select('id').eq('cuit', cuitVal).limit(1).single();
      if (getErr) throw getErr;
      if (existing && existing.id) return existing.id;
    }
    throw err;
  }
}

async function createAdmin() {
  try {
    // 1) Crear usuario vía admin API
    console.log('Creando usuario en Supabase Auth... (timeout 15000ms)');
    let newUserData, createUserError;
    try {
      const resp = await withTimeout(
        supabaseAdmin.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
          user_metadata: { nombre_completo: ADMIN_FULL_NAME }
        }),
        15000,
        'supabaseAdmin.auth.admin.createUser'
      );
      newUserData = resp.data;
      createUserError = resp.error;
      console.log('createUser response received');
    } catch (err) {
      console.error('Error/timeout calling createUser:', err && err.message ? err.message : err);
      throw err;
    }
    if (createUserError) {
      // Si ya existe, intentar recuperar. Manejar distintos formatos de error.
      const isExists = (createUserError.code && createUserError.code === 'email_exists') ||
        (createUserError.message && /already.*registered/i.test(createUserError.message));
      if (isExists) {
        console.warn('Usuario ya existe en Auth, intentando obtenerlo...');
        // Intentar obtener el usuario usando admin.listUsers() (mejor soporte a través de la API de administrador)
        try {
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) throw listError;
          // listData can be { users: [...] } or an array depending on client version
          const candidates = listData && listData.users ? listData.users : Array.isArray(listData) ? listData : [];
          const found = candidates.find(u => String(u.email).toLowerCase() === String(ADMIN_EMAIL).toLowerCase());
          if (found) {
            newUserData = { user: found };
          } else {
            throw createUserError;
          }
        } catch (errList) {
          // Si falla listUsers, re-lanzamos el error original para no ocultar la causa inicial
          throw createUserError;
        }
      } else {
        throw createUserError;
      }
    }

    const userId = newUserData.user.id;
    console.log('Usuario creado/recuperado con id:', userId);

    // 2) Asegurar rol
    const roleId = await ensureRole(ROLE_NAME);
    console.log('Role id:', roleId);

    // 3) Asegurar profile
    const profileId = await ensureProfile(PROFILE_ID);
    console.log('Profile id:', profileId);

    // 4) Insertar en profile_users (si no existe)
    const { data: exists, error: existsError } = await supabaseAdmin.from('profile_users').select('id').eq('user_id', userId).limit(1).single();
    if (existsError && existsError.code !== 'PGRST116') throw existsError;
    if (exists && exists.id) {
      console.log('La fila en profile_users ya existe. Actualizando role/profile si es necesario...');
      const { error: updateError } = await supabaseAdmin.from('profile_users').update({ profile_id: profileId, role_id: roleId, nombre: ADMIN_FULL_NAME }).eq('user_id', userId);
      if (updateError) throw updateError;
      console.log('Profile_users actualizado.');
    } else {
      const { data: insertPU, error: insertPUError } = await supabaseAdmin.from('profile_users').insert({ user_id: userId, profile_id: profileId, role_id: roleId, nombre: ADMIN_FULL_NAME }).select().single();
      if (insertPUError) throw insertPUError;
      console.log('Fila en profile_users creada con id:', insertPU.id);
    }

    // 5) Opcional: insertar en public.usuarios tabla (metadata)
    const { data: uExists, error: uExistsError } = await supabaseAdmin.from('usuarios').select('id').eq('id', userId).limit(1).single();
    if (uExistsError && uExistsError.code !== 'PGRST116') throw uExistsError;
    if (!uExists || !uExists.id) {
      const { error: insertUserMetaError } = await supabaseAdmin.from('usuarios').insert({ id: userId, email: ADMIN_EMAIL, nombre_completo: ADMIN_FULL_NAME }).select();
      if (insertUserMetaError) throw insertUserMetaError;
      console.log('Fila en public.usuarios creada.');
    } else {
      console.log('public.usuarios ya contiene al usuario.');
    }

    console.log('Admin creado y asociado correctamente.');
  } catch (err) {
    console.error('Error en createAdmin:', err);
    process.exit(1);
  }
}

createAdmin();
