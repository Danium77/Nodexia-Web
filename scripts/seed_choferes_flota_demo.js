// scripts/seed_choferes_flota_demo.js
// Crea choferes, camiones, acoplados y viajes de demostración

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

// Choferes demo
const choferesDemo = [
  {
    nombre: 'Juan Carlos',
    apellido: 'Pérez',
    dni: '12345678',
    telefono: '+54 9 3564 123456',
    email: 'juan.perez@nodexiademo.com'
  },
  {
    nombre: 'María Elena',
    apellido: 'Rodríguez',
    dni: '87654321',
    telefono: '+54 9 3564 987654',
    email: 'maria.rodriguez@nodexiademo.com'
  },
  {
    nombre: 'Roberto',
    apellido: 'Martínez',
    dni: '11223344',
    telefono: '+54 9 3564 112233',
    email: 'roberto.martinez@nodexiademo.com'
  },
  {
    nombre: 'Diego',
    apellido: 'Fernández',
    dni: '33445566',
    telefono: '+54 9 3564 334455',
    email: 'diego.fernandez@nodexiademo.com'
  },
  {
    nombre: 'Patricia',
    apellido: 'López',
    dni: '77889900',
    telefono: '+54 9 3564 778899',
    email: 'patricia.lopez@nodexiademo.com'
  }
];

// Camiones demo
const camionesDemo = [
  {
    patente: 'DEF456',
    marca: 'Volvo',
    modelo: 'FH540',
    anio: 2019
  },
  {
    patente: 'GHI789',
    marca: 'Mercedes-Benz',
    modelo: 'Actros 2046',
    anio: 2021
  },
  {
    patente: 'JKL012',
    marca: 'Scania',
    modelo: 'R450',
    anio: 2020
  },
  {
    patente: 'MNO345',
    marca: 'Iveco',
    modelo: 'Stralis 570',
    anio: 2022
  },
  {
    patente: 'PQR678',
    marca: 'DAF',
    modelo: 'XF 480',
    anio: 2020
  }
];

// Acoplados demo
const acoplacdosDemo = [
  {
    patente: 'XYZ001',
    marca: 'Helvetica',
    modelo: 'Granelero',
    anio: 2020
  },
  {
    patente: 'XYZ002',
    marca: 'Turinetto',
    modelo: 'Sider',
    anio: 2019
  },
  {
    patente: 'XYZ003',
    marca: 'Bresciani',
    modelo: 'Tanque',
    anio: 2021
  }
];

// Los documentos se manejan como archivos subidos, no como registros fijos

async function obtenerEmpresaDemo() {
  const { data, error } = await supabaseAdmin
    .from('empresas')
    .select('id')
    .eq('nombre', 'Transportes Nodexia Demo')
    .single();
    
  if (error) {
    console.error('❌ Error obteniendo empresa demo:', error.message);
    return null;
  }
  
  return data.id;
}

async function obtenerUsuarioDemo() {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('email', 'admin_demo@example.com')
    .single();
    
  if (error) {
    console.error('❌ Error obteniendo usuario demo:', error.message);
    return null;
  }
  
  return data.id;
}

async function crearChoferes(empresaId, usuarioId) {
  console.log('👨‍💼 Creando choferes demo...');
  
  const choferesCreados = [];
  
  for (const chofer of choferesDemo) {
    try {
      // Verificar si ya existe por DNI
      const { data: existente } = await supabaseAdmin
        .from('choferes')
        .select('id, nombre, apellido')
        .eq('dni', chofer.dni)
        .single();

      if (existente) {
        console.log(`   ✅ Chofer ya existe: ${existente.nombre} ${existente.apellido}`);
        choferesCreados.push(existente.id);
        continue;
      }

      // Crear nuevo chofer
      const { data: nuevoChofer, error } = await supabaseAdmin
        .from('choferes')
        .insert({
          ...chofer,
          id_transporte: empresaId,
          fecha_alta: new Date().toISOString(),
          usuario_alta: usuarioId
        })
        .select('id, nombre, apellido')
        .single();

      if (error) {
        console.error(`   ❌ Error creando ${chofer.nombre} ${chofer.apellido}:`, error.message);
        continue;
      }

      choferesCreados.push(nuevoChofer.id);
      console.log(`   ✅ Chofer creado: ${nuevoChofer.nombre} ${nuevoChofer.apellido}`);

    } catch (error) {
      console.error(`   ❌ Error procesando ${chofer.nombre} ${chofer.apellido}:`, error.message);
    }
  }

  return choferesCreados;
}

async function crearCamiones(empresaId, usuarioId) {
  console.log('🚛 Creando camiones demo...');
  
  const camionesCreados = [];
  
  for (const camion of camionesDemo) {
    try {
      // Verificar si ya existe por patente
      const { data: existente } = await supabaseAdmin
        .from('camiones')
        .select('id, patente, marca, modelo')
        .eq('patente', camion.patente)
        .single();

      if (existente) {
        console.log(`   ✅ Camión ya existe: ${existente.patente} - ${existente.marca} ${existente.modelo}`);
        camionesCreados.push(existente.id);
        continue;
      }

      // Crear nuevo camión
      const { data: nuevoCamion, error } = await supabaseAdmin
        .from('camiones')
        .insert({
          ...camion,
          id_transporte: empresaId,
          fecha_alta: new Date().toISOString(),
          usuario_alta: usuarioId
        })
        .select('id, patente, marca, modelo')
        .single();

      if (error) {
        console.error(`   ❌ Error creando ${camion.patente}:`, error.message);
        continue;
      }

      camionesCreados.push(nuevoCamion.id);
      console.log(`   ✅ Camión creado: ${nuevoCamion.patente} - ${nuevoCamion.marca} ${nuevoCamion.modelo}`);

    } catch (error) {
      console.error(`   ❌ Error procesando ${camion.patente}:`, error.message);
    }
  }

  return camionesCreados;
}

async function crearAcoplados(empresaId, usuarioId) {
  console.log('🚚 Creando acoplados demo...');
  
  const acoplaclosCreados = [];
  
  for (const acoplado of acoplacdosDemo) {
    try {
      // Verificar si ya existe por patente
      const { data: existente } = await supabaseAdmin
        .from('acoplados')
        .select('id, patente, marca, modelo')
        .eq('patente', acoplado.patente)
        .single();

      if (existente) {
        console.log(`   ✅ Acoplado ya existe: ${existente.patente} - ${existente.marca} ${existente.modelo}`);
        acoplaclosCreados.push(existente.id);
        continue;
      }

      // Crear nuevo acoplado
      const { data: nuevoAcoplado, error } = await supabaseAdmin
        .from('acoplados')
        .insert({
          ...acoplado,
          id_transporte: empresaId,
          fecha_alta: new Date().toISOString(),
          usuario_alta: usuarioId
        })
        .select('id, patente, marca, modelo')
        .single();

      if (error) {
        console.error(`   ❌ Error creando ${acoplado.patente}:`, error.message);
        continue;
      }

      acoplaclosCreados.push(nuevoAcoplado.id);
      console.log(`   ✅ Acoplado creado: ${nuevoAcoplado.patente} - ${nuevoAcoplado.marca} ${nuevoAcoplado.modelo}`);

    } catch (error) {
      console.error(`   ❌ Error procesando ${acoplado.patente}:`, error.message);
    }
  }

  return acoplaclosCreados;
}

// Función de documentos removida - se manejan como uploads

async function seed() {
  console.log('🚀 Iniciando creación de datos de flota demo...\n');

  try {
    // 1. Obtener empresa demo
    const empresaId = await obtenerEmpresaDemo();
    if (!empresaId) {
      console.error('❌ No se encontró la empresa demo. Ejecuta primero seed_demo_users_updated.js');
      process.exit(1);
    }
    console.log('🏢 Empresa demo encontrada\n');

    // 2. Obtener usuario demo
    const usuarioId = await obtenerUsuarioDemo();
    if (!usuarioId) {
      console.error('❌ No se encontró el usuario demo. Ejecuta primero seed_demo_users_updated.js');
      process.exit(1);
    }
    console.log('👤 Usuario demo encontrado\n');

    // 3. Crear choferes
    const choferes = await crearChoferes(empresaId, usuarioId);
    console.log('');

    // 4. Crear camiones
    const camiones = await crearCamiones(empresaId, usuarioId);
    console.log('');

    // 5. Crear acoplados
    const acoplados = await crearAcoplados(empresaId, usuarioId);
    console.log('');
    console.log('');

    console.log('🎉 ¡Datos de flota demo creados exitosamente!');
    console.log('\n📊 RESUMEN:');
    console.log('----------------------------');
    console.log(`👨‍💼 Choferes: ${choferes.length}`);
    console.log(`🚛 Camiones: ${camiones.length}`);
    console.log(`🚚 Acoplados: ${acoplados.length}`);
    console.log('\n🌐 Ve los resultados en: http://localhost:3000/admin/usuarios');
    console.log('🚛 Gestión de flota: http://localhost:3000/camiones');
    console.log('👨‍💼 Choferes: http://localhost:3000/choferes');

  } catch (error) {
    console.error('💥 Error general:', error.message);
    process.exit(1);
  }
}

seed();