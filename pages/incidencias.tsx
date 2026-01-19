import React, { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import Link from 'next/link';
import useIncidencias from '../lib/hooks/useIncidencias';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const IncidenciasPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [userName, setUserName] = useState('');
  const { incidencias, loading, error } = useIncidencias();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // try to read nombre_completo from public.usuarios
      const { data: userData, error: userError } = await supabase.from('usuarios').select('nombre_completo').eq('id', user.id).single();
      if (!userError && userData?.nombre_completo) setUserName(userData.nombre_completo);
      else setUserName(user.email?.split('@')[0] || 'Usuario');
    };

    checkUser();
  }, [router]);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d]">
      <LoadingSpinner size="xl" text="Verificando sesión..." fullScreen />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Incidencias" />
        <main className="flex-1 p-2">
          <div className="max-w-4xl">
            <h2 className="text-white text-xl mb-4">Últimas Incidencias</h2>

            {loading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" text="Cargando incidencias..." />
              </div>
            )}
            {error && <div className="text-red-400">{error}</div>}

            <ul className="space-y-3">
              {incidencias.map((inc) => (
                <li key={inc.id} className="bg-slate-800/60 border border-slate-700 p-2 rounded flex justify-between items-start">
                  <div>
                    <div className="text-white font-medium">{inc.tipo}</div>
                    <div className="text-slate-400 text-sm">Despacho {inc.despacho_id || '—'}</div>
                  </div>
                  <div className="text-sm text-slate-300">
                    <Link href={`/incidencias/${inc.id}`} className="text-blue-300">Ver</Link>
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

export default IncidenciasPage;
