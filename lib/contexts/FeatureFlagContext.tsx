import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/contexts/UserRoleContext';

interface FeatureFlagContextType {
  features: Set<string>;
  loading: boolean;
  hasFeature: (key: string) => boolean;
  refreshFeatures: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const { empresaId, primaryRole } = useUserRole();
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    // admin_nodexia sees all active features
    if (primaryRole === 'admin_nodexia' || primaryRole === 'super_admin') {
      const { data: sistema } = await supabase
        .from('funciones_sistema')
        .select('clave')
        .eq('activo', true);
      setFeatures(new Set(sistema?.map(f => f.clave) ?? []));
      setLoading(false);
      return;
    }

    if (!empresaId) {
      setFeatures(new Set());
      setLoading(false);
      return;
    }

    // Parallel queries
    const [sistemaRes, empresaRes, rolRes] = await Promise.all([
      supabase.from('funciones_sistema').select('id, clave').eq('activo', true),
      supabase.from('funciones_empresa').select('funcion_id, habilitada').eq('empresa_id', empresaId),
      primaryRole
        ? supabase.from('funciones_rol').select('funcion_id, visible').eq('empresa_id', empresaId).eq('rol_interno', primaryRole)
        : Promise.resolve({ data: [] as { funcion_id: string; visible: boolean }[] }),
    ]);

    const sistema = sistemaRes.data ?? [];
    const empresaMap = new Map((empresaRes.data ?? []).map(e => [e.funcion_id, e.habilitada]));
    const rolMap = new Map((rolRes.data ?? []).map(r => [r.funcion_id, r.visible]));

    const resolved = new Set<string>();
    for (const f of sistema) {
      const empresaEnabled = empresaMap.get(f.id) ?? false; // opt-in
      const rolVisible = rolMap.get(f.id) ?? true; // default visible
      if (empresaEnabled && rolVisible) {
        resolved.add(f.clave);
      }
    }

    setFeatures(resolved);
    setLoading(false);
  }, [empresaId, primaryRole]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const hasFeature = useCallback((key: string) => features.has(key), [features]);

  const value = useMemo(() => ({
    features,
    loading,
    hasFeature,
    refreshFeatures: loadFeatures,
  }), [features, loading, hasFeature, loadFeatures]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  return ctx;
}
