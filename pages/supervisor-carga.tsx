// pages/supervisor-carga.tsx
// Interfaz para Supervisor de Carga

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/layout/Sidebar';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon, ScaleIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface ViajeQR {
  id: string;
  numero_viaje: string;
  qr_code: string;
  estado_viaje: string;
  tipo_operacion: string;
  producto: string;
  peso_estimado: number;
  peso_real?: number;
  chofer: any;
  camion: any;
}

export default function SupervisorCarga() {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        setUser(user);
      }
    };
    getUser();
  }, []);

  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pesoReal, setPesoReal] = useState('');

  // Viajes demo simulados
  const viajesDemo = [
    {
      id: '1',
      numero_viaje: 'VJ-2025-001',
      qr_code: 'QR-VJ2025001',
      estado_viaje: 'ingresado_planta',
      tipo_operacion: 'carga',
      producto: 'Soja - 35 toneladas',
      peso_estimado: 35000,
      chofer: { nombre: 'Juan Pérez', dni: '12345678' },
      camion: { patente: 'ABC123', marca: 'Mercedes-Benz' }
    },
    {
      id: '2',
      numero_viaje: 'VJ-2025-002',
      qr_code: 'QR-VJ2025002',
      estado_viaje: 'llamado_carga',
      tipo_operacion: 'carga',
      producto: 'Trigo - 28 toneladas',
      peso_estimado: 28000,
      chofer: { nombre: 'Ana García', dni: '87654321' },
      camion: { patente: 'XYZ789', marca: 'Scania' }
    },
    {
      id: '3',
      numero_viaje: 'VJ-2025-003',
      qr_code: 'QR-VJ2025003',
      estado_viaje: 'cargando',
      tipo_operacion: 'carga',
      producto: 'Maíz - 32 toneladas',
      peso_estimado: 32000,
      chofer: { nombre: 'Roberto Silva', dni: '11223344' },
      camion: { patente: 'DEF456', marca: 'Volvo' }
    }
  ];

  const [viajes] = useState(viajesDemo);

  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    setMessage('');

    const viajeEncontrado = viajesDemo.find(v => v.qr_code === qrCode.trim());
    
    if (viajeEncontrado) {
      setViaje(viajeEncontrado);
      setMessage(`📋 Viaje ${viajeEncontrado.numero_viaje} encontrado`);
    } else {
      setMessage('❌ Código QR no válido o viaje no encontrado');
      setViaje(null);
    }

    setLoading(false);
  };

  const llamarACarga = async (viajeId: string) => {
    setLoading(true);
    try {
      console.log('Llamando a carga viaje:', viajeId);
      setMessage(`📞 Notificación enviada al chofer para dirigirse a carga`);
      
      // Simular actualización de estado
      const viajeActualizado = viajes.find(v => v.id === viajeId);
      if (viajeActualizado) {
        viajeActualizado.estado_viaje = 'llamado_carga';
      }
    } catch (error) {
      setMessage('❌ Error al llamar a carga');
    }
    setLoading(false);
  };

  const iniciarCarga = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('Iniciando carga para viaje:', viaje.id);
      setMessage(`✅ Carga iniciada para ${viaje.numero_viaje}`);
      
      setViaje({
        ...viaje,
        estado_viaje: 'cargando'
      });
    } catch (error) {
      setMessage('❌ Error al iniciar carga');
    }
    setLoading(false);
  };

  const finalizarCarga = async () => {
    if (!viaje || !pesoReal) {
      setMessage('❌ Debe ingresar el peso real');
      return;
    }

    setLoading(true);
    try {
      console.log('Finalizando carga:', { viajeId: viaje.id, pesoReal });
      setMessage(`✅ Carga finalizada - Peso: ${pesoReal} kg`);
      
      setViaje({
        ...viaje,
        estado_viaje: 'carga_finalizada',
        peso_real: parseInt(pesoReal)
      });

      // Limpiar después de 3 segundos
      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setPesoReal('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('❌ Error al finalizar carga');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setViaje(null);
    setQrCode('');
    setPesoReal('');
    setMessage('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Acceso restringido. <a href="/login" className="text-blue-600 hover:text-blue-800">Iniciar sesión</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userEmail={user.email} />
      
      <div className="flex-1 p-6">
        {/* Header con diseño Nodexia */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ScaleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Supervisor de Carga</h1>
                  <p className="text-gray-600">
                    Usuario: {user.email} | Gestión de procesos de carga
                  </p>
                </div>
              </div>
              
              {viaje && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Nuevo Escaneo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Panel de Viajes en Planta */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Viajes en Planta</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {viajes.map((v) => (
                    <div key={v.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{v.numero_viaje}</p>
                          <p className="text-sm text-gray-600">{v.producto}</p>
                          <p className="text-sm text-gray-500">Camión: {v.camion.patente}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          v.estado_viaje === 'ingresado_planta' ? 'bg-blue-100 text-blue-800' :
                          v.estado_viaje === 'llamado_carga' ? 'bg-yellow-100 text-yellow-800' :
                          v.estado_viaje === 'cargando' ? 'bg-green-100 text-green-800' :
                          v.estado_viaje === 'carga_finalizada' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {v.estado_viaje.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      {v.estado_viaje === 'ingresado_planta' && (
                        <button
                          onClick={() => llamarACarga(v.id)}
                          disabled={loading}
                          className="bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                          <PhoneIcon className="h-4 w-4" />
                          <span>Llamar a Carga</span>
                        </button>
                      )}
                      
                      {v.estado_viaje === 'llamado_carga' && (
                        <div className="flex items-center space-x-2 text-sm text-yellow-700">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>Esperando en posición</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Panel Principal de Trabajo */}
          <div className="xl:col-span-2">
            {/* QR Scanner */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <QrCodeIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Escanear QR para Gestionar Carga</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Escanee QR del viaje (ej: QR-VJ2025002, QR-VJ2025003)"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && escanearQR()}
                  />
                  <button
                    onClick={escanearQR}
                    disabled={loading || !qrCode.trim()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <QrCodeIcon className="h-5 w-5" />
                    <span>{loading ? 'Escaneando...' : 'Escanear'}</span>
                  </button>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg flex items-center space-x-2 ${
                    message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
                    message.includes('📞') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                    message.includes('📋') ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                    'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.includes('✅') && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                    {message.includes('📞') && <PhoneIcon className="h-5 w-5 text-yellow-600" />}
                    {message.includes('📋') && <DocumentTextIcon className="h-5 w-5 text-blue-600" />}
                    {!message.includes('✅') && !message.includes('📞') && !message.includes('📋') && <XCircleIcon className="h-5 w-5 text-red-600" />}
                    <span>{message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información del Viaje */}
            {viaje && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TruckIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Información del Viaje</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Número de Viaje</span>
                        <p className="text-lg font-semibold text-gray-900">{viaje.numero_viaje}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Estado</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            viaje.estado_viaje === 'ingresado_planta' ? 'bg-blue-100 text-blue-800' :
                            viaje.estado_viaje === 'llamado_carga' ? 'bg-yellow-100 text-yellow-800' :
                            viaje.estado_viaje === 'cargando' ? 'bg-green-100 text-green-800' :
                            viaje.estado_viaje === 'carga_finalizada' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {viaje.estado_viaje.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Producto</span>
                        <p className="text-gray-900">{viaje.producto}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Peso Estimado</span>
                        <p className="text-gray-900">{viaje.peso_estimado.toLocaleString()} kg</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Chofer</span>
                        <p className="text-gray-900">{viaje.chofer.nombre}</p>
                        <p className="text-sm text-gray-500">DNI: {viaje.chofer.dni}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Camión</span>
                        <p className="text-gray-900">{viaje.camion.patente} ({viaje.camion.marca})</p>
                      </div>
                      {viaje.peso_real && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Peso Real</span>
                          <p className="text-gray-900 font-semibold">{viaje.peso_real.toLocaleString()} kg</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex flex-wrap gap-4">
                      {viaje.estado_viaje === 'llamado_carga' && (
                        <button
                          onClick={iniciarCarga}
                          disabled={loading}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                          <span>Iniciar Carga</span>
                        </button>
                      )}

                      {viaje.estado_viaje === 'cargando' && (
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Peso Real (kg)
                            </label>
                            <input
                              type="number"
                              placeholder="Ingrese peso real"
                              value={pesoReal}
                              onChange={(e) => setPesoReal(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>
                          <button
                            onClick={finalizarCarga}
                            disabled={loading || !pesoReal}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2 mt-7"
                          >
                            <ScaleIcon className="h-5 w-5" />
                            <span>Finalizar Carga</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Códigos Demo */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5" />
            <span>Códigos Demo para Probar</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <code className="text-green-700 font-mono font-semibold">QR-VJ2025001</code>
              <p className="text-green-600 mt-1">En planta (se puede llamar a carga)</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <code className="text-green-700 font-mono font-semibold">QR-VJ2025002</code>
              <p className="text-green-600 mt-1">Llamado a carga (se puede iniciar)</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <code className="text-green-700 font-mono font-semibold">QR-VJ2025003</code>
              <p className="text-green-600 mt-1">Cargando (se puede finalizar)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}