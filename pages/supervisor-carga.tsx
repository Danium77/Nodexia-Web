// pages/supervisor-carga.tsx
// Interfaz para Supervisor de Carga - Gestión de operaciones de carga en planta origen

import { useState, useEffect, useCallback, useRef } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  QrCodeIcon,
  TruckIcon,
  ScaleIcon,
  PhoneIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { actualizarEstadoUnidad } from '../lib/api/estado-unidad';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import { supabase } from '../lib/supabaseClient';
import type { EstadoUnidadViaje } from '../lib/types';

// ─── Tipos ──────────────────────────────────────────────────────
interface ViajeParaCarga {
  id: string;
  numero_viaje: string;
  estado: string;
  estado_carga: string;
  origen: string;
  destino: string;
  chofer: { nombre: string; dni: string };
  camion: { patente: string; marca: string };
  tipo_operacion: 'carga' | 'descarga';
}

// ─── Labels de estado para UI ───────────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  ingresado_origen: '🏭 En Planta',
  en_playa_origen: '⏸️ En Playa',
  llamado_carga: '📢 Llamado',
  cargando: '⚙️ Cargando',
  cargado: '📦 Cargado',
};

const ESTADO_COLORS: Record<string, string> = {
  ingresado_origen: 'bg-blue-900/30 text-blue-400 border-blue-800',
  en_playa_origen: 'bg-cyan-900/30 text-cyan-400 border-cyan-800',
  llamado_carga: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  cargando: 'bg-orange-900/30 text-orange-400 border-orange-800',
  cargado: 'bg-green-900/30 text-green-400 border-green-800',
};

// Estados que interesan al supervisor: carga en origen + descarga en destino
const ESTADOS_CARGA = ['ingresado_origen', 'llamado_carga', 'cargando', 'cargado'];
const ESTADOS_DESCARGA = ['ingresado_destino', 'llamado_descarga', 'descargando', 'descargado'];
const ESTADOS_SUPERVISOR = [...ESTADOS_CARGA, ...ESTADOS_DESCARGA];

type TabType = 'scanner' | 'planta' | 'en_proceso' | 'completados';

// ─── Componente Principal ───────────────────────────────────────
export default function SupervisorCarga() {
  const { empresaId, user } = useUserRole();

  // Estado general
  const [activeTab, setActiveTab] = useState<TabType>('planta');
  const [viajes, setViajes] = useState<ViajeParaCarga[]>([]);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Scanner QR
  const [qrCode, setQrCode] = useState('');
  const [viajeEscaneado, setViajeEscaneado] = useState<ViajeParaCarga | null>(null);
  const [loadingScanner, setLoadingScanner] = useState(false);

  // Foto remito (requerida para finalizar carga)
  const [remitoFile, setRemitoFile] = useState<File | null>(null);
  const [remitoPreview, setRemitoPreview] = useState<string | null>(null);
  const [remitoUploaded, setRemitoUploaded] = useState(false);
  const [uploadingRemito, setUploadingRemito] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Mostrar notificación temporal ─────────────────────────────
  const showMessage = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  }, []);

  // ─── Cargar viajes relevantes ──────────────────────────────────
  const cargarViajes = useCallback(async () => {
    if (!empresaId) return;

    setLoadingViajes(true);
    try {
      const { data, error } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          estado,
          chofer_id,
          camion_id,
          despacho_id,
          despachos (
            id,
            pedido_id,
            origen,
            destino,
            origen_empresa_id,
            destino_empresa_id
          ),
          estado_carga_viaje (
            estado_carga
          )
        `)
        .in('estado', ESTADOS_SUPERVISOR)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [supervisor-carga] Error cargando viajes:', error);
        return;
      }

      console.log('📦 [supervisor-carga] Viajes crudos (antes de filtro empresa):', data?.length || 0, data);

      // Filtrar: carga (origen) + descarga (destino) según empresa del supervisor
      const viajesFiltrados = (data || []).filter((v: any) => {
        const despacho = Array.isArray(v.despachos) ? v.despachos[0] : v.despachos;
        const esCarga = despacho?.origen_empresa_id === empresaId;
        const esDescarga = despacho?.destino_empresa_id === empresaId;
        return esCarga || esDescarga;
      });

      console.log('✅ [supervisor-carga] Viajes filtrados:', viajesFiltrados.length);

      // Traer choferes y camiones por ID (queries directas para esquivar RLS)
      const choferIds = [...new Set(viajesFiltrados.map((v: any) => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set(viajesFiltrados.map((v: any) => v.camion_id).filter(Boolean))];

      let choferesMap: Record<string, any> = {};
      let camionesMap: Record<string, any> = {};

      if (choferIds.length > 0) {
        const { data: choferes } = await supabase
          .from('choferes')
          .select('id, nombre, apellido, dni')
          .in('id', choferIds);
        if (choferes) {
          choferes.forEach((c: any) => { choferesMap[c.id] = c; });
        }
      }

      if (camionIds.length > 0) {
        const { data: camiones } = await supabase
          .from('camiones')
          .select('id, patente, marca, modelo')
          .in('id', camionIds);
        if (camiones) {
          camiones.forEach((c: any) => { camionesMap[c.id] = c; });
        }
      }

      const formateados: ViajeParaCarga[] = viajesFiltrados.map((v: any) => {
        const despacho = Array.isArray(v.despachos) ? v.despachos[0] : v.despachos;
        const carga = Array.isArray(v.estado_carga_viaje) ? v.estado_carga_viaje[0] : v.estado_carga_viaje;
        const chofer = choferesMap[v.chofer_id];
        const camion = camionesMap[v.camion_id];

        // Determinar si es carga (origen) o descarga (destino)
        const esCarga = ESTADOS_CARGA.includes(v.estado);
        const tipo_operacion = esCarga ? 'carga' as const : 'descarga' as const;

        return {
          id: v.id,
          numero_viaje: String(v.numero_viaje),
          estado: v.estado || 'ingresado_origen',
          estado_carga: carga?.estado_carga || 'pendiente',
          origen: despacho?.origen || '-',
          destino: despacho?.destino || '-',
          chofer: chofer
            ? { nombre: `${chofer.nombre} ${chofer.apellido}`, dni: chofer.dni }
            : { nombre: 'Sin asignar', dni: '-' },
          camion: camion
            ? { patente: camion.patente, marca: `${camion.marca} ${camion.modelo || ''}`.trim() }
            : { patente: 'Sin asignar', marca: '-' },
          tipo_operacion,
        };
      });

      setViajes(formateados);
    } catch (err) {
      console.error('❌ [supervisor-carga] Exception:', err);
    } finally {
      setLoadingViajes(false);
    }
  }, [empresaId]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    cargarViajes();
    const interval = setInterval(cargarViajes, 30000);
    return () => clearInterval(interval);
  }, [cargarViajes]);

  // ─── Actualizar estado (centralizado via service layer) ─────
  // cambiarEstadoViaje() sincroniza automáticamente:
  //   viajes_despacho + despachos + estado_unidad_viaje + estado_carga_viaje
  const actualizarEstado = async (
    viajeId: string,
    nuevoEstado: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await actualizarEstadoUnidad({
      viaje_id: viajeId,
      nuevo_estado: nuevoEstado as EstadoUnidadViaje,
    });

    return result;
  };

  // ─── Acciones del Supervisor ───────────────────────────────────

  // Helper: actualizar viajeEscaneado si coincide
  const actualizarEscaneado = useCallback((viajeId: string, nuevoEstado: string, nuevoCarga?: string) => {
    setViajeEscaneado(prev => {
      if (prev && prev.id === viajeId) {
        return { ...prev, estado: nuevoEstado, estado_carga: nuevoCarga || prev.estado_carga };
      }
      return prev;
    });
  }, []);

  // 1. Llamar a Carga (ingresado_origen/en_playa_origen → llamado_carga)
  const llamarACarga = async (viajeId: string) => {
    setLoadingAction(viajeId);
    try {
      console.log('📢 [supervisor-carga] Llamando a carga viaje:', viajeId);
      const result = await actualizarEstado(
        viajeId,
        'llamado_carga',
      );

      if (result.success) {
        showMessage('📢 Vehículo llamado a carga');
        actualizarEscaneado(viajeId, 'llamado_carga', 'llamado_carga');
        await cargarViajes();
      } else {
        console.error('❌ [supervisor-carga] Error llamar a carga:', result.error);
        showMessage(result.error || 'Error al llamar a carga', 'error');
      }
    } catch (err) {
      console.error('❌ [supervisor-carga] Exception:', err);
      showMessage('Error al llamar a carga', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Iniciar Carga (llamado_carga → cargando)
  const iniciarCargaViaje = async (viaje: ViajeParaCarga) => {
    setLoadingAction(viaje.id);
    try {
      console.log('⚙️ [supervisor-carga] Iniciando carga viaje:', viaje.id);
      const result = await actualizarEstado(
        viaje.id,
        'cargando',
      );

      if (result.success) {
        showMessage(`⚙️ Carga iniciada - ${viaje.camion.patente}`);
        actualizarEscaneado(viaje.id, 'cargando', 'cargando');
        await cargarViajes();
      } else {
        console.error('❌ [supervisor-carga] Error iniciar carga:', result.error);
        showMessage(result.error || 'Error al iniciar carga', 'error');
      }
    } catch (err) {
      console.error('❌ [supervisor-carga] Exception:', err);
      showMessage('Error al iniciar carga', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Foto de Remito (requerida para finalizar carga) ─────────
  const handleRemitoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      showMessage('La imagen es demasiado grande. Máximo 10MB', 'error');
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      showMessage('Solo se permiten archivos de imagen (JPG, PNG, etc.)', 'error');
      return;
    }

    setRemitoFile(selectedFile);
    setRemitoUploaded(false);

    const reader = new FileReader();
    reader.onload = (ev) => setRemitoPreview(ev.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const limpiarRemito = () => {
    setRemitoFile(null);
    setRemitoPreview(null);
    setRemitoUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const subirFotoRemito = async (viajeId: string): Promise<string | null> => {
    if (!remitoFile) return null;

    setUploadingRemito(true);
    try {
      // Usar API route server-side para bypass RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showMessage('Sesión expirada. Ingrese nuevamente.', 'error');
        return null;
      }

      const formData = new FormData();
      formData.append('file', remitoFile);
      formData.append('viaje_id', viajeId);

      const response = await fetch('/api/upload-remito', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ [supervisor-carga] Error subiendo foto:', result.error);
        showMessage('Error subiendo la foto del remito', 'error');
        return null;
      }

      setRemitoUploaded(true);
      return result.url;
    } catch (err) {
      console.error('❌ [supervisor-carga] Exception subiendo remito:', err);
      showMessage('Error al subir la foto', 'error');
      return null;
    } finally {
      setUploadingRemito(false);
    }
  };

  // 3. Finalizar Carga (cargando → cargado)
  //    estado_unidad → cargado
  //    estado_carga  → cargado
  //    Control de Acceso luego hace: cargado → egreso_origen
  const finalizarCarga = async (viajeId: string) => {
    setLoadingAction(viajeId);
    try {
      // Subir foto si no se subió aún
      let remitoUrl: string | null = null;
      if (remitoFile && !remitoUploaded) {
        remitoUrl = await subirFotoRemito(viajeId);
        if (!remitoUrl) {
          showMessage('No se pudo subir la foto del remito', 'error');
          setLoadingAction(null);
          return;
        }
      }

      console.log('✅ [supervisor-carga] Finalizando carga viaje:', viajeId);
      const result = await actualizarEstado(
        viajeId,
        'cargado',
      );

      if (result.success) {
        showMessage('✅ Carga finalizada - Control de Acceso debe confirmar egreso');
        actualizarEscaneado(viajeId, 'cargado', 'cargado');
        limpiarRemito();
        await cargarViajes();
      } else {
        console.error('❌ [supervisor-carga] Error finalizar:', result.error);
        showMessage(result.error || 'Error al finalizar carga', 'error');
      }
    } catch (err) {
      console.error('❌ [supervisor-carga] Exception:', err);
      showMessage('Error al finalizar carga', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Acciones de DESCARGA (destino) ────────────────────────────

  // 4. Llamar a Descarga (ingresado_destino → llamado_descarga)
  const llamarADescarga = async (viajeId: string) => {
    setLoadingAction(viajeId);
    try {
      console.log('📢 [supervisor-carga] Llamando a descarga viaje:', viajeId);
      const result = await actualizarEstado(
        viajeId,
        'llamado_descarga',
      );

      if (result.success) {
        showMessage('📢 Vehículo llamado a descarga');
        actualizarEscaneado(viajeId, 'llamado_descarga', 'llamado_descarga');
        await cargarViajes();
      } else {
        showMessage(result.error || 'Error al llamar a descarga', 'error');
      }
    } catch (err) {
      showMessage('Error al llamar a descarga', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Iniciar Descarga (llamado_descarga → descargando)
  const iniciarDescarga = async (viaje: ViajeParaCarga) => {
    setLoadingAction(viaje.id);
    try {
      console.log('⬇️ [supervisor-carga] Iniciando descarga viaje:', viaje.id);
      const result = await actualizarEstado(
        viaje.id,
        'descargando',
      );

      if (result.success) {
        showMessage(`⬇️ Descarga iniciada - ${viaje.camion.patente}`);
        actualizarEscaneado(viaje.id, 'descargando', 'descargando');
        await cargarViajes();
      } else {
        showMessage(result.error || 'Error al iniciar descarga', 'error');
      }
    } catch (err) {
      showMessage('Error al iniciar descarga', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Finalizar Descarga (descargando → descargado)
  //    Control de Acceso luego hace: descargado → egreso_destino
  const finalizarDescarga = async (viajeId: string) => {
    setLoadingAction(viajeId);
    try {
      console.log('✅ [supervisor-carga] Finalizando descarga viaje:', viajeId);
      const result = await actualizarEstado(
        viajeId,
        'descargado',
      );

      if (result.success) {
        showMessage('✅ Descarga finalizada - Control de Acceso debe confirmar egreso');
        actualizarEscaneado(viajeId, 'descargado', 'descargado');
        await cargarViajes();
      } else {
        showMessage(result.error || 'Error al finalizar descarga', 'error');
      }
    } catch (err) {
      showMessage('Error al finalizar descarga', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Scanner QR ────────────────────────────────────────────────
  const escanearQR = async () => {
    if (!qrCode.trim()) return;

    setLoadingScanner(true);
    setViajeEscaneado(null);

    try {
      const codigo = qrCode.trim().replace(/^(QR-|DSP-)/, '');
      console.log('🔍 [supervisor-carga] Buscando con código:', codigo);

      // Paso 1: Buscar despacho por pedido_id
      const { data: despacho, error: despError } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino')
        .ilike('pedido_id', `%${codigo}%`)
        .maybeSingle();

      if (despError || !despacho) {
        showMessage('Despacho no encontrado', 'error');
        return;
      }

      console.log('✅ [supervisor-carga] Despacho encontrado:', despacho.pedido_id);

      // Paso 2: Buscar viaje del despacho
      const { data: viajesData, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, chofer_id, camion_id, estado_carga_viaje (estado_carga)')
        .eq('despacho_id', despacho.id)
        .limit(1);

      if (viajeError || !viajesData || viajesData.length === 0) {
        showMessage('No hay viajes asignados a este despacho', 'error');
        return;
      }

      const viajeData = viajesData[0];
      const carga = Array.isArray(viajeData.estado_carga_viaje) ? viajeData.estado_carga_viaje[0] : viajeData.estado_carga_viaje;

      // Paso 3: Traer chofer y camión por ID (queries directas para esquivar RLS)
      let choferNombre = 'Sin asignar';
      let choferDni = '-';
      let camionPatente = 'Sin asignar';
      let camionMarca = '-';

      if (viajeData.chofer_id) {
        const { data: choferData } = await supabase
          .from('choferes')
          .select('nombre, apellido, dni')
          .eq('id', viajeData.chofer_id)
          .maybeSingle();
        if (choferData) {
          choferNombre = `${choferData.nombre} ${choferData.apellido || ''}`.trim();
          choferDni = choferData.dni || '-';
        }
      }

      if (viajeData.camion_id) {
        const { data: camionData } = await supabase
          .from('camiones')
          .select('patente, marca, modelo')
          .eq('id', viajeData.camion_id)
          .maybeSingle();
        if (camionData) {
          camionPatente = camionData.patente;
          camionMarca = `${camionData.marca} ${camionData.modelo || ''}`.trim();
        }
      }

      setViajeEscaneado({
        id: viajeData.id,
        numero_viaje: String(viajeData.numero_viaje),
        estado: viajeData.estado || 'desconocido',
        estado_carga: carga?.estado_carga || 'pendiente',
        origen: despacho.origen || '-',
        destino: despacho.destino || '-',
        chofer: { nombre: choferNombre, dni: choferDni },
        camion: { patente: camionPatente, marca: camionMarca },
        tipo_operacion: ESTADOS_CARGA.includes(viajeData.estado) ? 'carga' : 'descarga',
      });

      showMessage(`Viaje ${viajeData.numero_viaje} encontrado`);
    } catch (err) {
      showMessage('Error al buscar viaje', 'error');
    } finally {
      setLoadingScanner(false);
    }
  };

  // ─── Filtros por Tab ───────────────────────────────────────────
  const viajesEnPlanta = viajes.filter(v =>
    ['ingresado_origen', 'ingresado_destino'].includes(v.estado)
  );

  const viajesEnProceso = viajes.filter(v =>
    ['llamado_carga', 'cargando', 'llamado_descarga', 'descargando'].includes(v.estado)
  );

  const viajesCompletados = viajes.filter(v =>
    v.estado === 'cargado' || v.estado === 'descargado'
  );

  // ─── Helpers de renderizado ────────────────────────────────────
  const getEstadoBadge = (estado: string, estadoCarga?: string) => {
    const key = estadoCarga === 'cargado' ? 'cargado' : estado;
    const label = ESTADO_LABELS[key] || key;
    const color = ESTADO_COLORS[key] || 'bg-slate-700 text-slate-300 border-slate-600';
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
        {label}
      </span>
    );
  };

  const renderAcciones = (v: ViajeParaCarga) => {
    const isLoading = loadingAction === v.id;

    // === CARGA (origen) ===
    if (v.estado === 'cargado') {
      return (
        <span className="text-sm text-green-400 flex items-center gap-1.5">
          <CheckCircleIcon className="h-4 w-4" />
          Cargado - Esperando egreso (Control Acceso)
        </span>
      );
    }

    if (v.estado === 'ingresado_origen') {
      return (
        <button
          onClick={() => llamarACarga(v.id)}
          disabled={isLoading}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <PhoneIcon className="h-4 w-4" />
          {isLoading ? 'Llamando...' : '📢 Llamar a Carga'}
        </button>
      );
    }

    if (v.estado === 'llamado_carga') {
      return (
        <button
          onClick={() => iniciarCargaViaje(v)}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <PlayIcon className="h-4 w-4" />
          {isLoading ? 'Iniciando...' : '⚙️ Iniciar Carga'}
        </button>
      );
    }

    if (v.estado === 'cargando') {
      return (
        <div className="w-full space-y-3">
          {/* Foto del remito */}
          <div className="border border-dashed border-slate-600 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-2 font-medium">📸 Foto del remito firmado (requerida)</p>

            {!remitoPreview ? (
              <label className="flex flex-col items-center gap-2 cursor-pointer py-4 hover:bg-slate-700/30 rounded-lg transition-colors">
                <CameraIcon className="h-8 w-8 text-yellow-500" />
                <span className="text-sm text-slate-300">Tomar foto o seleccionar imagen</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleRemitoFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={remitoPreview}
                  alt="Remito firmado"
                  className="w-full max-h-48 object-contain rounded-lg bg-slate-900"
                />
                <button
                  onClick={limpiarRemito}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                  title="Quitar foto"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                {remitoFile && (
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    {remitoFile.name} ({(remitoFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Botón Finalizar Carga — solo habilitado con foto */}
          <button
            onClick={() => finalizarCarga(v.id)}
            disabled={isLoading || !remitoFile || uploadingRemito}
            className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="h-4 w-4" />
            {uploadingRemito ? 'Subiendo foto...' : isLoading ? 'Finalizando...' : !remitoFile ? '📷 Suba la foto para finalizar' : '✅ Finalizar Carga'}
          </button>
        </div>
      );
    }

    // === DESCARGA (destino) ===
    if (v.estado === 'descargado') {
      return (
        <span className="text-sm text-green-400 flex items-center gap-1.5">
          <CheckCircleIcon className="h-4 w-4" />
          Descargado - Esperando egreso (Control Acceso)
        </span>
      );
    }

    if (v.estado === 'ingresado_destino') {
      return (
        <button
          onClick={() => llamarADescarga(v.id)}
          disabled={isLoading}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <PhoneIcon className="h-4 w-4" />
          {isLoading ? 'Llamando...' : '📢 Llamar a Descarga'}
        </button>
      );
    }

    if (v.estado === 'llamado_descarga') {
      return (
        <button
          onClick={() => iniciarDescarga(v)}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <PlayIcon className="h-4 w-4" />
          {isLoading ? 'Iniciando...' : '⬇️ Iniciar Descarga'}
        </button>
      );
    }

    if (v.estado === 'descargando') {
      return (
        <button
          onClick={() => finalizarDescarga(v.id)}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <CheckCircleIcon className="h-4 w-4" />
          {isLoading ? 'Finalizando...' : '✅ Finalizar Descarga'}
        </button>
      );
    }

    return null;
  };

  // ─── Tarjeta de viaje reutilizable ─────────────────────────────
  const renderViajeCard = (v: ViajeParaCarga) => (
    <div key={v.id} className="border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors bg-slate-800/50">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg text-slate-100">#{v.numero_viaje}</p>
            {getEstadoBadge(v.estado, v.estado_carga)}
          </div>
          <p className="text-sm text-slate-300">{v.origen} → {v.destino}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-slate-300 font-medium">{v.camion.patente}</p>
          <p className="text-xs text-slate-400">{v.camion.marca}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-slate-500">Chofer:</span>{' '}
          <span className="text-slate-300">{v.chofer.nombre}</span>
        </div>
        <div>
          <span className="text-slate-500">Ruta:</span>{' '}
          <span className="text-slate-300">{v.origen} → {v.destino}</span>
        </div>
      </div>

      {renderAcciones(v)}
    </div>
  );

  // ─── Render Principal ──────────────────────────────────────────
  return (
    <MainLayout pageTitle="Supervisor de Carga">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-600 rounded-xl">
              <ScaleIcon className="h-8 w-8 text-yellow-100" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Supervisor de Carga</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Gestión de operaciones de carga en planta
              </p>
            </div>
          </div>
          <button
            onClick={cargarViajes}
            disabled={loadingViajes}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
            title="Actualizar"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loadingViajes ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{viajesEnPlanta.length}</p>
          <p className="text-xs text-slate-400 mt-1">En Planta</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{viajesEnProceso.length}</p>
          <p className="text-xs text-slate-400 mt-1">En Proceso</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{viajesCompletados.length}</p>
          <p className="text-xs text-slate-400 mt-1">Completados</p>
        </div>
      </div>

      {/* Notificación */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${
          messageType === 'error'
            ? 'bg-red-900/30 text-red-400 border-red-800'
            : 'bg-green-900/30 text-green-400 border-green-800'
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-1">
            {[
              { key: 'planta' as TabType, label: 'En Planta', icon: TruckIcon, count: viajesEnPlanta.length },
              { key: 'en_proceso' as TabType, label: 'En Proceso', icon: PlayIcon, count: viajesEnProceso.length },
              { key: 'completados' as TabType, label: 'Completados', icon: CheckCircleIcon, count: viajesCompletados.length },
              { key: 'scanner' as TabType, label: 'Escáner QR', icon: QrCodeIcon },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2.5 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-yellow-500 text-yellow-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-yellow-600/30 text-yellow-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ─── TAB: En Planta ──────────────────────────────────────── */}
      {activeTab === 'planta' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-blue-400" />
              Vehículos en Planta
            </h2>
            <p className="text-xs text-slate-500">Esperando ser llamados a carga/descarga</p>
          </div>

          {viajesEnPlanta.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <TruckIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay vehículos esperando en planta</p>
              <p className="text-slate-500 text-xs mt-1">Aparecen aquí después de pasar por Control de Acceso</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {viajesEnPlanta.map(renderViajeCard)}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: En Proceso ─────────────────────────────────────── */}
      {activeTab === 'en_proceso' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <PlayIcon className="h-5 w-5 text-orange-400" />
              Operaciones en Proceso
            </h2>
            <p className="text-xs text-slate-500">Carga y descarga en curso</p>
          </div>

          {viajesEnProceso.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <PlayIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay operaciones en proceso</p>
              <p className="text-slate-500 text-xs mt-1">Llame vehículos desde la pestaña «En Planta»</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {viajesEnProceso.map(renderViajeCard)}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Completados ───────────────────────────────────── */}
      {activeTab === 'completados' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              Operaciones Completadas
            </h2>
            <p className="text-xs text-slate-500">Esperando egreso por Control de Acceso</p>
          </div>

          {viajesCompletados.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <CheckCircleIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay operaciones completadas</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {viajesCompletados.map(renderViajeCard)}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Scanner QR ─────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          {/* Campo de escaneo */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <QrCodeIcon className="h-6 w-6 text-yellow-500" />
              <h2 className="text-lg font-semibold text-slate-100">Escanear Código QR</h2>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ingrese N° de viaje o escanee código QR"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none placeholder-slate-400"
                onKeyDown={(e) => e.key === 'Enter' && escanearQR()}
              />
              <button
                onClick={escanearQR}
                disabled={loadingScanner || !qrCode.trim()}
                className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <QrCodeIcon className="h-5 w-5" />
                {loadingScanner ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Resultado del escaneo */}
          {viajeEscaneado && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">Viaje #{viajeEscaneado.numero_viaje}</h3>
                {getEstadoBadge(viajeEscaneado.estado, viajeEscaneado.estado_carga)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500">Ruta</label>
                    <p className="text-slate-200">{viajeEscaneado.origen} → {viajeEscaneado.destino}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Vehículo</label>
                    <p className="text-slate-200">{viajeEscaneado.camion.patente} - {viajeEscaneado.camion.marca}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500">Chofer</label>
                    <p className="text-slate-200">{viajeEscaneado.chofer.nombre}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">DNI</label>
                    <p className="text-slate-200">{viajeEscaneado.chofer.dni}</p>
                  </div>
                </div>
              </div>

              {/* Acciones del viaje escaneado */}
              <div className="pt-4 border-t border-slate-700 flex gap-3 flex-wrap">
                {renderAcciones(viajeEscaneado)}
                <button
                  onClick={() => {
                    setViajeEscaneado(null);
                    setQrCode('');
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 border border-slate-600 rounded-lg text-sm transition-colors"
                >
                  Nuevo Escaneo
                </button>
              </div>
            </div>
          )}

          {/* Advertencia: viaje fuera del ámbito supervisor */}
          {viajeEscaneado && !ESTADOS_SUPERVISOR.includes(viajeEscaneado.estado) && viajeEscaneado.estado_carga !== 'cargado' && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">Viaje fuera del ámbito del Supervisor</p>
                <p className="text-yellow-500/80 text-xs mt-1">
                  Estado actual: {viajeEscaneado.estado}. Este viaje no está en la etapa de carga.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
