// components/Transporte/DocumentosFlotaContent.tsx
// Gestión de documentación de flota (choferes, camiones, acoplados)
// UX: al seleccionar entidad, muestra documentos requeridos con estado inline

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import FormCard from '../ui/FormCard';
import { SubirDocumento } from '../Documentacion';

// Documentos requeridos por tipo de entidad
// Para chofer: licencia es obligatoria + (ART o Seguro de Vida - al menos uno)
const DOCUMENTOS_REQUERIDOS: Record<string, { tipo: string; label: string; alternativa?: string }[]> = {
  chofer: [
    { tipo: 'licencia_conducir', label: 'Licencia de Conducir' },
    { tipo: 'art_clausula_no_repeticion', label: 'ART Cláusula No Repetición', alternativa: 'seguro_vida_autonomo' },
    { tipo: 'seguro_vida_autonomo', label: 'Seguro de Vida Autónomo', alternativa: 'art_clausula_no_repeticion' },
  ],
  camion: [
    { tipo: 'seguro', label: 'Seguro' },
    { tipo: 'rto', label: 'Revisión Técnica Obligatoria (RTO)' },
    { tipo: 'cedula', label: 'Cédula Verde' },
  ],
  acoplado: [
    { tipo: 'seguro', label: 'Seguro' },
    { tipo: 'rto', label: 'Revisión Técnica Obligatoria (RTO)' },
    { tipo: 'cedula', label: 'Cédula Verde' },
  ],
};

interface Recurso {
  id: string;
  tipo: 'chofer' | 'camion' | 'acoplado';
  nombre: string;
  identificador: string;
}

interface DocumentoExistente {
  id: string;
  tipo_documento: string;
  nombre_archivo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado_vigencia: 'pendiente_validacion' | 'vigente' | 'por_vencer' | 'vencido' | 'rechazado';
  file_url: string;
  created_at: string;
}

export default function DocumentosFlotaContent() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<Recurso | null>(null);
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'chofer' | 'camion' | 'acoplado'>('todos');
  // Documentos cargados del recurso seleccionado
  const [documentos, setDocumentos] = useState<DocumentoExistente[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  // Tipo de documento para el cual se abre el form de subida
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  useEffect(() => {
    cargarEmpresaYRecursos();
  }, []);

  const cargarEmpresaYRecursos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: usuarioEmpresa, error: empresaError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (empresaError) throw empresaError;
      if (!usuarioEmpresa) throw new Error('No se encontró empresa asociada');

      setEmpresaId(usuarioEmpresa.empresa_id);

      const { data: choferes } = await supabase
        .from('choferes')
        .select('id, nombre, apellido, dni')
        .eq('empresa_id', usuarioEmpresa.empresa_id);

      const { data: camiones } = await supabase
        .from('camiones')
        .select('id, patente, marca, modelo')
        .eq('empresa_id', usuarioEmpresa.empresa_id);

      const { data: acoplados } = await supabase
        .from('acoplados')
        .select('id, patente, marca, modelo')
        .eq('empresa_id', usuarioEmpresa.empresa_id);

      const recursosCompletos: Recurso[] = [
        ...(choferes || []).map(c => ({
          id: c.id,
          tipo: 'chofer' as const,
          nombre: `${c.nombre} ${c.apellido}`,
          identificador: c.dni || 'Sin DNI'
        })),
        ...(camiones || []).map(c => ({
          id: c.id,
          tipo: 'camion' as const,
          nombre: `${c.marca} ${c.modelo}`,
          identificador: c.patente
        })),
        ...(acoplados || []).map(a => ({
          id: a.id,
          tipo: 'acoplado' as const,
          nombre: `${a.marca} ${a.modelo}`,
          identificador: a.patente
        }))
      ];

      setRecursos(recursosCompletos);
    } catch (err: any) {
      console.error('Error cargando recursos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar documentos del recurso seleccionado
  const cargarDocumentosRecurso = useCallback(async (recurso: Recurso) => {
    setLoadingDocs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/documentacion/listar?entidad_tipo=${recurso.tipo}&entidad_id=${recurso.id}`,
        {
          headers: {
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
        }
      );
      if (!response.ok) throw new Error('Error al cargar documentos');
      const result = await response.json();
      setDocumentos(result.data?.documentos || []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const handleSeleccionarRecurso = (recurso: Recurso) => {
    setRecursoSeleccionado(recurso);
    setUploadingTipo(null);
    cargarDocumentosRecurso(recurso);
  };

  const handleUploadSuccess = () => {
    setUploadingTipo(null);
    if (recursoSeleccionado) {
      cargarDocumentosRecurso(recursoSeleccionado);
    }
  };

  // Obtener el documento más reciente de un tipo específico
  const getDocumentoPorTipo = (tipo: string): DocumentoExistente | null => {
    const docs = documentos
      .filter(d => d.tipo_documento === tipo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return docs[0] || null;
  };

  // Calcular resumen de estado para el recurso seleccionado
  const getResumenEstado = () => {
    if (!recursoSeleccionado) return { total: 0, ok: 0, pendiente: 0, vencido: 0, sinDoc: 0 };
    const requeridos = DOCUMENTOS_REQUERIDOS[recursoSeleccionado.tipo] || [];
    let ok = 0, pendiente = 0, vencido = 0, sinDoc = 0;
    const alternativasCubiertas = new Set<string>();
    
    for (const req of requeridos) {
      // Si este doc tiene alternativa y la alternativa ya cubrió el grupo, saltar
      if (req.alternativa && alternativasCubiertas.has(req.tipo)) continue;
      
      const doc = getDocumentoPorTipo(req.tipo);
      if (!doc) {
        // Verificar si la alternativa existe
        if (req.alternativa) {
          const altDoc = getDocumentoPorTipo(req.alternativa);
          if (altDoc) {
            alternativasCubiertas.add(req.alternativa);
            if (altDoc.estado_vigencia === 'vigente') ok++;
            else if (altDoc.estado_vigencia === 'pendiente_validacion') pendiente++;
            else vencido++;
            continue;
          }
        }
        sinDoc++;
        continue;
      }
      if (req.alternativa) alternativasCubiertas.add(req.tipo);
      if (doc.estado_vigencia === 'vigente') ok++;
      else if (doc.estado_vigencia === 'pendiente_validacion') pendiente++;
      else vencido++;
    }
    
    // Ajustar total: para chofer, descontar 1 porque ART/Seguro son alternativos
    const totalAjustado = recursoSeleccionado.tipo === 'chofer' ? 2 : requeridos.length;
    return { total: totalAjustado, ok, pendiente, vencido, sinDoc };
  };

  // Ver documento
  const handleVerDocumento = async (fileUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from('documentacion-entidades')
        .createSignedUrl(fileUrl, 300);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error abriendo documento:', err);
    }
  };

  const recursosFiltrados = filtroTipo === 'todos'
    ? recursos
    : recursos.filter(r => r.tipo === filtroTipo);

  const contadorPorTipo = {
    chofer: recursos.filter(r => r.tipo === 'chofer').length,
    camion: recursos.filter(r => r.tipo === 'camion').length,
    acoplado: recursos.filter(r => r.tipo === 'acoplado').length,
  };

  const resumen = getResumenEstado();

  return (
    <div className="p-6 space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-center justify-between">
          <p className="text-red-200">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'todos', label: 'Todos', count: recursos.length },
          { value: 'chofer', label: '👤 Choferes', count: contadorPorTipo.chofer },
          { value: 'camion', label: '🚛 Camiones', count: contadorPorTipo.camion },
          { value: 'acoplado', label: '🔗 Acoplados', count: contadorPorTipo.acoplado },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroTipo === f.value
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Selector de Recurso */}
      <FormCard>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-200">📂 Seleccionar Recurso</h3>
          <p className="text-sm text-gray-400 mt-1">Seleccione un chofer, camión o acoplado para ver sus documentos requeridos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
              <p className="text-slate-400 mt-2 text-sm">Cargando recursos...</p>
            </div>
          ) : recursosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">
              {recursos.length === 0 ? 'No hay recursos registrados en tu empresa' : 'No hay recursos de este tipo'}
            </div>
          ) : (
            recursosFiltrados.map((recurso) => (
              <button
                key={recurso.id}
                onClick={() => handleSeleccionarRecurso(recurso)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  recursoSeleccionado?.id === recurso.id
                    ? 'border-cyan-500 bg-cyan-900/30'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg text-lg ${
                    recurso.tipo === 'chofer' ? 'bg-green-600' :
                    recurso.tipo === 'camion' ? 'bg-blue-600' :
                    'bg-purple-600'
                  }`}>
                    {recurso.tipo === 'chofer' && '👤'}
                    {recurso.tipo === 'camion' && '🚛'}
                    {recurso.tipo === 'acoplado' && '🔗'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{recurso.nombre}</p>
                    <p className="text-slate-400 text-sm">{recurso.identificador}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </FormCard>

      {/* Documentos requeridos del recurso seleccionado */}
      {recursoSeleccionado && empresaId && (
        <FormCard>
          {/* Header con nombre y resumen */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-200">
                📄 Documentos de {recursoSeleccionado.nombre}
                <span className="text-sm text-slate-400 ml-2">({recursoSeleccionado.identificador})</span>
              </h3>
              {!loadingDocs && (
                <div className="flex gap-3 mt-2 text-xs">
                  {resumen.ok > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {resumen.ok} vigente{resumen.ok > 1 ? 's' : ''}
                    </span>
                  )}
                  {resumen.pendiente > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <ClockIcon className="h-3.5 w-3.5" /> {resumen.pendiente} pendiente{resumen.pendiente > 1 ? 's' : ''}
                    </span>
                  )}
                  {resumen.vencido > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircleIcon className="h-3.5 w-3.5" /> {resumen.vencido} vencido{resumen.vencido > 1 ? 's' : ''}
                    </span>
                  )}
                  {resumen.sinDoc > 0 && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <DocumentTextIcon className="h-3.5 w-3.5" /> {resumen.sinDoc} sin cargar
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Badge global */}
            {!loadingDocs && (
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                resumen.sinDoc === 0 && resumen.vencido === 0 && resumen.pendiente === 0
                  ? 'bg-green-600/30 text-green-300 border border-green-600'
                  : resumen.vencido > 0 || resumen.sinDoc > 0
                    ? 'bg-red-600/30 text-red-300 border border-red-600'
                    : 'bg-yellow-600/30 text-yellow-300 border border-yellow-600'
              }`}>
                {resumen.sinDoc === 0 && resumen.vencido === 0 && resumen.pendiente === 0
                  ? '✅ Completo'
                  : resumen.vencido > 0 || resumen.sinDoc > 0
                    ? '⚠️ Incompleto'
                    : '⏳ En validación'}
              </div>
            )}
          </div>

          {/* Lista de documentos requeridos */}
          {loadingDocs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600 mx-auto"></div>
              <p className="text-slate-400 mt-2 text-sm">Cargando documentos...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(DOCUMENTOS_REQUERIDOS[recursoSeleccionado.tipo] || []).map((docReq) => {
                const docExistente = getDocumentoPorTipo(docReq.tipo);
                const isUploading = uploadingTipo === docReq.tipo;

                return (
                  <div key={docReq.tipo} className="border border-slate-700 rounded-xl overflow-hidden">
                    {/* Fila del documento */}
                    <div className={`p-4 flex items-center justify-between gap-4 ${
                      docExistente
                        ? docExistente.estado_vigencia === 'vigente' ? 'bg-green-950/20' :
                          docExistente.estado_vigencia === 'por_vencer' ? 'bg-yellow-950/20' :
                          docExistente.estado_vigencia === 'pendiente_validacion' ? 'bg-blue-950/20' :
                          'bg-red-950/20'
                        : 'bg-slate-800/50'
                    }`}>
                      {/* Info del doc */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Ícono estado */}
                        <div className="flex-shrink-0">
                          {!docExistente ? (
                            <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center">
                              <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                            </div>
                          ) : docExistente.estado_vigencia === 'vigente' ? (
                            <div className="h-9 w-9 rounded-full bg-green-600/30 flex items-center justify-center">
                              <CheckCircleIcon className="h-5 w-5 text-green-400" />
                            </div>
                          ) : docExistente.estado_vigencia === 'por_vencer' ? (
                            <div className="h-9 w-9 rounded-full bg-yellow-600/30 flex items-center justify-center">
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                            </div>
                          ) : docExistente.estado_vigencia === 'pendiente_validacion' ? (
                            <div className="h-9 w-9 rounded-full bg-blue-600/30 flex items-center justify-center">
                              <ClockIcon className="h-5 w-5 text-blue-400" />
                            </div>
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-red-600/30 flex items-center justify-center">
                              <XCircleIcon className="h-5 w-5 text-red-400" />
                            </div>
                          )}
                        </div>

                        {/* Texto */}
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm">{docReq.label}</p>
                          {docExistente ? (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                docExistente.estado_vigencia === 'vigente' ? 'bg-green-600/30 text-green-300' :
                                docExistente.estado_vigencia === 'por_vencer' ? 'bg-yellow-600/30 text-yellow-300' :
                                docExistente.estado_vigencia === 'pendiente_validacion' ? 'bg-blue-600/30 text-blue-300' :
                                docExistente.estado_vigencia === 'rechazado' ? 'bg-red-600/30 text-red-300' :
                                'bg-red-600/30 text-red-300'
                              }`}>
                                {docExistente.estado_vigencia === 'vigente' ? 'Vigente' :
                                 docExistente.estado_vigencia === 'por_vencer' ? 'Por vencer' :
                                 docExistente.estado_vigencia === 'pendiente_validacion' ? 'Pendiente validación' :
                                 docExistente.estado_vigencia === 'rechazado' ? 'Rechazado' :
                                 'Vencido'}
                              </span>
                              {docExistente.fecha_vencimiento && (
                                <span className="text-xs text-slate-400">
                                  Vto: {new Date(docExistente.fecha_vencimiento).toLocaleDateString('es-AR')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 mt-0.5">Sin documento cargado</p>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {docExistente && (
                          <button
                            onClick={() => handleVerDocumento(docExistente.file_url)}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all"
                            title="Ver documento"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setUploadingTipo(isUploading ? null : docReq.tipo)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isUploading
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : docExistente
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-cyan-600 text-white hover:bg-cyan-700'
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <XMarkIcon className="h-3.5 w-3.5" />
                              Cancelar
                            </>
                          ) : docExistente ? (
                            <>
                              <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                              Actualizar
                            </>
                          ) : (
                            <>
                              <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                              Subir
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Formulario de subida inline */}
                    {isUploading && (
                      <div className="border-t border-slate-700 bg-slate-800/80 p-4">
                        <SubirDocumento
                          entidadTipo={recursoSeleccionado.tipo}
                          entidadId={recursoSeleccionado.id}
                          empresaId={empresaId}
                          tiposPermitidos={[docReq.tipo]}
                          onUploadSuccess={handleUploadSuccess}
                          onCancel={() => setUploadingTipo(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </FormCard>
      )}
    </div>
  );
}
