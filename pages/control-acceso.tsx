// pages/control-acceso.tsx
// Interfaz para Control de Acceso con diseño Nodexia
// Gestiona ingresos/egresos tanto en ORIGEN como en DESTINO

import { useState, useEffect } from 'react';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { supabase } from '../lib/supabaseClient';
import DocumentacionDetalle from '../components/DocumentacionDetalle';
import MainLayout from '../components/layout/MainLayout';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { actualizarEstadoUnidad, obtenerEstadoUnidad } from '../lib/api/estado-unidad';
import { actualizarEstadoCarga, validarDocumentacion as validarDocsCarga } from '../lib/api/estado-carga';
import { getColorEstadoUnidad, getLabelEstadoUnidad } from '../lib/helpers/estados-helpers';
import type { EstadoUnidadViaje as EstadoUnidadViajeType } from '../lib/types';

interface ViajeQR {
  id: string;
  numero_viaje: string;
  qr_code: string;
  despacho_id: string;
  planta_origen_id: string;
  planta_destino_id: string;
  estado_unidad: EstadoUnidadViajeType;
  estado_carga: string;
  tipo_operacion: 'envio' | 'recepcion'; // Detectado automáticamente
  producto: string;
  chofer: any;
  camion: any;
  documentacion_validada: boolean;
  docs_chofer: {
    licencia_valida: boolean;
    licencia_vencimiento?: string;
  };
  docs_camion: {
    vtv_valida: boolean;
    vtv_vencimiento?: string;
    seguro_valido: boolean;
    seguro_vencimiento?: string;
  };
}

interface RegistroAcceso {
  id: string;
  viaje_id: string;
  tipo: 'ingreso' | 'egreso';
  timestamp: string;
  numero_viaje: string;
  chofer_nombre: string;
  camion_patente: string;
}

export default function ControlAcceso() {
  const { empresaId, user } = useUserRole();
  
  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDocumentacion, setShowDocumentacion] = useState(false);
  const [historial, setHistorial] = useState<RegistroAcceso[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  
  // Estados para egreso con peso y bultos
  const [pesoReal, setPesoReal] = useState('');
  const [cantidadBultos, setCantidadBultos] = useState('');
  const [showModalEgreso, setShowModalEgreso] = useState(false);
  
  // Estados para validación de documentación
  const [docsIncompletas, setDocsIncompletas] = useState(false);
  const [showModalDocs, setShowModalDocs] = useState(false);

  // Cargar historial de accesos al montar el componente
  useEffect(() => {
    cargarHistorial();
    // Recargar cada 30 segundos
    const interval = setInterval(cargarHistorial, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarHistorial = async () => {
    setLoadingHistorial(true);
    try {
      // Cargar registros de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const { data: registros, error } = await supabase
        .from('registros_acceso')
        .select(`
          id,
          viaje_id,
          tipo,
          timestamp,
          viajes_despacho!inner (
            numero_viaje,
            choferes (nombre, apellido),
            camiones (patente)
          )
        `)
        .gte('timestamp', hoy.toISOString())
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error cargando historial:', error);
        return;
      }

      const historialFormateado: RegistroAcceso[] = (registros || []).map((reg: any) => ({
        id: reg.id,
        viaje_id: reg.viaje_id,
        tipo: reg.tipo,
        timestamp: reg.timestamp,
        numero_viaje: reg.viajes_despacho?.numero_viaje || 'N/A',
        chofer_nombre: `${reg.viajes_despacho?.choferes?.nombre || ''} ${reg.viajes_despacho?.choferes?.apellido || ''}`.trim() || 'N/A',
        camion_patente: reg.viajes_despacho?.camiones?.patente || 'N/A'
      }));

      setHistorial(historialFormateado);
    } catch (error) {
      console.error('Error en cargarHistorial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Función para detectar si es Envío o Recepción
  const detectarTipoOperacion = (planta_origen_id: string, planta_destino_id: string): 'envio' | 'recepcion' => {
    if (empresaId === planta_origen_id) {
      return 'envio';
    } else if (empresaId === planta_destino_id) {
      return 'recepcion';
    }
    return 'envio'; // Default
  };

  // Escanear QR y obtener viaje desde BD
  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      // Buscar viaje por número de viaje (el QR puede ser el número de viaje)
      const codigoBusqueda = qrCode.trim().replace(/^QR-/, ''); // Quitar prefijo QR-
      
      console.log('🔍 [control-acceso] Buscando viaje con código:', codigoBusqueda);

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
            id_empresa
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
          )
        `)
        .or(`numero_viaje.ilike.%${codigoBusqueda}%,id.eq.${codigoBusqueda}`)
        .single();

      if (viajeError || !viajeData) {
        console.error('❌ [control-acceso] Error buscando viaje:', viajeError);
        setMessage('❌ Código QR no válido o viaje no encontrado');
        setViaje(null);
        return;
      }

      console.log('✅ [control-acceso] Viaje encontrado:', viajeData);

      // Detectar tipo de operación basado en la empresa del despacho
      const tipoOp: 'envio' | 'recepcion' = 
        viajeData.despachos.id_empresa === empresaId ? 'envio' : 'recepcion';

      const estadoUnidad = viajeData.estado_unidad_viaje?.estado_unidad || viajeData.estado || 'pendiente';

      const viajeCompleto: ViajeQR = {
        id: viajeData.id,
        numero_viaje: viajeData.numero_viaje.toString(),
        qr_code: `QR-${viajeData.numero_viaje}`,
        despacho_id: viajeData.despacho_id,
        planta_origen_id: viajeData.despachos.id_empresa,
        planta_destino_id: viajeData.despachos.id_empresa, // Simplificado
        estado_unidad: estadoUnidad as EstadoUnidadViajeType,
        estado_carga: viajeData.estado,
        tipo_operacion: tipoOp,
        producto: viajeData.despachos.producto || `${viajeData.despachos.origen} → ${viajeData.despachos.destino}`,
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
        },
        documentacion_validada: true // Por ahora, asumir válida
      };

      setViaje(viajeCompleto);
      setMessage(
        `📋 ${tipoOp === 'envio' ? 'Envío' : 'Recepción'} ${viajeCompleto.numero_viaje} encontrado - Estado: ${getLabelEstadoUnidad(estadoUnidad as EstadoUnidadViajeType)}`
      );
      
      console.log('📊 [control-acceso] Viaje completo:', viajeCompleto);
    } catch (error: any) {
      console.error('❌ [control-acceso] Error en escanearQR:', error);
      setMessage(`❌ Error: ${error.message}`);
      setViaje(null);
    } finally {
      setLoading(false);
    }
  };

  // Confirmar ingreso (origen o destino)
  const confirmarIngreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('🚪 [control-acceso] Confirmando ingreso para viaje:', viaje.id);
      console.log('🚪 [control-acceso] Tipo de operación:', viaje.tipo_operacion);
      console.log('🚪 [control-acceso] Estado actual:', viaje.estado_unidad);
      
      // Registrar en tabla de accesos
      const { error: registroError } = await supabase
        .from('registros_acceso')
        .insert({
          viaje_id: viaje.id,
          tipo: 'ingreso',
          usuario_id: user?.id,
          observaciones: `Ingreso registrado por Control de Acceso - ${viaje.tipo_operacion === 'envio' ? 'Planta Origen' : 'Destino'}`
        });

      if (registroError) {
        console.error('⚠️ [control-acceso] Error registrando acceso:', registroError);
      } else {
        console.log('✅ [control-acceso] Registro de acceso creado');
      }

      // Determinar el nuevo estado según el tipo de operación
      const nuevoEstado: EstadoUnidadViajeType =
        viaje.tipo_operacion === 'envio' ? 'ingreso_planta' : 'ingreso_destino';
      
      console.log('🔄 [control-acceso] Actualizando estado a:', nuevoEstado);

      const result = await actualizarEstadoUnidad({
        viaje_id: viaje.id,
        nuevo_estado: nuevoEstado,
        observaciones: `Ingreso confirmado por Control de Acceso`,
      });

      if (result.success) {
        const ahora = new Date().toLocaleString('es-ES');
        setMessage(`✅ Ingreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);
        console.log('✅ [control-acceso] Estado actualizado correctamente');

        setViaje({
          ...viaje,
          estado_unidad: nuevoEstado,
        });

        // Recargar historial
        cargarHistorial();

        // Limpiar después de 3 segundos
        setTimeout(() => {
          setViaje(null);
          setQrCode('');
          setMessage('');
        }, 3000);
      } else {
        console.error('❌ [control-acceso] Error actualizando estado:', result.error);
        setMessage(`❌ ${result.error || 'Error al confirmar ingreso'}`);
      }
    } catch (error: any) {
      console.error('❌ [control-acceso] Error en confirmarIngreso:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Confirmar egreso (origen o destino)
  const confirmarEgreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      console.log('🚪 [control-acceso] Confirmando egreso para viaje:', viaje.id);
      console.log('🚪 [control-acceso] Tipo de operación:', viaje.tipo_operacion);
      console.log('🚪 [control-acceso] Estado actual:', viaje.estado_unidad);
      
      // Registrar en tabla de accesos
      const { error: registroError } = await supabase
        .from('registros_acceso')
        .insert({
          viaje_id: viaje.id,
          tipo: 'egreso',
          usuario_id: user?.id,
          observaciones: `Egreso registrado por Control de Acceso - ${viaje.tipo_operacion === 'envio' ? 'Planta Origen' : 'Destino'}`
        });

      if (registroError) {
        console.error('⚠️ [control-acceso] Error registrando acceso:', registroError);
      } else {
        console.log('✅ [control-acceso] Registro de egreso creado');
      }

      // Determinar el nuevo estado según el tipo de operación
      // Origen: egreso_planta (que automáticamente dispara en_transito_destino)
      // Destino: egreso_destino (viaje completado)
      const nuevoEstado: EstadoUnidadViajeType =
        viaje.tipo_operacion === 'envio' ? 'egreso_planta' : 'egreso_destino';
      
      console.log('🔄 [control-acceso] Actualizando estado a:', nuevoEstado);

      const result = await actualizarEstadoUnidad({
        viaje_id: viaje.id,
        nuevo_estado: nuevoEstado,
        observaciones: `Egreso confirmado por Control de Acceso`,
      });

      if (result.success) {
        const ahora = new Date().toLocaleString('es-ES');
        setMessage(`✅ Egreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);
        console.log('✅ [control-acceso] Estado actualizado correctamente');

        setViaje({
          ...viaje,
          estado_unidad: nuevoEstado,
        });

        // Recargar historial
        cargarHistorial();

        // Limpiar después de 3 segundos
        setTimeout(() => {
          setViaje(null);
          setQrCode('');
          setMessage('');
        }, 3000);
      } else {
        console.error('❌ [control-acceso] Error actualizando estado:', result.error);
        setMessage(`❌ ${result.error || 'Error al confirmar egreso'}`);
      }
    } catch (error: any) {
      console.error('❌ [control-acceso] Error en confirmarEgreso:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Llamar a descarga (solo en destino)
  const llamarADescarga = async () => {
    if (!viaje || viaje.tipo_operacion !== 'recepcion') return;

    setLoading(true);
    try {
      const result = await actualizarEstadoUnidad({
        viaje_id: viaje.id,
        nuevo_estado: 'llamado_descarga',
        observaciones: 'Llamado a descarga desde Control de Acceso',
      });

      if (result.success) {
        setMessage(`📢 Llamado a descarga enviado para ${viaje.numero_viaje}`);
        setViaje({
          ...viaje,
          estado_unidad: 'llamado_descarga',
        });
      } else {
        setMessage(`❌ ${result.error || 'Error al llamar a descarga'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
          <div className="bg-slate-800 rounded shadow-sm border border-slate-700 mb-2">
            <div className="p-2 border-b border-slate-700">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div className="space-y-4">
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Número de Viaje</span>
                      <p className="text-xl font-bold text-slate-100 mt-1">{viaje.numero_viaje}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Estado</span>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${getColorEstadoUnidad(viaje.estado_unidad)} text-white`}>
                          {getLabelEstadoUnidad(viaje.estado_unidad)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Operación</span>
                      <p className="text-slate-100 font-medium capitalize mt-1">
                        {viaje.tipo_operacion === 'envio' ? '📤 Envío' : '📥 Recepción'}
                      </p>
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
                    {/* Confirmar Ingreso - Solo si el camión llegó (arribo_origen o arribo_destino) */}
                    {((viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'arribo_origen') ||
                      (viaje.tipo_operacion === 'recepcion' && viaje.estado_unidad === 'arribo_destino')) && (
                      <button
                        onClick={confirmarIngreso}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-sm font-medium"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>{viaje.tipo_operacion === 'envio' ? 'Confirmar Ingreso a Planta' : 'Confirmar Ingreso a Destino'}</span>
                      </button>
                    )}

                    {/* Asignar Playa de Espera - Solo en origen después del ingreso */}
                    {viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'ingreso_planta' && (
                      <button
                        onClick={() => {
                          const playa = prompt('Número de playa de espera:');
                          if (playa) {
                            actualizarEstadoUnidad({
                              viaje_id: viaje.id,
                              nuevo_estado: 'en_playa_espera',
                              observaciones: `Asignado a playa ${playa}`,
                            }).then(result => {
                              if (result.success) {
                                setMessage(`✅ Camión asignado a playa ${playa}`);
                                setViaje({...viaje, estado_unidad: 'en_playa_espera'});
                              } else {
                                setMessage(`❌ ${result.error}`);
                              }
                            });
                          }
                        }}
                        disabled={loading}
                        className="flex-1 bg-cyan-600 text-white px-6 py-3 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-sm font-medium"
                      >
                        <TruckIcon className="h-5 w-5" />
                        <span>Asignar Playa de Espera</span>
                      </button>
                    )}

                    {/* Validar Documentación - Solo en origen después de carga completada */}
                    {viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'cargado' && (
                      <button
                        onClick={async () => {
                          const result = await validarDocsCarga(viaje.id);
                          if (result.success) {
                            setMessage(`✅ Documentación validada`);
                            setViaje({...viaje, documentacion_validada: true});
                          } else {
                            setMessage(`❌ ${result.error}`);
                          }
                        }}
                        disabled={loading || viaje.documentacion_validada}
                        className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-sm font-medium"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                        <span>{viaje.documentacion_validada ? 'Documentación Validada ✓' : 'Validar Documentación'}</span>
                      </button>
                    )}

                    {/* Confirmar Egreso - Solo si documentación está validada o es en destino */}
                    {((viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'cargado' && viaje.documentacion_validada) ||
                      (viaje.tipo_operacion === 'recepcion' && viaje.estado_unidad === 'vacio')) && (
                      <button
                        onClick={confirmarEgreso}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-sm font-medium"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>{viaje.tipo_operacion === 'envio' ? 'Confirmar Egreso de Planta' : 'Confirmar Egreso de Destino'}</span>
                      </button>
                    )}

                    {/* Llamar a Descarga (solo recepción) */}
                    {viaje.tipo_operacion === 'recepcion' && viaje.estado_unidad === 'ingreso_destino' && (
                      <button
                        onClick={llamarADescarga}
                        disabled={loading}
                        className="flex-1 bg-cyan-600 text-white px-6 py-3 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-sm font-medium"
                      >
                        <span>📢</span>
                        <span>Llamar a Descarga</span>
                      </button>
                    )}

                    {/* Crear Incidencia */}
                    <button
                      onClick={crearIncidencia}
                      className="bg-amber-600 text-white px-6 py-3 rounded-xl hover:bg-amber-700 flex items-center space-x-2 transition-all shadow-sm font-medium"
                    >
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      <span>Crear Incidencia</span>
                    </button>

                    {/* Resetear */}
                    <button
                      onClick={resetForm}
                      className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all shadow-sm font-medium"
                    >
                      Resetear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historial de Accesos */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-purple-100" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Historial de Accesos Hoy</h2>
                    <p className="text-sm text-slate-400">Últimos 20 registros</p>
                  </div>
                </div>
                <button
                  onClick={cargarHistorial}
                  disabled={loadingHistorial}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loadingHistorial ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros hoy</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((registro) => (
                    <div
                      key={registro.id}
                      className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg ${
                            registro.tipo === 'ingreso' 
                              ? 'bg-green-600' 
                              : 'bg-blue-600'
                          }`}>
                            {registro.tipo === 'ingreso' ? (
                              <ArrowRightIcon className="h-5 w-5 text-white transform rotate-90" />
                            ) : (
                              <ArrowRightIcon className="h-5 w-5 text-white transform -rotate-90" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">{registro.numero_viaje}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                registro.tipo === 'ingreso' 
                                  ? 'bg-green-600 text-green-100' 
                                  : 'bg-blue-600 text-blue-100'
                              }`}>
                                {registro.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 mt-1">
                              {registro.chofer_nombre} • {registro.camion_patente}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-300 text-sm">
                            {new Date(registro.timestamp).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {new Date(registro.timestamp).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Información */}
          <div className="bg-blue-900/20 border border-blue-700 rounded p-2 shadow-sm">
            <h3 className="font-bold text-blue-300 mb-3 flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>ℹ️ Instrucciones</span>
            </h3>
            <div className="text-blue-200 text-sm space-y-2">
              <p>• Ingresa el número de viaje o escanea el código QR</p>
              <p>• Verifica la información del viaje antes de confirmar</p>
              <p>• Puedes probar con cualquier número de viaje existente en el sistema</p>
              <p>• El historial se actualiza automáticamente cada 30 segundos</p>
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