import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GestionVentanas from '@/components/Turnos/GestionVentanas';
import ReservaTurnos from '@/components/Turnos/ReservaTurnos';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { useFeatureFlags } from '@/lib/contexts/FeatureFlagContext';
import { supabase } from '@/lib/supabaseClient';

export default function TurnosPage() {
  const { user, loading, tipoEmpresa, empresaId } = useUserRole();
  const { hasFeature, loading: featureLoading } = useFeatureFlags();
  const [plantaTab, setPlantaTab] = useState<'ventanas' | 'reservar'>('reservar');
  const [hasVentanas, setHasVentanas] = useState<boolean | null>(null);

  useEffect(() => {
    if (!empresaId || String(tipoEmpresa || '').toLowerCase() !== 'planta') return;
    supabase
      .from('ventanas_recepcion')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_planta_id', empresaId)
      .then(({ count }) => {
        const has = (count ?? 0) > 0;
        setHasVentanas(has);
        if (has) setPlantaTab('ventanas');
      });
  }, [empresaId, tipoEmpresa]);

  if (loading || featureLoading) {
    return <LoadingSpinner text="Cargando..." fullScreen />;
  }

  if (!user) {
    return <LoadingSpinner text="Cargando..." fullScreen />;
  }

  const isPlanta = String(tipoEmpresa || '').toLowerCase() === 'planta';
  const isTransporte = String(tipoEmpresa || '').toLowerCase() === 'transporte';

  return (
    <MainLayout pageTitle="Turnos de Recepcion">
      {!hasFeature('turnos_recepcion') ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Feature no habilitada</h2>
          <p className="text-sm text-slate-400 mt-1">
            La funcionalidad de turnos de recepcion no esta habilitada para tu empresa.
          </p>
        </div>
      ) : isPlanta ? (
        <div className="space-y-4">
          {hasVentanas && (
            <div className="flex gap-2 border-b border-slate-700 pb-2">
              <button
                onClick={() => setPlantaTab('ventanas')}
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                  plantaTab === 'ventanas'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Mis Ventanas
              </button>
              <button
                onClick={() => setPlantaTab('reservar')}
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                  plantaTab === 'reservar'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Reservar Turno en otra Planta
              </button>
            </div>
          )}
          {plantaTab === 'ventanas' && hasVentanas ? (
            <GestionVentanas />
          ) : (
            <ReservaTurnos excludeEmpresaId={empresaId || undefined} asReservante />
          )}
        </div>
      ) : isTransporte ? (
        <ReservaTurnos />
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Acceso no disponible</h2>
          <p className="text-sm text-slate-400 mt-1">
            Esta vista aplica solo para empresas planta o transporte.
          </p>
        </div>
      )}
    </MainLayout>
  );
}
