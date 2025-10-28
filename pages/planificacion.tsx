import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import MainLayout from '../components/layout/MainLayout';
import PlanningGrid from '../components/Planning/PlanningGrid';
import TrackingView from '../components/Planning/TrackingView';

type TabType = 'planning' | 'tracking';

const PlanificacionPage = () => {
  const { user, loading: userLoading } = useUserRole();
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('planning'); // 🔥 NUEVO: Control de pestañas

  useEffect(() => {
    if (userLoading || !user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Obtener el perfil del usuario logueado
        const { data: profileUser } = await supabase
          .from('profile_users')
          .select('profile_id')
          .eq('user_id', user.id)
          .single();

        let plantaNombre = '';
        if (profileUser && profileUser.profile_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', profileUser.profile_id)
            .single();
          if (profile && profile.name) {
            plantaNombre = profile.name;
          }
        }

        // 2. Consultar despachos creados por el usuario logueado
        const { data: despachosData, error: despachosError } = await supabase
          .from('despachos')
          .select('id, pedido_id, origen, destino, estado, scheduled_at, scheduled_local_date, scheduled_local_time, type, transport_id, driver_id, created_by')
          .eq('created_by', user.id)
          .order('scheduled_at', { ascending: true });

        if (despachosError) console.error('Error al cargar despachos:', despachosError);

        // 3. Consultar recepciones (despachos con type='recepcion' dirigidos a esta planta)
        const { data: recepcionesData, error: recepcionesError } = await supabase
          .from('despachos')
          .select('id, pedido_id, origen, destino, estado, scheduled_at, scheduled_local_date, scheduled_local_time, type, transport_id, driver_id')
          .eq('type', 'recepcion')
          .eq('destino', plantaNombre)
          .order('scheduled_at', { ascending: true });

        if (recepcionesError) console.error('Error al cargar recepciones:', recepcionesError);

        // Set despachos filtrados
        setDispatches((despachosData || []).filter((item: any) => String(item.type || '').toLowerCase() === 'despacho'));

        // Set recepciones filtradas
        setRecepciones(recepcionesData || []);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, userLoading]);

  return (
    <MainLayout pageTitle="Planificación">
      {/* 🔥 NUEVO: Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'planning'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📅 Planificación Semanal
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'tracking'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📍 Seguimiento en Tiempo Real
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-100">Cargando planificación...</p>
        </div>
      ) : (
        <>
          {/* Vista de Planificación */}
          {activeTab === 'planning' && (
            <>
              {(() => {
                const toTimestamp = (item: any) => {
                  try {
                    if (item?.scheduled_local_date) {
                      const time = item?.scheduled_local_time || '00:00:00';
                      return new Date(`${item.scheduled_local_date}T${time}`).getTime();
                    }
                    if (item?.scheduled_at) return new Date(item.scheduled_at).getTime();
                  } catch (e) { /* ignore */ }
                  return 0;
                };

                const sortedDespachos = (dispatches || []).slice().sort((a, b) => toTimestamp(a) - toTimestamp(b));
                const sortedRecepciones = (recepciones || []).slice().sort((a, b) => toTimestamp(a) - toTimestamp(b));

                return (
                  <>
                    <PlanningGrid title="Planificación Semanal - Despachos" dispatches={sortedDespachos} type="despachos" />
                    <PlanningGrid title="Planificación Semanal - Recepciones" dispatches={sortedRecepciones} type="recepciones" />
                  </>
                );
              })()}
            </>
          )}

          {/* 🔥 NUEVO: Vista de Seguimiento */}
          {activeTab === 'tracking' && (
            <TrackingView dispatches={[...dispatches, ...recepciones]} userId={user?.id} />
          )}
        </>
      )}
    </MainLayout>
  );
};

export default PlanificacionPage;
