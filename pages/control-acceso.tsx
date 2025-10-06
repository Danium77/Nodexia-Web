// pages/control-acceso.tsx
// Interfaz para Control de Acceso

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/layout/Sidebar';
import DocumentacionDetalle from '../components/DocumentacionDetalle';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface ViajeQR {
  id: string;
  numero_viaje: string;
  qr_code: string;
  estado_viaje: string;
  tipo_operacion: string;
  producto: string;
  chofer: any;
  camion: any;
  documentacion_validada: boolean;
}

export default function ControlAcceso() {
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
  const [showDocumentacion, setShowDocumentacion] = useState(false);

  // Viajes demo simulados
  const viajesDemo = [
    {
      id: '1',
      numero_viaje: 'VJ-2025-001',
      qr_code: 'QR-VJ2025001',
      estado_viaje: 'confirmado',
      tipo_operacion: 'carga',
      producto: 'Soja - 35 toneladas',
      chofer: { nombre: 'Carlos Mendoza', dni: '32.456.789' },
      camion: { patente: 'ABC123', marca: 'Mercedes-Benz' },
      documentacion_validada: true
    },
    {
      id: '2',
      numero_viaje: 'VJ-2025-002',
      qr_code: 'QR-VJ2025002',
      estado_viaje: 'carga_finalizada',
      tipo_operacion: 'carga',
      producto: 'Trigo - 28 toneladas',
      chofer: { nombre: 'Roberto Silva', dni: '28.123.456' },
      camion: { patente: 'XYZ789', marca: 'Scania' },
      documentacion_validada: true
    }
  ];

  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    setMessage('');

    // Simular escaneo del QR
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

  const confirmarIngreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('Confirmando ingreso para viaje:', viaje.id);
      const ahora = new Date().toLocaleString('es-ES');
      setMessage(`✅ Ingreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);
      
      setViaje({
        ...viaje,
        estado_viaje: 'ingresado_planta'
      });

      // Limpiar después de 3 segundos
      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('❌ Error al confirmar ingreso');
    }
    setLoading(false);
  };

  const confirmarEgreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('Confirmando egreso para viaje:', viaje.id);
      const ahora = new Date().toLocaleString('es-ES');
      setMessage(`✅ Egreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);
      
      setViaje({
        ...viaje,
        estado_viaje: 'egresado_planta'
      });

      // Limpiar después de 3 segundos para permitir continuar
      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('❌ Error al confirmar egreso');
    }
    setLoading(false);
  };

  const crearIncidencia = () => {
    if (!viaje) return;
    
    const descripcion = prompt('Describe la incidencia:');
    if (descripcion) {
      console.log('Creando incidencia:', { viaje: viaje.id, descripcion });
      setMessage(`⚠️ Incidencia creada para ${viaje.numero_viaje}`);
    }
  };

  const resetForm = () => {
    setViaje(null);
    setQrCode('');
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
                <div className="p-2 bg-orange-100 rounded-lg">
                  <QrCodeIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Control de Acceso</h1>
                  <p className="text-gray-600">
                    Usuario: {user.email} | Gestión de ingreso y egreso de camiones
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

        {/* QR Scanner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <QrCodeIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Escanear Código QR</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Ingrese código QR (ej: QR-VJ2025001, QR-VJ2025002)"
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
                message.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                message.includes('📋') ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.includes('✅') && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                {message.includes('⚠️') && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />}
                {message.includes('📋') && <DocumentTextIcon className="h-5 w-5 text-blue-600" />}
                {!message.includes('✅') && !message.includes('⚠️') && !message.includes('📋') && <XCircleIcon className="h-5 w-5 text-red-600" />}
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
                        viaje.estado_viaje === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                        viaje.estado_viaje === 'ingresado_planta' ? 'bg-green-100 text-green-800' :
                        viaje.estado_viaje === 'carga_finalizada' ? 'bg-purple-100 text-purple-800' :
                        viaje.estado_viaje === 'egresado_planta' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {viaje.estado_viaje.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Operación</span>
                    <p className="text-gray-900 capitalize">{viaje.tipo_operacion}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Producto</span>
                    <p className="text-gray-900">{viaje.producto}</p>
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
                  <div>
                    <span className="text-sm font-medium text-gray-500">Documentación</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        viaje.documentacion_validada ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {viaje.documentacion_validada ? '✅ Válida' : '❌ Faltante'}
                      </span>
                      <button
                        onClick={() => setShowDocumentacion(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex flex-wrap gap-4">
                  {viaje.estado_viaje === 'confirmado' && (
                    <button
                      onClick={confirmarIngreso}
                      disabled={loading}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      <span>Confirmar Ingreso</span>
                    </button>
                  )}

                  {viaje.estado_viaje === 'carga_finalizada' && (
                    <button
                      onClick={confirmarEgreso}
                      disabled={loading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <TruckIcon className="h-5 w-5" />
                      <span>Confirmar Egreso</span>
                    </button>
                  )}

                  <button
                    onClick={crearIncidencia}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span>Crear Incidencia</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Códigos Demo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5" />
            <span>Códigos Demo para Probar</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <code className="text-blue-700 font-mono font-semibold">QR-VJ2025001</code>
              <p className="text-blue-600 mt-1">Viaje confirmado (listo para ingreso)</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <code className="text-blue-700 font-mono font-semibold">QR-VJ2025002</code>
              <p className="text-blue-600 mt-1">Viaje con carga finalizada (listo para egreso)</p>
            </div>
          </div>
        </div>

        {/* Modal de Documentación Detallada */}
        {showDocumentacion && viaje && (
          <DocumentacionDetalle
            numeroViaje={viaje.numero_viaje}
            onClose={() => setShowDocumentacion(false)}
          />
        )}
      </div>
    </div>
  );
}