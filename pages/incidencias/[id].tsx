// pages/incidencias/[id].tsx
// Detalle de incidencia — timeline, datos de viaje, acciones por rol
// Tabla canónica: incidencias_viaje

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { supabase } from '../../lib/supabaseClient';
import SubirDocumento from '../../components/Documentacion/SubirDocumento';
import type { IncidenciaViaje, SeveridadIncidencia, TipoIncidenciaViaje, EstadoIncidencia } from '../../lib/types';

const TIPO_LABELS: Record<TipoIncidenciaViaje, string> = {
  retraso: 'Retraso',
  averia_camion: 'Avería Camión',
  documentacion_faltante: 'Documentación Faltante',
  producto_danado: 'Producto Dañado',
  accidente: 'Accidente',
  demora: 'Demora',
  problema_mecanico: 'Problema Mecánico',
  problema_carga: 'Problema Carga',
  ruta_bloqueada: 'Ruta Bloqueada',
  clima_adverso: 'Clima Adverso',
  otro: 'Otro',
};

const SEVERIDAD_CONFIG: Record<SeveridadIncidencia, { color: string; bg: string; label: string; icon: string }> = {
  baja: { color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', label: 'Baja', icon: '🟢' },
  media: { color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', label: 'Media', icon: '🟡' },
  alta: { color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30', label: 'Alta', icon: '🟠' },
  critica: { color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', label: 'Crítica', icon: '🔴' },
};

const ESTADO_CONFIG: Record<EstadoIncidencia, { color: string; bg: string; label: string }> = {
  abierta: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Abierta' },
  en_proceso: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'En Proceso' },
  resuelta: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Resuelta' },
  cerrada: { color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Cerrada' },
};

const TRANSICIONES: Record<EstadoIncidencia, EstadoIncidencia[]> = {
  abierta: ['en_proceso', 'cerrada'],
  en_proceso: ['resuelta', 'cerrada'],
  resuelta: ['cerrada'],
  cerrada: [],
};

function formatFechaCompleta(fecha: string): string {
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface IncidenciaDetalle extends IncidenciaViaje {
  viaje?: any;
  producto?: string;
  recursos_nombres?: Record<string, string>;
}

const IncidenciaDetallePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { primaryRole } = useUserRole();
  const [incidencia, setIncidencia] = useState<IncidenciaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolucionText, setResolucionText] = useState('');
  const [message, setMessage] = useState('');
  // Estado para panel de documentación
  const [docsRecurso, setDocsRecurso] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showUploadFor, setShowUploadFor] = useState<{ entidadTipo: string; entidadId: string; tipo?: string } | null>(null);
  const [validandoDocId, setValidandoDocId] = useState<string | null>(null);

  const fetchDetalle = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const response = await fetch(`/api/incidencias/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error ${response.status}`);
      }

      const json = await response.json();
      setIncidencia(json.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Derivar recursos afectados: usar documentos_afectados si existe, sino extraer del viaje
  const recursosAfectados = React.useMemo(() => {
    // Si documentos_afectados existe (migration 064 aplicada), usar eso
    if (incidencia?.documentos_afectados && Array.isArray(incidencia.documentos_afectados) && incidencia.documentos_afectados.length > 0) {
      return incidencia.documentos_afectados;
    }
    // Fallback: derivar del viaje asignado
    if (incidencia?.viaje) {
      const recursos: any[] = [];
      if (incidencia.viaje.chofer_id) {
        recursos.push({ entidad_tipo: 'chofer', entidad_id: incidencia.viaje.chofer_id, tipo: 'documentacion', problema: 'faltante' });
      }
      if (incidencia.viaje.camion_id) {
        recursos.push({ entidad_tipo: 'camion', entidad_id: incidencia.viaje.camion_id, tipo: 'documentacion', problema: 'faltante' });
      }
      if (incidencia.viaje.acoplado_id) {
        recursos.push({ entidad_tipo: 'acoplado', entidad_id: incidencia.viaje.acoplado_id, tipo: 'documentacion', problema: 'faltante' });
      }
      return recursos;
    }
    return [];
  }, [incidencia]);

  // Cargar documentos del recurso afectado (para incidencias de documentación)
  const fetchDocsRecurso = useCallback(async () => {
    if (!incidencia || incidencia.tipo_incidencia !== 'documentacion_faltante') return;
    if (recursosAfectados.length === 0) return;
    
    setDocsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Obtener IDs únicos de entidades
      const entidades = new Map<string, string>();
      recursosAfectados.forEach((doc: any) => {
        if (doc.entidad_tipo && doc.entidad_id) {
          entidades.set(`${doc.entidad_tipo}:${doc.entidad_id}`, doc.entidad_tipo);
        }
      });

      // Para cada entidad, cargar sus docs
      const allDocs: any[] = [];
      for (const [key] of entidades) {
        const [entidadTipo, entidadId] = key.split(':');
        const response = await fetch(
          `/api/documentacion/listar?entidad_tipo=${entidadTipo}&entidad_id=${entidadId}&cross_empresa=true`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        );
        if (response.ok) {
          const json = await response.json();
          const docs = json.data?.documentos || json.documentos || [];
          docs.forEach((d: any) => {
            allDocs.push({ ...d, _entidad_tipo: entidadTipo, _entidad_id: entidadId });
          });
        }
      }
      setDocsRecurso(allDocs);
    } catch (err) {
      console.error('Error cargando docs recurso:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [incidencia, recursosAfectados]);

  // Aprobar provisoriamente un documento
  const aprobarProvisorio = async (docId: string) => {
    setValidandoDocId(docId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/documentacion/validar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documento_id: docId,
          accion: 'aprobar_provisorio',
          motivo_provisorio: `Aprobación provisoria para resolver incidencia de documentación (viaje ${incidencia?.numero_viaje || ''})`,
          incidencia_id: incidencia?.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.details || 'Error al aprobar');
      }

      setMessage('✅ Documento aprobado provisoriamente (válido 24h). CA puede re-escanear.');
      // Recargar docs
      await fetchDocsRecurso();
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setValidandoDocId(null);
    }
  };

  useEffect(() => {
    if (id) fetchDetalle();
  }, [id]);

  // Cargar docs de recursos afectados cuando la incidencia se carga
  useEffect(() => {
    if (incidencia && incidencia.tipo_incidencia === 'documentacion_faltante') {
      fetchDocsRecurso();
    }
  }, [incidencia?.id, fetchDocsRecurso]);

  const cambiarEstado = async (nuevoEstado: EstadoIncidencia) => {
    if (!incidencia) return;
    setActionLoading(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const body: any = { estado: nuevoEstado };
      if (nuevoEstado === 'resuelta' || nuevoEstado === 'cerrada') {
        if (!resolucionText.trim() && nuevoEstado === 'resuelta') {
          setMessage('⚠️ Ingresá una resolución antes de resolver');
          setActionLoading(false);
          return;
        }
        body.resolucion = resolucionText.trim() || `Incidencia ${nuevoEstado}`;
      }

      const response = await fetch(`/api/incidencias/${incidencia.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar');
      }

      setMessage(`✅ Incidencia cambiada a: ${nuevoEstado.replace('_', ' ')}`);
      await fetchDetalle(); // Recargar
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const puedeActuar = ['control_acceso', 'supervisor', 'coordinador', 'coordinador_integral', 'admin_nodexia'].includes(primaryRole || '');
  const puedeCerrar = ['supervisor', 'coordinador', 'coordinador_integral', 'admin_nodexia'].includes(primaryRole || '');
  const puedeGestionarDocs = ['coordinador', 'coordinador_integral', 'supervisor', 'admin_nodexia'].includes(primaryRole || '');

  if (loading) {
    return (
      <MainLayout pageTitle="Incidencia">
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" text="Cargando detalle..." variant="logo" color="primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !incidencia) {
    return (
      <MainLayout pageTitle="Incidencia">
        <div className="max-w-3xl mx-auto py-12">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-300 mb-4">{error || 'Incidencia no encontrada'}</p>
            <button onClick={() => router.push('/incidencias')} className="text-blue-400 hover:text-blue-300 text-sm">
              ← Volver a incidencias
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const estadoCfg = ESTADO_CONFIG[incidencia.estado as EstadoIncidencia] || ESTADO_CONFIG.abierta;
  const severidadCfg = SEVERIDAD_CONFIG[incidencia.severidad as SeveridadIncidencia] || SEVERIDAD_CONFIG.media;
  const tipoLabel = TIPO_LABELS[incidencia.tipo_incidencia as TipoIncidenciaViaje] || incidencia.tipo_incidencia;
  const transicionesDisponibles = TRANSICIONES[incidencia.estado as EstadoIncidencia] || [];

  return (
    <MainLayout pageTitle={`Incidencia — ${tipoLabel}`}>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4">
          <button onClick={() => router.push('/incidencias')} className="text-blue-400 hover:text-blue-300 text-sm">
            ← Volver a incidencias
          </button>
        </div>

        {/* Header */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-sm px-3 py-1 rounded-full border font-medium ${severidadCfg.bg} ${severidadCfg.color}`}>
                  {severidadCfg.icon} {severidadCfg.label}
                </span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${estadoCfg.bg} ${estadoCfg.color}`}>
                  {estadoCfg.label}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">{tipoLabel}</h1>
            </div>
            <div className="text-right text-sm text-slate-500">
              <div>{formatFechaCompleta(incidencia.fecha_incidencia || incidencia.created_at)}</div>
            </div>
          </div>

          {/* Descripción */}
          <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
            <p className="text-slate-200 whitespace-pre-wrap">{incidencia.descripcion}</p>
          </div>

          {/* Info del viaje */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {incidencia.numero_viaje && (
              <div>
                <span className="text-xs text-slate-500 block">Viaje</span>
                <span className="text-white text-sm font-medium">🚛 {incidencia.numero_viaje}</span>
              </div>
            )}
            {incidencia.despacho_pedido_id && (
              <div>
                <span className="text-xs text-slate-500 block">Despacho</span>
                <span className="text-white text-sm font-medium">📦 {incidencia.despacho_pedido_id}</span>
              </div>
            )}
            {incidencia.producto && (
              <div>
                <span className="text-xs text-slate-500 block">Producto</span>
                <span className="text-white text-sm font-medium">{incidencia.producto}</span>
              </div>
            )}
            {incidencia.reportado_por_nombre && (
              <div>
                <span className="text-xs text-slate-500 block">Reportado por</span>
                <span className="text-white text-sm font-medium">👤 {incidencia.reportado_por_nombre}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documentos afectados (si los hay) */}
        {recursosAfectados.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
            <h3 className="text-purple-300 font-medium mb-3 text-sm">📄 Documentos Afectados</h3>
            <div className="space-y-2">
              {recursosAfectados.map((doc: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <span className="text-white font-medium">{incidencia.recursos_nombres?.[doc.entidad_id] || doc.tipo}</span>
                    <span className="text-slate-500 ml-2">({doc.entidad_tipo})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    doc.problema === 'vencido' ? 'bg-red-500/20 text-red-300' :
                    doc.problema === 'faltante' ? 'bg-orange-500/20 text-orange-300' :
                    doc.problema === 'rechazado' ? 'bg-red-500/20 text-red-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {doc.problema}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel de gestión de documentación — solo para incidencias de docs + roles autorizados */}
        {incidencia.tipo_incidencia === 'documentacion_faltante' && puedeGestionarDocs && incidencia.estado !== 'cerrada' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
            <h3 className="text-blue-300 font-medium mb-3 text-sm">🔧 Gestionar Documentación</h3>
            <p className="text-slate-400 text-xs mb-4">
              Subí o actualizá los documentos problemáticos. Una vez válidos, Control de Acceso podrá re-escanear y habilitar el ingreso.
            </p>

            {/* Docs actuales del recurso */}
            {docsLoading ? (
              <div className="text-slate-400 text-sm py-4 text-center">Cargando documentos...</div>
            ) : docsRecurso.length > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-slate-300 text-xs font-medium mb-2">Documentos actuales del recurso:</p>
                {docsRecurso.map((doc) => {
                  const esProblematico = recursosAfectados.some(
                    (da: any) => da.tipo === doc.tipo_documento && da.entidad_tipo === doc._entidad_tipo
                  );
                  const esVigente = doc.estado_vigencia === 'vigente' || doc.estado_vigencia === 'aprobado_provisorio';
                  return (
                    <div key={doc.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      esProblematico && !esVigente ? 'bg-red-900/30 border border-red-500/20' : 'bg-slate-900/50'
                    }`}>
                      <div className="flex-1">
                        <span className="text-white font-medium">{doc.tipo_documento}</span>
                        <span className="text-slate-500 ml-2">({doc._entidad_tipo})</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          doc.estado_vigencia === 'vigente' ? 'bg-green-500/20 text-green-300' :
                          doc.estado_vigencia === 'aprobado_provisorio' ? 'bg-blue-500/20 text-blue-300' :
                          doc.estado_vigencia === 'pendiente_validacion' ? 'bg-yellow-500/20 text-yellow-300' :
                          doc.estado_vigencia === 'vencido' ? 'bg-red-500/20 text-red-300' :
                          doc.estado_vigencia === 'rechazado' ? 'bg-red-500/20 text-red-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {doc.estado_vigencia === 'aprobado_provisorio' ? 'Aprobado 24h' : doc.estado_vigencia}
                        </span>
                        {doc.fecha_vencimiento && (
                          <span className="text-slate-500 text-xs ml-2">
                            Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                      {/* Botón aprobar provisorio — solo si el doc no está vigente */}
                      {!esVigente && (
                        <button
                          onClick={() => aprobarProvisorio(doc.id)}
                          disabled={validandoDocId === doc.id}
                          className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap"
                        >
                          {validandoDocId === doc.id ? '...' : '✅ Aprobar Provisorio'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-xs mb-4">No se encontraron documentos cargados para los recursos afectados.</p>
            )}

            {/* Botones para subir documentos nuevos por cada recurso afectado */}
            {recursosAfectados.length > 0 && (
              <div className="space-y-2">
                {/* Agrupar por entidad para no repetir botones */}
                {[...new Map(recursosAfectados.map((da: any) => [`${da.entidad_tipo}:${da.entidad_id}`, da])).values()].map((da: any) => (
                  <div key={`${da.entidad_tipo}:${da.entidad_id}`}>
                    {showUploadFor?.entidadTipo === da.entidad_tipo && showUploadFor?.entidadId === da.entidad_id ? (
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <SubirDocumento
                          entidadTipo={da.entidad_tipo}
                          entidadId={da.entidad_id}
                          empresaId={incidencia.viaje?.despachos?.empresa_id || ''}
                          onUploadSuccess={() => {
                            setShowUploadFor(null);
                            setMessage('✅ Documento subido. Requiere aprobación provisoria o validación admin.');
                            fetchDocsRecurso();
                          }}
                          onCancel={() => setShowUploadFor(null)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowUploadFor({ entidadTipo: da.entidad_tipo, entidadId: da.entidad_id })}
                        className="w-full px-4 py-2 bg-slate-700 text-slate-200 text-sm rounded-lg hover:bg-slate-600 transition-all text-left flex items-center gap-2"
                      >
                        <span>📤</span>
                        <span>Subir documento para {da.entidad_tipo}: {incidencia.recursos_nombres?.[da.entidad_id] || da.entidad_id?.substring(0, 8) + '...'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resolución (si existe) */}
        {incidencia.resolucion && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
            <h3 className="text-green-300 font-medium mb-2 text-sm">✅ Resolución</h3>
            <p className="text-slate-200 text-sm whitespace-pre-wrap">{incidencia.resolucion}</p>
            {incidencia.resuelto_por_nombre && (
              <p className="text-slate-500 text-xs mt-2">
                Por: {incidencia.resuelto_por_nombre}
                {incidencia.fecha_resolucion && ` — ${formatFechaCompleta(incidencia.fecha_resolucion)}`}
              </p>
            )}
          </div>
        )}

        {/* Acciones */}
        {puedeActuar && transicionesDisponibles.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-4">
            <h3 className="text-white font-medium mb-3 text-sm">Acciones</h3>

            {/* Campo resolución si la transición lo necesita */}
            {(transicionesDisponibles.includes('resuelta') || transicionesDisponibles.includes('cerrada')) && (
              <textarea
                value={resolucionText}
                onChange={e => setResolucionText(e.target.value)}
                placeholder="Descripción de la resolución..."
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 mb-3 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500 resize-none"
                rows={3}
              />
            )}

            <div className="flex gap-3 flex-wrap">
              {transicionesDisponibles.includes('en_proceso') && (
                <button
                  onClick={() => cambiarEstado('en_proceso')}
                  disabled={actionLoading}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium transition-all"
                >
                  🔄 Tomar en Proceso
                </button>
              )}
              {transicionesDisponibles.includes('resuelta') && (
                <button
                  onClick={() => cambiarEstado('resuelta')}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-all"
                >
                  ✅ Resolver
                </button>
              )}
              {transicionesDisponibles.includes('cerrada') && puedeCerrar && (
                <button
                  onClick={() => cambiarEstado('cerrada')}
                  disabled={actionLoading}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm font-medium transition-all"
                >
                  ⚫ Cerrar
                </button>
              )}
            </div>

            {message && (
              <div className={`mt-3 text-sm ${message.startsWith('✅') ? 'text-green-400' : message.startsWith('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default IncidenciaDetallePage;
