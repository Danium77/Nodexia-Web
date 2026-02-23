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
import HistorialAccesos from '../components/ControlAcceso/HistorialAccesos';
import EstadoBanners from '../components/ControlAcceso/EstadoBanners';
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
  chofer_id?: string;
  camion_id?: string;
  acoplado_id?: string;
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

// Documentos requeridos por tipo de entidad (debe coincidir con DocumentacionDetalle)
const DOCS_REQUERIDOS: Record<string, string[]> = {
  chofer: ['licencia_conducir', 'art_clausula_no_repeticion'],
  camion: ['seguro', 'rto', 'cedula'],
  acoplado: ['seguro', 'rto', 'cedula'],
};

// Aliases para normalizar tipos de documentos
const TIPO_DOC_ALIASES: Record<string, string> = {
  vtv: 'rto',
  tarjeta_verde: 'cedula',
  cedula_verde: 'cedula',
};

function normalizarTipoDoc(tipo: string): string {
  return TIPO_DOC_ALIASES[tipo] || tipo;
}

// Función para validar documentación completa
async function validarDocumentacionCompleta(
  choferId?: string,
  camionId?: string,
  acopladoId?: string
): Promise<{ valida: boolean; faltantes: number; vencidos: number; rechazados: number; pendientes: number; provisorios: any[] }> {
  try {
    // Recopilar IDs de entidades
    const entidadIds: string[] = [];
    const entidadesPorId: Record<string, string> = {}; // id -> tipo
    
    if (choferId) {
      entidadIds.push(choferId);
      entidadesPorId[choferId] = 'chofer';
    }
    if (camionId) {
      entidadIds.push(camionId);
      entidadesPorId[camionId] = 'camion';
    }
    if (acopladoId) {
      entidadIds.push(acopladoId);
      entidadesPorId[acopladoId] = 'acoplado';
    }

    if (entidadIds.length === 0) {
      return { valida: false, faltantes: 0, vencidos: 0, rechazados: 0, pendientes: 0, provisorios: [] };
    }

    // Consultar documentos vía API (RLS con get_visible_*_ids permite cross-company)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No hay sesión activa para validar documentación');
      return { valida: false, faltantes: 0, vencidos: 0, rechazados: 0, pendientes: 0, provisorios: [] };
    }

    const params = new URLSearchParams();
    if (choferId) params.set('chofer_id', choferId);
    if (camionId) params.set('camion_id', camionId);
    if (acopladoId) params.set('acoplado_id', acopladoId);

    const response = await fetch(`/api/control-acceso/documentos-detalle?${params}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      console.error('❌ Error al cargar documentos para validación:', response.status);
      return { valida: false, faltantes: 0, vencidos: 0, rechazados: 0, pendientes: 0, provisorios: [] };
    }

    const json = await response.json();
    const documentos = json.data?.documentos || [];

    console.log('📋 Documentos cargados para validación:', documentos.length);

    // Calcular estado de cada documento
    let vencidos = 0;
    let rechazados = 0;
    let pendientes = 0;
    const provisorios: any[] = [];

    documentos.forEach((doc: any) => {
      if (doc.estado_vigencia === 'rechazado') {
        rechazados++;
      } else if (doc.estado_vigencia === 'pendiente_validacion') {
        pendientes++;
      } else if (doc.estado_vigencia === 'aprobado_provisorio') {
        provisorios.push(doc);
        // Aprobado provisoriamente — NO bloquea, permite operar
      } else if (doc.fecha_vencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vto = new Date(doc.fecha_vencimiento);
        vto.setHours(0, 0, 0, 0);
        const dias = Math.floor((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (dias < 0) vencidos++;
      }
    });

    // Calcular documentos faltantes
    let faltantes = 0;
    Object.entries(entidadesPorId).forEach(([entidadId, tipoEntidad]) => {
      const requeridos = DOCS_REQUERIDOS[tipoEntidad] || [];
      const docsEntidad = documentos.filter((d: any) => d.entidad_id === entidadId) || [];
      const tiposPresentes = docsEntidad.map((d: any) => normalizarTipoDoc(d.tipo_documento));
      
      requeridos.forEach(tipoReq => {
        if (!tiposPresentes.includes(tipoReq)) {
          faltantes++;
        }
      });
    });

    const valida = faltantes === 0 && vencidos === 0 && rechazados === 0 && pendientes === 0;

    console.log('✅ Resultado validación:', { valida, faltantes, vencidos, rechazados, pendientes, provisorios: provisorios.length });

    return { valida, faltantes, vencidos, rechazados, pendientes, provisorios };
  } catch (error) {
    console.error('❌ Error en validarDocumentacionCompleta:', error);
    return { valida: false, faltantes: 0, vencidos: 0, rechazados: 0, pendientes: 0, provisorios: [] };
  }
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
  const { empresaId, cuitEmpresa, user } = useUserRole();
  
  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDocumentacion, setShowDocumentacion] = useState(false);
  const [historial, setHistorial] = useState<RegistroAcceso[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Incidencia modal state
  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false);
  const [incidenciaTipo, setIncidenciaTipo] = useState('documentacion_faltante');
  const [incidenciaDesc, setIncidenciaDesc] = useState('');
  const [incidenciaSeveridad, setIncidenciaSeveridad] = useState('media');
  const [incidenciaLoading, setIncidenciaLoading] = useState(false);

  // Docs provisorios info
  const [docsProvisorioBanner, setDocsProvisorioBanner] = useState<any[]>([]);

  // Remito preview state
  const [remitoUrl, setRemitoUrl] = useState<string | null>(null);
  const [remitoValidado, setRemitoValidado] = useState(false);
  const [loadingRemito, setLoadingRemito] = useState(false);

  // Cargar remito cuando el viaje está en estado cargado (para validar antes de egreso)
  useEffect(() => {
    if (!viaje) {
      setRemitoUrl(null);
      setRemitoValidado(false);
      return;
    }
    if (viaje.estado_unidad === 'cargado' && viaje.tipo_operacion === 'envio') {
      const fetchRemito = async () => {
        setLoadingRemito(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const res = await fetch(`/api/viajes/${viaje.id}/remito`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.found && json.url) {
              setRemitoUrl(json.url);
            }
          }
        } catch (err) {
          console.warn('⚠️ [control-acceso] Error cargando remito:', err);
        } finally {
          setLoadingRemito(false);
        }
      };
      fetchRemito();
    }
  }, [viaje?.id, viaje?.estado_unidad]);

  // Cargar historial de accesos al montar el componente
  useEffect(() => {
    cargarHistorial();
    // Recargar cada 30 segundos
    const interval = setInterval(cargarHistorial, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  const cargarHistorial = async () => {
    setLoadingHistorial(true);
    try {
      // Sin empresa determinada, no mostrar nada
      if (!empresaId) {
        setHistorial([]);
        return;
      }

      // Cargar registros de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Paso 1: obtener todos los user_ids de MI empresa
      // Solo mostrar registros creados por usuarios de esta misma planta
      const { data: companyUsers } = await supabase
        .from('usuarios_empresa')
        .select('user_id')
        .eq('empresa_id', empresaId)
        .eq('activo', true);

      const myCompanyUserIds = (companyUsers || []).map((u: any) => u.user_id).filter(Boolean);
      if (myCompanyUserIds.length === 0) {
        setHistorial([]);
        return;
      }

      // Paso 2: registros_acceso creados por usuarios de MI empresa, solo hoy
      const { data: registros, error } = await supabase
        .from('registros_acceso')
        .select('id, viaje_id, tipo, timestamp')
        .in('usuario_id', myCompanyUserIds)
        .gte('timestamp', hoy.toISOString())
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error cargando historial:', error);
        return;
      }

      if (!registros || registros.length === 0) {
        setHistorial([]);
        return;
      }

      // Obtener viajes relacionados
      const viajeIds = [...new Set(registros.map(r => r.viaje_id).filter(Boolean))];
      const { data: viajes } = viajeIds.length > 0
        ? await supabase.from('viajes_despacho').select('id, numero_viaje, chofer_id, camion_id').in('id', viajeIds)
        : { data: [] };

      const viajesMap = new Map((viajes || []).map((v: any) => [v.id, v]));

      // Obtener choferes y camiones
      const choferIds = [...new Set((viajes || []).map((v: any) => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set((viajes || []).map((v: any) => v.camion_id).filter(Boolean))];

      const [choferesRes, camionesRes] = await Promise.all([
        choferIds.length > 0
          ? supabase.from('choferes').select('id, nombre, apellido').in('id', choferIds)
          : Promise.resolve({ data: [] }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente').in('id', camionIds)
          : Promise.resolve({ data: [] })
      ]);

      const choferesMap = new Map((choferesRes.data || []).map((c: any) => [c.id, c]));
      const camionesMap = new Map((camionesRes.data || []).map((c: any) => [c.id, c]));

      const historialFormateado: RegistroAcceso[] = registros.map((reg: any) => {
        const viaje = viajesMap.get(reg.viaje_id);
        const chofer = viaje?.chofer_id ? choferesMap.get(viaje.chofer_id) : null;
        const camion = viaje?.camion_id ? camionesMap.get(viaje.camion_id) : null;

        return {
          id: reg.id,
          viaje_id: reg.viaje_id,
          tipo: reg.tipo,
          timestamp: reg.timestamp,
          numero_viaje: viaje?.numero_viaje?.toString() || 'N/A',
          chofer_nombre: chofer ? `${chofer.nombre || ''} ${chofer.apellido || ''}`.trim() : 'N/A',
          camion_patente: camion?.patente || 'N/A'
        };
      });

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
        .select('id, pedido_id, origen, destino, origen_id, destino_id, created_by, estado')
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

      // Paso 2: Obtener ubicaciones para nombres de origen/destino
      // Usar origen_id/destino_id (UUIDs) si existen, fallback a origen/destino (texto)
      const origenRef = despacho.origen_id || despacho.origen;
      const destinoRef = despacho.destino_id || despacho.destino;
      const ubicacionIds = [origenRef, destinoRef].filter(Boolean);

      const { data: ubicaciones, error: ubicacionesError } = ubicacionIds.length > 0
        ? await supabase
            .from('ubicaciones')
            .select('id, nombre, tipo')
            .in('id', ubicacionIds)
        : { data: [], error: null };

      if (ubicacionesError) {
        console.warn('⚠️ [control-acceso] Error cargando ubicaciones:', ubicacionesError);
      }

      // Paso 2.5: Verificar que el despacho pertenece a la empresa del usuario
      // La relación canónica es: empresa.cuit == ubicaciones.cuit (origen o destino)
      let esOrigen = false;
      let esDestino = false;

      if (ubicacionIds.length > 0) {
        // Buscar ubicaciones cuyo CUIT o empresa_id coincidan con la empresa del usuario
        const filtro = cuitEmpresa
          ? `empresa_id.eq.${empresaId},cuit.eq.${cuitEmpresa}`
          : `empresa_id.eq.${empresaId}`;

        const { data: misUbics } = await supabase
          .from('ubicaciones')
          .select('id')
          .in('id', ubicacionIds)
          .or(filtro);

        const misUbicIds = new Set((misUbics || []).map((u: any) => u.id));
        esOrigen = misUbicIds.has(origenRef);
        esDestino = misUbicIds.has(destinoRef);
      }

      if (!esOrigen && !esDestino) {
        // Fallback: verificar por created_by (compatibilidad)
        const { data: usuarioDespacho } = await supabase
          .from('usuarios_empresa')
          .select('empresa_id')
          .eq('user_id', despacho.created_by)
          .single();

        if (!usuarioDespacho || usuarioDespacho.empresa_id !== empresaId) {
          console.error('❌ [control-acceso] Despacho no pertenece a esta empresa (ni origen ni destino)');
          setMessage('❌ Este despacho no pertenece a su empresa');
          setViaje(null);
          setLoading(false);
          return;
        }
      }

      const origenUbicacion = ubicaciones?.find(u => u.id === origenRef);
      const destinoUbicacion = ubicaciones?.find(u => u.id === destinoRef);

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


      // 🔥 Auto-detectar tipo de operación basado en empresa del usuario
      const tipoOp: 'envio' | 'recepcion' = esDestino && !esOrigen ? 'recepcion' : 'envio';
      console.log(`🏢 Tipo operación detectado: ${tipoOp} (esOrigen=${esOrigen}, esDestino=${esDestino})`);
      const estadoUnidad = viajeData.estado || viajeData.estado_unidad || 'pendiente';

      // Validar documentación real antes de permitir ingreso
      const estadoDocumentacion = await validarDocumentacionCompleta(
        viajeData.chofer_id,
        viajeData.camion_id,
        viajeData.acoplado_id
      );

      console.log('📋 Estado documentación:', estadoDocumentacion);

      const viajeCompleto: ViajeQR = {
        id: viajeData.id,
        numero_viaje: viajeData.numero_viaje?.toString() || despacho.pedido_id,
        qr_code: despacho.pedido_id,
        despacho_id: despacho.id,
        planta_origen_id: despacho.origen,
        planta_destino_id: despacho.destino,
        chofer_id: viajeData.chofer_id || undefined,
        camion_id: viajeData.camion_id || undefined,
        acoplado_id: viajeData.acoplado_id || undefined,
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
        documentacion_validada: estadoDocumentacion.valida,
        docs_chofer: {
          licencia_valida: true
        },
        docs_camion: {
          vtv_valida: true,
          seguro_valido: true
        }
      };

      setViaje(viajeCompleto);
      setDocsProvisorioBanner(estadoDocumentacion.provisorios);
      
      let mensajeDocumentacion = '';
      if (!estadoDocumentacion.valida) {
        const problemas = [];
        if (estadoDocumentacion.faltantes > 0) problemas.push(`${estadoDocumentacion.faltantes} faltante(s)`);
        if (estadoDocumentacion.vencidos > 0) problemas.push(`${estadoDocumentacion.vencidos} vencido(s)`);
        if (estadoDocumentacion.rechazados > 0) problemas.push(`${estadoDocumentacion.rechazados} rechazado(s)`);
        if (estadoDocumentacion.pendientes > 0) problemas.push(`${estadoDocumentacion.pendientes} pendiente(s)`);
        mensajeDocumentacion = ` - ⚠️ Documentación: ${problemas.join(', ')}`;
      }
      
      setMessage(
        `📋 ${tipoOp === 'envio' ? 'Envío' : 'Recepción'} ${viajeCompleto.numero_viaje} encontrado - Estado: ${getLabelEstadoUnidad(estadoUnidad as EstadoUnidadViajeType)}${mensajeDocumentacion}`
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
        viaje.tipo_operacion === 'envio' ? 'ingresado_origen' : 'ingresado_destino';
      

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
          estado_unidad: autoCompletado ? 'completado' : nuevoEstado,
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
    
    // Pre-fill description with doc problems if available
    if (!viaje.documentacion_validada) {
      setIncidenciaTipo('documentacion_faltante');
      setIncidenciaDesc('Documentación incompleta detectada al escanear QR');
    } else {
      setIncidenciaTipo('otro');
      setIncidenciaDesc('');
    }
    setIncidenciaSeveridad('media');
    setShowIncidenciaModal(true);
  };

  const enviarIncidencia = async () => {
    if (!viaje || !incidenciaDesc.trim()) return;
    setIncidenciaLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const body: any = {
        viaje_id: viaje.id,
        tipo_incidencia: incidenciaTipo,
        descripcion: incidenciaDesc.trim(),
        severidad: incidenciaSeveridad,
      };

      // Si es incidencia de documentación, adjuntar problemas de docs
      if (incidenciaTipo === 'documentacion_faltante') {
        const docsAfectados: any[] = [];
        // Intentar obtener detalles de los docs problemáticos
        try {
          const params = new URLSearchParams();
          if (viaje.chofer_id) params.set('chofer_id', viaje.chofer_id);
          if (viaje.camion_id) params.set('camion_id', viaje.camion_id);
          if (viaje.acoplado_id) params.set('acoplado_id', viaje.acoplado_id);

          const res = await fetch(`/api/control-acceso/verificar-documentacion?${params}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const data = json.data;
            if (data?.problemas) {
              data.problemas.forEach((p: any) => {
                docsAfectados.push({
                  tipo: p.detalle || 'desconocido',
                  entidad_tipo: p.recurso,
                  entidad_id: p.recurso === 'chofer' ? viaje.chofer_id : p.recurso === 'camion' ? viaje.camion_id : viaje.acoplado_id,
                  problema: p.problema === 'documentacion_bloqueada' ? 'faltante' : 'por_vencer',
                });
              });
            }
          }
        } catch (e) { /* best effort */ }

        if (docsAfectados.length > 0) {
          body.documentos_afectados = docsAfectados;
        }
      }

      const res = await fetch('/api/incidencias', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        setMessage(`✅ Incidencia creada para viaje ${viaje.numero_viaje}`);
        setShowIncidenciaModal(false);
        setIncidenciaDesc('');
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[Incidencia] Error response:', err);
        setMessage(`❌ Error: ${err.error || 'No se pudo crear la incidencia'}${err.hint ? ` (${err.hint})` : ''}`);
      }
    } catch (error: any) {
      console.error('[Incidencia] Catch error:', error);
      setMessage('❌ Error al crear incidencia');
    } finally {
      setIncidenciaLoading(false);
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
                  placeholder="Ingrese N° despacho o viaje (ej: DSP-20260221-001)"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-slate-700 text-slate-100 placeholder-slate-400 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && escanearQR()}
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

                  {/* Banner documentación aprobada provisoriamente */}
                  {docsProvisorioBanner && docsProvisorioBanner.length > 0 && (
                    <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-300 font-semibold text-sm">Documentación aprobada provisoriamente</p>
                          <p className="text-amber-200/70 text-xs mt-1">
                            {docsProvisorioBanner.length} documento(s) con aprobación provisoria (válida 24h). Pendiente revalidación Admin Nodexia.
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {docsProvisorioBanner.map((doc: any, idx: number) => (
                              <li key={idx} className="text-amber-200/60 text-xs">
                                • {doc.tipo_documento} — aprobado por {doc.aprobado_provisorio_por || 'Coordinador'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banners contextuales y remito */}
                <EstadoBanners
                  estadoUnidad={viaje.estado_unidad}
                  tipoOperacion={viaje.tipo_operacion}
                  documentacionValidada={viaje.documentacion_validada}
                  remitoUrl={remitoUrl}
                  remitoValidado={remitoValidado}
                  loadingRemito={loadingRemito}
                  onValidarRemito={() => setRemitoValidado(true)}
                />

                {/* Acciones */}
                <div className="border-t border-slate-700 pt-6">
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Acciones Disponibles</p>
                  
                  {/* 🔥 Banner informativo para recepciones: cuando el camión aún no llegó a destino */}
                  {viaje.tipo_operacion === 'recepcion' && !['en_transito_destino', 'ingresado_destino', 'llamado_descarga', 'descargando', 'descargado', 'egreso_destino', 'completado'].includes(viaje.estado_unidad) && (
                    <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <TruckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-300 font-semibold text-sm">Camión en camino</p>
                          <p className="text-blue-200/70 text-xs mt-1">
                            Este viaje aún está en etapa de <strong>{viaje.estado_unidad === 'en_transito_origen' ? 'tránsito a planta origen' 
                              : viaje.estado_unidad === 'ingresado_origen' ? 'ingresado en planta origen'
                              : viaje.estado_unidad === 'llamado_carga' ? 'llamado a carga en origen'
                              : viaje.estado_unidad === 'cargando' ? 'cargando en planta origen'
                              : viaje.estado_unidad === 'cargado' ? 'cargado, pendiente egreso de origen'
                              : viaje.estado_unidad === 'egreso_origen' ? 'egreso de planta origen'
                              : viaje.estado_unidad}</strong>.
                            Podrás confirmar el ingreso a destino cuando el camión esté en tránsito hacia tu planta.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">{/* Confirmar Ingreso - Solo si el camión llegó Y la documentación está validada */}
                    {((viaje.tipo_operacion === 'envio' && ['en_transito_origen', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer'].includes(viaje.estado_unidad)) ||
                      (viaje.tipo_operacion === 'recepcion' && ['en_transito_destino'].includes(viaje.estado_unidad))) && (
                      <button
                        onClick={confirmarIngreso}
                        disabled={loading || !viaje.documentacion_validada}
                        className="flex-1 bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                        title={!viaje.documentacion_validada ? 'No se puede confirmar ingreso: Documentación incompleta o inválida' : ''}
                      >
                        <CheckCircleIcon className="h-6 w-6" />
                        <span>{viaje.tipo_operacion === 'envio' ? 'Confirmar Ingreso a Planta' : 'Confirmar Ingreso a Destino'}</span>
                      </button>
                    )}
                    
                    {/* Mensaje de advertencia si documentación no está validada */}
                    {((viaje.tipo_operacion === 'envio' && ['en_transito_origen', 'transporte_asignado', 'camion_asignado', 'confirmado_chofer'].includes(viaje.estado_unidad)) ||
                      (viaje.tipo_operacion === 'recepcion' && ['en_transito_destino'].includes(viaje.estado_unidad))) && 
                      !viaje.documentacion_validada && (
                      <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                          <p className="text-red-400 text-sm font-medium">
                            No se puede confirmar ingreso: La documentación está incompleta, vencida o pendiente de validación. Revisar detalle arriba.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Asignar Playa de Espera - Solo en origen después del ingreso */}
                    {viaje.tipo_operacion === 'envio' && viaje.estado_unidad === 'ingresado_origen' && (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          id="playa-input"
                          type="text"
                          defaultValue="1"
                          placeholder="N° playa"
                          className="w-20 px-3 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                        <button
                          onClick={() => {
                            const playa = (document.getElementById('playa-input') as HTMLInputElement)?.value || '1';
                            actualizarEstadoUnidad({
                              viaje_id: viaje.id,
                              nuevo_estado: 'ingresado_origen',
                              observaciones: `Asignado a playa ${playa}`,
                            }).then(result => {
                              if (result.success) {
                                setMessage(`✅ Camión asignado a playa ${playa}`);
                                setViaje({...viaje, estado_unidad: 'ingresado_origen'});
                              } else {
                                setMessage(`❌ ${result.error}`);
                              }
                            });
                          }}
                          disabled={loading}
                          className="flex-1 bg-cyan-600 text-white px-6 py-4 rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl font-semibold"
                        >
                          <TruckIcon className="h-6 w-6" />
                          <span>Asignar Playa de Espera</span>
                        </button>
                      </div>
                    )}

                    {/* Validar Documentación - Solo en origen después de carga completada */}
                    {viaje.tipo_operacion === 'envio' && (viaje.estado_unidad === 'cargado' || viaje.estado_unidad === 'egreso_origen') && (
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

                    {/* Confirmar Egreso - Solo si documentación y remito están validados, o es en destino */}
                    {((viaje.tipo_operacion === 'envio' && (viaje.estado_unidad === 'cargado' || viaje.estado_unidad === 'egreso_origen') && viaje.documentacion_validada && remitoValidado) ||
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
          <HistorialAccesos
            historial={historial}
            loadingHistorial={loadingHistorial}
            onActualizar={cargarHistorial}
          />

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
          choferId={viaje.chofer_id}
          camionId={viaje.camion_id}
          acopladoId={viaje.acoplado_id}
          onClose={handleCloseDocumentacion}
        />
      )}

      {/* Modal de Creación de Incidencia */}
      {showIncidenciaModal && viaje && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
                  Crear Incidencia
                </h3>
                <button onClick={() => setShowIncidenciaModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              <div className="text-sm text-slate-400 mb-4">
                Viaje: <span className="text-white font-medium">{viaje.numero_viaje}</span>
              </div>

              {/* Tipo */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 block mb-1">Tipo de incidencia</label>
                <select
                  value={incidenciaTipo}
                  onChange={e => setIncidenciaTipo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="documentacion_faltante">📄 Documentación Faltante</option>
                  <option value="retraso">⏰ Retraso</option>
                  <option value="averia_camion">🔧 Avería Camión</option>
                  <option value="producto_danado">📦 Producto Dañado</option>
                  <option value="problema_carga">⚠️ Problema de Carga</option>
                  <option value="problema_mecanico">🛠️ Problema Mecánico</option>
                  <option value="accidente">🚨 Accidente</option>
                  <option value="otro">❓ Otro</option>
                </select>
              </div>

              {/* Severidad */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 block mb-1">Severidad</label>
                <div className="flex gap-2">
                  {[
                    { value: 'baja', label: '🟢 Baja', color: 'border-green-500 bg-green-500/20' },
                    { value: 'media', label: '🟡 Media', color: 'border-yellow-500 bg-yellow-500/20' },
                    { value: 'alta', label: '🟠 Alta', color: 'border-orange-500 bg-orange-500/20' },
                    { value: 'critica', label: '🔴 Crítica', color: 'border-red-500 bg-red-500/20' },
                  ].map(s => (
                    <button
                      key={s.value}
                      onClick={() => setIncidenciaSeveridad(s.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        incidenciaSeveridad === s.value ? `${s.color} text-white` : 'border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 block mb-1">Descripción</label>
                <textarea
                  value={incidenciaDesc}
                  onChange={e => setIncidenciaDesc(e.target.value)}
                  placeholder="Describe la incidencia con detalle..."
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowIncidenciaModal(false)}
                  className="flex-1 bg-slate-700 text-slate-300 px-4 py-3 rounded-xl hover:bg-slate-600 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarIncidencia}
                  disabled={incidenciaLoading || !incidenciaDesc.trim()}
                  className="flex-1 bg-amber-600 text-white px-4 py-3 rounded-xl hover:bg-amber-700 disabled:opacity-50 font-medium transition-all"
                >
                  {incidenciaLoading ? 'Creando...' : '⚠️ Crear Incidencia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}