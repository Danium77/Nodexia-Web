// pages/demo-qr.tsx  
// Página central de demostración del sistema QR
// ⚠️ SOLO visible en desarrollo — en producción redirige al login

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function DemoQR() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Bloquear en producción
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        setUser(user);
      }
    };
    getUser();
  }, []);
  const [_selectedRole, _setSelectedRole] = useState('');

  // Si estamos en producción, no renderizar nada
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const credenciales = [
    {
      rol: 'Super Admin',
      email: 'admin.demo@nodexia.com',
      descripcion: 'Acceso completo al sistema',
      color: 'bg-purple-600'
    },
    {
      rol: 'Control de Acceso',
      email: 'control.acceso@nodexia.com', 
      descripcion: 'Gestión de ingreso y egreso de camiones',
      color: 'bg-blue-600'
    },
    {
      rol: 'Supervisor de Carga',
      email: 'supervisor.carga@nodexia.com',
      descripcion: 'Gestión de procesos de carga',
      color: 'bg-green-600'
    },
    {
      rol: 'Coordinador',
      email: 'coordinador.demo@tecnoembalajes.com',
      descripcion: 'Planificación y gestión de viajes',
      color: 'bg-orange-600'
    },
    {
      rol: 'Chofer',
      email: 'chofer.demo@nodexia.com',
      descripcion: 'Vista del chofer (móvil simulada)',
      color: 'bg-gray-600'
    }
  ];

  const flujoEstados = [
    { estado: 'confirmado', descripcion: 'Chofer confirma viaje, QR generado', actor: 'Chofer', color: 'bg-blue-100 text-blue-800' },
    { estado: 'ingresado_planta', descripcion: 'Control de Acceso autoriza ingreso', actor: 'Control de Acceso', color: 'bg-green-100 text-green-800' },
    { estado: 'llamado_carga', descripcion: 'Supervisor llama camión a carga', actor: 'Supervisor de Carga', color: 'bg-yellow-100 text-yellow-800' },
    { estado: 'cargando', descripción: 'Supervisor inicia proceso de carga', actor: 'Supervisor de Carga', color: 'bg-orange-100 text-orange-800' },
    { estado: 'cargado', descripcion: 'Supervisor completa carga con remito', actor: 'Supervisor de Carga', color: 'bg-purple-100 text-purple-800' },
    { estado: 'egreso_origen', descripcion: 'Control de Acceso autoriza egreso', actor: 'Control de Acceso', color: 'bg-gray-100 text-gray-800' }
  ];

  const codigosQR = [
    { codigo: 'QR-VJ2025001', viaje: 'VJ-2025-001', estado: 'confirmado', uso: 'Para probar ingreso' },
    { codigo: 'QR-VJ2025002', viaje: 'VJ-2025-002', estado: 'cargado', uso: 'Para probar egreso' },
    { codigo: 'QR-VJ2025003', viaje: 'VJ-2025-003', estado: 'llamado_carga', uso: 'Para iniciar carga' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🚛 Sistema QR de Gestión de Viajes - Demo
          </h1>
          <p className="text-gray-600 mb-4">
            Sistema completo de gestión de viajes con códigos QR, roles especializados y workflow automatizado.
          </p>
          
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ Sesión activa: {user.email}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                ⚠️ No hay sesión activa. <Link href="/login" className="text-blue-600 underline">Iniciar sesión</Link>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credenciales de Acceso */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🔑 Credenciales de Acceso</h2>
            <p className="text-sm text-gray-600 mb-4">
              Usa estas credenciales para probar diferentes roles:
            </p>
            
            <div className="space-y-3">
              {credenciales.map((cred, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className={`inline-block px-2 py-1 rounded text-white text-sm font-medium mb-2 ${cred.color}`}>
                    {cred.rol}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{cred.descripcion}</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                    📧 {cred.email}
                  </p>
                  
                  <Link 
                    href={`/login`}
                    className="inline-block mt-2 text-blue-600 text-sm hover:underline"
                  >
                    → Iniciar sesión con este rol
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Flujo de Estados */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🔄 Flujo de Estados</h2>
            <p className="text-sm text-gray-600 mb-4">
              Cada viaje pasa por estos estados secuencialmente:
            </p>
            
            <div className="space-y-3">
              {flujoEstados.map((paso, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-white mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-1 ${paso.color}`}>
                      {paso.estado.replace('_', ' ').toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-700">{paso.descripcion}</p>
                    <p className="text-xs text-gray-500">Actor: {paso.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Códigos QR para Probar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📱 Códigos QR Demo</h2>
            <p className="text-sm text-gray-600 mb-4">
              Usa estos códigos en las interfaces de escaneo:
            </p>
            
            <div className="space-y-3">
              {codigosQR.map((qr, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded mb-2">
                    {qr.codigo}
                  </p>
                  <p className="text-sm">
                    <strong>Viaje:</strong> {qr.viaje}<br/>
                    <strong>Estado:</strong> {qr.estado}<br/>
                    <strong>Uso:</strong> {qr.uso}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Copia y pega estos códigos en los campos de "Escanear QR" de las interfaces.
              </p>
            </div>
          </div>
        </div>

        {/* Interfaces Disponibles */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🌐 Interfaces Disponibles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/control-acceso" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🚪</div>
                <h3 className="font-medium">Control de Acceso</h3>
                <p className="text-sm text-gray-600">Gestión ingreso/egreso</p>
              </div>
            </Link>
            
            <Link href="/supervisor-carga" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">👷</div>
                <h3 className="font-medium">Supervisor de Carga</h3>
                <p className="text-sm text-gray-600">Gestión de carga</p>
              </div>
            </Link>
            
            <Link href="/planificacion" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📅</div>
                <h3 className="font-medium">Planificación</h3>
                <p className="text-sm text-gray-600">Gestión de viajes</p>
              </div>
            </Link>
            
            <Link href="/dashboard" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-medium">Dashboard</h3>
                <p className="text-sm text-gray-600">Vista general</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Simulación del Flujo */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <h2 className="text-xl font-bold mb-4">🎬 Simulación Completa</h2>
          <p className="mb-4">
            ¿Quieres ver una simulación completa del flujo? Ejecuta este comando en la terminal:
          </p>
          <div className="bg-black bg-opacity-30 rounded p-3 mb-4">
            <code className="text-green-300">node scripts/test_flow_simple.js</code>
          </div>
          <p className="text-sm opacity-90">
            La simulación muestra paso a paso cómo funciona el flujo QR desde confirmación hasta egreso,
            incluyendo todas las validaciones, notificaciones y cambios de estado.
          </p>
        </div>
      </div>
    </div>
  );
}