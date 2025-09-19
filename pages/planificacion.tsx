import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import PlanningGrid from '../components/Planning/PlanningGrid';

const PlanificacionPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndLoad = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) return router.push('/login');
      setUser(currentUser);
      setUserName(currentUser.user_metadata?.nombre_completo || currentUser.email.split('@')[0] || 'Usuario');


      // 1. Obtener el perfil del usuario logueado (para saber la planta asociada)
      const { data: profileUser } = await supabase
        .from('profile_users')
        .select('profile_id')
        .eq('user_id', currentUser.id)
        .single();

      let plantaNombre = '';
      if (profileUser && profileUser.profile_id) {
        // Buscar el nombre de la planta asociada a ese perfil
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
        .select('id, pedido_id, origen, destino, estado, scheduled_at, scheduled_local_date, scheduled_local_time, type, transporte_data:transportes!despachos_transporte_id_fkey(nombre), chofer:choferes!despachos_chofer_id_fkey(nombre_completo), created_by')
        .eq('created_by', currentUser.id)
        .order('scheduled_at', { ascending: true });

      // 3. Consultar recepciones cuyo destino sea la planta del usuario
      const { data: recepcionesData, error: recepcionesError } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino, estado, scheduled_at, scheduled_local_date, scheduled_local_time, type, transporte_data:transportes!despachos_transporte_id_fkey(nombre), chofer:choferes!despachos_chofer_id_fkey(nombre_completo)')
        .eq('type', 'recepcion')
        .eq('destino', plantaNombre)
        .order('scheduled_at', { ascending: true });

  // Set despachos filtrados
  setDispatches((despachosData || []).filter((item: any) => String(item.type || '').toLowerCase() === 'despacho'));

  // Set recepciones filtradas
  setRecepciones(recepcionesData || []);
  setLoading(false);
    };
    checkUserAndLoad();
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d] text-slate-100">Cargando...</div>;

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Planificación" />
        <main className="flex-1 p-6 space-y-6">
          {/* Normalize and sort by local scheduled datetime (fallback to scheduled_at) */}
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
        </main>
      </div>
    </div>
  );
};

export default PlanificacionPage;
