// components/DocumentacionDetalle.tsx
// Componente para mostrar detalle completo de documentación de un viaje
// Consulta datos REALES de documentos_entidad para chofer, camión y acoplado

import { useState, useEffect } from 'react';
import { DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

interface DocumentoReal {
  id: string;
  tipo_documento: string;
  entidad_tipo: string;
  entidad_id: string;
  nombre_archivo: string;
  estado_vigencia: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
}

interface DocumentacionDetalleProps {
  numeroViaje: string;
  choferId?: string;
  camionId?: string;
  acopladoId?: string;
  onClose: () => void;
}

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
  tarjeta_verde: 'Cédula Verde',
  cedula_verde: 'Cédula Verde',
};

// Documentos requeridos por tipo de entidad
const DOCS_REQUERIDOS: Record<string, string[]> = {
  chofer: ['licencia_conducir', 'art_clausula_no_repeticion'], // Mínimo; el criterio real depende de si es autónomo
  camion: ['seguro', 'rto', 'cedula'],
  acoplado: ['seguro', 'rto', 'cedula'],
};

// Aliases para normalizar tipos de doc viejos
const TIPO_DOC_ALIASES: Record<string, string> = {
  vtv: 'rto',
  tarjeta_verde: 'cedula',
  cedula_verde: 'cedula',
};

function normalizarTipoDoc(tipo: string): string {
  return TIPO_DOC_ALIASES[tipo] || tipo;
}

const ENTIDAD_LABELS: Record<string, string> = {
  chofer: '👤 Chofer',
  camion: '🚛 Camión',
  acoplado: '🔗 Acoplado',
};

function calcularEstadoDoc(doc: DocumentoReal): { estado: string; diasRestantes: number | null } {
  if (doc.estado_vigencia === 'rechazado') return { estado: 'rechazado', diasRestantes: null };
  if (doc.estado_vigencia === 'pendiente_validacion') return { estado: 'pendiente', diasRestantes: null };
  if (!doc.fecha_vencimiento) return { estado: doc.estado_vigencia, diasRestantes: null };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vto = new Date(doc.fecha_vencimiento);
  vto.setHours(0, 0, 0, 0);
  const dias = Math.floor((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (dias < 0) return { estado: 'vencido', diasRestantes: dias };
  if (dias <= 30) return { estado: 'por_vencer', diasRestantes: dias };
  return { estado: 'vigente', diasRestantes: dias };
}

export default function DocumentacionDetalle({ numeroViaje, choferId, camionId, acopladoId, onClose }: DocumentacionDetalleProps) {
  const [documentos, setDocumentos] = useState<DocumentoReal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entidadNombres, setEntidadNombres] = useState<Record<string, string>>({});

  useEffect(() => {
    const cargarDocumentos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Recopilar IDs de entidades disponibles
        const entidadIds: string[] = [];
        if (choferId) entidadIds.push(choferId);
        if (camionId) entidadIds.push(camionId);
        if (acopladoId) entidadIds.push(acopladoId);

        if (entidadIds.length === 0) {
          setError('No se encontraron recursos asignados a este viaje');
          setLoading(false);
          return;
        }

        // Obtener token para API autenticada
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('No autenticado');
          setLoading(false);
          return;
        }

        // Usar API server-side que bypasea RLS (control-acceso no tiene acceso directo a documentos_entidad)
        const params = new URLSearchParams();
        if (choferId) params.set('chofer_id', choferId);
        if (camionId) params.set('camion_id', camionId);
        if (acopladoId) params.set('acoplado_id', acopladoId);

        const response = await fetch(`/api/control-acceso/documentos-detalle?${params}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status} al consultar documentos`);
        }

        const json = await response.json();
        if (!json.success || !json.data) {
          throw new Error('Respuesta inválida del servidor');
        }

        setDocumentos(json.data.documentos || []);
        setEntidadNombres(json.data.nombres || {});

      } catch (err: any) {
        console.error('Error cargando documentación:', err);
        setError(err.message || 'Error al cargar documentación');
      } finally {
        setLoading(false);
      }
    };

    cargarDocumentos();
  }, [choferId, camionId, acopladoId]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente': return 'bg-green-900 text-green-300 border-green-700';
      case 'por_vencer': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'vencido': return 'bg-red-900 text-red-300 border-red-700';
      case 'rechazado': return 'bg-red-900 text-red-300 border-red-700';
      case 'pendiente': case 'pendiente_validacion': return 'bg-blue-900 text-blue-300 border-blue-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'vigente': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'por_vencer': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'vencido': case 'rechazado': return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'pendiente': case 'pendiente_validacion': return <DocumentTextIcon className="h-4 w-4 text-blue-500" />;
      default: return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEstadoTexto = (estado: string, dias: number | null) => {
    switch (estado) {
      case 'vigente': return dias !== null ? `Vigente (${dias} días)` : 'Vigente';
      case 'por_vencer': return dias !== null ? `Por vencer (${dias} días)` : 'Por vencer';
      case 'vencido': return dias !== null ? `Vencido (${Math.abs(dias)} días)` : 'Vencido';
      case 'rechazado': return 'Rechazado';
      case 'pendiente': case 'pendiente_validacion': return 'Pendiente validación';
      default: return estado;
    }
  };

  // Agrupar documentos por entidad
  const docsPorEntidad = documentos.reduce((acc, doc) => {
    const key = `${doc.entidad_tipo}:${doc.entidad_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, DocumentoReal[]>);

  // Asegurar que todas las entidades del viaje estén representadas (incluso sin docs)
  if (choferId && !Object.keys(docsPorEntidad).some(k => k.startsWith('chofer:'))) {
    docsPorEntidad[`chofer:${choferId}`] = [];
  }
  if (camionId && !Object.keys(docsPorEntidad).some(k => k.startsWith('camion:'))) {
    docsPorEntidad[`camion:${camionId}`] = [];
  }
  if (acopladoId && !Object.keys(docsPorEntidad).some(k => k.startsWith('acoplado:'))) {
    docsPorEntidad[`acoplado:${acopladoId}`] = [];
  }

  // Calcular faltantes totales
  let totalFaltantes = 0;
  Object.entries(docsPorEntidad).forEach(([key, docs]) => {
    const [tipo] = key.split(':');
    const requeridos = DOCS_REQUERIDOS[tipo] || [];
    const tiposPresentes = docs.map(d => normalizarTipoDoc(d.tipo_documento));
    totalFaltantes += requeridos.filter(r => !tiposPresentes.includes(r)).length;
  });

  // Contadores
  const estadoDocs = documentos.map(d => calcularEstadoDoc(d));
  const vigentes = estadoDocs.filter(d => d.estado === 'vigente').length;
  const porVencer = estadoDocs.filter(d => d.estado === 'por_vencer').length;
  const vencidos = estadoDocs.filter(d => d.estado === 'vencido').length;
  const rechazados = estadoDocs.filter(d => d.estado === 'rechazado').length;
  const pendientes = estadoDocs.filter(d => d.estado === 'pendiente' || d.estado === 'pendiente_validacion').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-blue-100" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Documentación Detallada
                </h2>
                <p className="text-slate-400">Viaje: {numeroViaje}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-3"></div>
            <p className="text-slate-400">Cargando documentación...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-6">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
              ❌ {error}
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Resumen */}
            <div className="p-6 border-b border-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-green-900/40 border border-green-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-200">{vigentes}</p>
                  <p className="text-xs text-green-300">Vigentes</p>
                </div>
                <div className="bg-yellow-900/40 border border-yellow-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-200">{porVencer}</p>
                  <p className="text-xs text-yellow-300">Por Vencer</p>
                </div>
                <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-200">{vencidos + rechazados}</p>
                  <p className="text-xs text-red-300">Vencidos / Rechazados</p>
                </div>
                <div className={`border rounded-lg p-3 text-center ${totalFaltantes > 0 ? 'bg-red-900/60 border-red-600' : 'bg-slate-800 border-slate-600'}`}>
                  <p className={`text-2xl font-bold ${totalFaltantes > 0 ? 'text-red-200 animate-pulse' : 'text-slate-300'}`}>{totalFaltantes}</p>
                  <p className={`text-xs ${totalFaltantes > 0 ? 'text-red-300 font-semibold' : 'text-slate-400'}`}>Faltantes</p>
                </div>
                <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-200">{pendientes}</p>
                  <p className="text-xs text-blue-300">Pendientes</p>
                </div>
              </div>
            </div>

            {/* Documentos agrupados por entidad */}
            <div className="p-6">
              {documentos.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-lg">Sin documentos cargados</p>
                  <p className="text-slate-500 text-sm mt-1">
                    No se encontraron documentos para los recursos de este viaje
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(docsPorEntidad).map(([key, docs]) => {
                    const [tipo, id] = key.split(':');
                    const nombre = entidadNombres[id] || id;
                    
                    // Calcular docs faltantes para esta entidad
                    const requeridos = DOCS_REQUERIDOS[tipo] || [];
                    const tiposPresentes = docs.map(d => normalizarTipoDoc(d.tipo_documento));
                    const faltantes = requeridos.filter(r => !tiposPresentes.includes(r));
                    
                    return (
                      <div key={key}>
                        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                          <span>{ENTIDAD_LABELS[tipo] || tipo}</span>
                          <span className="text-cyan-400 font-normal">— {nombre}</span>
                          <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-full text-slate-400">
                            {docs.length} doc{docs.length !== 1 ? 's' : ''}
                          </span>
                          {faltantes.length > 0 && (
                            <span className="text-[10px] bg-red-900 px-2 py-0.5 rounded-full text-red-300">
                              {faltantes.length} faltante{faltantes.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </h3>
                        
                        {/* Docs faltantes */}
                        {faltantes.length > 0 && (
                          <div className="mb-3 space-y-1">
                            {faltantes.map(f => (
                              <div key={f} className="border border-red-800 bg-red-900/30 rounded-lg p-3 flex items-center gap-3">
                                <XCircleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <div>
                                  <h4 className="font-medium text-red-200 text-sm">{TIPO_DOC_LABELS[f] || f}</h4>
                                  <p className="text-xs text-red-400">No cargado — Requerido para operar</p>
                                </div>
                                <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-red-900 text-red-300 border-red-700 whitespace-nowrap">
                                  ❌ Faltante
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {docs.map((doc) => {
                            const { estado, diasRestantes } = calcularEstadoDoc(doc);
                            return (
                              <div
                                key={doc.id}
                                className="border border-slate-600 rounded-lg p-3 bg-slate-700/50 hover:border-slate-500 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {getEstadoIcon(estado)}
                                    <div className="min-w-0">
                                      <h4 className="font-medium text-slate-100 text-sm">
                                        {TIPO_DOC_LABELS[doc.tipo_documento] || doc.tipo_documento}
                                      </h4>
                                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                        {doc.fecha_vencimiento && (
                                          <span>
                                            Vto: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-AR')}
                                          </span>
                                        )}
                                        {doc.fecha_emision && (
                                          <span>
                                            Emis: {new Date(doc.fecha_emision).toLocaleDateString('es-AR')}
                                          </span>
                                        )}
                                        {!doc.fecha_vencimiento && !doc.fecha_emision && (
                                          <span className="text-slate-500">Sin fechas asignadas</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getEstadoColor(estado)}`}>
                                    {getEstadoIcon(estado)}
                                    <span>{getEstadoTexto(estado, diasRestantes)}</span>
                                  </span>
                                </div>

                                {estado === 'por_vencer' && diasRestantes !== null && diasRestantes <= 30 && (
                                  <div className="mt-2">
                                    <div className="w-full bg-slate-600 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          diasRestantes <= 7 ? 'bg-red-500' :
                                          diasRestantes <= 15 ? 'bg-yellow-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.max(10, (diasRestantes / 30) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <strong>{documentos.length}</strong> documentos encontrados
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-700 text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}