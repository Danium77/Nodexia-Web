const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEMO_PREFIX = 'DEMO_';

// ===== GENERAR USUARIOS DEMO =====
async function generateUsuarios() {
  console.log('👥 Generando usuarios demo...');
  
  const usuarios = [
    {
      nombre_completo: 'Ana García - DEMO',
      email: 'ana.garcia@demo.nodexia.com',
      rol: 'coordinador',
      empresa_id: null,
      activo: true
    },
    {
      nombre_completo: 'Carlos López - DEMO', 
      email: 'carlos.lopez@demo.nodexia.com',
      rol: 'supervisor',
      empresa_id: null,
      activo: true
    },
    {
      nombre_completo: 'María Rodríguez - DEMO',
      email: 'maria.rodriguez@demo.nodexia.com', 
      rol: 'admin',
      empresa_id: null,
      activo: true
    }
  ];

  for (const usuario of usuarios) {
    try {
      const { error } = await supabase
        .from('usuarios')
        .insert({
          ...usuario,
          created_at: new Date().toISOString()
        });

      if (error && !error.message.includes('does not exist')) {
        console.error('Error creando usuario:', error);
      }
    } catch (e) {
      // Tabla usuarios puede no existir, continuar
    }
  }
}

// ===== GENERAR INCIDENCIAS DEMO =====
async function generateIncidencias() {
  console.log('⚠️ Generando incidencias demo...');
  
  // Obtener despachos demo
  const { data: despachos } = await supabase
    .from('despachos')
    .select('id, pedido_id')
    .ilike('pedido_id', 'DEMO_%')
    .limit(10);

  if (!despachos || despachos.length === 0) return;

  const tiposIncidencia = [
    'Retraso en entrega', 'Daño en mercadería', 'Problemas de tráfico',
    'Falla mecánica', 'Documentación faltante', 'Cliente ausente',
    'Condiciones climáticas', 'Problema en ruta'
  ];

  const severidades = ['baja', 'media', 'alta', 'crítica'];
  const estados = ['pendiente', 'en_proceso', 'resuelto'];

  // Generar 10 incidencias
  for (let i = 0; i < 10; i++) {
    const despacho = despachos[Math.floor(Math.random() * despachos.length)];
    const tipo = tiposIncidencia[Math.floor(Math.random() * tiposIncidencia.length)];
    const severidad = severidades[Math.floor(Math.random() * severidades.length)];
    const estado = estados[Math.floor(Math.random() * estados.length)];

    const incidencia = {
      despacho_id: despacho.id,
      tipo: tipo,
      descripcion: `${DEMO_PREFIX}${tipo} reportada en despacho ${despacho.pedido_id}. Incidencia de prueba para demostración del sistema.`,
      severidad: severidad,
      estado: estado,
      fecha_reporte: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Últimos 30 días
      fecha_resolucion: estado === 'resuelto' ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('incidencias')
        .insert(incidencia);

      if (error && !error.message.includes('does not exist')) {
        console.error('Error creando incidencia:', error);
      }
    } catch (e) {
      // Tabla incidencias puede no existir, continuar  
    }
  }
}

// ===== GENERAR DATOS DE DASHBOARD =====
async function generateDashboardData() {
  console.log('📊 Preparando datos para Dashboard...');
  
  // Los datos del dashboard se basan en los despachos existentes
  // Crear algunas métricas calculadas
  
  const today = new Date();
  const metricas = [];
  
  // Generar métricas para los últimos 30 días
  for (let i = 30; i >= 0; i--) {
    const fecha = new Date(today);
    fecha.setDate(today.getDate() - i);
    
    const metrica = {
      fecha: fecha.toISOString().split('T')[0],
      despachos_creados: Math.floor(Math.random() * 15) + 5, // 5-20 por día
      despachos_completados: Math.floor(Math.random() * 12) + 3, // 3-15 por día
      incidencias_reportadas: Math.floor(Math.random() * 3), // 0-3 por día
      tiempo_promedio_entrega: Math.floor(Math.random() * 24) + 24, // 24-48 horas
      satisfaccion_cliente: Math.floor(Math.random() * 20) + 80, // 80-100%
      created_at: new Date().toISOString()
    };

    metricas.push(metrica);
  }

  // Intentar insertar en tabla de métricas (si existe)
  try {
    for (const metrica of metricas) {
      const { error } = await supabase
        .from('metricas_dashboard')
        .upsert(metrica, { onConflict: 'fecha' });

      if (error && !error.message.includes('does not exist')) {
        console.error('Error creando métrica dashboard:', error);
      }
    }
  } catch (e) {
    // Tabla puede no existir, los datos se calcularán en tiempo real desde despachos
    console.log('   → Métricas se calcularán en tiempo real desde despachos existentes');
  }
}

// ===== GENERAR CLIENTES Y PLANTAS =====
async function generateClientesYPlantas() {
  console.log('🏢 Generando clientes y plantas demo...');

  const clientes = [
    'DEMO_Walmart Argentina S.A.',
    'DEMO_Carrefour Argentina',
    'DEMO_Coto CICSA',
    'DEMO_Jumbo Retail Argentina',
    'DEMO_Farmacity S.A.',
    'DEMO_Mercado Libre Argentina'
  ];

  const plantas = [
    'DEMO_Planta Buenos Aires Norte',
    'DEMO_Centro de Distribución Rosario', 
    'DEMO_Planta Córdoba Central',
    'DEMO_Depósito Mendoza Oeste',
    'DEMO_Centro Logístico La Plata'
  ];

  // Insertar clientes
  for (const cliente of clientes) {
    try {
      const { error } = await supabase
        .from('clientes')
        .insert({
          nombre: cliente,
          contacto: `contacto@${cliente.replace('DEMO_', '').toLowerCase().replace(/\s+/g, '')}.com`,
          direccion: `Av. Demo ${Math.floor(Math.random() * 9999) + 1000}, Buenos Aires`,
          activo: true,
          created_at: new Date().toISOString()
        });

      if (error && !error.message.includes('does not exist')) {
        console.error('Error creando cliente:', error);
      }
    } catch (e) {
      // Tabla puede no existir
    }
  }

  // Insertar plantas
  for (const planta of plantas) {
    try {
      const { error } = await supabase
        .from('plantas')
        .insert({
          nombre: planta,
          ubicacion: `${Math.floor(Math.random() * 90)}°${Math.floor(Math.random() * 60)}'S, ${Math.floor(Math.random() * 180)}°${Math.floor(Math.random() * 60)}'W`,
          capacidad: `${Math.floor(Math.random() * 5000) + 1000} m²`,
          activo: true,
          created_at: new Date().toISOString()
        });

      if (error && !error.message.includes('does not exist')) {
        console.error('Error creando planta:', error);
      }
    } catch (e) {
      // Tabla puede no existir
    }
  }
}

// ===== FUNCIÓN PRINCIPAL =====
async function generateExtendedDemo() {
  console.log('🎯 ===== GENERANDO DATOS DEMO EXTENDIDOS =====');
  console.log('📋 Complementando datos para todas las secciones\n');

  try {
    await generateUsuarios();
    console.log('✅ Usuarios demo generados');

    await generateIncidencias();
    console.log('✅ Incidencias demo generadas');

    await generateDashboardData();
    console.log('✅ Datos de dashboard preparados');

    await generateClientesYPlantas();
    console.log('✅ Clientes y plantas generados');

    console.log('\n🎉 ===== DATOS EXTENDIDOS COMPLETADOS =====');
    console.log('📊 Ahora tienes datos demo para:');
    console.log('   • Dashboard (métricas de 30 días)');
    console.log('   • Despachos (30 registros con estados variados)');
    console.log('   • Transportes (7 transportes disponibles)');
    console.log('   • Incidencias (10 incidencias de ejemplo)');
    console.log('   • Usuarios (3 usuarios con diferentes roles)');
    console.log('   • Clientes y Plantas (datos maestros)');
    console.log('\n🚀 ¡Listo para la presentación!');

  } catch (error) {
    console.error('💥 Error durante la generación extendida:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateExtendedDemo();
}

module.exports = { generateExtendedDemo };