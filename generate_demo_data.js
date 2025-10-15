const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== CONFIGURACIÓN DEMO =====
const DEMO_MARKER = 'DEMO_PRESENTATION_2025'; // Marcador para identificar datos demo

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
  return `DSP-${dateStr}-${randomNum}`;
}

// ===== GENERADORES DE DATOS =====
async function generateTransportes() {
  console.log('🚛 Generando transportes demo...');
  
  const transportes = [
    { nombre: 'Transporte Buenos Aires', capacidad: '25 toneladas', ubicacion: 'CABA', disponible: true },
    { nombre: 'Logística Rosario', capacidad: '30 toneladas', ubicacion: 'Rosario', disponible: true },
    { nombre: 'Carga Córdoba Express', capacidad: '20 toneladas', ubicacion: 'Córdoba', disponible: false },
    { nombre: 'Transporte Mendoza', capacidad: '28 toneladas', ubicacion: 'Mendoza', disponible: true },
    { nombre: 'Distribución Norte', capacidad: '35 toneladas', ubicacion: 'Tucumán', disponible: true },
    { nombre: 'Logística Patagonia', capacidad: '22 toneladas', ubicacion: 'Neuquén', disponible: false },
    { nombre: 'Express La Plata', capacidad: '26 toneladas', ubicacion: 'La Plata', disponible: true }
  ];

  for (const transporte of transportes) {
    const { error } = await supabase
      .from('transportes')
      .upsert({
        nombre: transporte.nombre,
        capacidad: transporte.capacidad,
        ubicacion: transporte.ubicacion,
        disponible: transporte.disponible,
        created_at: new Date().toISOString(),
        demo_marker: DEMO_MARKER
      }, { onConflict: 'nombre' });

    if (error) console.error('Error creando transporte:', error);
  }
}

async function generateChoferes() {
  console.log('👨‍💼 Generando choferes demo...');
  
  // Obtener transportes
  const { data: transportes } = await supabase
    .from('transportes')
    .select('id, nombre');

  const choferes = [
    { nombre: 'Carlos', apellido: 'González', dni: '12345678', telefono: '+54 11 1234-5678' },
    { nombre: 'Miguel', apellido: 'Rodríguez', dni: '23456789', telefono: '+54 11 2345-6789' },
    { nombre: 'Roberto', apellido: 'López', dni: '34567890', telefono: '+54 341 3456-7890' },
    { nombre: 'Juan', apellido: 'Martínez', dni: '45678901', telefono: '+54 351 4567-8901' },
    { nombre: 'Diego', apellido: 'Fernández', dni: '56789012', telefono: '+54 261 5678-9012' },
    { nombre: 'Sebastián', apellido: 'Silva', dni: '67890123', telefono: '+54 381 6789-0123' },
    { nombre: 'Alejandro', apellido: 'Morales', dni: '78901234', telefono: '+54 221 7890-1234' }
  ];

  for (let i = 0; i < choferes.length && i < transportes.length; i++) {
    const chofer = choferes[i];
    const transporte = transportes[i];

    const { error } = await supabase
      .from('choferes')
      .upsert({
        nombre: chofer.nombre,
        apellido: chofer.apellido,
        dni: chofer.dni,
        telefono: chofer.telefono,
        id_transporte: transporte.id,
        usuario_alta: 'demo-admin',
        demo_marker: DEMO_MARKER
      }, { onConflict: 'dni' });

    if (error) console.error('Error creando chofer:', error);
  }
}

async function generateDespachos() {
  console.log('📦 Generando despachos demo...');
  
  // Obtener transportes
  const { data: transportes } = await supabase
    .from('transportes')
    .select('id, nombre');

  const today = new Date();
  const estados = ['pendiente_transporte', 'transporte_asignado', 'en_transito', 'entregado', 'cancelado'];
  
  // Generar 25 despachos
  for (let i = 0; i < 25; i++) {
    const fechaBase = new Date(today);
    fechaBase.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 días
    
    const estado = randomElement(estados);
    const transporteAsignado = estado !== 'pendiente_transporte' ? randomElement(transportes) : null;
    
    const despacho = {
      pedido_id: generatePedidoId(),
      origen: randomElement(ciudades),
      destino: randomElement(clientes),
      estado: estado,
      type: randomElement(tiposCarga),
      prioridad: randomElement(prioridades),
      unidad_type: randomElement(unidadTypes),
      transport_id: transporteAsignado?.id || null,
      scheduled_at: new Date(fechaBase.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Próximos 7 días
      created_at: fechaBase.toISOString(),
      comentarios: estado === 'cancelado' ? 'Cancelado por el cliente' : 
                  estado === 'entregado' ? 'Entrega exitosa' :
                  estado === 'en_transito' ? `En ruta hacia ${randomElement(clientes)}` :
                  estado === 'transporte_asignado' ? `Asignado a ${transporteAsignado?.nombre}` : '',
      demo_marker: DEMO_MARKER
    };

    const { error } = await supabase
      .from('despachos')
      .insert(despacho);

    if (error) console.error('Error creando despacho:', error);
  }
}

async function generateIncidencias() {
  console.log('⚠️ Generando incidencias demo...');
  
  // Obtener algunos despachos
  const { data: despachos } = await supabase
    .from('despachos')
    .select('id, pedido_id')
    .limit(10);

  const tiposIncidencia = [
    'Retraso en entrega', 'Daño en mercadería', 'Problemas de tráfico', 
    'Falla mecánica', 'Documentación faltante', 'Cliente ausente'
  ];

  const severidades = ['baja', 'media', 'alta', 'crítica'];

  for (let i = 0; i < 8; i++) {
    const despacho = randomElement(despachos);
    
    const incidencia = {
      despacho_id: despacho.id,
      tipo: randomElement(tiposIncidencia),
      descripcion: `Incidencia en despacho ${despacho.pedido_id}: ${randomElement(tiposIncidencia)}`,
      severidad: randomElement(severidades),
      estado: Math.random() > 0.3 ? 'resuelto' : 'pendiente',
      created_at: randomDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), new Date()).toISOString(),
      demo_marker: DEMO_MARKER
    };

    const { error } = await supabase
      .from('incidencias')
      .insert(incidencia);

    if (error) console.error('Error creando incidencia:', error);
  }
}

async function generateEstadisticas() {
  console.log('📊 Generando datos de estadísticas demo...');
  
  // Estos datos serán utilizados por las páginas de estadísticas y dashboard
  const today = new Date();
  
  // Generar métricas por día de los últimos 30 días
  for (let i = 30; i >= 0; i--) {
    const fecha = new Date(today);
    fecha.setDate(today.getDate() - i);
    
    const metrics = {
      fecha: fecha.toISOString().split('T')[0],
      despachos_creados: Math.floor(Math.random() * 20) + 5,
      despachos_entregados: Math.floor(Math.random() * 15) + 3,
      incidencias: Math.floor(Math.random() * 5),
      satisfaccion_cliente: Math.floor(Math.random() * 30) + 70, // 70-100
      tiempo_promedio_entrega: Math.floor(Math.random() * 48) + 24, // 24-72 horas
      demo_marker: DEMO_MARKER
    };

    const { error } = await supabase
      .from('metricas_diarias')
      .upsert(metrics, { onConflict: 'fecha' });

    if (error && !error.message.includes('does not exist')) {
      console.error('Error creando métrica:', error);
    }
  }
}

async function generatePlanificacion() {
  console.log('📅 Generando datos de planificación demo...');
  
  const { data: transportes } = await supabase
    .from('transportes')
    .select('id, nombre');

  const { data: choferes } = await supabase
    .from('choferes')
    .select('id, nombre, apellido');

  // Generar planificación para los próximos 14 días
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const fecha = new Date(today);
    fecha.setDate(today.getDate() + i);
    
    // Generar 2-5 eventos por día
    const eventosDelDia = Math.floor(Math.random() * 4) + 2;
    
    for (let j = 0; j < eventosDelDia; j++) {
      const hora = Math.floor(Math.random() * 12) + 8; // 8:00 - 19:00
      const transporte = randomElement(transportes);
      const chofer = randomElement(choferes);
      
      const evento = {
        fecha: fecha.toISOString().split('T')[0],
        hora: `${hora.toString().padStart(2, '0')}:00`,
        tipo_evento: randomElement(['carga', 'entrega', 'mantenimiento', 'descanso']),
        transporte_id: transporte.id,
        chofer_id: chofer.id,
        ubicacion: randomElement(ciudades),
        descripcion: `${randomElement(['Carga', 'Entrega', 'Mantenimiento', 'Descanso'])} programada - ${transporte.nombre}`,
        estado: randomElement(['programado', 'en_proceso', 'completado']),
        created_at: new Date().toISOString(),
        demo_marker: DEMO_MARKER
      };

      const { error } = await supabase
        .from('planificacion')
        .insert(evento);

      if (error && !error.message.includes('does not exist')) {
        console.error('Error creando evento de planificación:', error);
      }
    }
  }
}

// ===== FUNCIÓN PRINCIPAL =====
async function generateAllDemoData() {
  console.log('🎭 ===== INICIANDO GENERACIÓN DE DATOS DEMO =====');
  console.log(`📋 Marcador: ${DEMO_MARKER}`);
  console.log('⚠️  DATOS TEMPORALES PARA PRESENTACIÓN\n');

  try {
    await generateTransportes();
    console.log('✅ Transportes generados');

    await generateChoferes();
    console.log('✅ Choferes generados');

    await generateDespachos();
    console.log('✅ Despachos generados');

    await generateIncidencias();
    console.log('✅ Incidencias generadas');

    await generateEstadisticas();
    console.log('✅ Estadísticas generadas');

    await generatePlanificacion();
    console.log('✅ Planificación generada');

    console.log('\n🎉 ===== GENERACIÓN COMPLETADA =====');
    console.log('📊 Datos disponibles para:');
    console.log('   • Dashboard (métricas y gráficos)');
    console.log('   • Despachos (listado completo)');
    console.log('   • Planificación (eventos programados)');
    console.log('   • Estadísticas (reportes y analytics)');
    console.log('   • Transportes y Choferes');
    console.log('   • Incidencias');
    console.log('\n⚠️  Para eliminar datos demo después:');
    console.log(`   DELETE FROM tabla WHERE demo_marker = '${DEMO_MARKER}';`);

  } catch (error) {
    console.error('💥 Error durante la generación:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateAllDemoData();
}

module.exports = { generateAllDemoData, DEMO_MARKER };