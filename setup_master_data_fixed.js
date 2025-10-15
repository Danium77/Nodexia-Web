// Configurar datos maestros con estructura correcta
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupMasterDataCorrect() {
  console.log('🏭 CONFIGURANDO DATOS MAESTROS PARA NODEXIA (estructura correcta)...');
  
  try {
    // 1. PLANTAS / ORÍGENES 
    const plantas = [
      {
        nombre: 'Planta Córdoba',
        cuit: '30-12345678-1',
        email: 'produccion.cordoba@nodexia.com',
        telefono: '+54 351 123-4567',
        direccion: 'Av. Circunvalación 1234',
        localidad: 'Córdoba Capital',
        provincia: 'Córdoba',
        tipo_empresa: 'planta',
        activo: true,
        configuracion_empresa: {
          tipo_instalacion: 'planta_produccion',
          capacidad_diaria: '800 toneladas',
          turnos: 3,
          categoria: 'procesamiento'
        }
      },
      {
        nombre: 'Planta Rosario',
        cuit: '30-23456789-2',
        email: 'produccion.rosario@nodexia.com',
        telefono: '+54 341 987-6543',
        direccion: 'Zona Industrial Norte',
        localidad: 'Rosario',
        provincia: 'Santa Fe',
        tipo_empresa: 'planta',
        activo: true,
        configuracion_empresa: {
          tipo_instalacion: 'planta_produccion',
          capacidad_diaria: '600 toneladas',
          turnos: 2,
          categoria: 'procesamiento'
        }
      },
      {
        nombre: 'Centro Distribución Buenos Aires',
        cuit: '30-34567890-3',
        email: 'distribucion.bsas@nodexia.com',
        telefono: '+54 11 555-0123',
        direccion: 'Parque Industrial Pilar',
        localidad: 'Pilar',
        provincia: 'Buenos Aires',
        tipo_empresa: 'planta',
        activo: true,
        configuracion_empresa: {
          tipo_instalacion: 'centro_distribucion',
          capacidad_diaria: '1200 toneladas',
          turnos: 3,
          categoria: 'distribucion'
        }
      }
    ];

    console.log('🏭 Creando plantas...');
    for (const planta of plantas) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('empresas')
        .select('id')
        .eq('nombre', planta.nombre)
        .single();
      
      if (!existing) {
        const { data, error } = await supabase
          .from('empresas')
          .insert(planta)
          .select();
        
        if (error) {
          console.error(`❌ Error con ${planta.nombre}:`, error);
        } else {
          console.log(`✅ ${planta.nombre} creada`);
        }
      } else {
        console.log(`ℹ️ ${planta.nombre} ya existe`);
      }
    }

    // 2. CLIENTES / DESTINOS adicionales
    const clientesNuevos = [
      {
        nombre: 'Supermercados Del Norte',
        cuit: '30-55555555-5',
        email: 'logistica@supernorte.com',
        telefono: '+54 11 777-5678',
        direccion: 'Zona Norte',
        localidad: 'San Isidro',
        provincia: 'Buenos Aires',
        tipo_empresa: 'cliente',
        activo: true,
        configuracion_empresa: {
          categoria: 'retail',
          volumen_mensual: '300 toneladas',
          tipo_instalacion: 'supermercado'
        }
      },
      {
        nombre: 'Distribuidora Córdoba Central',
        cuit: '30-66666666-6',
        email: 'compras@distcordoba.com',
        telefono: '+54 351 888-9012',
        direccion: 'Barrio Nueva Córdoba',
        localidad: 'Córdoba Capital',
        provincia: 'Córdoba',
        tipo_empresa: 'cliente',
        activo: true,
        configuracion_empresa: {
          categoria: 'distribuidor',
          volumen_mensual: '400 toneladas',
          tipo_instalacion: 'distribuidor'
        }
      },
      {
        nombre: 'Retail Santa Fe',
        cuit: '30-77777777-7',
        email: 'recepcion@retailsf.com',
        telefono: '+54 341 999-3456',
        direccion: 'Centro Comercial Rosario',
        localidad: 'Rosario',
        provincia: 'Santa Fe',
        tipo_empresa: 'cliente',
        activo: true,
        configuracion_empresa: {
          categoria: 'retail',
          volumen_mensual: '250 toneladas',
          tipo_instalacion: 'retail'
        }
      },
      {
        nombre: 'Farmacéutica Cuyo',
        cuit: '30-88888888-8',
        email: 'logistica@farmcuyo.com',
        telefono: '+54 261 333-4567',
        direccion: 'Ciudad de Mendoza',
        localidad: 'Mendoza',
        provincia: 'Mendoza',
        tipo_empresa: 'cliente',
        activo: true,
        configuracion_empresa: {
          categoria: 'farmaceutico',
          volumen_mensual: '150 toneladas',
          tipo_instalacion: 'farmaceutica'
        }
      }
    ];

    console.log('🏢 Creando clientes adicionales...');
    for (const cliente of clientesNuevos) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('empresas')
        .select('id')
        .eq('nombre', cliente.nombre)
        .single();
      
      if (!existing) {
        const { data, error } = await supabase
          .from('empresas')
          .insert(cliente)
          .select();
        
        if (error) {
          console.error(`❌ Error con ${cliente.nombre}:`, error);
        } else {
          console.log(`✅ ${cliente.nombre} creado`);
        }
      } else {
        console.log(`ℹ️ ${cliente.nombre} ya existe`);
      }
    }

    console.log('\n🎉 DATOS MAESTROS ACTUALIZADOS!');
    
    // Mostrar resumen de empresas por tipo
    const { data: allEmpresas } = await supabase
      .from('empresas')
      .select('nombre, tipo_empresa')
      .order('tipo_empresa', { ascending: true });
    
    const resumen = {};
    allEmpresas?.forEach(emp => {
      const tipo = emp.tipo_empresa || 'sin_tipo';
      if (!resumen[tipo]) resumen[tipo] = [];
      resumen[tipo].push(emp.nombre);
    });
    
    console.log('\n📋 RESUMEN POR TIPO:');
    Object.entries(resumen).forEach(([tipo, empresas]) => {
      console.log(`${tipo.toUpperCase()}: ${empresas.length} empresas`);
      empresas.forEach(nombre => console.log(`  - ${nombre}`));
    });

    console.log('\n🎯 ¡AHORA PUEDES CREAR DESPACHOS CON DATOS REALES!');
    console.log('Ve a /crear-despacho y selecciona:');
    console.log('• Origen: Planta Córdoba, Planta Rosario, etc.');
    console.log('• Destino: Cliente Mayorista ABC, Supermercados Del Norte, etc.');

  } catch (error) {
    console.error('💥 Error configurando datos maestros:', error);
  }
}

setupMasterDataCorrect();