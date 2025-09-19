// scripts/seed_demo_users.js
// Crea usuarios demo para varios perfiles y roles en Supabase.
// Requisitos: tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
// Uso:
// npm install @supabase/supabase-js dotenv
// node scripts/seed_demo_users.js

const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Lista de usuarios demo: {email, fullName, profileName, roleName}
const demoUsers = [
  { email: 'admin_demo@example.com', fullName: 'Admin Demo', profile: 'Administrador General', role: 'admin' },
  { email: 'coord_demo@example.com', fullName: 'Coordinador Demo', profile: 'Nodexia San Francisco', role: 'coordinador' },
  { email: 'chofer_demo@example.com', fullName: 'Chofer Demo', profile: 'Nodexia San Francisco', role: 'chofer' },
  { email: 'cliente_demo@example.com', fullName: 'Cliente Demo', profile: 'Empresa Demo', role: 'user' }
];

async function ensureProfileByName(name) {
  const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('name', name).limit(1).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data && data.id) return data.id;
  const { data: insertData, error: insertError } = await supabaseAdmin.from('profiles').insert({ name, type: 'demo', cuit: '000' + Math.floor(Math.random()*1000000) }).select().single();
  if (insertError) throw insertError;
  return insertData.id;
}

async function ensureRoleByName(name) {
  const { data, error } = await supabaseAdmin.from('roles').select('id').eq('name', name).limit(1).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data && data.id) return data.id;
  const { data: insertData, error: insertError } = await supabaseAdmin.from('roles').insert({ name }).select().single();
  if (insertError) throw insertError;
  return insertData.id;
}

async function createOrGetUser(email, password, fullName) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre_completo: fullName } });
    if (error) {
      const already = (error.code === 'email_exists') || (error.message && /already.*registered/i.test(error.message));
      if (!already) throw error;
      // buscar usuario existente
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const usersArr = listData && listData.users ? listData.users : Array.isArray(listData) ? listData : [];
      const found = usersArr.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
      if (found) return found;
      throw new Error('Email existe pero no se encontró el usuario en listUsers');
    }
    return data.user;
  } catch (err) {
    throw err;
  }
}

async function upsertProfileUser(userId, profileId, roleId, fullName) {
  const { data: exists, error: existsError } = await supabaseAdmin.from('profile_users').select('id').eq('user_id', userId).limit(1).single();
  if (existsError && existsError.code !== 'PGRST116') throw existsError;
  if (exists && exists.id) {
    await supabaseAdmin.from('profile_users').update({ profile_id: profileId, role_id: roleId, nombre: fullName }).eq('user_id', userId);
  } else {
    await supabaseAdmin.from('profile_users').insert({ user_id: userId, profile_id: profileId, role_id: roleId, nombre: fullName });
  }
}

async function upsertUsuarioMeta(userId, email, fullName) {
  const { data: exists, error: existsError } = await supabaseAdmin.from('usuarios').select('id').eq('id', userId).limit(1).single();
  if (existsError && existsError.code !== 'PGRST116') throw existsError;
  if (!exists || !exists.id) {
    await supabaseAdmin.from('usuarios').insert({ id: userId, email, nombre_completo: fullName });
  }
}

async function seed() {
  for (const u of demoUsers) {
    try {
      console.log('Procesando:', u.email);
      const profileId = await ensureProfileByName(u.profile);
      const roleId = await ensureRoleByName(u.role);
      // password demo predictable (no para producción)
      const password = 'Demo1234!';
      const user = await createOrGetUser(u.email, password, u.fullName);
      const userId = user.id || user.user?.id || user.uuid || userId;
      if (!userId) throw new Error('No se obtuvo user id');
      await upsertProfileUser(userId, profileId, roleId, u.fullName);
      await upsertUsuarioMeta(userId, u.email, u.fullName);
      console.log('OK:', u.email);
    } catch (err) {
      console.error('Error con', u.email, err && err.message ? err.message : err);
    }
  }
  console.log('Seed demo users finalizado');
}

seed().catch(e => { console.error('Seed falló', e); process.exit(1); });
