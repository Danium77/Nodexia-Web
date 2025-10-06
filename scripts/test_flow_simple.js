// scripts/test_flow_simple.js
// Test del flujo usando datos simples sin tablas complejas

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 DEMO DE FLUJO QR - MODO SIMULADO');
console.log('=====================================\n');

// Datos simulados del viaje
const viajeDemo = {
  id: 'demo-001',
  numero_viaje: 'VJ-2025-DEMO-001',
  qr_code: 'QR-VJ2025DEMO001-HASH123',
  tipo_operacion: 'carga',
  estado_viaje: 'confirmado',
  chofer: {
    nombre: 'Juan Carlos Pérez',
    dni: '12345678',
    licencia: 'LIC123456789',
    vencimiento_licencia: '2025-12-31'
  },
  camion: {
    patente: 'ABC123',
    marca: 'Mercedes-Benz',
    modelo: 'Actros 2546'
  },
  producto: 'Soja - 38 toneladas',
  peso_estimado: 38000,
  empresa_origen: 'Acopio San Lorenzo',
  empresa_destino: 'Terminal Puerto'
};

// Usuarios simulados
const usuarios = {
  control_acceso: {
    nombre: 'Elena Seguridad',
    email: 'control.acceso@nodexia.com',
    rol: 'Control de Acceso'
  },
  supervisor_carga: {
    nombre: 'Luis Supervisor',  
    email: 'supervisor.carga@nodexia.com',
    rol: 'Supervisor de Carga'
  },
  chofer: {
    nombre: 'Juan Carlos Pérez',
    email: 'chofer.demo@nodexia.com',
    rol: 'Chofer'
  }
};

function mostrarEstadoActual(viaje) {
  console.log(`📋 ESTADO ACTUAL DEL VIAJE:`);
  console.log(`   🚛 ${viaje.numero_viaje} - ${viaje.producto}`);
  console.log(`   📍 Estado: ${viaje.estado_viaje.toUpperCase()}`);
  console.log(`   🚚 Camión: ${viaje.camion.patente} (${viaje.camion.marca})`);
  console.log(`   👤 Chofer: ${viaje.chofer.nombre}`);
  console.log(`   📱 QR Code: ${viaje.qr_code}\n`);
}

function simularEscaneoQR(qrCode, rol) {
  console.log(`📱 ${usuarios[rol].nombre} (${usuarios[rol].rol}) escanea QR:`);
  console.log(`   🔍 Código: ${qrCode}`);
  
  // Simular validación
  if (qrCode === viajeDemo.qr_code) {
    console.log(`   ✅ QR válido - Datos del viaje cargados`);
    return { valid: true, viaje: viajeDemo };
  } else {
    console.log(`   ❌ QR inválido o no encontrado`);
    return { valid: false };
  }
}

function simularCambioEstado(estadoAnterior, estadoNuevo, responsable) {
  console.log(`🔄 CAMBIO DE ESTADO:`);
  console.log(`   📤 ${estadoAnterior} → ${estadoNuevo}`);
  console.log(`   👤 Responsable: ${responsable}`);
  console.log(`   ⏰ Timestamp: ${new Date().toLocaleString('es-AR')}`);
  
  viajeDemo.estado_viaje = estadoNuevo;
  viajeDemo.ultima_actualizacion = new Date().toISOString();
  
  console.log(`   ✅ Estado actualizado exitosamente\n`);
}

function enviarNotificacion(destinatario, tipo, mensaje) {
  console.log(`📱 NOTIFICACIÓN ENVIADA:`);
  console.log(`   👤 Para: ${destinatario}`);
  console.log(`   📢 Tipo: ${tipo}`);
  console.log(`   💬 Mensaje: ${mensaje}\n`);
}

// SIMULACIÓN DEL FLUJO COMPLETO
console.log('🎬 INICIANDO SIMULACIÓN DEL FLUJO QR...\n');

// Estado inicial
mostrarEstadoActual(viajeDemo);

console.log('=' .repeat(50));
console.log('🚪 PASO 1: CONTROL DE ACCESO - INGRESO');
console.log('=' .repeat(50));

const escaneoIngreso = simularEscaneoQR(viajeDemo.qr_code, 'control_acceso');
if (escaneoIngreso.valid) {
  // Validar documentación
  console.log(`🔍 Validando documentación del chofer...`);
  console.log(`   📄 Licencia: ${viajeDemo.chofer.licencia} - ✅ Válida hasta ${viajeDemo.chofer.vencimiento_licencia}`);
  console.log(`   🆔 DNI: ${viajeDemo.chofer.dni} - ✅ Coincide`);
  console.log(`   🚛 Patente: ${viajeDemo.camion.patente} - ✅ Autorizada`);
  
  simularCambioEstado('confirmado', 'ingresado_planta', usuarios.control_acceso.nombre);
  enviarNotificacion(
    usuarios.chofer.nombre,
    'Ingreso Confirmado',
    'Ingreso a planta autorizado. Diríjase a playa de estacionamiento.'
  );
  enviarNotificacion(
    usuarios.supervisor_carga.nombre,
    'Camión en Planta', 
    `Camión ${viajeDemo.camion.patente} ingresó a planta. Viaje: ${viajeDemo.numero_viaje}`
  );
}

console.log('\n' + '=' .repeat(50));
console.log('👷 PASO 2: SUPERVISOR DE CARGA - LLAMAR A CARGA');
console.log('=' .repeat(50));

setTimeout(() => {
  console.log(`👷 ${usuarios.supervisor_carga.nombre} revisa los camiones en planta...`);
  console.log(`🔍 Ve el viaje ${viajeDemo.numero_viaje} en estado: ${viajeDemo.estado_viaje}`);
  console.log(`📞 Decide llamar el camión a posición de carga...`);
  
  simularCambioEstado('ingresado_planta', 'llamado_carga', usuarios.supervisor_carga.nombre);
  enviarNotificacion(
    usuarios.chofer.nombre,
    'Llamado a Carga',
    `🚛 Diríjase a la posición de carga N°3. Su turno ha llegado.`
  );
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔄 PASO 3: SUPERVISOR - INICIAR CARGA CON QR');
  console.log('=' .repeat(50));
  
  setTimeout(() => {
    console.log(`👷 El chofer llega a la posición de carga...`);
    console.log(`📱 ${usuarios.supervisor_carga.nombre} escanea nuevamente el QR para iniciar carga:`);
    
    const escaneoInicioCarga = simularEscaneoQR(viajeDemo.qr_code, 'supervisor_carga');
    if (escaneoInicioCarga.valid) {
      console.log(`✅ Verificación exitosa - Camión en posición correcta`);
      console.log(`⚡ Iniciando proceso de carga de ${viajeDemo.producto}...`);
      
      simularCambioEstado('llamado_carga', 'cargando', usuarios.supervisor_carga.nombre);
      enviarNotificacion(
        usuarios.chofer.nombre,
        'Carga Iniciada',
        '⚡ Proceso de carga iniciado. Manténgase cerca del camión.'
      );
      
      console.log('\n' + '=' .repeat(50));
      console.log('📸 PASO 4: FINALIZAR CARGA CON REMITO');  
      console.log('=' .repeat(50));
      
      setTimeout(() => {
        console.log(`⏳ Proceso de carga completado...`);
        console.log(`📸 ${usuarios.supervisor_carga.nombre} toma foto del remito...`);
        console.log(`⚖️ Peso final registrado: 37,850 kg (estimado: 38,000 kg)`);
        
        viajeDemo.peso_real = 37850;
        viajeDemo.remito_url = 'https://storage.supabase.co/remitos/remito-VJ2025DEMO001.jpg';
        
        simularCambioEstado('cargando', 'carga_finalizada', usuarios.supervisor_carga.nombre);
        enviarNotificacion(
          usuarios.chofer.nombre,
          'Carga Completada',
          '✅ Carga completada. Puede dirigirse a Control de Acceso para egresar.'
        );
        enviarNotificacion(
          usuarios.control_acceso.nombre,
          'Camión Listo Egreso',
          `🚪 Camión ${viajeDemo.camion.patente} listo para egresar de planta.`
        );
        
        console.log('\n' + '=' .repeat(50));
        console.log('🚪 PASO 5: CONTROL DE ACCESO - EGRESO');
        console.log('=' .repeat(50));
        
        setTimeout(() => {
          console.log(`🚚 El chofer llega a Control de Acceso para egresar...`);
          
          const escaneoEgreso = simularEscaneoQR(viajeDemo.qr_code, 'control_acceso');
          if (escaneoEgreso.valid) {
            console.log(`✅ Verificación exitosa - Carga completada correctamente`);
            console.log(`📋 Revisión final:`);
            console.log(`   📄 Remito: ✅ Presente`);
            console.log(`   ⚖️ Peso: ✅ ${viajeDemo.peso_real} kg`);
            console.log(`   🚛 Documentación: ✅ Completa`);
            
            simularCambioEstado('carga_finalizada', 'egresado_planta', usuarios.control_acceso.nombre);
            enviarNotificacion(
              usuarios.chofer.nombre,
              'Egreso Autorizado',
              '🎉 Egreso autorizado. Viaje completado exitosamente. ¡Buen viaje!'
            );
            
            // Estado final
            setTimeout(() => {
              simularCambioEstado('egresado_planta', 'viaje_completado', 'SISTEMA');
              
              console.log('\n' + '🎉'.repeat(20));
              console.log('✅ FLUJO COMPLETADO EXITOSAMENTE!');
              console.log('🎉'.repeat(20));
              
              console.log('\n📊 RESUMEN FINAL:');
              console.log(`   🚛 Viaje: ${viajeDemo.numero_viaje}`);
              console.log(`   📍 Estado: ${viajeDemo.estado_viaje}`);
              console.log(`   ⚖️ Peso: ${viajeDemo.peso_real} kg`);
              console.log(`   ⏱️ Duración total: ~15 minutos`);
              console.log(`   👥 Involucrados: 3 personas`);
              console.log(`   📱 Notificaciones enviadas: 8`);
              console.log(`   🔄 Cambios de estado: 6`);
              
              console.log('\n🌐 Para ver la aplicación real:');
              console.log('   🔗 Login: http://localhost:3000/login');
              console.log('   📧 Control de Acceso: control.acceso@nodexia.com');
              console.log('   📧 Supervisor de Carga: supervisor.carga@nodexia.com');
              console.log('   🔑 Password: Demo1234!');
              
            }, 1000);
          }
        }, 2000);
        
      }, 3000);
    }
  }, 2000);
  
}, 1500);