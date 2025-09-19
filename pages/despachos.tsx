import React, { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import useDispatches from '../lib/hooks/useDispatches';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

const DespachosPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [userName, setUserName] = useState('');
  const { dispatches, loading, error } = useDispatches();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: userData, error: userError } = await supabase.from('usuarios').select('nombre_completo').eq('id', user.id).single();
      if (!userError && userData?.nombre_completo) setUserName(userData.nombre_completo);
      else setUserName(user.email?.split('@')[0] || 'Usuario');
    };

    checkUser();
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d] text-slate-100">Cargando...</div>;

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Despachos" />
        <main className="flex-1 p-6">
          <div className="max-w-4xl">
            <h2 className="text-white text-xl mb-4">Lista de Despachos</h2>

            {loading && <div className="text-slate-300">Cargando despachos...</div>}
            {error && <div className="text-red-400">{error}</div>}

            <ul className="space-y-3">
              {dispatches.map((d) => (
                <li key={d.id} className="bg-slate-800/60 border border-slate-700 p-4 rounded-md flex justify-between items-start">
                  <div>
                    <div className="text-white font-medium">{d.destino || 'Destino'}</div>
                    <div className="text-slate-400 text-sm">{d.scheduled_local_date || (d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : '')}</div>
                  </div>
                  <div className="text-sm text-slate-300">
                    <Link href={`/despachos/${d.id}`} className="text-blue-300">Ver</Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DespachosPage;
