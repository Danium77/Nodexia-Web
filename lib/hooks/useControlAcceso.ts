import { useState, useEffect } from 'react';
import { useUserRole } from '../contexts/UserRoleContext';
import { supabase } from '../supabaseClient';
import { actualizarEstadoUnidad } from '../api/estado-unidad';
import type { EstadoUnidadViaje as EstadoUnidadViajeType } from '../types';
import { getLabelEstadoUnidad } from '../helpers/estados-helpers';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ViajeQR {
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
  tipo_operacion: 'envio' | 'recepcion';
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

export interface RegistroAcceso {
  id: string;
  viaje_id: string;
  tipo: 'ingreso' | 'egreso';
  timestamp: string;
  numero_viaje: string;
  chofer_nombre: string;
  camion_patente: string;
}

// ─── Module-level helpers ───────────────────────────────────────────────

const DOCS_REQUERIDOS: Record<string, string[]> = {
  chofer: ['licencia_conducir', 'art_clausula_no_repeticion'],
  camion: ['seguro', 'rto', 'cedula'],
  acoplado: ['seguro', 'rto', 'cedula'],
};

const TIPO_DOC_ALIASES: Record<string, string> = {
  vtv: 'rto',
  tarjeta_verde: 'cedula',
  cedula_verde: 'cedula',
};

function normalizarTipoDoc(tipo: string): string {
  return TIPO_DOC_ALIASES[tipo] || tipo;
}

async function validarDocumentacionCompleta(
  choferId?: string,
  camionId?: string,
  acopladoId?: string
): Promise<{ valida: boolean; faltantes: number; vencidos: number; rechazados: number; pendientes: number; provisorios: any[] }> {
  try {
    const entidadIds: string[] = [];
    const entidadesPorId: Record<string, string> = {};

    if (choferId) { entidadIds.push(choferId); entidadesPorId[choferId] = 'chofer'; }
    if (camionId) { entidadIds.push(camionId); entidadesPorId[camionId] = 'camion'; }
    if (acopladoId) { entidadIds.push(acopladoId); entidadesPorId[acopladoId] = 'acoplado'; }

    if (entidadIds.length === 0) {
      return { valida: false, faltantes: 0, vencidos: 0, rechazados: 0, pendientes: 0, provisorios: [] };
    }

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
      } else if (doc.fecha_vencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vto = new Date(doc.fecha_vencimiento);
        vto.setHours(0, 0, 0, 0);
        const dias = Math.floor((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (dias < 0) vencidos++;
      }
    });

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

// ─── Hook ───────────────────────────────────────────────────────────────

export default function useControlAcceso() {
  const { empresaId, cuitEmpresa, user } = useUserRole();

  const [qrCode, setQrCode] = useState('');
  const [viaje, setViaje] = useState<ViajeQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDocumentacion, setShowDocumentacion] = useState(false);
  const [historial, setHistorial] = useState<RegistroAcceso[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Incidencia modal
  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false);
  const [incidenciaTipo, setIncidenciaTipo] = useState('documentacion_faltante');
  const [incidenciaDesc, setIncidenciaDesc] = useState('');
  const [incidenciaSeveridad, setIncidenciaSeveridad] = useState('media');
  const [incidenciaLoading, setIncidenciaLoading] = useState(false);

  // Docs provisorios
  const [docsProvisorioBanner, setDocsProvisorioBanner] = useState<any[]>([]);

  // Remito preview
  const [remitoUrl, setRemitoUrl] = useState<string | null>(null);
  const [remitoValidado, setRemitoValidado] = useState(false);
  const [loadingRemito, setLoadingRemito] = useState(false);

  // ─── Effects ──────────────────────────────────────────────────────────

  // Load remito when viaje is in estado cargado (for validation before egreso)
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

  // Load access history on mount + auto-refresh
  useEffect(() => {
    cargarHistorial();
    const interval = setInterval(cargarHistorial, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  // ─── Data Loading ─────────────────────────────────────────────────────

  const cargarHistorial = async () => {
    setLoadingHistorial(true);
    try {
      if (!empresaId) {
        setHistorial([]);
        return;
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

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

      const viajeIds = [...new Set(registros.map(r => r.viaje_id).filter(Boolean))];
      const { data: viajes } = viajeIds.length > 0
        ? await supabase.from('viajes_despacho').select('id, numero_viaje, chofer_id, camion_id').in('id', viajeIds)
        : { data: [] };

      const viajesMap = new Map((viajes || []).map((v: any) => [v.id, v]));

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
        const viajeReg = viajesMap.get(reg.viaje_id);
        const chofer = viajeReg?.chofer_id ? choferesMap.get(viajeReg.chofer_id) : null;
        const camion = viajeReg?.camion_id ? camionesMap.get(viajeReg.camion_id) : null;

        return {
          id: reg.id,
          viaje_id: reg.viaje_id,
          tipo: reg.tipo,
          timestamp: reg.timestamp,
          numero_viaje: viajeReg?.numero_viaje?.toString() || 'N/A',
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

  // ─── Handlers ─────────────────────────────────────────────────────────

  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const codigoBusqueda = qrCode.trim().replace(/^(QR-|DSP-)/, '');

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

      // Get ubicaciones
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

      // Verify despacho belongs to user's company
      let esOrigen = false;
      let esDestino = false;

      if (ubicacionIds.length > 0) {
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
        const { data: usuarioDespacho } = await supabase
          .from('usuarios_empresa')
          .select('empresa_id')
          .eq('user_id', despacho.created_by)
          .maybeSingle();

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

      // Get viaje
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

      // Get chofer and camion
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

      const tipoOp: 'envio' | 'recepcion' = esDestino && !esOrigen ? 'recepcion' : 'envio';
      console.log(`🏢 Tipo operación detectado: ${tipoOp} (esOrigen=${esOrigen}, esDestino=${esDestino})`);
      const estadoUnidad = viajeData.estado || viajeData.estado_unidad || 'pendiente';

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
        } : { nombre: 'Sin asignar', dni: 'N/A', telefono: 'N/A' },
        camion: camion ? {
          patente: camion.patente,
          marca: `${camion.marca} ${camion.modelo || ''}`.trim(),
          año: camion.año
        } : { patente: 'Sin asignar', marca: 'N/A', año: null },
        documentacion_validada: estadoDocumentacion.valida,
        docs_chofer: { licencia_valida: true },
        docs_camion: { vtv_valida: true, seguro_valido: true }
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

  const confirmarIngreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
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
      }

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
        setViaje({ ...viaje, estado_unidad: nuevoEstado });
        cargarHistorial();
        setTimeout(() => { setViaje(null); setQrCode(''); setMessage(''); }, 3000);
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

  const confirmarEgreso = async () => {
    if (!viaje) return;

    setLoading(true);
    try {
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
      }

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

        if (autoCompletado) {
          setMessage(`✅ Egreso confirmado y viaje completado automáticamente para ${viaje.numero_viaje} a las ${ahora}`);
        } else {
          setMessage(`✅ Egreso confirmado para ${viaje.numero_viaje} a las ${ahora}`);
        }

        setViaje({ ...viaje, estado_unidad: autoCompletado ? 'completado' : nuevoEstado });
        cargarHistorial();
        setTimeout(() => { setViaje(null); setQrCode(''); setMessage(''); }, 3000);
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
        setViaje({ ...viaje, estado_unidad: 'llamado_descarga' });
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

      if (incidenciaTipo === 'documentacion_faltante') {
        const docsAfectados: any[] = [];
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

  const handleValidarDocumentacion = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('viajes_despacho')
        .update({ documentacion_completa: true })
        .eq('id', viaje.id);

      if (error) throw error;
      setMessage(`✅ Documentación validada`);
      setViaje({ ...viaje, documentacion_validada: true });
    } catch (error: any) {
      setMessage('❌ Error al validar documentación. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarPlaya = async (playa: string) => {
    if (!viaje) return;
    const result = await actualizarEstadoUnidad({
      viaje_id: viaje.id,
      nuevo_estado: 'ingresado_origen',
      observaciones: `Asignado a playa ${playa}`,
    });
    if (result.success) {
      setMessage(`✅ Camión asignado a playa ${playa}`);
      setViaje({ ...viaje, estado_unidad: 'ingresado_origen' });
    } else {
      setMessage(`❌ ${result.error}`);
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

  // ─── Return ───────────────────────────────────────────────────────────

  return {
    // State
    qrCode,
    setQrCode,
    viaje,
    loading,
    message,
    showDocumentacion,
    setShowDocumentacion,
    historial,
    loadingHistorial,

    // Incidencia modal
    showIncidenciaModal,
    setShowIncidenciaModal,
    incidenciaTipo,
    setIncidenciaTipo,
    incidenciaDesc,
    setIncidenciaDesc,
    incidenciaSeveridad,
    setIncidenciaSeveridad,
    incidenciaLoading,

    // Docs provisorios
    docsProvisorioBanner,

    // Remito
    remitoUrl,
    remitoValidado,
    setRemitoValidado,
    loadingRemito,

    // Actions
    escanearQR,
    confirmarIngreso,
    confirmarEgreso,
    llamarADescarga,
    crearIncidencia,
    enviarIncidencia,
    handleValidarDocumentacion,
    handleAsignarPlaya,
    resetForm,
    handleCloseDocumentacion,
    cargarHistorial,
  };
}
