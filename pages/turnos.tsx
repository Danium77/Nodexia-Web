import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GestionVentanas from '@/components/Turnos/GestionVentanas';
import ReservaTurnos from '@/components/Turnos/ReservaTurnos';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { useFeatureFlags } from '@/lib/contexts/FeatureFlagContext';

export default function TurnosPage() {
  const { user, loading, tipoEmpresa } = useUserRole();
  const { hasFeature, loading: featureLoading } = useFeatureFlags();

  if (loading || featureLoading) {
    return <LoadingSpinner text="Cargando..." fullScreen />;
  }

  if (!user) {
    return <LoadingSpinner text="Cargando..." fullScreen />;
  }

  return (
    <MainLayout pageTitle="Turnos de Recepcion">
      {!hasFeature('turnos_recepcion') ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Feature no habilitada</h2>
          <p className="text-sm text-slate-400 mt-1">
            La funcionalidad de turnos de recepcion no esta habilitada para tu empresa.
          </p>
        </div>
      ) : String(tipoEmpresa || '').toLowerCase() === 'planta' ? (
        <GestionVentanas />
      ) : String(tipoEmpresa || '').toLowerCase() === 'transporte' ? (
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
