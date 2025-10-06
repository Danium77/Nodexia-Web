import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

import Header from '../components/layout/Header'; // Asegúrate que esta ruta sea correcta
import Sidebar from '../components/layout/Sidebar'; // Asegúrate que esta ruta sea correcta
import InicioDashboard from '../components/Dashboard/InicioDashboard';

interface Dispatch {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  scheduled_at: string;
  created_by: string;
  transport_id: string;
  driver_id: string;
  type?: string;

  transporte_data?: { nombre: string };
  creador?: { nombre_completo: string; };
  chofer?: { nombre_completo: string; };
}

const Dashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(true);
  const [errorDispatches, setErrorDispatches] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login');
      } else {
        // Verificar rol del usuario para redirección automática
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select(`
            nombre_completo,
            usuarios_empresa (
              rol_interno
            )
          `)
          .eq('email', user.email)
          .single();

        // Redirección basada en rol
        if (usuarioData?.usuarios_empresa?.[0]?.rol_interno) {
          const rolInterno = usuarioData.usuarios_empresa[0].rol_interno;
          
          console.log('🔍 [Dashboard] Rol detectado:', rolInterno);
          
          if (rolInterno === 'Control de Acceso') {
            console.log('🚪 [Dashboard] Redirigiendo a Control de Acceso...');
            router.push('/control-acceso');
            return;
          } else if (rolInterno === 'Supervisor de Carga') {
            console.log('👷 [Dashboard] Redirigiendo a Supervisor de Carga...');
            router.push('/supervisor-carga');
            return;
          }
        } else {
          console.log('⚠️ [Dashboard] Sin rol detectado, continuando en dashboard normal');
        }
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('nombre_completo')
          .eq('id', user.id)
          .single();

        if (userError || !userData || !userData.nombre_completo) {
          console.error("Error o nombre completo no encontrado para el usuario:", userError?.message || "Nombre no definido en DB.");
          setUserName(user.email?.split('@')[0] || 'Usuario');
        } else {
          setUserName(userData.nombre_completo);
        }
        setUser(user);
      }
    };

    checkUser();

    const fetchDispatches = async () => {
      setLoadingDispatches(true);
      setErrorDispatches(null);
      
      const { data, error } = await supabase
        .from('despachos')
        .select(`
          id,
          pedido_id,
          origen,
          destino,
          estado,
          scheduled_at,
          created_by,
          transport_id,
          driver_id,
          type,
          transporte_data:transportes!despachos_transporte_id_fkey(
            nombre
          ),
          creador:usuarios!despachos_created_by_fkey(
            nombre_completo
          ),
          chofer:usuarios!despachos_driver_id_fkey(
            nombre_completo
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error al cargar despachos:', error);
        setErrorDispatches('Error al cargar despachos: ' + error.message);
      } else {
        const filteredData = data ? data.filter(d => d.scheduled_at) : [];
        // Map nested arrays to objects as expected by Dispatch type
        const mappedData: Dispatch[] = filteredData.map((d: any) => ({
          ...d,
          transporte_data: d.transporte_data && Array.isArray(d.transporte_data) ? d.transporte_data[0] : d.transporte_data,
          creador: d.creador && Array.isArray(d.creador) ? d.creador[0] : d.creador,
          chofer: d.chofer && Array.isArray(d.chofer) ? d.chofer[0] : d.chofer,
        }));
        setDispatches(mappedData);
        console.log('Despachos cargados:', mappedData);
      }
      setLoadingDispatches(false);
    };

    fetchDispatches();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        } else if (session) {
          const currentUserName = session.user.user_metadata?.nombre_completo || session.user.email?.split('@')[0] || 'Usuario';
          setUserName(currentUserName);
          setUser(session.user);
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d] text-slate-100">
        Cargando Dashboard...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Tablero de Control Principal" />
        <main className="flex-1 p-6">
          {loadingDispatches ? (
            <p className="text-slate-300">Cargando despachos...</p>
          ) : errorDispatches ? (
            <p className="text-red-400">Error al cargar datos: {errorDispatches}</p>
          ) : (
            <>
              {/* New InicioDashboard: visión global con KPIs, mapa y widgets */}
              <section className="flex flex-col gap-6">
                {/* Lazy import the dashboard component */}
                <InicioDashboard dispatches={dispatches} />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;