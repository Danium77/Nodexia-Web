// Configurar datos maestros para NODEXIA - Plantas y Clientes
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupMasterData() {
  console.log('🏭 CONFIGURANDO DATOS MAESTROS PARA NODEXIA...');
  
  try {
    // 1. PLANTAS / ORÍGENES (donde se generan las cargas)
    const plantas = [
      {
        nombre: 'Planta Córdoba',
        direccion: 'Av. Circunvalación 1234, Córdoba Capital',
        tipo: 'planta_produccion',
        activa: true,
        contacto: 'produccion.cordoba@nodexia.com',
        telefono: '+54 351 123-4567'
      },
      {
        nombre: 'Planta Rosario',
        direccion: 'Zona Industrial Norte, Rosario, Santa Fe',
        tipo: 'planta_produccion', 
        activa: true,
        contacto: 'produccion.rosario@nodexia.com',
        telefono: '+54 341 987-6543'
      },
      {
        nombre: 'Centro Distribución Buenos Aires',
        direccion: 'Parque Industrial Pilar, Buenos Aires',
        tipo: 'centro_distribucion',
        activa: true,
        contacto: 'distribucion.bsas@nodexia.com',
        telefono: '+54 11 555-0123'
      },
      {
        nombre: 'Planta Mendoza',
        direccion: 'Parque Industrial Las Heras, Mendoza',
        tipo: 'planta_produccion',
        activa: true,
        contacto: 'produccion.mendoza@nodexia.com',
        telefono: '+54 261 444-7890'
      }
    ];

    console.log('🏭 Creando plantas...');
    for (const planta of plantas) {
      const { data, error } = await supabase
        .from('empresas')
        .upsert(planta, { onConflict: 'nombre' })
        .select();
      
      if (error) {
        console.error(`❌ Error con ${planta.nombre}:`, error);
      } else {
        console.log(`✅ ${planta.nombre} configurada`);
      }
    }

    // 2. CLIENTES / DESTINOS (donde se entregan las cargas)
    const clientes = [
      {
        nombre: 'Cliente Mayorista ABC',
        direccion: 'Av. Rivadavia 5678, CABA',
        tipo: 'cliente',
        activa: true,
        contacto: 'recepcion@mayoristaabc.com',
        telefono: '+54 11 666-1234'
      },
      {
        nombre: 'Supermercados Del Norte',
        direccion: 'Zona Norte, San Isidro, Buenos Aires',
        tipo: 'cliente',
        activa: true,
        contacto: 'logistica@supernorte.com',
        telefono: '+54 11 777-5678'
      },
      {
        nombre: 'Distribuidora Córdoba Central',
        direccion: 'Barrio Nueva Córdoba, Córdoba Capital',
        tipo: 'cliente',
        activa: true,
        contacto: 'compras@distcordoba.com',
        telefono: '+54 351 888-9012'
      },
      {
        nombre: 'Retail Santa Fe',
        direccion: 'Centro Comercial Rosario, Santa Fe',
        tipo: 'cliente',
        activa: true,
        contacto: 'recepcion@retailsf.com',
        telefono: '+54 341 999-3456'
      },
      {
        nombre: 'Cadena Oeste',
        direccion: 'Zona Oeste, Morón, Buenos Aires',
        tipo: 'cliente',
        activa: true,
        contacto: 'deposito@cadena-oeste.com',
        telefono: '+54 11 555-7890'
      },
      {
        nombre: 'Farmacéutica Cuyo',
        direccion: 'Ciudad de Mendoza, Mendoza',
        tipo: 'cliente',
        activa: true,
        contacto: 'logistica@farmcuyo.com',
        telefono: '+54 261 333-4567'
      }
    ];

    console.log('🏢 Creando clientes...');
    for (const cliente of clientes) {
      const { data, error } = await supabase
        .from('empresas')
        .upsert(cliente, { onConflict: 'nombre' })
        .select();
      
      if (error) {
        console.error(`❌ Error con ${cliente.nombre}:`, error);
      } else {
        console.log(`✅ ${cliente.nombre} configurado`);
      }
    }

    // 3. TIPOS DE CARGA comunes
    const tiposCarga = [
      'Electrónicos',
      'Alimentos', 
      'Farmacéuticos',
      'Textiles',
      'Autopartes',
      'Productos Químicos',
      'Muebles',
      'Materiales de Construcción',
      'Bebidas',
      'Productos de Limpieza'
    ];

    console.log('📦 Configurando tipos de carga...');
    for (const tipo of tiposCarga) {
      const { error } = await supabase
        .from('tipos_carga')
        .upsert({ nombre: tipo, activo: true }, { onConflict: 'nombre' });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Error con tipo ${tipo}:`, error);
      } else {
        console.log(`✅ Tipo de carga: ${tipo}`);
      }
    }

    console.log('\n🎉 DATOS MAESTROS CONFIGURADOS EXITOSAMENTE!');
    console.log('\n📋 RESUMEN:');
    console.log(`✅ ${plantas.length} Plantas/Orígenes configuradas`);
    console.log(`✅ ${clientes.length} Clientes/Destinos configurados`);
    console.log(`✅ ${tiposCarga.length} Tipos de carga configurados`);

    console.log('\n🎯 AHORA PUEDES:');
    console.log('1. Ir a Crear Despacho');
    console.log('2. Seleccionar "Planta Córdoba" como origen');
    console.log('3. Seleccionar "Cliente Mayorista ABC" como destino');
    console.log('4. Elegir "Electrónicos" como tipo de carga');
    console.log('5. ¡Crear tu despacho con datos reales!');

  } catch (error) {
    console.error('💥 Error configurando datos maestros:', error);
  }
}

setupMasterData();