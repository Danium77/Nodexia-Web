// components/Documentacion/ListaDocumentos.tsx
// Lista de documentos de una entidad con filtros y estados

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  DocumentTextIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import DocumentoCard from './DocumentoCard';

interface ListaDocumentosProps {
  entidadTipo: 'chofer' | 'camion' | 'acoplado' | 'transporte';
  entidadId: string;
  showActions?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // en milisegundos
  onDocumentoDeleted?: () => void;
}

interface Documento {
  id: string;
  tipo_documento: string;
  nombre_archivo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado_vigencia: 'pendiente_validacion' | 'vigente' | 'por_vencer' | 'vencido' | 'rechazado';
  file_url: string;
  validado_por?: string;
  fecha_validacion?: string;
  motivo_rechazo?: string;
  created_at: string;
}

type FiltroEstado = 'todos' | 'vigente' | 'por_vencer' | 'vencido' | 'pendiente_validacion' | 'rechazado';

export default function ListaDocumentos({
  entidadTipo,
  entidadId,
  showActions = true,
  autoRefresh = false,
  refreshInterval = 30000,
  onDocumentoDeleted,
}: ListaDocumentosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  // Cargar documentos
  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/documentacion/listar?entidad_tipo=${entidadTipo}&entidad_id=${entidadId}`,
        {
          headers: {
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }

      const result = await response.json();
      setDocumentos(result.data?.documentos || []);
    } catch (err) {
      console.error('Error al cargar documentos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Cargar documentos al montar
  useEffect(() => {
    cargarDocumentos();
  }, [entidadTipo, entidadId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      cargarDocumentos();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, entidadTipo, entidadId]);

  // Eliminar documento
  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/documentacion/${id}`, {
        method: 'DELETE',
        headers: {
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar documento');
      }

      // Actualizar lista
      await cargarDocumentos();
      
      if (onDocumentoDeleted) {
        onDocumentoDeleted();
      }
    } catch (err) {
      console.error('Error al eliminar documento:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar documento');
    }
  };

  // Ver documento
  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  // Filtrar documentos
  const documentosFiltrados = documentos.filter((doc) => {
    if (filtroEstado === 'todos') return true;
    return doc.estado_vigencia === filtroEstado;
  });

  // Contar documentos por estado
  const contadores = {
    vigente: documentos.filter((d) => d.estado_vigencia === 'vigente').length,
    por_vencer: documentos.filter((d) => d.estado_vigencia === 'por_vencer').length,
    vencido: documentos.filter((d) => d.estado_vigencia === 'vencido').length,
    pendiente_validacion: documentos.filter((d) => d.estado_vigencia === 'pendiente_validacion').length,
    rechazado: documentos.filter((d) => d.estado_vigencia === 'rechazado').length,
  };

  // Estados de filtro disponibles
  const filtrosDisponibles: { value: FiltroEstado; label: string; count: number; color: string }[] = [
    { value: 'todos', label: 'Todos', count: documentos.length, color: 'text-slate-300' },
    { value: 'vigente', label: 'Vigentes', count: contadores.vigente, color: 'text-green-400' },
    { value: 'por_vencer', label: 'Por Vencer', count: contadores.por_vencer, color: 'text-yellow-400' },
    { value: 'vencido', label: 'Vencidos', count: contadores.vencido, color: 'text-red-400' },
    { value: 'pendiente_validacion', label: 'Pendientes', count: contadores.pendiente_validacion, color: 'text-blue-400' },
    { value: 'rechazado', label: 'Rechazados', count: contadores.rechazado, color: 'text-red-400' },
  ];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Documentación
              </h3>
              <p className="text-sm text-slate-400">
                {documentos.length} documento{documentos.length !== 1 ? 's' : ''} registrado{documentos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={cargarDocumentos}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Recargar"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Resumen de estados */}
        {documentos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-green-300">Vigentes</p>
                  <p className="text-lg font-bold text-green-200">{contadores.vigente}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-yellow-300">Por Vencer</p>
                  <p className="text-lg font-bold text-yellow-200">{contadores.por_vencer}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <XCircleIcon className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-red-300">Vencidos</p>
                  <p className="text-lg font-bold text-red-200">{contadores.vencido}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-blue-300">Pendientes</p>
                  <p className="text-lg font-bold text-blue-200">{contadores.pendiente_validacion}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <XCircleIcon className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-red-300">Rechazados</p>
                  <p className="text-lg font-bold text-red-200">{contadores.rechazado}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      {documentos.length > 0 && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 flex-wrap">
            <FunnelIcon className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Filtrar:</span>
            {filtrosDisponibles.map((filtro) => (
              <button
                key={filtro.value}
                onClick={() => setFiltroEstado(filtro.value)}
                className={`
                  px-3 py-1 rounded-lg text-sm font-medium transition-colors
                  ${filtroEstado === filtro.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }
                `}
              >
                {filtro.label} ({filtro.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-slate-400 animate-spin" />
            <span className="ml-3 text-slate-400">Cargando documentos...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium mb-1">Error al cargar documentos</p>
              <p className="text-sm text-slate-400">{error}</p>
              <button
                onClick={cargarDocumentos}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <DocumentTextIcon className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">
                {documentos.length === 0
                  ? 'No hay documentos registrados'
                  : `No hay documentos ${filtroEstado === 'todos' ? '' : filtroEstado.replace('_', ' ')}`}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {documentos.length === 0
                  ? 'Sube tu primer documento para comenzar'
                  : 'Prueba con otro filtro'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {documentosFiltrados.map((documento) => (
              <DocumentoCard
                key={documento.id}
                documento={documento}
                onDelete={showActions ? handleDelete : undefined}
                onView={showActions ? handleView : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
