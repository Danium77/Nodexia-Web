const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== CONFIGURACIÓN DEMO =====
const DEMO_PREFIX = 'DEMO_'; // Prefijo para identificar datos demo

const empresas = [
  'Techno Embalajes SA',
  'Logística Buenos Aires',
  'Distribuidora Central',
  'Transporte Rosario',
  'Carga Express',
  'Nodexia Logistics'
];

const clientes = [
  'Walmart Argentina', 'Carrefour', 'Coto', 'Jumbo', 'Disco',
  'Farmacity', 'Dr Ahorro', 'Simplicity', 'Vea', 'Día %',
  'Mercado Libre', 'Amazon', 'Falabella', 'Garbarino', 'Frávega'
];

const ciudades = [
  'Buenos Aires', 'Rosario', 'Córdoba', 'Mendoza', 'Tucumán',
  'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'Neuquén',
  'Bahía Blanca', 'Resistencia', 'Posadas', 'Corrientes'
];

const tiposCarga = ['paletizada', 'granel', 'contenedores', 'refrigerada', 'peligrosa'];
const prioridades = ['Baja', 'Normal', 'Alta', 'Urgente'];
const unidadTypes = ['camión', 'semi', 'trailer', 'furgón'];

// ===== FUNCIONES HELPER =====
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generatePedidoId() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${DEMO_PREFIX}DSP-${dateStr}-${randomNum}`;
}

// ===== GENERADORES DE DATOS =====
async function generateTransportes() {
  console.log('🚛 Generando transportes demo...');
  
  const transportes = [
    { nombre: `${DEMO_PREFIX}Transporte Buenos Aires`, contacto: 'contacto@transporteba.com' },
    { nombre: `${DEMO_PREFIX}Logística Rosario`, contacto: 'info@logrosario.com' },
    { nombre: `${DEMO_PREFIX}Carga Córdoba Express`, contacto: 'operaciones@cargacba.com' },
    { nombre: `${DEMO_PREFIX}Transporte Mendoza`, contacto: 'despachos@transmza.com' },
    { nombre: `${DEMO_PREFIX}Distribución Norte`, contacto: 'coordinacion@distrinom.com' },
    { nombre: `${DEMO_PREFIX}Logística Patagonia`, contacto: 'logistica@patagonia.com' },
    { nombre: `${DEMO_PREFIX}Express La Plata`, contacto: 'express@laplata.com' }
  ];

  for (const transporte of transportes) {
    const { error } = await supabase
      .from('transportes')
      .insert({
        nombre: transporte.nombre,
        contacto: transporte.contacto,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Error creando transporte:', error);
  }
}

async function generateChoferes() {
  console.log('👨‍💼 Generando choferes demo...');
  
  // Obtener transportes demo
  const { data: transportes } = await supabase
    .from('transportes')
    .select('id, nombre')
    .ilike('nombre', `${DEMO_PREFIX}%`);

  const choferes = [
    { nombre: 'Carlos', apellido: 'González', dni: `${DEMO_PREFIX}12345678`, telefono: '+54 11 1234-5678', email: 'carlos.gonzalez@demo.com' },
    { nombre: 'Miguel', apellido: 'Rodríguez', dni: `${DEMO_PREFIX}23456789`, telefono: '+54 11 2345-6789', email: 'miguel.rodriguez@demo.com' },
    { nombre: 'Roberto', apellido: 'López', dni: `${DEMO_PREFIX}34567890`, telefono: '+54 341 3456-7890', email: 'roberto.lopez@demo.com' },
    { nombre: 'Juan', apellido: 'Martínez', dni: `${DEMO_PREFIX}45678901`, telefono: '+54 351 4567-8901', email: 'juan.martinez@demo.com' },
    { nombre: 'Diego', apellido: 'Fernández', dni: `${DEMO_PREFIX}56789012`, telefono: '+54 261 5678-9012', email: 'diego.fernandez@demo.com' },
    { nombre: 'Sebastián', apellido: 'Silva', dni: `${DEMO_PREFIX}67890123`, telefono: '+54 381 6789-0123', email: 'sebastian.silva@demo.com' },
    { nombre: 'Alejandro', apellido: 'Morales', dni: `${DEMO_PREFIX}78901234`, telefono: '+54 221 7890-1234', email: 'alejandro.morales@demo.com' }
  ];

  for (let i = 0; i < choferes.length && i < transportes.length; i++) {
    const chofer = choferes[i];
    const transporte = transportes[i];

    const { error } = await supabase
      .from('choferes')
      .insert({
        nombre: chofer.nombre,
        apellido: chofer.apellido,
        dni: chofer.dni,
        telefono: chofer.telefono,
        email: chofer.email,
        id_transporte: transporte.id,
        usuario_alta: 'demo-admin',
        fecha_alta: new Date().toISOString()
      });

    if (error) console.error('Error creando chofer:', error);
  }
}

async function generateDespachos() {
  console.log('📦 Generando despachos demo...');
  
  // Obtener transportes demo
  const { data: transportes } = await supabase
    .from('transportes')
    .select('id, nombre')
    .ilike('nombre', `${DEMO_PREFIX}%`);

  const today = new Date();
  const estados = ['pendiente_transporte', 'transporte_asignado', 'en_transito', 'entregado', 'cancelado'];
  
  // Generar 30 despachos
  for (let i = 0; i < 30; i++) {
    const fechaBase = new Date(today);
    fechaBase.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 días
    
    const estado = randomElement(estados);
    const transporteAsignado = estado !== 'pendiente_transporte' && transportes.length > 0 ? randomElement(transportes) : null;
    
    const scheduledDate = new Date(fechaBase.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Próximos 7 días
    
    const despacho = {
      pedido_id: generatePedidoId(),
      origen: randomElement(ciudades),
      destino: randomElement(clientes),
      estado: estado,
      type: randomElement(tiposCarga),
      prioridad: randomElement(prioridades),
      unidad_type: randomElement(unidadTypes),
      transport_id: transporteAsignado?.id || null,
      scheduled_at: scheduledDate.toISOString(),
      scheduled_local_date: scheduledDate.toISOString().split('T')[0],
      scheduled_local_time: `${Math.floor(Math.random() * 12) + 8}:00:00`, // 8:00 - 19:00
      created_at: fechaBase.toISOString(),
      comentarios: estado === 'cancelado' ? 'DEMO - Cancelado por el cliente' : 
                  estado === 'entregado' ? 'DEMO - Entrega exitosa' :
                  estado === 'en_transito' ? `DEMO - En ruta hacia ${randomElement(clientes)}` :
                  estado === 'transporte_asignado' ? `DEMO - Asignado a ${transporteAsignado?.nombre || 'Transporte'}` : 
                  'DEMO - Despacho de prueba'
    };

    const { error } = await supabase
      .from('despachos')
      .insert(despacho);

    if (error) console.error('Error creando despacho:', error);
  }
}

async function cleanupOldDemoData() {
  console.log('🧹 Limpiando datos demo antiguos...');
  
  try {
    // Limpiar choferes demo
    await supabase
      .from('choferes')
      .delete()
      .ilike('dni', `${DEMO_PREFIX}%`);

    // Limpiar despachos demo
    await supabase
      .from('despachos')
      .delete()
      .ilike('pedido_id', `${DEMO_PREFIX}%`);

    // Limpiar transportes demo
    await supabase
      .from('transportes')
      .delete()
      .ilike('nombre', `${DEMO_PREFIX}%`);

    console.log('✅ Datos demo antiguos eliminados');
  } catch (error) {
    console.error('Error limpiando datos antiguos:', error);
  }
}

// ===== FUNCIÓN PRINCIPAL =====
async function generateAllDemoData() {
  console.log('🎭 ===== INICIANDO GENERACIÓN DE DATOS DEMO =====');
  console.log(`📋 Prefijo identificador: ${DEMO_PREFIX}`);
  console.log('⚠️  DATOS TEMPORALES PARA PRESENTACIÓN\n');

  try {
    // Limpiar datos demo anteriores
    await cleanupOldDemoData();

    await generateTransportes();
    console.log('✅ Transportes generados');

    await generateChoferes();
    console.log('✅ Choferes generados');

    await generateDespachos();
    console.log('✅ Despachos generados');

    console.log('\n🎉 ===== GENERACIÓN COMPLETADA =====');
    console.log('📊 Datos disponibles para:');
    console.log('   • Dashboard (métricas y gráficos)');
    console.log('   • Despachos (30 registros con diferentes estados)');
    console.log('   • Transportes (7 transportes de diferentes ciudades)');
    console.log('   • Choferes (7 choferes asignados)');
    console.log('\n⚠️  Para eliminar datos demo después:');
    console.log(`   - Despachos: DELETE WHERE pedido_id LIKE '${DEMO_PREFIX}%'`);
    console.log(`   - Transportes: DELETE WHERE nombre LIKE '${DEMO_PREFIX}%'`);
    console.log(`   - Choferes: DELETE WHERE dni LIKE '${DEMO_PREFIX}%'`);

    // Mostrar resumen
    console.log('\n📈 RESUMEN GENERADO:');
    
    const { data: despachosCount } = await supabase
      .from('despachos')
      .select('*', { count: 'exact' })
      .ilike('pedido_id', `${DEMO_PREFIX}%`);
      
    const { data: transportesCount } = await supabase
      .from('transportes')
      .select('*', { count: 'exact' })
      .ilike('nombre', `${DEMO_PREFIX}%`);
      
    const { data: choferesCount } = await supabase
      .from('choferes')
      .select('*', { count: 'exact' })
      .ilike('dni', `${DEMO_PREFIX}%`);

    console.log(`   • ${despachosCount?.length || 0} despachos creados`);
    console.log(`   • ${transportesCount?.length || 0} transportes creados`);
    console.log(`   • ${choferesCount?.length || 0} choferes creados`);

  } catch (error) {
    console.error('💥 Error durante la generación:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateAllDemoData();
}

module.exports = { generateAllDemoData, DEMO_PREFIX };