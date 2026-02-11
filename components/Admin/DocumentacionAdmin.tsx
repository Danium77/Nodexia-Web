// components/Admin/DocumentacionAdmin.tsx
// Componente principal del panel de validación de documentos (TASK-S04)

import { useEffect, useState, useCallback } from 'react';
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabaseClient';
import DocumentoPendienteCard, { type DocumentoPendiente } from './DocumentoPendienteCard';

interface Empresa {
  id: string;
  nombre: string;
}

type EntidadTipoFiltro = '' | 'chofer' | 'camion' | 'acoplado' | 'transporte';

export default function DocumentacionAdmin() {
  const [documentos, setDocumentos] = useState<DocumentoPendiente[]>([]);
  const [filteredDocumentos, setFilteredDocumentos] = useState<DocumentoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [entidadTipoFilter, setEntidadTipoFilter] = useState<EntidadTipoFiltro>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    };
  }, []);

  const fetchPendientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const res = await fetch('/api/documentacion/pendientes', { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status} al cargar documentos pendientes`);
      }

      const json = await res.json();
      const data: DocumentoPendiente[] = json.data?.documentos || [];
      setDocumentos(data);

      // Extraer empresas únicas para filtro
      const empresasMap = new Map<string, string>();
      data.forEach((doc) => {
        if (doc.empresa_id && doc.empresa_nombre) {
          empresasMap.set(doc.empresa_id, doc.empresa_nombre);
        }
      });
      setEmpresas(
        Array.from(empresasMap.entries()).map(([id, nombre]) => ({ id, nombre }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('Error fetching pendientes:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...documentos];

    if (empresaFilter) {
      filtered = filtered.filter((d) => d.empresa_id === empresaFilter);
    }

    if (entidadTipoFilter) {
      filtered = filtered.filter((d) => d.entidad_tipo === entidadTipoFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.tipo_documento.toLowerCase().includes(term) ||
          d.nombre_archivo.toLowerCase().includes(term) ||
          d.entidad_info.nombre?.toLowerCase().includes(term) ||
          d.entidad_info.patente?.toLowerCase().includes(term) ||
          d.empresa_nombre?.toLowerCase().includes(term)
      );
    }

    setFilteredDocumentos(filtered);
  }, [documentos, empresaFilter, entidadTipoFilter, searchTerm]);

  // Carga inicial
  useEffect(() => {
    void fetchPendientes();
  }, [fetchPendientes]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleAprobar = async (id: string) => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/documentacion/validar', {
        method: 'POST',
        headers,
        body: JSON.stringify({ documento_id: id, accion: 'aprobar' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al aprobar documento');
      }

      setSuccessMsg('Documento aprobado correctamente');
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al aprobar';
      setError(message);
    }
  };

  const handleRechazar = async (id: string, motivo: string) => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/documentacion/validar', {
        method: 'POST',
        headers,
        body: JSON.stringify({ documento_id: id, accion: 'rechazar', motivo_rechazo: motivo }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al rechazar documento');
      }

      setSuccessMsg('Documento rechazado correctamente');
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al rechazar';
      setError(message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">
            Validación de Documentos
          </h1>
          <p className="text-slate-400">
            Revisá y aprobá o rechazá los documentos subidos por las empresas de transporte
          </p>
        </div>
        <button
          onClick={() => void fetchPendientes()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total pendientes</span>
            <ClockIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-50">{documentos.length}</div>
        </div>

        <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Empresas con pendientes</span>
            <DocumentTextIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-50">{empresas.length}</div>
        </div>

        <div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Mostrando</span>
            <FunnelIcon className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-50">{filteredDocumentos.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#1b273b] rounded-lg border border-slate-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por tipo, archivo, entidad o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              showFilters || empresaFilter || entidadTipoFilter
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            Filtros
            {(empresaFilter || entidadTipoFilter) && (
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                {[empresaFilter, entidadTipoFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
            {/* Filtro por empresa */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Empresa
              </label>
              <select
                value={empresaFilter}
                onChange={(e) => setEmpresaFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por tipo entidad */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Tipo de entidad
              </label>
              <select
                value={entidadTipoFilter}
                onChange={(e) => setEntidadTipoFilter(e.target.value as EntidadTipoFiltro)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las entidades</option>
                <option value="chofer">Chofer</option>
                <option value="camion">Camión</option>
                <option value="acoplado">Acoplado</option>
                <option value="transporte">Transporte</option>
              </select>
            </div>

            {/* Limpiar filtros */}
            {(empresaFilter || entidadTipoFilter) && (
              <div className="sm:col-span-2">
                <button
                  onClick={() => {
                    setEmpresaFilter('');
                    setEntidadTipoFilter('');
                    setSearchTerm('');
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300">{successMsg}</p>
        </div>
      )}

      {/* Lista de documentos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ArrowPathIcon className="h-8 w-8 text-blue-400 animate-spin mb-4" />
          <p className="text-slate-400">Cargando documentos pendientes...</p>
        </div>
      ) : filteredDocumentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1b273b] rounded-lg border border-slate-700">
          {documentos.length === 0 ? (
            <>
              <CheckCircleIcon className="h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-1">
                No hay documentos pendientes
              </h3>
              <p className="text-slate-400 text-sm">
                Todos los documentos han sido validados
              </p>
            </>
          ) : (
            <>
              <FunnelIcon className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-1">
                Sin resultados
              </h3>
              <p className="text-slate-400 text-sm">
                No se encontraron documentos con los filtros aplicados
              </p>
              <button
                onClick={() => {
                  setEmpresaFilter('');
                  setEntidadTipoFilter('');
                  setSearchTerm('');
                }}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocumentos.map((doc) => (
            <DocumentoPendienteCard
              key={doc.id}
              documento={doc}
              onAprobar={handleAprobar}
              onRechazar={handleRechazar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
