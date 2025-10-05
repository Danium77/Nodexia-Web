// scripts/seed_viajes_qr_demo.js
// Crea viajes demo con sistema QR para demostrar el flujo completo

const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Función para generar QR code único
function generarQRCode(numeroViaje) {
  const timestamp = Date.now();
  const data = `${numeroViaje}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Viajes demo con diferentes estados
const viajesDemo = [
  {
    numero_viaje: 'VJ-2025-001',
    tipo_operacion: 'carga',
    estado_viaje: 'confirmado',
    producto: 'Soja procesada - 45 toneladas',
    peso_estimado: 45000,
    observaciones: 'Carga programada para las 08:00 hs'
  },
  {
    numero_viaje: 'VJ-2025-002', 
    tipo_operacion: 'carga',
    estado_viaje: 'ingresado_planta',
    producto: 'Maíz granel - 40 toneladas',
    peso_estimado: 40000,
    observaciones: 'Camión ingresado, esperando en playa'
  },
  {
    numero_viaje: 'VJ-2025-003',
    tipo_operacion: 'carga', 
    estado_viaje: 'llamado_carga',
    producto: 'Trigo - 38 toneladas',
    peso_estimado: 38000,
    observaciones: 'Supervisor llamó a carga - Posición 3'
  },
  {
    numero_viaje: 'VJ-2025-004',
    tipo_operacion: 'carga',
    estado_viaje: 'cargando',
    producto: 'Girasol procesado - 42 toneladas', 
    peso_estimado: 42000,
    observaciones: 'Carga en proceso - Silo 2'
  },
  {
    numero_viaje: 'VJ-2025-005',
    tipo_operacion: 'descarga',
    estado_viaje: 'carga_finalizada',
    producto: 'Fertilizante - 35 toneladas',
    peso_estimado: 35000,
    peso_real: 34500,
    observaciones: 'Descarga completada - Verificar remito'
  },
  {
    numero_viaje: 'VJ-2025-006',
    tipo_operacion: 'carga',
    estado_viaje: 'incidencia', 
    producto: 'Soja - 45 toneladas',
    peso_estimado: 45000,
    observaciones: 'Documentación del chofer vencida - Ver incidencia'
  }
];

// Incidencias demo
const incidenciasDemo = [
  {
    tipo_incidencia: 'documentacion_vencida',
    descripcion: 'Licencia de conducir del chofer Juan Pérez vencida desde el 15/09/2025. Necesita renovación antes de ingresar a planta.',
    severidad: 'alta'
  },
  {
    tipo_incidencia: 'problema_vehiculo', 
    descripcion: 'VTV del camión patente ABC123 próximo a vencer (vence 10/10/2025). Solicitar renovación.',
    severidad: 'media'
  }
];

// Notificaciones demo
const notificacionesDemo = [
  {
    tipo_notificacion: 'llamado_carga',
    titulo: 'Llamado a Carga',
    mensaje: 'Su camión ha sido llamado a cargar. Diríjase a la posición 3 del sector de carga.'
  },
  {
    tipo_notificacion: 'documentacion_vencimiento',
    titulo: 'Documentación por vencer',
    mensaje: 'Su VTV vence en 5 días. Renueve la documentación para evitar inconvenientes.'
  },
  {
    tipo_notificacion: 'viaje_confirmado',
    titulo: 'Viaje Confirmado',
    mensaje: 'Su viaje VJ-2025-001 ha sido confirmado. Código QR generado exitosamente.'
  }
];

async function obtenerDatosBase() {
  console.log('🔍 Obteniendo datos base...');
  
  try {
    // Obtener choferes
    const { data: choferes } = await supabaseAdmin
      .from('choferes')
      .select('id, nombre, apellido')
      .limit(5);

    // Obtener camiones  
    const { data: camiones } = await supabaseAdmin
      .from('camiones')
      .select('id, patente, marca, modelo')
      .limit(6);

    // Obtener acoplados
    const { data: acoplados } = await supabaseAdmin
      .from('acoplados')
      .select('id, patente, marca, modelo')
      .limit(3);

    // Obtener empresas
    const { data: empresas } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre')
      .limit(4);

    // Obtener usuarios de control y supervisión
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nombre_completo')
      .in('email', [
        'supervisor.carga@nodexia.com',
        'control.acceso@nodexia.com',
        'admin_demo@example.com'
      ]);

    return { choferes, camiones, acoplados, empresas, usuarios };
  } catch (error) {
    console.error('❌ Error obteniendo datos base:', error.message);
    return null;
  }
}

function asignarDatosAleatorios(datosBase) {
  const { choferes, camiones, acoplados, empresas, usuarios } = datosBase;
  
  return viajesDemo.map((viaje, index) => {
    const chofer = choferes[index % choferes.length];
    const camion = camiones[index % camiones.length];
    const acoplado = acoplados[index % acoplados.length];
    const empresaOrigen = empresas[0]; // Transportes Nodexia Demo
    const empresaDestino = empresas[index % empresas.length];
    
    // Asignar usuarios responsables según el estado
    let responsables = {};
    const supervisorUsuario = usuarios.find(u => u.email === 'supervisor.carga@nodexia.com');
    const controlUsuario = usuarios.find(u => u.email === 'control.acceso@nodexia.com');
    const adminUsuario = usuarios.find(u => u.email === 'admin_demo@example.com');

    // Asignar responsables y timestamps según el estado del viaje
    const now = new Date();
    const horas = [8, 9, 10, 11, 12, 14]; // Horarios de operación
    
    responsables.confirmado_por = adminUsuario?.id;
    responsables.fecha_confirmacion = new Date(now.setHours(horas[index % 6], 0, 0, 0)).toISOString();
    
    if (['ingresado_planta', 'en_playa_esperando', 'llamado_carga', 'cargando', 'carga_finalizada'].includes(viaje.estado_viaje)) {
      responsables.ingreso_por = controlUsuario?.id;
      responsables.fecha_ingreso_planta = new Date(now.setHours(horas[index % 6], 15, 0, 0)).toISOString();
    }
    
    if (['llamado_carga', 'cargando', 'carga_finalizada'].includes(viaje.estado_viaje)) {
      responsables.llamado_por = supervisorUsuario?.id;
      responsables.fecha_llamado_carga = new Date(now.setHours(horas[index % 6], 30, 0, 0)).toISOString();
    }
    
    if (['cargando', 'carga_finalizada'].includes(viaje.estado_viaje)) {
      responsables.carga_iniciada_por = supervisorUsuario?.id;
      responsables.fecha_inicio_carga = new Date(now.setHours(horas[index % 6], 45, 0, 0)).toISOString();
    }
    
    if (viaje.estado_viaje === 'carga_finalizada') {
      responsables.carga_finalizada_por = supervisorUsuario?.id;
      responsables.fecha_fin_carga = new Date(now.setHours(horas[index % 6] + 1, 30, 0, 0)).toISOString();
    }

    return {
      ...viaje,
      qr_code: generarQRCode(viaje.numero_viaje),
      chofer_id: chofer?.id,
      camion_id: camion?.id,
      acoplado_id: acoplado?.id,
      empresa_origen_id: empresaOrigen?.id,
      empresa_destino_id: empresaDestino?.id,
      documentacion_validada: !['incidencia'].includes(viaje.estado_viaje),
      ...responsables
    };
  });
}

async function crearViajes(viajesConDatos) {
  console.log('🚛 Creando viajes demo...');
  
  const viajesCreados = [];
  
  for (const viaje of viajesConDatos) {
    try {
      // Verificar si ya existe
      const { data: existente } = await supabaseAdmin
        .from('viajes')
        .select('id, numero_viaje')
        .eq('numero_viaje', viaje.numero_viaje)
        .single();

      if (existente) {
        console.log(`   ✅ Viaje ya existe: ${existente.numero_viaje}`);
        viajesCreados.push(existente);
        continue;
      }

      // Crear nuevo viaje
      const { data: nuevoViaje, error } = await supabaseAdmin
        .from('viajes')
        .insert(viaje)
        .select('id, numero_viaje, estado_viaje')
        .single();

      if (error) {
        console.error(`   ❌ Error creando ${viaje.numero_viaje}:`, error.message);
        continue;
      }

      viajesCreados.push(nuevoViaje);
      console.log(`   ✅ Viaje creado: ${nuevoViaje.numero_viaje} - Estado: ${nuevoViaje.estado_viaje}`);

    } catch (error) {
      console.error(`   ❌ Error procesando ${viaje.numero_viaje}:`, error.message);
    }
  }

  return viajesCreados;
}

async function crearIncidencias(viajesCreados, usuarios) {
  console.log('🚨 Creando incidencias demo...');
  
  const viajesConIncidencia = viajesCreados.filter(v => v.numero_viaje && v.numero_viaje.includes('006'));
  if (viajesConIncidencia.length === 0) return;

  const controlUsuario = usuarios.find(u => u.email === 'control.acceso@nodexia.com');
  
  for (const [index, incidencia] of incidenciasDemo.entries()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('incidencias_viaje')
        .insert({
          ...incidencia,
          viaje_id: viajesConIncidencia[0].id,
          reportado_por: controlUsuario?.id,
          estado_incidencia: 'abierta'
        })
        .select('id, tipo_incidencia')
        .single();

      if (error) {
        console.error(`   ❌ Error creando incidencia:`, error.message);
        continue;
      }

      console.log(`   ✅ Incidencia creada: ${data.tipo_incidencia}`);
    } catch (error) {
      console.error(`   ❌ Error procesando incidencia:`, error.message);
    }
  }
}

async function crearNotificaciones(viajesCreados, usuarios) {
  console.log('📱 Creando notificaciones demo...');
  
  // Buscar usuario chofer para las notificaciones
  const { data: choferUsuario } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('email', 'chofer.demo@nodexia.com')
    .single();

  if (!choferUsuario) {
    console.log('   ⚠️ No se encontró usuario chofer para notificaciones');
    return;
  }

  for (const [index, notif] of notificacionesDemo.entries()) {
    try {
      const viaje = viajesCreados[index];
      
      const { data, error } = await supabaseAdmin
        .from('notificaciones')
        .insert({
          ...notif,
          usuario_id: choferUsuario.id,
          viaje_id: viaje?.id,
          enviada: true,
          fecha_envio: new Date().toISOString(),
          datos_extra: {
            viaje_numero: viaje?.numero_viaje,
            qr_code: viajesCreados.find(v => v.numero_viaje === viaje?.numero_viaje)?.qr_code
          }
        })
        .select('id, tipo_notificacion')
        .single();

      if (error) {
        console.error(`   ❌ Error creando notificación:`, error.message);
        continue;
      }

      console.log(`   ✅ Notificación creada: ${data.tipo_notificacion}`);
    } catch (error) {
      console.error(`   ❌ Error procesando notificación:`, error.message);
    }
  }
}

async function seed() {
  console.log('🚀 Iniciando creación de viajes demo con sistema QR...\n');

  try {
    // 1. Obtener datos base
    const datosBase = await obtenerDatosBase();
    if (!datosBase) {
      console.error('❌ No se pudieron obtener los datos base');
      process.exit(1);
    }
    console.log('✅ Datos base obtenidos\n');

    // 2. Asignar datos a los viajes
    const viajesConDatos = asignarDatosAleatorios(datosBase);

    // 3. Crear viajes
    const viajesCreados = await crearViajes(viajesConDatos);
    console.log('');

    // 4. Crear incidencias
    await crearIncidencias(viajesCreados, datosBase.usuarios);
    console.log('');

    // 5. Crear notificaciones
    await crearNotificaciones(viajesCreados, datosBase.usuarios);
    console.log('');

    console.log('🎉 ¡Sistema QR de viajes demo creado exitosamente!');
    console.log('\n📊 RESUMEN:');
    console.log('----------------------------');
    console.log(`🚛 Viajes creados: ${viajesCreados.length}`);
    console.log(`🚨 Incidencias: ${incidenciasDemo.length}`);
    console.log(`📱 Notificaciones: ${notificacionesDemo.length}`);
    console.log('\n🌐 Ve los resultados en:');
    console.log('🛡️ Control de Acceso: http://localhost:3000/control-acceso');
    console.log('👷 Supervisor de Carga: http://localhost:3000/supervisor-carga');
    console.log('📋 Planificación: http://localhost:3000/planificacion');

  } catch (error) {
    console.error('💥 Error general:', error.message);
    process.exit(1);
  }
}

seed();