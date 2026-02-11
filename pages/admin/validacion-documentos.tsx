// pages/admin/validacion-documentos.tsx
// Panel de validación de documentos para admin_nodexia / super_admin
// Rediseño: 3 tabs (PENDIENTE/APROBADO/RECHAZADO), modal de validación, notificaciones

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { supabase } from '../../lib/supabaseClient';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentoEnriquecido {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  tipo_documento: string;
  nombre_archivo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado_vigencia: string;
  file_url: string;
  created_at: string;
  empresa_id: string;
  subido_por: string | null;
  motivo_rechazo?: string | null;
  validado_por?: string | null;
  fecha_validacion?: string | null;
  // Datos enriquecidos
  entidad_nombre?: string;
  entidad_identificador?: string;
  empresa_nombre?: string;
  remitente_nombre?: string;
}

type TabActivo = 'pendiente' | 'aprobado' | 'rechazado';

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_DOC_LABELS: Record<string, string> = {
  licencia_conducir: 'Licencia de Conducir',
  art_clausula_no_repeticion: 'ART Cláusula No Repetición',
  seguro_vida_autonomo: 'Seguro de Vida Autónomo',
  seguro: 'Seguro',
  rto: 'Revisión Técnica Obligatoria',
  cedula: 'Cédula Verde',
  seguro_carga_global: 'Seguro de Carga Global',
  habilitacion: 'Habilitación',
  vtv: 'VTV',
};

const ENTIDAD_TIPO_ICONS: Record<string, string> = {
  chofer: '👤',
  camion: '🚛',
  acoplado: '🔗',
  transporte: '🏢',
};

const ENTIDAD_TIPO_LABEL: Record<string, string> = {
  chofer: 'Chofer',
  camion: 'Camión',
  acoplado: 'Acoplado',
  transporte: 'Transporte',
};

const TAB_CONFIG: { key: TabActivo; label: string; icon: string; estadoFilter: string[] }[] = [
  { key: 'pendiente', label: 'PENDIENTE', icon: '🕐', estadoFilter: ['pendiente_validacion'] },
  { key: 'aprobado', label: 'APROBADO', icon: '✅', estadoFilter: ['vigente', 'por_vencer', 'vencido'] },
  { key: 'rechazado', label: 'RECHAZADO', icon: '❌', estadoFilter: ['rechazado'] },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ValidacionDocumentos() {
  const { user, primaryRole, loading: roleLoading } = useUserRole();
  const [documentos, setDocumentos] = useState<DocumentoEnriquecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabActivo, setTabActivo] = useState<TabActivo>('pendiente');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  // Modal de validación
  const [modalDoc, setModalDoc] = useState<DocumentoEnriquecido | null>(null);
  const [modalRechazoNota, setModalRechazoNota] = useState('');
  const [modalDocUrl, setModalDocUrl] = useState<string | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [modalFechaEmision, setModalFechaEmision] = useState('');
  const [modalFechaVencimiento, setModalFechaVencimiento] = useState('');

  // Guard: solo admin_nodexia y super_admin
  const tieneAcceso = primaryRole === 'super_admin' || primaryRole === 'admin_nodexia';

  // ─── Data Loading ────────────────────────────────────────────────────────

  const cargarDocumentos = useCallback(async () => {
    if (!user || !tieneAcceso) return;
    setLoading(true);
    try {
      // Traer todos los documentos (filtro se hace en frontend para contadores)
      const { data, error } = await supabase
        .from('documentos_entidad')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const docs = data || [];

      // Collect unique IDs for batch queries
      const choferIds = new Set<string>();
      const camionIds = new Set<string>();
      const acopladoIds = new Set<string>();
      const empresaIds = new Set<string>();
      const userIds = new Set<string>();

      for (const doc of docs) {
        if (doc.entidad_tipo === 'chofer') choferIds.add(doc.entidad_id);
        else if (doc.entidad_tipo === 'camion') camionIds.add(doc.entidad_id);
        else if (doc.entidad_tipo === 'acoplado') acopladoIds.add(doc.entidad_id);
        if (doc.empresa_id) empresaIds.add(doc.empresa_id);
        if (doc.subido_por) userIds.add(doc.subido_por);
      }

      // Batch queries in parallel (RLS corregido en migración 052)
      const [choferesRes, camionesRes, acopladosRes, empresasRes, usuariosRes] = await Promise.all([
        choferIds.size > 0
          ? supabase.from('choferes').select('id, nombre, apellido, dni, empresa_id').in('id', Array.from(choferIds))
          : { data: [] },
        camionIds.size > 0
          ? supabase.from('camiones').select('id, patente, marca, modelo, empresa_id').in('id', Array.from(camionIds))
          : { data: [] },
        acopladoIds.size > 0
          ? supabase.from('acoplados').select('id, patente, marca, modelo, empresa_id').in('id', Array.from(acopladoIds))
          : { data: [] },
        empresaIds.size > 0
          ? supabase.from('empresas').select('id, nombre').in('id', Array.from(empresaIds))
          : { data: [] },
        userIds.size > 0
          ? supabase.from('usuarios').select('id, nombre_completo, email').in('id', Array.from(userIds))
          : { data: [] },
      ]);

      // Build lookup maps
      const choferesMap = new Map<string, any>((choferesRes.data || []).map((c: any) => [c.id, c]));
      const camionesMap = new Map<string, any>((camionesRes.data || []).map((c: any) => [c.id, c]));
      const acopladosMap = new Map<string, any>((acopladosRes.data || []).map((a: any) => [a.id, a]));
      const empresasMap = new Map<string, any>((empresasRes.data || []).map((e: any) => [e.id, e]));
      const usuariosMap = new Map<string, any>((usuariosRes.data || []).map((u: any) => [u.id, u]));

      // Enrich
      const docsEnriquecidos: DocumentoEnriquecido[] = docs.map((doc: any) => {
        let entidad_nombre = '';
        let entidad_identificador = '';
        let empresa_nombre = '';
        let remitente_nombre = '';

        if (doc.entidad_tipo === 'chofer') {
          const chofer = choferesMap.get(doc.entidad_id);
          if (chofer) {
            entidad_nombre = `${chofer.nombre} ${chofer.apellido}`;
            entidad_identificador = chofer.dni || '';
            const emp = empresasMap.get(chofer.empresa_id);
            empresa_nombre = emp?.nombre || '';
          }
        } else if (doc.entidad_tipo === 'camion') {
          const camion = camionesMap.get(doc.entidad_id);
          if (camion) {
            entidad_nombre = `${camion.marca || ''} ${camion.modelo || ''}`.trim();
            entidad_identificador = camion.patente;
            const emp = empresasMap.get(camion.empresa_id);
            empresa_nombre = emp?.nombre || '';
          }
        } else if (doc.entidad_tipo === 'acoplado') {
          const acoplado = acopladosMap.get(doc.entidad_id);
          if (acoplado) {
            entidad_nombre = `${acoplado.marca || ''} ${acoplado.modelo || ''}`.trim();
            entidad_identificador = acoplado.patente;
            const emp = empresasMap.get(acoplado.empresa_id);
            empresa_nombre = emp?.nombre || '';
          }
        }

        // Remitente
        if (doc.subido_por) {
          const usr = usuariosMap.get(doc.subido_por);
          remitente_nombre = usr?.nombre_completo || usr?.email || '';
        }

        // Empresa fallback
        if (!empresa_nombre && doc.empresa_id) {
          const emp = empresasMap.get(doc.empresa_id);
          empresa_nombre = emp?.nombre || '';
        }

        return {
          ...doc,
          entidad_nombre,
          entidad_identificador,
          empresa_nombre,
          remitente_nombre,
        };
      });

      setDocumentos(docsEnriquecidos);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setMensaje({ tipo: 'error', texto: 'Error al cargar documentos' });
      setTimeout(() => setMensaje(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [user, tieneAcceso]);

  useEffect(() => {
    if (tieneAcceso) {
      cargarDocumentos();
    }
  }, [tieneAcceso, cargarDocumentos]);

  // ─── Filtered/Counted documents ──────────────────────────────────────────

  const tabEstados = TAB_CONFIG.find(t => t.key === tabActivo)?.estadoFilter || [];

  const documentosFiltrados = useMemo(() => {
    let filtered = documentos.filter(d => tabEstados.includes(d.estado_vigencia));

    // Date filter (by created_at / upload date)
    if (fechaFiltro) {
      filtered = filtered.filter(d => d.created_at.startsWith(fechaFiltro));
    }

    // Search
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      filtered = filtered.filter(d =>
        (d.entidad_nombre || '').toLowerCase().includes(term) ||
        (d.entidad_identificador || '').toLowerCase().includes(term) ||
        (d.tipo_documento || '').toLowerCase().includes(term) ||
        (TIPO_DOC_LABELS[d.tipo_documento] || '').toLowerCase().includes(term) ||
        (d.nombre_archivo || '').toLowerCase().includes(term) ||
        (d.empresa_nombre || '').toLowerCase().includes(term) ||
        (d.remitente_nombre || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [documentos, tabEstados, fechaFiltro, busqueda]);

  const contadores = useMemo(() => ({
    pendiente: documentos.filter(d => d.estado_vigencia === 'pendiente_validacion').length,
    aprobado: documentos.filter(d => ['vigente', 'por_vencer', 'vencido'].includes(d.estado_vigencia)).length,
    rechazado: documentos.filter(d => d.estado_vigencia === 'rechazado').length,
  }), [documentos]);

  // ─── Modal: Open with preview ────────────────────────────────────────────

  const abrirModal = async (doc: DocumentoEnriquecido) => {
    setModalDoc(doc);
    setModalRechazoNota('');
    setModalDocUrl(null);
    setCargandoPreview(true);
    setModalFechaEmision(doc.fecha_emision || '');
    setModalFechaVencimiento(doc.fecha_vencimiento || '');

    try {
      // Usar API con service role para generar signed URL (bypasses storage RLS)
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (token) {
        const res = await fetch('/api/documentacion/preview-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ file_url: doc.file_url }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.signedUrl) {
            setModalDocUrl(data.signedUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error generando URL firmada:', err);
    } finally {
      setCargandoPreview(false);
    }
  };

  const cerrarModal = () => {
    setModalDoc(null);
    setModalDocUrl(null);
    setModalRechazoNota('');
    setModalFechaEmision('');
    setModalFechaVencimiento('');
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const aprobarDocumento = async () => {
    if (!modalDoc || !user) return;
    setProcesando(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No hay sesión activa');

      const body: Record<string, any> = {
        documento_id: modalDoc.id,
        accion: 'aprobar',
      };
      if (modalFechaEmision) body.fecha_emision = modalFechaEmision;
      if (modalFechaVencimiento) body.fecha_vencimiento = modalFechaVencimiento;

      const res = await fetch('/api/documentacion/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Error al aprobar');

      setMensaje({ tipo: 'success', texto: '✅ Documento aprobado correctamente' });
      setDocumentos(prev => prev.map(d =>
        d.id === modalDoc.id
          ? {
              ...d,
              estado_vigencia: 'vigente',
              validado_por: user.id,
              fecha_emision: modalFechaEmision || d.fecha_emision,
              fecha_vencimiento: modalFechaVencimiento || d.fecha_vencimiento,
            }
          : d
      ));
      cerrarModal();
    } catch (err: any) {
      console.error('Error aprobando documento:', err);
      setMensaje({ tipo: 'error', texto: `Error al aprobar: ${err.message}` });
    } finally {
      setProcesando(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  const rechazarDocumento = async () => {
    if (!modalDoc || !user) return;
    if (!modalRechazoNota.trim()) {
      setMensaje({ tipo: 'error', texto: 'Debe indicar el motivo del rechazo' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }

    setProcesando(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No hay sesión activa');

      const res = await fetch('/api/documentacion/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          documento_id: modalDoc.id,
          accion: 'rechazar',
          motivo_rechazo: modalRechazoNota.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Error al rechazar');

      // Crear notificaciones (lado cliente para UX rápida)
      const tipoDocLabel = TIPO_DOC_LABELS[modalDoc.tipo_documento] || modalDoc.tipo_documento;
      const entidadLabel = modalDoc.entidad_tipo === 'chofer'
        ? `${modalDoc.entidad_nombre || 'Chofer'}`
        : `${modalDoc.entidad_identificador || modalDoc.entidad_nombre || modalDoc.entidad_tipo}`;

      const notifTitulo = '❌ Documento Rechazado';
      const notifMensaje = `El documento "${tipoDocLabel}" de ${entidadLabel} fue rechazado. Motivo: ${modalRechazoNota.trim()}`;

      const notificaciones: any[] = [];

      if (modalDoc.subido_por) {
        notificaciones.push({
          user_id: modalDoc.subido_por,
          tipo: 'mensaje_sistema',
          titulo: notifTitulo,
          mensaje: notifMensaje,
          metadata: {
            documento_id: modalDoc.id,
            tipo_documento: modalDoc.tipo_documento,
            motivo_rechazo: modalRechazoNota.trim(),
            entidad_tipo: modalDoc.entidad_tipo,
            entidad_id: modalDoc.entidad_id,
          },
        });
      }

      if (notificaciones.length > 0) {
        await supabase.from('notificaciones').insert(notificaciones);
      }

      setMensaje({ tipo: 'success', texto: '❌ Documento rechazado — notificación enviada' });
      setDocumentos(prev => prev.map(d =>
        d.id === modalDoc.id
          ? { ...d, estado_vigencia: 'rechazado', motivo_rechazo: modalRechazoNota.trim(), validado_por: user.id }
          : d
      ));
      cerrarModal();
    } catch (err: any) {
      console.error('Error rechazando documento:', err);
      setMensaje({ tipo: 'error', texto: `Error al rechazar: ${err.message}` });
    } finally {
      setProcesando(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return { bg: 'bg-green-600/30 border-green-600 text-green-300', label: '✅ Vigente' };
      case 'pendiente_validacion':
        return { bg: 'bg-blue-600/30 border-blue-600 text-blue-300', label: '🕐 Pendiente' };
      case 'por_vencer':
        return { bg: 'bg-yellow-600/30 border-yellow-600 text-yellow-300', label: '⚠️ Por vencer' };
      case 'vencido':
        return { bg: 'bg-red-600/30 border-red-600 text-red-300', label: '⏰ Vencido' };
      case 'rechazado':
        return { bg: 'bg-red-600/30 border-red-600 text-red-300', label: '❌ Rechazado' };
      default:
        return { bg: 'bg-gray-600/30 border-gray-600 text-gray-300', label: estado };
    }
  };

  const isImageFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ─── Loading / No Access ─────────────────────────────────────────────────

  if (roleLoading || !tieneAcceso) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <MainLayout pageTitle="Validación de Documentos">
      <div className="space-y-5 p-4 sm:p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white">
          <h1 className="text-2xl font-bold mb-1">✅ Validación de Documentos</h1>
          <p className="text-green-100 text-sm">
            Revise, apruebe o rechace documentos subidos por las empresas de transporte
          </p>
        </div>

        {/* Mensaje flash */}
        {mensaje && (
          <div className={`rounded-xl p-4 border ${
            mensaje.tipo === 'success'
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700">
          {TAB_CONFIG.map(tab => {
            const count = contadores[tab.key];
            const isActive = tabActivo === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTabActivo(tab.key)}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? tab.key === 'pendiente'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : tab.key === 'aprobado'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                      : 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20' : 'bg-slate-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Filters Row ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, patente, tipo de documento..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date filter */}
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 [color-scheme:dark]"
            />
            {fechaFiltro && (
              <button onClick={() => setFechaFiltro('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={cargarDocumentos}
            className="px-4 py-2.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-2 text-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {/* ─── Document List ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="text-slate-400 mt-3 text-sm">Cargando documentos...</p>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700">
            <DocumentTextIcon className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-lg font-medium">
              {tabActivo === 'pendiente'
                ? 'No hay documentos pendientes de validación'
                : tabActivo === 'aprobado'
                ? 'No hay documentos aprobados'
                : 'No hay documentos rechazados'}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {busqueda || fechaFiltro
                ? 'Intente modificar los filtros de búsqueda'
                : 'Los documentos aparecerán aquí cuando los transportes los suban'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 px-1">
              {documentosFiltrados.length} documento{documentosFiltrados.length !== 1 ? 's' : ''}
            </p>

            {documentosFiltrados.map((doc) => {
              const badge = getEstadoBadge(doc.estado_vigencia);
              const entidadIcon = ENTIDAD_TIPO_ICONS[doc.entidad_tipo] || '📄';
              const isPendiente = doc.estado_vigencia === 'pendiente_validacion';

              return (
                <div
                  key={doc.id}
                  className={`rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
                    isPendiente
                      ? 'border-blue-700/40 bg-blue-950/10 hover:border-blue-600/60'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    {/* Entity icon + type + identificador */}
                    <div className="flex-shrink-0 text-center w-16">
                      <span className="text-2xl">{entidadIcon}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {ENTIDAD_TIPO_LABEL[doc.entidad_tipo] || doc.entidad_tipo}
                      </p>
                      {doc.entidad_identificador && (
                        <p className="text-[11px] text-cyan-400 font-bold mt-0.5 truncate">
                          {doc.entidad_identificador}
                        </p>
                      )}
                      {!doc.entidad_identificador && doc.entidad_nombre && (
                        <p className="text-[10px] text-slate-300 mt-0.5 truncate leading-tight">
                          {doc.entidad_nombre.split(' ').slice(0, 2).join(' ')}
                        </p>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Document type + badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-semibold text-sm">
                          {TIPO_DOC_LABELS[doc.tipo_documento] || doc.tipo_documento}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Row 2: Relationship data (chofer name / patente) */}
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {doc.entidad_nombre && (
                          <span className="text-slate-200 font-medium">
                            {doc.entidad_nombre}
                            {doc.entidad_identificador && (
                              <span className="text-slate-400 ml-1">({doc.entidad_identificador})</span>
                            )}
                          </span>
                        )}
                        {doc.empresa_nombre && (
                          <span className="text-cyan-400">🏢 {doc.empresa_nombre}</span>
                        )}
                      </div>

                      {/* Row 3: Remitente + dates */}
                      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                        {doc.remitente_nombre && (
                          <span>📤 Subido por: <span className="text-slate-300">{doc.remitente_nombre}</span></span>
                        )}
                        <span>📅 {formatDate(doc.created_at)}</span>
                        {doc.fecha_vencimiento && (
                          <span>
                            Vto: <span className={
                              new Date(doc.fecha_vencimiento) < new Date() ? 'text-red-400 font-semibold' : 'text-slate-300'
                            }>{formatDate(doc.fecha_vencimiento)}</span>
                          </span>
                        )}
                      </div>

                      {/* Row 4: Rejection reason (only for rejected tab) */}
                      {doc.estado_vigencia === 'rechazado' && doc.motivo_rechazo && (
                        <div className="mt-2 text-xs text-red-400 bg-red-900/20 rounded px-2 py-1 border border-red-800/30">
                          💬 Motivo: {doc.motivo_rechazo}
                        </div>
                      )}
                    </div>

                    {/* Action button: VALIDAR */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => abrirModal(doc)}
                        className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                          isPendiente
                            ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/20'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        <EyeIcon className="h-4 w-4" />
                        {isPendiente ? 'VALIDAR' : 'VER'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Validation Modal ──────────────────────────────────────────────── */}
      {modalDoc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={cerrarModal}>
          <div
            className="bg-[#1b273b] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-600"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {modalDoc.estado_vigencia === 'pendiente_validacion' ? '🔍 Validar Documento' : '📄 Detalle del Documento'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {TIPO_DOC_LABELS[modalDoc.tipo_documento] || modalDoc.tipo_documento}
                </p>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-white p-1">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Document Preview */}
                <div className="bg-slate-900/60 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="p-3 border-b border-slate-700 text-xs text-slate-400 font-medium flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4" />
                    Vista previa — {modalDoc.nombre_archivo}
                  </div>
                  <div className="aspect-[3/4] flex items-center justify-center bg-slate-950 relative">
                    {cargandoPreview ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
                        <p className="text-slate-500 text-sm mt-2">Cargando...</p>
                      </div>
                    ) : modalDocUrl ? (
                      isImageFile(modalDoc.nombre_archivo) ? (
                        <img
                          src={modalDocUrl}
                          alt={modalDoc.nombre_archivo}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={modalDocUrl}
                          className="w-full h-full"
                          title={modalDoc.nombre_archivo}
                        />
                      )
                    ) : (
                      <div className="text-center text-slate-500">
                        <DocumentTextIcon className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">No se pudo cargar la vista previa</p>
                      </div>
                    )}
                  </div>
                  {modalDocUrl && (
                    <div className="p-2 border-t border-slate-700 text-center">
                      <a
                        href={modalDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline"
                      >
                        Abrir en nueva pestaña ↗
                      </a>
                    </div>
                  )}
                </div>

                {/* Right: Metadata + Actions */}
                <div className="space-y-5">
                  {/* Document Info */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Información</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tipo de Documento</span>
                        <p className="text-white text-sm font-medium mt-0.5">
                          {TIPO_DOC_LABELS[modalDoc.tipo_documento] || modalDoc.tipo_documento}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Estado</span>
                        <p className="mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getEstadoBadge(modalDoc.estado_vigencia).bg}`}>
                            {getEstadoBadge(modalDoc.estado_vigencia).label}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Entity (relationship data) */}
                    <div className="pt-2 border-t border-slate-700/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {ENTIDAD_TIPO_LABEL[modalDoc.entidad_tipo] || 'Entidad'}
                      </span>
                      <p className="text-white text-sm font-medium mt-0.5 flex items-center gap-2">
                        <span>{ENTIDAD_TIPO_ICONS[modalDoc.entidad_tipo] || '📄'}</span>
                        <span>
                          {modalDoc.entidad_nombre || 'Sin datos'}
                          {modalDoc.entidad_identificador && (
                            <span className="text-slate-400 ml-2">({modalDoc.entidad_identificador})</span>
                          )}
                        </span>
                      </p>
                      {modalDoc.empresa_nombre && (
                        <p className="text-cyan-400 text-xs mt-1">🏢 {modalDoc.empresa_nombre}</p>
                      )}
                    </div>

                    {/* Upload info */}
                    <div className="pt-2 border-t border-slate-700/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Remitente / Fecha de Carga</span>
                      <p className="text-white text-sm mt-0.5">
                        {modalDoc.remitente_nombre || 'Desconocido'} — {formatDate(modalDoc.created_at)}
                      </p>
                    </div>

                    {/* Rejection info (if already rejected) */}
                    {modalDoc.estado_vigencia === 'rechazado' && modalDoc.motivo_rechazo && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold">Motivo de Rechazo</span>
                        <p className="text-red-300 text-sm mt-0.5 bg-red-900/20 rounded p-2 border border-red-800/30">
                          {modalDoc.motivo_rechazo}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (only for pending) */}
                  {modalDoc.estado_vigencia === 'pendiente_validacion' && (
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-4">
                      <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Acción de Validación</h3>

                      {/* Date inputs for admin */}
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-700/50">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                            Fecha Otorgamiento
                          </label>
                          <input
                            type="date"
                            value={modalFechaEmision}
                            onChange={(e) => setModalFechaEmision(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                            Fecha Vencimiento
                          </label>
                          <input
                            type="date"
                            value={modalFechaVencimiento}
                            onChange={(e) => setModalFechaVencimiento(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 [color-scheme:dark]"
                          />
                        </div>
                        <p className="col-span-2 text-[10px] text-slate-500">
                          💡 Complete las fechas antes de aprobar. Serán guardadas junto con la aprobación.
                        </p>
                      </div>

                      {/* Approve */}
                      <button
                        onClick={aprobarDocumento}
                        disabled={procesando}
                        className="w-full px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-green-600/20"
                      >
                        {procesando ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <CheckCircleIcon className="h-5 w-5" />
                        )}
                        APROBAR DOCUMENTO
                      </button>

                      {/* Reject with reason */}
                      <div className="border-t border-slate-700 pt-4">
                        <label className="block text-xs text-red-300 font-semibold mb-2">
                          Motivo del rechazo (obligatorio para rechazar):
                        </label>
                        <textarea
                          value={modalRechazoNota}
                          onChange={(e) => setModalRechazoNota(e.target.value)}
                          placeholder="Ej: Documento ilegible, fecha vencida, datos incorrectos..."
                          className="w-full bg-slate-900 border border-red-700/40 rounded-lg p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                          rows={3}
                        />
                        <button
                          onClick={rechazarDocumento}
                          disabled={procesando || !modalRechazoNota.trim()}
                          className="w-full mt-3 px-4 py-3 rounded-lg bg-red-600/80 hover:bg-red-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {procesando ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <XCircleIcon className="h-5 w-5" />
                          )}
                          RECHAZAR DOCUMENTO
                        </button>
                        <p className="text-[10px] text-slate-500 mt-2">
                          ⚠️ El rechazo generará una notificación al remitente y al propietario de la documentación
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
