import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';
import DashboardStats from '../../components/Transporte/DashboardStats';
import ViajesAsignados from '../../components/Transporte/ViajesAsignados';
import ViajeDetalleModal from '../../components/Transporte/ViajeDetalleModal';
import dynamic from 'next/dynamic';
import { useUserRole } from '../../lib/contexts/UserRoleContext';

// Importar mapa dinámicamente para evitar SSR
const MapaFlota = dynamic(() => import('../../components/Transporte/MapaFlota'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#1b273b] rounded-lg border border-gray-800 h-[500px] flex items-center justify-center">
      <p className="text-gray-400">Cargando mapa...</p>
    </div>
  )
});

interface Viaje {
  id: string;
  despacho_id: string;
  pedido_id: string;
  numero_viaje: number;
  origen: string;
  destino: string;
  estado: string;
  scheduled_date: string;
  scheduled_time: string;
  chofer?: {
    nombre: string;
  };
  camion?: {
    patente: string;
  };
}

interface Stats {
  pendientes: number;
  enCurso: number;
  completadosHoy: number;
  alertas: number;
}

const TransporteDashboard = () => {
  const { user, userEmpresas } = useUserRole();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [stats, setStats] = useState<Stats>({ pendientes: 0, enCurso: 0, completadosHoy: 0, alertas: 0 });
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Modal de detalle de viaje
  const [selectedViajeId, setSelectedViajeId] = useState<string | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);

      try {
        // Obtener empresa de transporte del usuario
        const empresaTransporte = userEmpresas?.find(
          (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
        );

        if (!empresaTransporte) {
          console.error('Usuario no tiene empresa de transporte asignada');
          setLoading(false);
          return;
        }

        const empresaId = empresaTransporte.empresa_id;
        setEmpresaId(empresaId);

        // Cargar viajes asignados a esta empresa de transporte
        const { data: viajesData, error: viajesError } = await supabase
          .from('viajes_despacho')
          .select(`
            id,
            despacho_id,
            numero_viaje,
            estado,
            despachos!inner(
              pedido_id,
              origen,
              destino,
              scheduled_local_date,
              scheduled_local_time
            ),
            choferes:id_chofer(nombre),
            camiones:id_camion(patente)
          `)
          .eq('id_transporte', empresaId)
          .in('estado', ['pendiente', 'transporte_asignado', 'cargando', 'en_camino', 'descargando'])
          .order('despachos(scheduled_local_date)', { ascending: true });

        if (viajesError) throw viajesError;

        // Transformar datos
        const viajesTransformados: Viaje[] = (viajesData || []).map((v: any) => ({
          id: v.id,
          despacho_id: v.despacho_id,
          pedido_id: v.despachos.pedido_id,
          numero_viaje: v.numero_viaje,
          origen: v.despachos.origen,
          destino: v.despachos.destino,
          estado: v.estado,
          scheduled_date: v.despachos.scheduled_local_date,
          scheduled_time: v.despachos.scheduled_local_time,
          chofer: Array.isArray(v.choferes) ? v.choferes[0] : v.choferes,
          camion: Array.isArray(v.camiones) ? v.camiones[0] : v.camiones
        }));

        setViajes(viajesTransformados);

        // Calcular estadísticas
        const pendientes = viajesTransformados.filter(v => 
          ['pendiente', 'transporte_asignado'].includes(v.estado)
        ).length;

        const enCurso = viajesTransformados.filter(v => 
          ['cargando', 'en_camino', 'descargando'].includes(v.estado)
        ).length;

        // Viajes completados hoy
        const hoy = new Date().toISOString().split('T')[0];
        const { count: completadosHoy } = await supabase
          .from('viajes_despacho')
          .select('id', { count: 'exact', head: true })
          .eq('id_transporte', empresaId)
          .eq('estado', 'completado')
          .gte('updated_at', `${hoy}T00:00:00`)
          .lte('updated_at', `${hoy}T23:59:59`);

        // Alertas: viajes sin chofer o camión asignado
        const alertas = viajesTransformados.filter(v => 
          v.estado === 'transporte_asignado' && (!v.chofer || !v.camion)
        ).length;

        setStats({
          pendientes,
          enCurso,
          completadosHoy: completadosHoy || 0,
          alertas
        });

      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, userEmpresas]);

  const handleSelectViaje = (viaje: Viaje) => {
    setSelectedViajeId(viaje.id);
    setShowDetalleModal(true);
  };

  const handleCloseModal = () => {
    setShowDetalleModal(false);
    setSelectedViajeId(null);
  };

  const handleViajeActualizado = () => {
    // Recargar datos cuando se actualiza el viaje
    fetchDashboardData();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-cyan-400">Cargando dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Transporte</h1>
        <p className="text-gray-400">Bienvenido, {user?.email}</p>
      </div>

      {/* Estadísticas */}
      <DashboardStats
        pendientes={stats.pendientes}
        enCurso={stats.enCurso}
        completadosHoy={stats.completadosHoy}
        alertas={stats.alertas}
      />

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lista de viajes */}
        <ViajesAsignados viajes={viajes} onSelectViaje={handleSelectViaje} />

        {/* Mapa de flota */}
        {empresaId && <MapaFlota empresaId={empresaId} />}
      </div>

      {/* Sección de alertas si hay */}
      {stats.alertas > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <h3 className="text-red-400 font-bold mb-2">⚠️ Alertas Pendientes</h3>
          <p className="text-gray-300 text-sm">
            Tienes {stats.alertas} viajes asignados sin chofer o camión. Revisa la lista de viajes pendientes.
          </p>
        </div>
      )}

      {/* Modal de detalle de viaje */}
      {showDetalleModal && selectedViajeId && (
        <ViajeDetalleModal
          isOpen={showDetalleModal}
          onClose={handleCloseModal}
          viajeId={selectedViajeId}
          onEstadoActualizado={handleViajeActualizado}
        />
      )}
    </AdminLayout>
  );
};

export default TransporteDashboard;
