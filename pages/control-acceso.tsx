// pages/control-acceso.tsx
// Interfaz para Control de Acceso con diseño Nodexia

import { useState } from 'react';
import DocumentacionDetalle from '../components/DocumentacionDetalle';
import MainLayout from '../components/layout/MainLayout';
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

  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDocumentacion, setShowDocumentacion] = useState(false);

  // Función para validar documentación basada en documentos vencidos
  const validarDocumentacion = () => {
    // Simulamos los documentos (en producción vendrían del viaje)
    const documentos = [
      { estado: 'vigente' },
      { estado: 'vigente' },
      { estado: 'por_vencer' },
      { estado: 'por_vencer' },
      { estado: 'vigente' },
      { estado: 'vencido' }, // Licencia de Conducir vencida
      { estado: 'vigente' },
      { estado: 'por_vencer' },
      { estado: 'vigente' },
      { estado: 'vencido' }  // Habilitación Cargas Peligrosas vencida
    ];
    
    // Si hay al menos un documento vencido, la documentación no es válida
    return !documentos.some(doc => doc.estado === 'vencido');
  };

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
      documentacion_validada: false // Se actualiza dinámicamente
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
      // Aplicar validación de documentación en tiempo real
      const viajeConValidacion = {
        ...viajeEncontrado,
        documentacion_validada: validarDocumentacion()
      };
      setViaje(viajeConValidacion);
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

  const handleCloseDocumentacion = () => {
    setShowDocumentacion(false);
  };

  return (
    <MainLayout pageTitle="Control de Acceso">
          {/* Header específico de la página */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <QrCodeIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Gestión de Ingreso y Egreso</h1>
                  <p className="text-slate-300 mt-1">
                    Escaneo QR y validación de documentación
                  </p>
                </div>
              </div>
              
              {viaje && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Nuevo Escaneo
                </button>
              )}
            </div>
          </div>

          {/* QR Scanner */}
          <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 mb-6">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <QrCodeIcon className="h-5 w-5 text-blue-100" />
                </div>
                <h2 className="text-lg font-semibold text-slate-100">Escanear Código QR</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Ingrese código QR (ej: QR-VJ2025001, QR-VJ2025002)"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && escanearQR()}
                />
                <button
                  onClick={escanearQR}
                  disabled={loading || !qrCode.trim()}
                  className="bg-cyan-600 text-white px-8 py-3 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-sm"
                >
                  <QrCodeIcon className="h-5 w-5" />
                  <span className="font-medium">{loading ? 'Escaneando...' : 'Escanear'}</span>
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center space-x-3 ${
                  message.includes('✅') ? 'bg-green-900 text-green-100 border border-green-700' :
                  message.includes('⚠️') ? 'bg-yellow-900 text-yellow-100 border border-yellow-700' :
                  message.includes('📋') ? 'bg-blue-900 text-blue-100 border border-blue-700' :
                  'bg-red-900 text-red-100 border border-red-700'
                }`}>
                  {message.includes('✅') && <CheckCircleIcon className="h-5 w-5 text-green-300" />}
                  {message.includes('⚠️') && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-300" />}
                  {message.includes('📋') && <DocumentTextIcon className="h-5 w-5 text-blue-300" />}
                  {!message.includes('✅') && !message.includes('⚠️') && !message.includes('📋') && <XCircleIcon className="h-5 w-5 text-red-300" />}
                  <span className="font-medium">{message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información del Viaje */}
          {viaje && (
            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 mb-6">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-green-100" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-100">Información del Viaje</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-4">
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Número de Viaje</span>
                      <p className="text-xl font-bold text-slate-100 mt-1">{viaje.numero_viaje}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Estado</span>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                          viaje.estado_viaje === 'confirmado' ? 'bg-blue-600 text-blue-100' :
                          viaje.estado_viaje === 'ingresado_planta' ? 'bg-green-600 text-green-100' :
                          viaje.estado_viaje === 'carga_finalizada' ? 'bg-purple-600 text-purple-100' :
                          viaje.estado_viaje === 'egresado_planta' ? 'bg-gray-600 text-gray-100' :
                          'bg-yellow-600 text-yellow-100'
                        }`}>
                          {viaje.estado_viaje.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Operación</span>
                      <p className="text-slate-100 font-medium capitalize mt-1">{viaje.tipo_operacion}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Producto</span>
                      <p className="text-slate-100 font-medium mt-1">{viaje.producto}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Chofer</span>
                      <p className="text-slate-100 font-medium mt-1">{viaje.chofer.nombre}</p>
                      <p className="text-sm text-slate-300 mt-1">DNI: {viaje.chofer.dni}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Camión</span>
                      <p className="text-slate-100 font-medium mt-1">{viaje.camion.patente}</p>
                      <p className="text-sm text-slate-300 mt-1">{viaje.camion.marca}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Documentación</span>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                          viaje.documentacion_validada ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                        }`}>
                          {viaje.documentacion_validada ? '✅ Válida' : '❌ Faltante'}
                        </span>
                        <button
                          onClick={() => setShowDocumentacion(true)}
                          className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold underline transition-colors"
                        >
                          Ver Detalle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="border-t border-slate-700 pt-6">
                  <div className="flex flex-wrap gap-4">
                    {viaje.estado_viaje === 'confirmado' && (
                      <button
                        onClick={confirmarIngreso}
                        disabled={loading}
                        className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 font-semibold shadow-lg transition-all"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Confirmar Ingreso</span>
                      </button>
                    )}

                    {viaje.estado_viaje === 'carga_finalizada' && (
                      <button
                        onClick={confirmarEgreso}
                        disabled={loading}
                        className="bg-cyan-600 text-white px-8 py-3 rounded-xl hover:bg-cyan-700 disabled:opacity-50 flex items-center space-x-2 font-semibold shadow-lg transition-all"
                      >
                        <TruckIcon className="h-5 w-5" />
                        <span>Confirmar Egreso</span>
                      </button>
                    )}

                    <button
                      onClick={crearIncidencia}
                      className="bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 flex items-center space-x-2 font-semibold shadow-lg transition-all"
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
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <DocumentTextIcon className="h-6 w-6 text-cyan-400" />
              <span>Códigos Demo para Probar</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-700 rounded-xl p-5 border border-slate-600 hover:border-slate-500 transition-colors">
                <code className="text-cyan-400 font-mono font-bold text-base">QR-VJ2025001</code>
                <p className="text-slate-200 mt-2 font-medium">Viaje confirmado (listo para ingreso)</p>
                <div className="mt-2 text-xs text-slate-300">
                  • Chofer: Carlos Mendoza<br/>
                  • Camión: ABC123 (Mercedes-Benz)
                </div>
              </div>
              <div className="bg-slate-700 rounded-xl p-5 border border-slate-600 hover:border-slate-500 transition-colors">
                <code className="text-cyan-400 font-mono font-bold text-base">QR-VJ2025002</code>
                <p className="text-slate-200 mt-2 font-medium">Viaje con carga finalizada (listo para egreso)</p>
                <div className="mt-2 text-xs text-slate-300">
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
          onClose={handleCloseDocumentacion}
        />
      )}
    </MainLayout>
  );
}