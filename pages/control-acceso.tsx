// pages/control-acceso.tsx
// Interfaz para Control de Acceso con diseño Nodexia
// Gestiona ingresos/egresos tanto en ORIGEN como en DESTINO

import { useState, useEffect } from 'react';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { supabase } from '../lib/supabaseClient';
import DocumentacionDetalle from '../components/DocumentacionDetalle';
import MainLayout from '../components/layout/MainLayout';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { actualizarEstadoUnidad } from '../lib/api/estado-unidad';
import { validarDocumentacion as validarDocsCarga } from '../lib/api/estado-carga';
import { getColorEstadoUnidad, getLabelEstadoUnidad } from '../lib/helpers/estados-helpers';
import type { EstadoUnidadViaje as EstadoUnidadViajeType } from '../lib/types';

interface ViajeQR {
  id: string;
  numero_viaje: string;
  qr_code: string;
  despacho_id: string;
  planta_origen_id: string;
  planta_destino_id: string;
  origen_nombre?: string;
  destino_nombre?: string;
  estado_unidad: EstadoUnidadViajeType;
  estado_carga: string;
  tipo_operacion: 'envio' | 'recepcion'; // Detectado automáticamente
  producto: string;
  chofer: any;
  camion: any;
  fecha_programada?: string;
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

  // Función para detectar si es Envío o Recepción - NO UTILIZADA
  // const detectarTipoOperacion = (planta_origen_id: string, planta_destino_id: string): 'envio' | 'recepcion' => {
  //   if (empresaId === planta_origen_id) {
  //     return 'envio';
  //   } else if (empresaId === planta_destino_id) {
  //     return 'recepcion';
  //   }
  //   return 'envio'; // Default
  // };

  // Escanear QR y obtener viaje desde BD
  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      // Buscar despacho primero (porque el QR puede ser el número de despacho)
      const codigoBusqueda = qrCode.trim().replace(/^(QR-|DSP-)/, ''); // Quitar prefijos
      

      // Paso 1: Buscar el despacho por código
      const { data: despacho, error: despachoError } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino, created_by, estado')
        .ilike('pedido_id', `%${codigoBusqueda}%`)
        .maybeSingle();

      if (despachoError) {
        console.error('❌ [control-acceso] Error buscando despacho:', despachoError);
        setMessage('❌ Código QR no válido o viaje no encontrado');
        setViaje(null);
        setLoading(false);
        return;
      }

      if (!despacho) {
        console.error('❌ [control-acceso] Despacho no encontrado');
        setMessage('❌ Despacho no encontrado');
        setViaje(null);
        setLoading(false);
        return;
      }

      // Paso 2: Verificar que el despacho pertenece a la empresa del usuario
      // Obtener la empresa del usuario que creó el despacho
      const { data: usuarioDespacho, error: usuarioError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', despacho.created_by)
        .single();

      if (usuarioError || !usuarioDespacho || usuarioDespacho.empresa_id !== empresaId) {
        console.error('❌ [control-acceso] Despacho no pertenece a esta empresa');
        setMessage('❌ Este despacho no pertenece a su empresa');
        setViaje(null);
        setLoading(false);
        return;
      }


      // Paso 2.5: Obtener nombres de ubicaciones
      const { data: ubicaciones, error: ubicacionesError } = await supabase
        .from('ubicaciones')
        .select('id, nombre, tipo')
        .in('id', [despacho.origen, despacho.destino]);

      const origenUbicacion = ubicaciones?.find(u => u.id === despacho.origen);
      const destinoUbicacion = ubicaciones?.find(u => u.id === despacho.destino);

      // Paso 3: Buscar viaje con relaciones nativas de Supabase
      
      // Traer viaje sin relaciones primero
      const { data: viajesData, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('*')
        .eq('despacho_id', despacho.id)
        .limit(1);
      


      if (viajeError) {
        console.error('❌ [control-acceso] Error buscando viaje:', viajeError);
        setMessage('❌ Error al buscar viaje. Intente nuevamente.');
        setViaje(null);
        setLoading(false);
        return;
      }

      if (!viajesData || viajesData.length === 0) {
        console.error('❌ [control-acceso] No se encontró viaje para despacho:', despacho.id);
        setMessage(`❌ No hay viajes asignados para el despacho ${despacho.pedido_id}`);
        setViaje(null);
        setLoading(false);
        return;
      }

      const viajeData = viajesData[0];
      
      // Traer chofer y camión con queries separadas
      let choferData = null;
      let camionData = null;
      
      if (viajeData.chofer_id) {
        const { data: chofer, error: choferError } = await supabase
          .from('choferes')
          .select('nombre, apellido, dni, telefono')
          .eq('id', viajeData.chofer_id)
          .maybeSingle();
        
        if (choferError) {
          console.error('❌ [control-acceso] Error al buscar chofer:', choferError);
        } else if (!chofer) {
        }
        choferData = chofer;
      }
      
      if (viajeData.camion_id) {
        const { data: camion, error: camionError } = await supabase
          .from('camiones')
          .select('patente, marca, modelo, anio')
          .eq('id', viajeData.camion_id)
          .maybeSingle();
        
        if (camionError) {
          console.error('❌ [control-acceso] Error al buscar camión:', camionError);
        } else if (!camion) {
        }
        camionData = camion;
      }

      const chofer = choferData ? {
        nombre: choferData.nombre,
        apellido: choferData.apellido,
        dni: choferData.dni,
        telefono: choferData.telefono
      } : null;

      const camion = camionData ? {
        patente: camionData.patente,
        marca: camionData.marca,
        modelo: camionData.modelo,
        año: camionData.anio
      } : null;


      const tipoOp: 'envio' | 'recepcion' = 'envio';
      const estadoUnidad = viajeData.estado_unidad || viajeData.estado || 'pendiente';

      const viajeCompleto: ViajeQR = {
        id: viajeData.id,
        numero_viaje: viajeData.numero_viaje?.toString() || despacho.pedido_id,
        qr_code: despacho.pedido_id,
        despacho_id: despacho.id,
        planta_origen_id: despacho.origen,
        planta_destino_id: despacho.destino,
        origen_nombre: origenUbicacion?.nombre || 'Origen desconocido',
        destino_nombre: destinoUbicacion?.nombre || 'Destino desconocido',
        estado_unidad: estadoUnidad as EstadoUnidadViajeType,
        estado_carga: viajeData.estado,
        tipo_operacion: tipoOp,
        producto: `${origenUbicacion?.nombre || 'Origen'} → ${destinoUbicacion?.nombre || 'Destino'}`,
        chofer: chofer ? {
          nombre: `${chofer.nombre} ${chofer.apellido || ''}`.trim(),
          dni: chofer.dni || 'N/A',
          telefono: chofer.telefono || 'N/A'
        } : {
          nombre: 'Sin asignar',
          dni: 'N/A',
          telefono: 'N/A'
        },
        camion: camion ? {
          patente: camion.patente,
          marca: `${camion.marca} ${camion.modelo || ''}`.trim(),
          año: camion.año
        } : {
          patente: 'Sin asignar',
          marca: 'N/A',
          año: null
        },
        documentacion_validada: true, // Por ahora, asumir válida
        docs_chofer: {
          licencia_valida: true
        },
        docs_camion: {
          vtv_valida: true,
          seguro_valido: true
        }
      };

      setViaje(viajeCompleto);
      setMessage(
        `📋 ${tipoOp === 'envio' ? 'Envío' : 'Recepción'} ${viajeCompleto.numero_viaje} encontrado - Estado: ${getLabelEstadoUnidad(estadoUnidad as EstadoUnidadViajeType)}`
      );
      
    } catch (error: any) {
      console.error('❌ [control-acceso] Error en escanearQR:', error);
      setMessage('❌ Error al procesar QR. Intente nuevamente.');
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
      }

      // Determinar el nuevo estado según el tipo de operación
      const nuevoEstado: EstadoUnidadViajeType =
        viaje.tipo_operacion === 'envio' ? 'en_playa_origen' : 'ingresado_destino';
      

      const result = await actualizarEstadoUnidad({
        viaje_id: viaje.id,
        nuevo_estado: nuevoEstado,
        observaciones: `Ingreso confirmado por Control de Acceso`,
      });

      if (result.success) {
        const ahora = new Date().toLocaleString('es-ES');
        setMessage(`✅ Ingreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);

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
      setMessage('❌ Error al confirmar ingreso. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar egreso (origen o destino)
  const confirmarEgreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
      
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
      }

      // Determinar el nuevo estado según el tipo de operación
      // Origen: egreso_origen (que automáticamente dispara en_transito_destino)
      // Destino: egreso_destino (camión sale del destino tras descarga)
      const nuevoEstado: EstadoUnidadViajeType =
        viaje.tipo_operacion === 'envio' ? 'egreso_origen' : 'egreso_destino';
      

      const result = await actualizarEstadoUnidad({
        viaje_id: viaje.id,
        nuevo_estado: nuevoEstado,
        observaciones: `Egreso confirmado por Control de Acceso`,
      });

      if (result.success) {
        const ahora = new Date().toLocaleString('es-ES');
        const autoCompletado = result.data?.viaje_auto_completado;
        
        // Check if viaje was auto-completed
        if (autoCompletado) {
          setMessage(`✅ Egreso confirmado y viaje completado automáticamente para ${viaje.numero_viaje} a las ${ahora}`);
        } else {
          setMessage(`✅ Egreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);
        }

        setViaje({
          ...viaje,
          estado_unidad: autoCompletado ? 'viaje_completado' : nuevoEstado,
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
      setMessage('❌ Error al confirmar egreso. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Llamar a descarga (solo en destino)
  const llamarADescarga = async () => {
    if (!viaje || viaje.tipo_operacion !== 'recepcion') return;
    if (viaje.estado_unidad !== 'ingresado_destino') {
      setMessage('❌ Solo se puede llamar a descarga desde estado Ingresado Destino');
      return;
    }

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
      setMessage('❌ Error al llamar a descarga. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const crearIncidencia = () => {
    if (!viaje) return;
    
    const descripcion = prompt('Describe la incidencia:');
    if (descripcion) {
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
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg border border-slate-700 mb-6">
              {/* Header de la tarjeta */}
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <TruckIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {viaje.qr_code}
                      </h2>
                      <p className="text-cyan-100 font-medium mt-1">
                        Viaje #{viaje.numero_viaje}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-6 py-3 rounded-xl text-sm font-bold shadow-lg ${getColorEstadoUnidad(viaje.estado_unidad)} text-white`}>
                      {getLabelEstadoUnidad(viaje.estado_unidad)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Ruta */}
                <div className="mb-6 bg-slate-700/50 rounded-xl p-5 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Origen</p>
                      <p className="text-xl font-bold text-white">{viaje.origen_nombre}</p>
                    </div>
                    <div className="px-6">
                      <div className="p-3 bg-cyan-600 rounded-full">
                        <ArrowRightIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Destino</p>
                      <p className="text-xl font-bold text-white">{viaje.destino_nombre}</p>
                    </div>
                  </div>
                </div>

                {/* Grid de información */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Camión */}
                  <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-cyan-500 transition-colors">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-cyan-600 rounded-lg">
                        <TruckIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Camión</span>
                    </div>
                    <p className="text-xl font-bold text-white mb-1">{viaje.camion.patente}</p>
                    <p className="text-sm text-slate-300">{viaje.camion.marca}</p>
                    {viaje.camion.año && (
                      <p className="text-xs text-slate-400 mt-1">Año {viaje.camion.año}</p>
                    )}
                  </div>

                  {/* Chofer */}
                  <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-cyan-500 transition-colors">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Chofer</span>
                    </div>
                    <p className="text-lg font-bold text-white mb-1">{viaje.chofer.nombre}</p>
                    <p className="text-sm text-slate-300">DNI: {viaje.chofer.dni}</p>
                    {viaje.chofer.telefono && (
                      <p className="text-xs text-slate-400 mt-1">Tel: {viaje.chofer.telefono}</p>
                    )}
                  </div>

                  {/* Info adicional */}
                  <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-purple-600 rounded-lg">
                        <ClockIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Información</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-400">Operación</p>
                        <p className="text-sm font-semibold text-white capitalize">
                          {viaje.tipo_operacion === 'envio' ? '📤 Envío' : '📥 Recepción'}
                        </p>
                      </div>
                      {viaje.fecha_programada && (
                        <div>
                          <p className="text-xs text-slate-400">Fecha Programada</p>
                          <p className="text-sm font-semibold text-white">
                            {new Date(viaje.fecha_programada).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Documentación */}
                <div className="mb-6 bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-300">Documentación</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-semibold ${
                        viaje.documentacion_validada 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-red-600 text-red-100'
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

                {/* Información contextual según estado */}
                {viaje.estado_unidad === 'ingresado_origen' && viaje.tipo_operacion === 'envio' && (
                  <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-blue-100 font-semibold">El camión ha arribado a planta</p>
                        <p className="text-blue-300 text-sm mt-1">Confirme el ingreso para permitir el acceso a la playa de espera</p>
                      </div>
                    </div>
                  </div>
                )}

                {viaje.estado_unidad === 'en_playa_origen' && viaje.tipo_operacion === 'envio' && (
                  <div className="mb-6 bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-600 rounded-lg">
                        <TruckIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-yellow-100 font-semibold">Camión en playa de espera</p>
                        <p className="text-yellow-300 text-sm mt-1">Asigne una playa específica o espere llamado a carga del coordinador</p>
                      </div>
                    </div>
                  </div>
                )}

                {viaje.estado_unidad === 'egreso_origen' && viaje.tipo_operacion === 'envio' && !viaje.documentacion_validada && (
                  <div className="mb-6 bg-purple-900/30 border border-purple-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-600 rounded-lg">
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-purple-100 font-semibold">Carga completada - Validar documentación</p>
                        <p className="text-purple-300 text-sm mt-1">Verifique que toda la documentación esté completa antes de autorizar la salida</p>
                      </div>
                    </div>
                  </div>
                )}

                {viaje.estado_unidad === 'en_transito_destino' && viaje.tipo_operacion === 'recepcion' && (
                  <div className="mb-6 bg-purple-900/30 border border-purple-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-600 rounded-lg">
                        <TruckIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-purple-100 font-semibold">Camión en tránsito hacia destino</p>
                        <p className="text-purple-300 text-sm mt-1">Aguardando arribo para confirmar ingreso</p>
                      </div>
                    </div>
                  </div>
                )}

                {(viaje.estado_unidad === 'arribado_destino' || viaje.estado_unidad === 'arribo_destino') && viaje.tipo_operacion === 'recepcion' && (
                  <div className="mb-6 bg-teal-900/30 border border-teal-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-teal-600 rounded-lg">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-teal-100 font-semibold">Camión arribó a destino</p>
                        <p className="text-teal-300 text-sm mt-1">Confirme el ingreso para registrar la entrada</p>
                      </div>
                    </div>
                  </div>
                )}

                {viaje.estado_unidad === 'ingresado_destino' && viaje.tipo_operacion === 'recepcion' && (
                  <div className="mb-6 bg-cyan-900/30 border border-cyan-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-600 rounded-lg">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-cyan-100 font-semibold">Camión ingresado en destino</p>
                        <p className="text-cyan-300 text-sm mt-1">Llame a descarga cuando esté listo</p>
                      </div>
                    </div>
                  </div>
                )}

                {(viaje.estado_unidad === 'llamado_descarga' || viaje.estado_unidad === 'descargando') && viaje.tipo_operacion === 'recepcion' && (
                  <div className="mb-6 bg-orange-900/30 border border-orange-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-600 rounded-lg">
                        <TruckIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-orange-100 font-semibold">{viaje.estado_unidad === 'llamado_descarga' ? 'Descarga solicitada' : 'Descargando'}</p>
                        <p className="text-orange-300 text-sm mt-1">Aguardando finalización de descarga</p>
                      </div>
                    </div>
                  </div>
                )}

                {(viaje.estado_unidad === 'descargado' || viaje.estado_unidad === 'egreso_destino') && viaje.tipo_operacion === 'recepcion' && (
                  <div className="mb-6 bg-green-900/30 border border-green-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-green-100 font-semibold">Descarga completada</p>
                        <p className="text-green-300 text-sm mt-1">Confirme el egreso del camión</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="border-t border-slate-700 pt-6">
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Acciones Disponibles</p>
                  <div className="flex flex-wrap gap-3">{/* Confirmar Ingreso - Solo si el camión llegó */}
                    {((viaje.tipo_operacion === 'envio' && (viaje.estado_unidad === 'en_transito_origen' || viaje.estado_unidad === 'arribo_origen')) ||
                      (viaje.tipo_operacion === 'recepcion' && (viaje.estado_unidad === 'en_transito_destino' || viaje.estado_unidad === 'arribo_destino' || viaje.estado_unidad === 'arribado_destino'))) && (
                      <button
                        onClick={confirmarIngreso}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <CheckCircleIcon className="h-6 w-6" />
                        <span>{viaje.tipo_operacion === 'envio' ? 'Confirmar Ingreso a Planta' : 'Confirmar Ingreso a Destino'}</span>
                      </button>
                    )}

                    {/* Asignar Playa de Espera - Solo en origen después del ingreso */}
                    {viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'en_playa_origen' && (
                      <button
                        onClick={() => {
                          const playa = prompt('Número de playa de espera:');
                          if (playa) {
                            actualizarEstadoUnidad({
                              viaje_id: viaje.id,
                              nuevo_estado: 'en_playa_origen',
                              observaciones: `Asignado a playa ${playa}`,
                            }).then(result => {
                              if (result.success) {
                                setMessage(`✅ Camión asignado a playa ${playa}`);
                                setViaje({...viaje, estado_unidad: 'en_playa_origen'});
                              } else {
                                setMessage(`❌ ${result.error}`);
                              }
                            });
                          }
                        }}
                        disabled={loading}
                        className="flex-1 bg-cyan-600 text-white px-6 py-4 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <TruckIcon className="h-6 w-6" />
                        <span>Asignar Playa de Espera</span>
                      </button>
                    )}

                    {/* Validar Documentación - Solo en origen después de carga completada */}
                    {viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'egreso_origen' && (
                      <button
                        onClick={async () => {
                          setLoading(true);
                          try {
                            // Marcar documentación como validada en el viaje
                            const { error } = await supabase
                              .from('viajes_despacho')
                              .update({ documentacion_completa: true })
                              .eq('id', viaje.id);

                            if (error) throw error;
                            
                            setMessage(`✅ Documentación validada`);
                            setViaje({...viaje, documentacion_validada: true});
                          } catch (error: any) {
                            setMessage('❌ Error al validar documentación. Intente nuevamente.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading || viaje.documentacion_validada}
                        className="bg-purple-600 text-white px-6 py-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <DocumentTextIcon className="h-6 w-6" />
                        <span>{viaje.documentacion_validada ? 'Documentación Validada ✓' : 'Validar Documentación'}</span>
                      </button>
                    )}

                    {/* Confirmar Egreso - Solo si documentación está validada o es en destino */}
                    {((viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'egreso_origen' && viaje.documentacion_validada) ||
                      (viaje.tipo_operacion === 'recepcion' && (viaje.estado_unidad === 'descargado' || viaje.estado_unidad === 'egreso_destino'))) && (
                      <button
                        onClick={confirmarEgreso}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <CheckCircleIcon className="h-6 w-6" />
                        <span>{viaje.tipo_operacion === 'envio' ? 'Confirmar Egreso de Planta' : 'Confirmar Egreso de Destino'}</span>
                      </button>
                    )}

                    {/* Llamar a Descarga (solo recepción) */}
                    {viaje.tipo_operacion === 'recepcion' && viaje.estado_unidad === 'ingresado_destino' && (
                      <button
                        onClick={llamarADescarga}
                        disabled={loading}
                        className="flex-1 bg-cyan-600 text-white px-6 py-4 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <span>📢</span>
                        <span>Llamar a Descarga</span>
                      </button>
                    )}

                    {/* Crear Incidencia */}
                    <button
                      onClick={crearIncidencia}
                      className="bg-amber-600 text-white px-6 py-4 rounded-xl hover:bg-amber-700 flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                      <ExclamationTriangleIcon className="h-6 w-6" />
                      <span>Crear Incidencia</span>
                    </button>

                    {/* Resetear */}
                    <button
                      onClick={resetForm}
                      className="bg-slate-600 text-white px-6 py-4 rounded-xl hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                      Limpiar
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
                  {loadingHistorial ? 'Actualizando...' : 'Actualizar'}
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