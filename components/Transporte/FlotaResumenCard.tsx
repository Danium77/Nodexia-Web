// components/Transporte/FlotaResumenCard.tsx
// Resumen de flota (choferes, camiones, acoplados) para dashboard
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { UserGroupIcon, TruckIcon } from '@heroicons/react/24/outline';

interface FlotaResumenCardProps {
  empresaId: string;
}

interface FlotaCounts {
  choferes: number;
  camiones: number;
  acoplados: number;
}

const FlotaResumenCard: React.FC<FlotaResumenCardProps> = ({ empresaId }) => {
  const [counts, setCounts] = useState<FlotaCounts>({ choferes: 0, camiones: 0, acoplados: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;

    const fetchCounts = async () => {
      try {
        const [ch, ca, ac] = await Promise.all([
          supabase.from('choferes').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('activo', true),
          supabase.from('camiones').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('activo', true),
          supabase.from('acoplados').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('activo', true),
        ]);
        setCounts({
          choferes: ch.count || 0,
          camiones: ca.count || 0,
          acoplados: ac.count || 0,
        });
      } catch (err) {
        console.error('Error cargando resumen de flota:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [empresaId]);

  const total = counts.choferes + counts.camiones + counts.acoplados;

  if (loading) {
    return (
      <div className="bg-[#1b273b] rounded-lg p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4" />
        <div className="h-10 bg-gray-700 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-[#1b273b] rounded-lg p-6 border border-gray-800 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-purple-600/10 rounded-lg">
          <UserGroupIcon className="h-6 w-6 text-purple-400" />
        </div>
        <span className="text-3xl font-bold text-white">{total}</span>
      </div>
      <p className="text-gray-400 text-sm font-medium mb-3">Total Flota</p>
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-cyan-400">
          <UserGroupIcon className="h-3.5 w-3.5" />
          {counts.choferes} choferes
        </span>
        <span className="flex items-center gap-1 text-blue-400">
          <TruckIcon className="h-3.5 w-3.5" />
          {counts.camiones} camiones
        </span>
        <span className="flex items-center gap-1 text-indigo-400">
          {counts.acoplados} acoplados
        </span>
      </div>
    </div>
  );
};

export default FlotaResumenCard;
