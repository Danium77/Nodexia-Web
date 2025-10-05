// scripts/seed_demo_users_updated.js
// Crea usuarios demo con la nueva estructura de empresas y usuarios_empresa
// Requisitos: tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local

const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Empresas demo para crear
const empresasDemo = [
  {
    nombre: 'Tecnoembalajes Demo S.A.',
    cuit: '20-12345678-9',
    direccion: 'Av. Industrial 1234, San Francisco',
    telefono: '+54 3564 123456',
    email: 'info@tecnoembalajesdemo.com',
    activa: true
  },
  {
    nombre: 'Transportes Nodexia Demo',
    cuit: '30-98765432-1', 
    direccion: 'Ruta Nacional 19 Km 432',
    telefono: '+54 3564 654321',
    email: 'operaciones@nodexiademo.com',
    activa: true
  },
  {
    nombre: 'Logística del Centro Demo',
    cuit: '27-55443322-8',
    direccion: 'Parque Industrial Norte',
    telefono: '+54 3564 987654',
    email: 'contacto@logisticademo.com',
    activa: true
  }
];

// Usuarios demo para crear
const usuariosDemo = [
  {
    email: 'admin.demo@nodexia.com',
    password: 'Demo1234!',
    nombre: 'Carlos',
    apellido: 'Administrador',
    empresa: 'Transportes Nodexia Demo',
    rol_interno: 'Super Admin',
    departamento: 'Administración',
    telefono_interno: '+54 3564 654321',
    es_super_admin: true
  },
  {
    email: 'coordinador.demo@tecnoembalajes.com',
    password: 'Demo1234!',
    nombre: 'María',
    apellido: 'Coordinadora',
    empresa: 'Tecnoembalajes Demo S.A.',
    rol_interno: 'Coordinador',
    departamento: 'Operaciones',
    telefono_interno: '+54 3564 123456'
  },
  {
    email: 'supervisor.carga@nodexia.com',
    password: 'Demo1234!',
    nombre: 'Luis',
    apellido: 'Supervisor',
    empresa: 'Transportes Nodexia Demo',
    rol_interno: 'Supervisor de Carga',
    departamento: 'Operaciones',
    telefono_interno: '+54 3564 789123'
  },
  {
    email: 'control.acceso@nodexia.com',
    password: 'Demo1234!',
    nombre: 'Elena',
    apellido: 'Seguridad',
    empresa: 'Transportes Nodexia Demo',
    rol_interno: 'Control de Acceso',
    departamento: 'Seguridad',
    telefono_interno: '+54 3564 456789'
  },
  {
    email: 'chofer.demo@nodexia.com',
    password: 'Demo1234!',
    nombre: 'Juan',
    apellido: 'Transportista',
    empresa: 'Transportes Nodexia Demo',
    rol_interno: 'Chofer',
    departamento: 'Transporte',
    telefono_interno: '+54 3564 654322'
  },
  {
    email: 'operador.demo@logistica.com',
    password: 'Demo1234!',
    nombre: 'Ana',
    apellido: 'Operadora',
    empresa: 'Logística del Centro Demo',
    rol_interno: 'Operador',
    departamento: 'Logística',
    telefono_interno: '+54 3564 987655'
  },
  {
    email: 'cliente.demo@tecnoembalajes.com',
    password: 'Demo1234!',
    nombre: 'Roberto',
    apellido: 'Cliente',
    empresa: 'Tecnoembalajes Demo S.A.',
    rol_interno: 'Cliente',
    departamento: 'Ventas',
    telefono_interno: '+54 3564 123457'
  }
];

// Roles de empresa demo
const rolesEmpresa = [
  { nombre: 'Super Admin', descripcion: 'Administrador del sistema', tipo_empresa: 'ambos', nombre_rol: 'Super Admin' },
  { nombre: 'Coordinador', descripcion: 'Coordinador de operaciones', tipo_empresa: 'coordinador', nombre_rol: 'Coordinador' },
  { nombre: 'Chofer', descripcion: 'Conductor de transporte', tipo_empresa: 'ambos', nombre_rol: 'Chofer' },
  { nombre: 'Operador', descripcion: 'Operador logístico', tipo_empresa: 'ambos', nombre_rol: 'Operador' },
  { nombre: 'Supervisor de Carga', descripcion: 'Supervisor de operaciones de carga', tipo_empresa: 'ambos', nombre_rol: 'Supervisor de Carga' },
  { nombre: 'Control de Acceso', descripcion: 'Control de acceso y seguridad', tipo_empresa: 'ambos', nombre_rol: 'Control de Acceso' },
  { nombre: 'Cliente', descripcion: 'Usuario cliente', tipo_empresa: 'coordinador', nombre_rol: 'Cliente' }
];

async function crearEmpresasDemo() {
  console.log('🏢 Creando empresas demo...');
  const empresasCreadas = {};
  
  for (const empresa of empresasDemo) {
    try {
      // Verificar si ya existe
      const { data: existente, error: errorBuscar } = await supabaseAdmin
        .from('empresas')
        .select('id, nombre')
        .eq('cuit', empresa.cuit)
        .single();

      if (existente) {
        console.log(`   ✅ Empresa ya existe: ${existente.nombre}`);
        empresasCreadas[empresa.nombre] = existente.id;
        continue;
      }

      // Crear nueva empresa
      const { data: nuevaEmpresa, error: errorCrear } = await supabaseAdmin
        .from('empresas')
        .insert(empresa)
        .select('id, nombre')
        .single();

      if (errorCrear) {
        console.error(`   ❌ Error creando ${empresa.nombre}:`, errorCrear.message);
        continue;
      }

      empresasCreadas[empresa.nombre] = nuevaEmpresa.id;
      console.log(`   ✅ Empresa creada: ${empresa.nombre}`);

    } catch (error) {
      console.error(`   ❌ Error procesando ${empresa.nombre}:`, error.message);
    }
  }

  return empresasCreadas;
}

async function crearRolesEmpresa() {
  console.log('👥 Creando roles de empresa...');
  const rolesCreados = {};

  for (const rol of rolesEmpresa) {
    try {
      // Verificar si ya existe
      const { data: existente, error: errorBuscar } = await supabaseAdmin
        .from('roles_empresa')
        .select('id, nombre')
        .eq('nombre', rol.nombre)
        .single();

      if (existente) {
        console.log(`   ✅ Rol ya existe: ${existente.nombre}`);
        rolesCreados[rol.nombre] = existente.id;
        continue;
      }

      // Crear nuevo rol
      const { data: nuevoRol, error: errorCrear } = await supabaseAdmin
        .from('roles_empresa')
        .insert(rol)
        .select('id, nombre')
        .single();

      if (errorCrear) {
        console.error(`   ❌ Error creando rol ${rol.nombre}:`, errorCrear.message);
        continue;
      }

      rolesCreados[rol.nombre] = nuevoRol.id;
      console.log(`   ✅ Rol creado: ${rol.nombre}`);

    } catch (error) {
      console.error(`   ❌ Error procesando rol ${rol.nombre}:`, error.message);
    }
  }

  return rolesCreados;
}

async function crearUsuariosDemo(empresasCreadas, rolesCreados) {
  console.log('👤 Creando usuarios demo...');
  
  for (const usuario of usuariosDemo) {
    try {
      console.log(`   🔄 Procesando: ${usuario.email}`);

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: usuario.email,
        password: usuario.password,
        email_confirm: true,
        user_metadata: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          nombre_completo: `${usuario.nombre} ${usuario.apellido}`
        }
      });

      if (authError && authError.message !== 'User already registered') {
        console.error(`   ❌ Error creando auth user:`, authError.message);
        continue;
      }

      let userId;
      if (authError && authError.message === 'User already registered') {
        // Buscar usuario existente
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === usuario.email);
        userId = existingUser?.id;
        console.log(`   ⚠️ Usuario ya existe: ${usuario.email}`);
      } else {
        userId = authData.user.id;
        console.log(`   ✅ Auth user creado: ${usuario.email}`);
      }

      if (!userId) {
        console.error(`   ❌ No se pudo obtener userId para ${usuario.email}`);
        continue;
      }

      // 2. Crear entrada en tabla usuarios
      const { error: usuariosError } = await supabaseAdmin
        .from('usuarios')
        .upsert({
          id: userId,
          email: usuario.email,
          nombre_completo: `${usuario.nombre} ${usuario.apellido}`,
          es_super_admin: usuario.es_super_admin || false
        });

      if (usuariosError) {
        console.error(`   ❌ Error en tabla usuarios:`, usuariosError.message);
      } else {
        console.log(`   ✅ Usuario insertado en tabla usuarios`);
      }

      // 3. Asociar con empresa
      const empresaId = empresasCreadas[usuario.empresa];
      const rolId = rolesCreados[usuario.rol_interno];

      if (!empresaId || !rolId) {
        console.error(`   ❌ No se encontró empresa (${usuario.empresa}) o rol (${usuario.rol_interno})`);
        continue;
      }

      const { error: asociacionError } = await supabaseAdmin
        .from('usuarios_empresa')
        .upsert({
          user_id: userId,
          empresa_id: empresaId,
          rol_empresa_id: rolId,
          nombre_completo: `${usuario.nombre} ${usuario.apellido}`,
          email_interno: usuario.email,
          telefono_interno: usuario.telefono_interno,
          departamento: usuario.departamento,
          rol_interno: usuario.rol_interno,
          activo: true,
          fecha_vinculacion: new Date().toISOString(),
          vinculado_por: userId // Se auto-vincula para demo
        });

      if (asociacionError) {
        console.error(`   ❌ Error asociando con empresa:`, asociacionError.message);
      } else {
        console.log(`   ✅ Asociado con empresa: ${usuario.empresa}`);
      }

      console.log(`   ✅ Usuario completado: ${usuario.nombre} ${usuario.apellido}`);

    } catch (error) {
      console.error(`   ❌ Error procesando ${usuario.email}:`, error.message);
    }
  }
}

async function seed() {
  console.log('🚀 Iniciando creación de datos demo...\n');

  try {
    // 1. Crear empresas
    const empresasCreadas = await crearEmpresasDemo();
    console.log('');

    // 2. Crear roles
    const rolesCreados = await crearRolesEmpresa();
    console.log('');

    // 3. Crear usuarios
    await crearUsuariosDemo(empresasCreadas, rolesCreados);
    console.log('');

    console.log('🎉 ¡Datos demo creados exitosamente!');
    console.log('\n📋 CREDENCIALES DE ACCESO:');
    console.log('----------------------------');
    usuariosDemo.forEach(usuario => {
      console.log(`👤 ${usuario.nombre} ${usuario.apellido}`);
      console.log(`   📧 Email: ${usuario.email}`);
      console.log(`   🔑 Password: ${usuario.password}`);
      console.log(`   🏢 Empresa: ${usuario.empresa}`);
      console.log(`   👔 Rol: ${usuario.rol_interno}`);
      console.log('');
    });

    console.log('🌐 Aplicación: http://localhost:3000');
    console.log('🔐 Inicia sesión con cualquiera de las credenciales de arriba');

  } catch (error) {
    console.error('💥 Error general:', error.message);
    process.exit(1);
  }
}

seed();