import React, { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const EstadisticasPage = () => {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        setUserName(currentUser.user_metadata?.nombre_completo || currentUser.email?.split('@')[0] || 'Usuario');       
      }
    };
    load();
  }, []);

  if (!user) return <LoadingSpinner text="Cargando..." fullScreen />;

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Estadísticas" />
        <main className="flex-1 p-2">
          <div className="bg-[#1b273b] p-2 rounded shadow-lg text-slate-100">
            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">Estadísticas (stub)</h2>
            <p className="text-slate-300">Aquí se implementarán gráficos y KPIs. De momento puedes usar datos de la tabla <code>despachos</code> para construir métricas.</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EstadisticasPage;
