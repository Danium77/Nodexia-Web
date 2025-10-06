// pages/control-acceso.tsx
// Interfaz para Control de Acceso

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
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
      
      <div className="flex-1 flex flex-col">
        <Header 
          pageTitle="Control de Acceso" 
          userName={user.email.split('@')[0]} 
          userEmail={user.email}
        />
        
        <div className="flex-1 p-6 bg-[#f8f9fa]">
          {/* Header específico de la página */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <QrCodeIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gestión de Ingreso y Egreso</h1>
                  <p className="text-gray-600 mt-1">
                    Escaneo QR y validación de documentación
                  </p>
                </div>
              </div>
              
              {viaje && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Nuevo Escaneo
                </button>
              )}
            </div>
          </div>

          {/* QR Scanner */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-6 border-b border-gray-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <QrCodeIcon className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Escanear Código QR</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Ingrese código QR (ej: QR-VJ2025001, QR-VJ2025002)"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && escanearQR()}
                />
                <button
                  onClick={escanearQR}
                  disabled={loading || !qrCode.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-sm"
                >
                  <QrCodeIcon className="h-5 w-5" />
                  <span className="font-medium">{loading ? 'Escaneando...' : 'Escanear'}</span>
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center space-x-3 ${
                  message.includes('✅') ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-100' :
                  message.includes('⚠️') ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-800 border border-yellow-100' :
                  message.includes('📋') ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-100' :
                  'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border border-red-100'
                }`}>
                  {message.includes('✅') && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                  {message.includes('⚠️') && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />}
                  {message.includes('📋') && <DocumentTextIcon className="h-5 w-5 text-blue-600" />}
                  {!message.includes('✅') && !message.includes('⚠️') && !message.includes('📋') && <XCircleIcon className="h-5 w-5 text-red-600" />}
                  <span className="font-medium">{message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información del Viaje */}
          {viaje && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="p-6 border-b border-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Información del Viaje</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Número de Viaje</span>
                      <p className="text-xl font-bold text-gray-900 mt-1">{viaje.numero_viaje}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</span>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                          viaje.estado_viaje === 'confirmado' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                          viaje.estado_viaje === 'ingresado_planta' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                          viaje.estado_viaje === 'carga_finalizada' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' :
                          viaje.estado_viaje === 'egresado_planta' ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800' :
                          'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                        }`}>
                          {viaje.estado_viaje.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operación</span>
                      <p className="text-gray-900 font-medium capitalize mt-1">{viaje.tipo_operacion}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</span>
                      <p className="text-gray-900 font-medium mt-1">{viaje.producto}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chofer</span>
                      <p className="text-gray-900 font-medium mt-1">{viaje.chofer.nombre}</p>
                      <p className="text-sm text-gray-500 mt-1">DNI: {viaje.chofer.dni}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Camión</span>
                      <p className="text-gray-900 font-medium mt-1">{viaje.camion.patente}</p>
                      <p className="text-sm text-gray-500 mt-1">{viaje.camion.marca}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documentación</span>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                          viaje.documentacion_validada ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                        }`}>
                          {viaje.documentacion_validada ? '✅ Válida' : '❌ Faltante'}
                        </span>
                        <button
                          onClick={() => setShowDocumentacion(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold underline transition-colors"
                        >
                          Ver Detalle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="border-t border-gray-50 pt-6">
                  <div className="flex flex-wrap gap-4">
                    {viaje.estado_viaje === 'confirmado' && (
                      <button
                        onClick={confirmarIngreso}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 flex items-center space-x-2 font-semibold shadow-lg transition-all"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Confirmar Ingreso</span>
                      </button>
                    )}

                    {viaje.estado_viaje === 'carga_finalizada' && (
                      <button
                        onClick={confirmarEgreso}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center space-x-2 font-semibold shadow-lg transition-all"
                      >
                        <TruckIcon className="h-5 w-5" />
                        <span>Confirmar Egreso</span>
                      </button>
                    )}

                    <button
                      onClick={crearIncidencia}
                      className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-xl hover:from-red-700 hover:to-red-800 flex items-center space-x-2 font-semibold shadow-lg transition-all"
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
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center space-x-2">
              <DocumentTextIcon className="h-6 w-6" />
              <span>Códigos Demo para Probar</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <code className="text-blue-700 font-mono font-bold text-base">QR-VJ2025001</code>
                <p className="text-blue-600 mt-2 font-medium">Viaje confirmado (listo para ingreso)</p>
                <div className="mt-2 text-xs text-blue-500">
                  • Chofer: Carlos Mendoza<br/>
                  • Camión: ABC123 (Mercedes-Benz)
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <code className="text-blue-700 font-mono font-bold text-base">QR-VJ2025002</code>
                <p className="text-blue-600 mt-2 font-medium">Viaje con carga finalizada (listo para egreso)</p>
                <div className="mt-2 text-xs text-blue-500">
                  • Chofer: Roberto Silva<br/>
                  • Camión: XYZ789 (Scania)
                </div>
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
    </div>
  );
}