// pages/supervisor-carga.tsx
// Interfaz para Supervisor de Carga

import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon, ScaleIcon, PhoneIcon, PlayIcon, PauseIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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
  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pesoReal, setPesoReal] = useState('');
  const [activeTab, setActiveTab] = useState('scanner');

  // Viajes demo simulados con mÃ¡s datos para supervisor de carga
  const viajesDemo = [
    {
      id: '1',
      numero_viaje: 'VJ-2025-001',
      qr_code: 'QR-VJ2025001',
      estado_viaje: 'ingresado_planta',
      tipo_operacion: 'carga',
      producto: 'Soja - 35 toneladas',
      peso_estimado: 35000,
      chofer: { nombre: 'Juan PÃ©rez', dni: '12345678' },
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
      chofer: { nombre: 'Ana GarcÃ­a', dni: '87654321' },
      camion: { patente: 'XYZ789', marca: 'Scania' }
    },
    {
      id: '3',
      numero_viaje: 'VJ-2025-003',
      qr_code: 'QR-VJ2025003',
      estado_viaje: 'cargando',
      tipo_operacion: 'carga',
      producto: 'MaÃ­z - 32 toneladas',
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
      setMessage(`ðŸ“‹ Viaje ${viajeEncontrado.numero_viaje} encontrado`);
    } else {
      setMessage('âŒ CÃ³digo QR no vÃ¡lido o viaje no encontrado');
      setViaje(null);
    }

    setLoading(false);
  };

  const llamarACarga = async (viajeId: string) => {
    setLoading(true);
    try {
      console.log('Llamando a carga viaje:', viajeId);
      setMessage(`ðŸ“ž NotificaciÃ³n enviada al chofer para dirigirse a carga`);
      
      // Simular actualizaciÃ³n de estado
      const viajeActualizado = viajes.find(v => v.id === viajeId);
      if (viajeActualizado) {
        viajeActualizado.estado_viaje = 'llamado_carga';
      }
    } catch (error) {
      setMessage('âŒ Error al llamar a carga');
    }
    setLoading(false);
  };

  const iniciarCarga = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('Iniciando carga para viaje:', viaje.id);
      setMessage(`âœ… Carga iniciada para ${viaje.numero_viaje}`);
      
      setViaje({
        ...viaje,
        estado_viaje: 'cargando'
      });
    } catch (error) {
      setMessage('âŒ Error al iniciar carga');
    }
    setLoading(false);
  };

  const finalizarCarga = async () => {
    if (!viaje || !pesoReal) {
      setMessage('âŒ Debe ingresar el peso real');
      return;
    }

    setLoading(true);
    try {
      console.log('Finalizando carga:', { viajeId: viaje.id, pesoReal });
      setMessage(`âœ… Carga finalizada - Peso: ${pesoReal} kg`);
      
      setViaje({
        ...viaje,
        estado_viaje: 'carga_finalizada',
        peso_real: parseInt(pesoReal)
      });

      // Limpiar despuÃ©s de 3 segundos
      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setPesoReal('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('âŒ Error al finalizar carga');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setViaje(null);
    setQrCode('');
    setPesoReal('');
    setMessage('');
  };

  return (
    <MainLayout pageTitle="Supervisor de Carga">
      {/* Header especÃ­fico de la pÃ¡gina */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-yellow-600 rounded-xl">
            <ScaleIcon className="h-8 w-8 text-yellow-100" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Supervisor de Carga</h1>
            <p className="text-slate-300 mt-1">
              GestiÃ³n y control de procesos de carga en planta
            </p>
          </div>
        </div>
      </div>

      {/* NavegaciÃ³n por pestaÃ±as */}
      <div className="mb-6">
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scanner'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <QrCodeIcon className="h-5 w-5 inline mr-2" />
              EscÃ¡ner QR
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'queue'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <TruckIcon className="h-5 w-5 inline mr-2" />
              Cola de Carga
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <PlayIcon className="h-5 w-5 inline mr-2" />
              Cargas Activas
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido segÃºn pestaÃ±a activa */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          {/* EscÃ¡ner QR */}
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <QrCodeIcon className="h-6 w-6 text-yellow-500" />
              <h2 className="text-lg font-semibold text-slate-100">Escanear CÃ³digo QR</h2>
            </div>

            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Ingrese o escanee cÃ³digo QR"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none placeholder-slate-400"
                onKeyPress={(e) => e.key === 'Enter' && escanearQR()}
              />
              <button
                onClick={escanearQR}
                disabled={loading || !qrCode.trim()}
                className="bg-yellow-600 text-yellow-100 px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <QrCodeIcon className="h-5 w-5" />
                <span>{loading ? 'Escaneando...' : 'Escanear'}</span>
              </button>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-lg ${
                message.includes('âŒ') ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-green-900/30 text-green-400 border border-green-800'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* CÃ³digos Demo */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold text-slate-100 mb-3 flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>CÃ³digos Demo para Probar</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <code className="text-yellow-400 font-mono font-semibold">QR-VJ2025001</code>
                <p className="text-slate-300 mt-1">En planta (se puede llamar a carga)</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <code className="text-yellow-400 font-mono font-semibold">QR-VJ2025002</code>
                <p className="text-slate-300 mt-1">Llamado a carga (se puede iniciar)</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <code className="text-yellow-400 font-mono font-semibold">QR-VJ2025003</code>
                <p className="text-slate-300 mt-1">Cargando (se puede finalizar)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PestaÃ±a Cola de Carga */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TruckIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-100">VehÃ­culos en Cola de Carga</h2>
            </div>
            
            <div className="space-y-4">
              {viajes.filter(v => v.estado_viaje === 'ingresado_planta').map((v) => (
                <div key={v.id} className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-slate-100">{v.numero_viaje}</p>
                      <p className="text-sm text-slate-300">{v.producto}</p>
                      <p className="text-sm text-slate-400">CamiÃ³n: {v.camion.patente} - {v.camion.marca}</p>
                      <p className="text-sm text-slate-400">Chofer: {v.chofer.nombre}</p>
                    </div>
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
                      EN PLANTA
                    </span>
                  </div>
                  
                  <button
                    onClick={() => llamarACarga(v.id)}
                    disabled={loading}
                    className="bg-yellow-600 text-yellow-100 px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    <span>Llamar a Carga</span>
                  </button>
                </div>
              ))}
              
              {viajes.filter(v => v.estado_viaje === 'ingresado_planta').length === 0 && (
                <div className="text-center py-8">
                  <TruckIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay vehÃ­culos esperando ser llamados a carga</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PestaÃ±a Cargas Activas */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <PlayIcon className="h-6 w-6 text-green-500" />
              <h2 className="text-lg font-semibold text-slate-100">Cargas en Proceso</h2>
            </div>
            
            <div className="space-y-4">
              {viajes.filter(v => ['llamado_carga', 'cargando'].includes(v.estado_viaje)).map((v) => (
                <div key={v.id} className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-slate-100">{v.numero_viaje}</p>
                      <p className="text-sm text-slate-300">{v.producto}</p>
                      <p className="text-sm text-slate-400">Peso Estimado: {v.peso_estimado / 1000} tons</p>
                      <p className="text-sm text-slate-400">CamiÃ³n: {v.camion.patente} - {v.camion.marca}</p>
                      <p className="text-sm text-slate-400">Chofer: {v.chofer.nombre}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      v.estado_viaje === 'llamado_carga' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'
                    }`}>
                      {v.estado_viaje === 'llamado_carga' ? 'LLAMADO A CARGA' : 'CARGANDO'}
                    </span>
                  </div>
                  
                  <div className="flex space-x-3">
                    {v.estado_viaje === 'llamado_carga' && (
                      <button
                        onClick={() => iniciarCarga(v.id)}
                        disabled={loading}
                        className="bg-green-600 text-green-100 px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        <PlayIcon className="h-4 w-4" />
                        <span>Iniciar Carga</span>
                      </button>
                    )}
                    
                    {v.estado_viaje === 'cargando' && (
                      <div className="flex space-x-3 items-center">
                        <input
                          type="number"
                          placeholder="Peso real (kg)"
                          value={pesoReal}
                          onChange={(e) => setPesoReal(e.target.value)}
                          className="px-3 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none placeholder-slate-400 w-40"
                        />
                        <button
                          onClick={() => finalizarCarga(v.id)}
                          disabled={loading || !pesoReal}
                          className="bg-purple-600 text-purple-100 px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Finalizar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {viajes.filter(v => ['llamado_carga', 'cargando'].includes(v.estado_viaje)).length === 0 && (
                <div className="text-center py-8">
                  <PauseIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay cargas en proceso en este momento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Detalle del viaje escaneado */}
      {viaje && (
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6 mt-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            <h2 className="text-lg font-semibold text-slate-100">Viaje Encontrado</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300">NÃºmero de Viaje</label>
                <p className="text-lg font-semibold text-slate-100">{viaje.numero_viaje}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Producto</label>
                <p className="text-slate-100">{viaje.producto}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Peso Estimado</label>
                <p className="text-slate-100">{viaje.peso_estimado / 1000} toneladas</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300">Estado Actual</label>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  viaje.estado_viaje === 'ingresado_planta' ? 'bg-blue-900/30 text-blue-400' :
                  viaje.estado_viaje === 'llamado_carga' ? 'bg-yellow-900/30 text-yellow-400' :
                  viaje.estado_viaje === 'cargando' ? 'bg-green-900/30 text-green-400' :
                  'bg-gray-900/30 text-gray-400'
                }`}>
                  {viaje.estado_viaje.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">VehÃ­culo</label>
                <p className="text-slate-100">{viaje.camion.patente} - {viaje.camion.marca}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Chofer</label>
                <p className="text-slate-100">{viaje.chofer.nombre}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            {viaje.estado_viaje === 'ingresado_planta' && (
              <button
                onClick={() => llamarACarga(viaje.id)}
                disabled={loading}
                className="bg-yellow-600 text-yellow-100 px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <PhoneIcon className="h-5 w-5" />
                <span>Llamar a Carga</span>
              </button>
            )}
            
            {viaje.estado_viaje === 'llamado_carga' && (
              <button
                onClick={() => iniciarCarga(viaje.id)}
                disabled={loading}
                className="bg-green-600 text-green-100 px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <PlayIcon className="h-5 w-5" />
                <span>Iniciar Carga</span>
              </button>
            )}
            
            {viaje.estado_viaje === 'cargando' && (
              <div className="flex space-x-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Peso Real (kg)</label>
                  <input
                    type="number"
                    placeholder="Ingrese peso real"
                    value={pesoReal}
                    onChange={(e) => setPesoReal(e.target.value)}
                    className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={() => finalizarCarga(viaje.id)}
                  disabled={loading || !pesoReal}
                  className="bg-purple-600 text-purple-100 px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2 mt-7"
                >
                  <ScaleIcon className="h-5 w-5" />
                  <span>Finalizar Carga</span>
                </button>
              </div>
            )}
            
            <button
              onClick={resetForm}
              className="px-6 py-3 text-slate-300 hover:text-slate-100 border border-slate-600 rounded-lg hover:bg-slate-700"
            >
              Nuevo Escaneo
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
