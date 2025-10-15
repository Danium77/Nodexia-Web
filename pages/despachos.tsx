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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl">Lista de Despachos</h2>
              <button
                onClick={() => router.push('/crear-despacho')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
              >
                + Crear Despacho
              </button>
            </div>

            {loading && <div className="text-slate-300">Cargando despachos...</div>}
            {error && <div className="text-red-400">{error}</div>}

            <div className="space-y-3">
              {dispatches.map((d) => (
                <div key={d.id} className="bg-slate-800/60 border border-slate-700 p-4 rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-white font-medium mb-1">
                        {d.origen || 'Sin origen'} → {d.destino || 'Sin destino'}
                      </div>
                      <div className="text-slate-400 text-sm">
                        Fecha: {d.scheduled_local_date || (d.scheduled_at ? new Date(d.scheduled_at).toLocaleDateString() : 'Sin fecha')}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        d.estado === 'planificado' ? 'bg-yellow-600 text-yellow-100' :
                        d.estado === 'asignado' ? 'bg-blue-600 text-blue-100' :
                        d.estado === 'en_ruta' ? 'bg-purple-600 text-purple-100' :
                        d.estado === 'entregado' ? 'bg-green-600 text-green-100' :
                        d.estado === 'cancelado' ? 'bg-red-600 text-red-100' :
                        'bg-gray-600 text-gray-100'
                      }`}>
                        {d.estado || 'Sin estado'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-300">
                    {(d as any).empresa_cliente && (
                      <div>
                        <span className="text-slate-400">Cliente:</span> {(d as any).empresa_cliente.nombre}
                      </div>
                    )}
                    {(d as any).empresa_transporte && (
                      <div>
                        <span className="text-slate-400">Transporte:</span> {(d as any).empresa_transporte.nombre}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <Link 
                      href={`/despachos/${d.id}`} 
                      className="text-blue-300 hover:text-blue-200 text-sm font-medium"
                    >
                      Ver Detalle
                    </Link>
                  </div>
                </div>
              ))}
              
              {dispatches.length === 0 && !loading && !error && (
                <div className="text-center py-8">
                  <div className="text-slate-400 mb-4">No hay despachos registrados</div>
                  <button
                    onClick={() => router.push('/crear-despacho')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
                  >
                    Crear tu primer despacho
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DespachosPage;
