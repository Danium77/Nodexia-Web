import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ROLES_BY_TIPO, TIPO_EMPRESA_LABELS, ROL_INTERNO_LABELS } from '@/lib/types';
import type { TipoEmpresa, RolInterno } from '@/lib/types';
import {
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface FuncionSistema {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  tipos_aplicables: string[];
  activo: boolean;
  empresa_habilitada?: boolean;
  empresa_config?: Record<string, unknown>;
  roles_override?: { rol_interno: string; visible: boolean }[];
}

interface Empresa {
  id: string;
  nombre: string;
  tipo_empresa: string;
  cuit: string | null;
}

type Vista = 'global' | 'empresa';

export default function GestionFunciones() {
  const [funciones, setFunciones] = useState<FuncionSistema[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [vista, setVista] = useState<Vista>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load empresas list
  useEffect(() => {
    supabase
      .from('empresas')
      .select('id, nombre, tipo_empresa, cuit')
      .order('nombre')
      .then(({ data }) => setEmpresas(data ?? []));
  }, []);

  // Load funciones (global or per empresa)
  const loadFunciones = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const url = selectedEmpresa
        ? `/api/admin/funciones?empresa_id=${selectedEmpresa.id}`
        : '/api/admin/funciones';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setFunciones(data);
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresa]);

  useEffect(() => {
    loadFunciones();
  }, [loadFunciones]);

  // API call helper
  const apiCall = useCallback(async (body: Record<string, unknown>) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return;

    const res = await fetch('/api/admin/funciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error');
    }
  }, []);

  // Toggle global kill switch
  const toggleGlobal = async (funcion: FuncionSistema) => {
    setSaving(funcion.id);
    try {
      await apiCall({
        action: 'toggle_global',
        funcion_id: funcion.id,
        activo: !funcion.activo,
      });
      showToast('success', `${funcion.nombre}: ${!funcion.activo ? 'activada' : 'desactivada'} globalmente`);
      await loadFunciones();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(null);
    }
  };

  // Toggle empresa feature
  const toggleEmpresa = async (funcion: FuncionSistema) => {
    if (!selectedEmpresa) return;
    setSaving(funcion.id);
    try {
      await apiCall({
        action: 'toggle_empresa',
        empresa_id: selectedEmpresa.id,
        funcion_id: funcion.id,
        habilitada: !funcion.empresa_habilitada,
      });
      showToast('success', `${funcion.nombre}: ${!funcion.empresa_habilitada ? 'habilitada' : 'deshabilitada'} para ${selectedEmpresa.nombre}`);
      await loadFunciones();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(null);
    }
  };

  // Toggle role visibility
  const toggleRol = async (funcion: FuncionSistema, rol: string, currentVisible: boolean) => {
    if (!selectedEmpresa) return;
    setSaving(`${funcion.id}-${rol}`);
    try {
      await apiCall({
        action: 'toggle_rol',
        empresa_id: selectedEmpresa.id,
        funcion_id: funcion.id,
        rol_interno: rol,
        visible: !currentVisible,
      });
      showToast('success', `${funcion.nombre} → ${rol}: ${!currentVisible ? 'visible' : 'oculta'}`);
      await loadFunciones();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(null);
    }
  };

  // Group funciones by modulo
  const grouped = funciones.reduce<Record<string, FuncionSistema[]>>((acc, f) => {
    (acc[f.modulo] = acc[f.modulo] || []).push(f);
    return acc;
  }, {});

  const moduloLabels: Record<string, string> = {
    operaciones: 'Operaciones',
    analytics: 'Analytics',
    general: 'General',
  };

  const empresaRoles = selectedEmpresa
    ? ROLES_BY_TIPO[selectedEmpresa.tipo_empresa as TipoEmpresa] ?? []
    : [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header + View toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CogIcon className="h-7 w-7 text-cyan-400" />
            Gestión de Funciones
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Controla qué funciones están disponibles por empresa y rol
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setVista('global'); setSelectedEmpresa(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
              vista === 'global'
                ? 'bg-cyan-600 text-white'
                : 'bg-[#1b273b] text-gray-300 hover:bg-[#243044]'
            }`}
          >
            <GlobeAltIcon className="h-4 w-4" /> Global
          </button>
          <button
            onClick={() => setVista('empresa')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
              vista === 'empresa'
                ? 'bg-cyan-600 text-white'
                : 'bg-[#1b273b] text-gray-300 hover:bg-[#243044]'
            }`}
          >
            <BuildingOfficeIcon className="h-4 w-4" /> Por Empresa
          </button>
        </div>
      </div>

      {/* Empresa selector (when vista=empresa) */}
      {vista === 'empresa' && (
        <div className="bg-[#1b273b] rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Seleccionar empresa</label>
          <select
            value={selectedEmpresa?.id ?? ''}
            onChange={(e) => {
              const emp = empresas.find(x => x.id === e.target.value) ?? null;
              setSelectedEmpresa(emp);
            }}
            className="w-full sm:w-96 bg-[#0f1729] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">— Seleccionar —</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} ({TIPO_EMPRESA_LABELS[emp.tipo_empresa as TipoEmpresa] ?? emp.tipo_empresa})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Cargando funciones...</div>
      ) : (
        Object.entries(grouped).map(([modulo, fns]) => (
          <div key={modulo} className="bg-[#1b273b] rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-[#162032] border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                {moduloLabels[modulo] ?? modulo}
              </h3>
            </div>

            <div className="divide-y divide-gray-700/50">
              {fns.map(fn => {
                const isSaving = saving === fn.id;
                const aplicable = !selectedEmpresa || fn.tipos_aplicables.includes(selectedEmpresa.tipo_empresa);

                return (
                  <div key={fn.id} className={`px-5 py-4 ${!aplicable ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{fn.nombre}</span>
                          <span className="text-xs text-gray-500 font-mono">{fn.clave}</span>
                          {fn.tipos_aplicables.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                              {t}
                            </span>
                          ))}
                        </div>
                        {fn.descripcion && (
                          <p className="text-sm text-gray-400 mt-0.5">{fn.descripcion}</p>
                        )}
                      </div>

                      {/* Global view: kill switch */}
                      {vista === 'global' && (
                        <button
                          onClick={() => toggleGlobal(fn)}
                          disabled={!!saving}
                          className="flex items-center gap-1.5 ml-4"
                        >
                          {fn.activo ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-red-500" />
                          )}
                          <span className={`text-sm ${fn.activo ? 'text-green-400' : 'text-red-400'}`}>
                            {isSaving ? '...' : fn.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </button>
                      )}

                      {/* Empresa view: empresa toggle */}
                      {vista === 'empresa' && selectedEmpresa && aplicable && (
                        <button
                          onClick={() => toggleEmpresa(fn)}
                          disabled={!fn.activo || !!saving}
                          className="flex items-center gap-1.5 ml-4"
                          title={!fn.activo ? 'Desactivada globalmente' : ''}
                        >
                          {fn.empresa_habilitada ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-gray-500" />
                          )}
                          <span className={`text-sm ${fn.empresa_habilitada ? 'text-green-400' : 'text-gray-400'}`}>
                            {saving === fn.id ? '...' : fn.empresa_habilitada ? 'Habilitada' : 'Deshabilitada'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Role overrides (empresa view, when feature is enabled) */}
                    {vista === 'empresa' && selectedEmpresa && aplicable && fn.empresa_habilitada && fn.activo && empresaRoles.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <UserGroupIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                        {empresaRoles.map(rol => {
                          const override = fn.roles_override?.find(r => r.rol_interno === rol);
                          const isVisible = override?.visible ?? true;
                          const rolSaving = saving === `${fn.id}-${rol}`;

                          return (
                            <button
                              key={rol}
                              onClick={() => toggleRol(fn, rol, isVisible)}
                              disabled={!!saving}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                isVisible
                                  ? 'bg-green-900/30 border-green-700 text-green-400 hover:bg-green-900/50'
                                  : 'bg-gray-800 border-gray-600 text-gray-500 hover:bg-gray-700 line-through'
                              }`}
                            >
                              {rolSaving ? '...' : ROL_INTERNO_LABELS[rol as RolInterno] ?? rol}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
