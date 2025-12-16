// pages/supervisor-carga.tsx
// Interfaz para Supervisor de Carga con sistema de estados duales

import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { QrCodeIcon, TruckIcon, DocumentTextIcon, ScaleIcon, PhoneIcon, PlayIcon } from '@heroicons/react/24/outline';
import { registrarLlamadoCarga, registrarPosicionadoCarga, iniciarCarga as apiIniciarCarga, registrarCargando, completarCarga, validarDocumentacion, iniciarDescarga, registrarDescargando, completarDescarga, confirmarEntrega } from '../lib/api/estado-carga';
import { getColorEstadoCarga, getLabelEstadoCarga } from '../lib/helpers/estados-helpers';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { supabase } from '../lib/supabaseClient';
import type { EstadoUnidadViaje, EstadoCargaViaje } from '../lib/types';

interface ViajeQR {
  id: string;
  numero_viaje: string;
  qr_code: string;
  estado_viaje: string;
  estado_unidad: EstadoUnidadViaje;
  estado_carga: EstadoCargaViaje;
  tipo_operacion: 'envio' | 'recepcion';
  producto: string;
  peso_estimado: number;
  peso_real?: number;
  bultos?: number;
  temperatura?: number;
  observaciones?: string;
  planta_origen_id: string;
  planta_destino_id: string;
  chofer: any;
  camion: any;
}

export default function SupervisorCarga() {
  const { empresaId, user } = useUserRole();
  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pesoReal, setPesoReal] = useState('');
  const [bultos, setBultos] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activeTab, setActiveTab] = useState('scanner');
  const [viajes, setViajes] = useState<ViajeQR[]>([]);
  const [loadingViajes, setLoadingViajes] = useState(false);

  // Cargar viajes en cola y activos al montar y cada 30 segundos
  useEffect(() => {
    cargarViajes();
    const interval = setInterval(cargarViajes, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  // Cargar viajes relevantes para supervisor de carga
  const cargarViajes = async () => {
    if (!empresaId) return;
    
    setLoadingViajes(true);
    try {
      console.log('📦 [supervisor-carga] Cargando viajes para empresa:', empresaId);
      
      const { data: viajesData, error } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          despacho_id,
          id_chofer,
          id_camion,
          estado,
          despachos!inner (
            id,
            origen,
            destino,
            producto,
            id_empresa,
            peso_estimado
          ),
          choferes (
            id,
            nombre,
            apellido,
            dni
          ),
          camiones (
            id,
            patente,
            marca,
            modelo
          ),
          estado_unidad_viaje (
            estado_unidad
          ),
          estado_carga_viaje (
            estado_carga,
            peso_real_kg,
            cantidad_bultos,
            temperatura_carga
          )
        `)
        .eq('despachos.id_empresa', empresaId)
        .in('estado_unidad_viaje.estado_unidad', [
          'ingreso_planta',
          'en_playa_espera',
          'en_proceso_carga'
        ])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [supervisor-carga] Error cargando viajes:', error);
        return;
      }

      console.log('✅ [supervisor-carga] Viajes cargados:', viajesData?.length || 0);

      const viajesFormateados: ViajeQR[] = (viajesData || []).map((v: any) => ({
        id: v.id,
        numero_viaje: v.numero_viaje.toString(),
        qr_code: `QR-${v.numero_viaje}`,
        estado_viaje: v.estado,
        estado_unidad: v.estado_unidad_viaje?.estado_unidad || v.estado,
        estado_carga: v.estado_carga_viaje?.estado_carga || 'pendiente',
        tipo_operacion: 'envio' as const, // Supervisor solo trabaja en origen
        producto: v.despachos?.producto || `${v.despachos?.origen} → ${v.despachos?.destino}`,
        peso_estimado: v.despachos?.peso_estimado || 0,
        peso_real: v.estado_carga_viaje?.peso_real_kg,
        bultos: v.estado_carga_viaje?.cantidad_bultos,
        temperatura: v.estado_carga_viaje?.temperatura_carga,
        planta_origen_id: v.despachos?.id_empresa,
        planta_destino_id: v.despachos?.id_empresa,
        chofer: v.choferes ? {
          nombre: `${v.choferes.nombre} ${v.choferes.apellido}`,
          dni: v.choferes.dni
        } : {
          nombre: 'Sin asignar',
          dni: 'N/A'
        },
        camion: v.camiones ? {
          patente: v.camiones.patente,
          marca: `${v.camiones.marca} ${v.camiones.modelo || ''}`.trim()
        } : {
          patente: 'Sin asignar',
          marca: 'N/A'
        }
      }));

      setViajes(viajesFormateados);
    } catch (error) {
      console.error('❌ [supervisor-carga] Error en cargarViajes:', error);
    } finally {
      setLoadingViajes(false);
    }
  };

  // Detectar tipo de operación (envío vs recepción)
  const detectarTipoOperacion = (viajeData: ViajeQR): 'envio' | 'recepcion' => {
    return empresaId === viajeData.planta_origen_id ? 'envio' : 'recepcion';
  };

  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const codigoBusqueda = qrCode.trim().replace(/^QR-/, '');
      console.log('🔍 [supervisor-carga] Buscando viaje con código:', codigoBusqueda);
      
      const { data: viajeData, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          despacho_id,
          id_chofer,
          id_camion,
          estado,
          despachos!inner (
            id,
            origen,
            destino,
            producto,
            id_empresa,
            peso_estimado
          ),
          choferes (
            id,
            nombre,
            apellido,
            dni
          ),
          camiones (
            id,
            patente,
            marca,
            modelo
          ),
          estado_unidad_viaje (
            estado_unidad
          ),
          estado_carga_viaje (
            estado_carga,
            peso_real_kg,
            cantidad_bultos,
            temperatura_carga
          )
        `)
        .or(`numero_viaje.ilike.%${codigoBusqueda}%,id.eq.${codigoBusqueda}`)
        .single();
      
      if (viajeError || !viajeData) {
        console.error('❌ [supervisor-carga] Error buscando viaje:', viajeError);
        setMessage('❌ Código QR no válido o viaje no encontrado');
        setViaje(null);
        return;
      }

      console.log('✅ [supervisor-carga] Viaje encontrado:', viajeData);

      const tipoOperacion = viajeData.despachos.id_empresa === empresaId ? 'envio' : 'recepcion';
      
      const viajeCompleto: ViajeQR = {
        id: viajeData.id,
        numero_viaje: viajeData.numero_viaje.toString(),
        qr_code: `QR-${viajeData.numero_viaje}`,
        estado_viaje: viajeData.estado,
        estado_unidad: viajeData.estado_unidad_viaje?.estado_unidad || viajeData.estado,
        estado_carga: viajeData.estado_carga_viaje?.estado_carga || 'pendiente',
        tipo_operacion: tipoOperacion,
        producto: viajeData.despachos.producto || `${viajeData.despachos.origen} → ${viajeData.despachos.destino}`,
        peso_estimado: viajeData.despachos.peso_estimado || 0,
        peso_real: viajeData.estado_carga_viaje?.peso_real_kg,
        bultos: viajeData.estado_carga_viaje?.cantidad_bultos,
        temperatura: viajeData.estado_carga_viaje?.temperatura_carga,
        planta_origen_id: viajeData.despachos.id_empresa,
        planta_destino_id: viajeData.despachos.id_empresa,
        chofer: viajeData.choferes ? {
          nombre: `${viajeData.choferes.nombre} ${viajeData.choferes.apellido}`,
          dni: viajeData.choferes.dni
        } : {
          nombre: 'Sin asignar',
          dni: 'N/A'
        },
        camion: viajeData.camiones ? {
          patente: viajeData.camiones.patente,
          marca: `${viajeData.camiones.marca} ${viajeData.camiones.modelo || ''}`.trim()
        } : {
          patente: 'Sin asignar',
          marca: 'N/A'
        }
      };
      
      setViaje(viajeCompleto);
      setMessage(`📋 Viaje ${viajeCompleto.numero_viaje} encontrado - Operación: ${tipoOperacion === 'envio' ? '📤 Envío (Carga)' : '📥 Recepción (Descarga)'}`);
      console.log('📊 [supervisor-carga] Viaje completo:', viajeCompleto);
    } catch (error: any) {
      console.error('❌ [supervisor-carga] Error en escanearQR:', error);
      setMessage(`❌ Error: ${error.message}`);
      setViaje(null);
    } finally {
      setLoading(false);
    }
  };

  const llamarACarga = async (viajeId: string) => {
    setLoading(true);
    try {
      console.log('📞 [supervisor-carga] Llamando a carga viaje:', viajeId);
      const result = await registrarLlamadoCarga(viajeId);
      
      if (result.success) {
        setMessage(`✅ Notificación enviada al chofer para dirigirse a punto de carga`);
        console.log('✅ [supervisor-carga] Llamado a carga exitoso');
        cargarViajes();
      } else {
        setMessage(`❌ ${result.error || 'Error al llamar a carga'}`);
        console.error('❌ [supervisor-carga] Error:', result.error);
      }
    } catch (error) {
      setMessage('❌ Error al llamar a carga');
      console.error('❌ [supervisor-carga] Exception:', error);
    }
    setLoading(false);
  };

  const posicionarParaCarga = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      await registrarPosicionadoCarga(viaje.id);
      setMessage(`✅ Vehículo posicionado en punto de carga`);
      setViaje({ ...viaje, estado_carga: 'posicionado_carga' });
    } catch (error) {
      setMessage('❌ Error al posicionar vehículo');
      console.error(error);
    }
    setLoading(false);
  };

  const iniciarCarga = async (viajeIdOpt?: string) => {
    const targetViajeId = viajeIdOpt || viaje?.id;
    if (!targetViajeId) return;
    
    setLoading(true);
    try {
      console.log('▶️ [supervisor-carga] Iniciando carga:', targetViajeId);
      const result = await apiIniciarCarga(targetViajeId, viaje?.producto || 'Carga', viaje?.peso_estimado);
      
      if (result.success) {
        setMessage(`✅ Carga iniciada`);
        console.log('✅ [supervisor-carga] Carga iniciada exitosamente');
        
        if (viaje && !viajeIdOpt) {
          setViaje({ ...viaje, estado_carga: 'iniciando_carga' });
        }
        cargarViajes();
      } else {
        setMessage(`❌ ${result.error || 'Error al iniciar carga'}`);
      }
    } catch (error) {
      setMessage('❌ Error al iniciar carga');
      console.error('❌ [supervisor-carga] Error:', error);
    }
    setLoading(false);
  };

  const cerrarCarga = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('🏁 [supervisor-carga] Cerrando carga:', viaje.id);
      
  const cerrarCarga = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('🏁 [supervisor-carga] Cerrando carga:', viaje.id);
      
      const result = await completarCarga(
        viaje.id,
        0, // Peso se registra en Control de Acceso
        0  // Bultos se registran en Control de Acceso
      );
      
      if (result.success) {
        setMessage(`✅ Carga cerrada - Peso y bultos se registrarán en Control de Acceso`);
        console.log('✅ [supervisor-carga] Carga cerrada exitosamente');
        
        setViaje({
          ...viaje,
          estado_carga: 'carga_completada'
        });

        setTimeout(() => {
          setViaje(null);
          setQrCode('');
          setMessage('');
          cargarViajes();
        }, 3000);
      } else {
        setMessage(`❌ ${result.error || 'Error al cerrar carga'}`);
      }
    } catch (error) {
      setMessage('❌ Error al cerrar carga');
      console.error('❌ [supervisor-carga] Error:', error);
    }
    setLoading(false);
  };;
          setQrCode('');
          setPesoReal('');
          setBultos('');
          setTemperatura('');
          setObservaciones('');
          setMessage('');
          cargarViajes();
        }, 3000);
      } else {
        setMessage(`❌ ${result.error || 'Error al finalizar carga'}`);
      }
    } catch (error) {
      setMessage('❌ Error al finalizar carga');
      console.error('❌ [supervisor-carga] Error:', error);
    }
    setLoading(false);
  };
        bultos: parseInt(bultos)
      });

      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setPesoReal('');
        setBultos('');
        setTemperatura('');
        setObservaciones('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('âŒ Error al finalizar carga');
      console.error(error);
    }
    setLoading(false);
  };

  // Funciones para descarga (recepciÃ³n)
  const iniciarDescargaViaje = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      await iniciarDescarga(viaje.id);
      setMessage(`âœ… Descarga iniciada para ${viaje.numero_viaje}`);
      setViaje({ ...viaje, estado_carga: 'iniciando_descarga' });
    } catch (error) {
      setMessage('âŒ Error al iniciar descarga');
      console.error(error);
    }
    setLoading(false);
  };

  const registrarProgresoDescarga = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      await registrarDescargando(viaje.id, {
        observaciones: observaciones || undefined
      });
      setMessage(`âœ… Progreso de descarga registrado`);
      setViaje({ ...viaje, estado_carga: 'descargando' });
    } catch (error) {
      setMessage('âŒ Error al registrar progreso');
      console.error(error);
    }
    setLoading(false);
  };

  const finalizarDescarga = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      await completarDescarga(viaje.id, {
        observaciones: observaciones || undefined
      });
      setMessage(`âœ… Descarga completada para ${viaje.numero_viaje}`);
      setViaje({ ...viaje, estado_carga: 'descargado' });

      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setObservaciones('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('âŒ Error al completar descarga');
      console.error(error);
    }
    setLoading(false);
  };

  const confirmarEntregaFinal = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      await confirmarEntrega(viaje.id, {
        observaciones: observaciones || undefined
      });
      setMessage(`âœ… Entrega confirmada para ${viaje.numero_viaje}`);
      setViaje({ ...viaje, estado_carga: 'entregado' });

      setTimeout(() => {
        setViaje(null);
        setQrCode('');
        setObservaciones('');
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('âŒ Error al confirmar entrega');
      console.error(error);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setViaje(null);
    setQrCode('');
    setPesoReal('');
    setBultos('');
    setTemperatura('');
    setObservaciones('');
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
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
                      <button
                        onClick={() => cerrarCarga()}
                        disabled={loading}
                        className="bg-purple-600 text-purple-100 px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                      >
                        Cerrar Carga
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {viajes.filter(v => ['llamado_carga', 'cargando'].includes(v.estado_viaje)).length === 0 && (
                <div className="text-center py-8">
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
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Viaje Encontrado</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
              <button
                onClick={() => cerrarCarga()}
                disabled={loading}
                className="bg-purple-600 text-purple-100 px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>Cerrar Carga</span>
              </button>
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
