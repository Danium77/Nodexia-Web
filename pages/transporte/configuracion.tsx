
import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useRouter } from 'next/router';



const transporteCards = [
  {
    title: 'Documentación',
    color: 'text-cyan-400',
    desc: 'Gestiona la documentación legal, seguros y habilitaciones de tu empresa.',
    button: 'bg-cyan-600 hover:bg-cyan-700',
  },
  {
    title: 'Flota',
    color: 'text-green-400',
    desc: 'Administra los camiones y acoplados de tu flota.',
    button: 'bg-green-600 hover:bg-green-700',
  },
  {
    title: 'Choferes',
    color: 'text-yellow-400',
    desc: 'Gestiona los choferes habilitados para tus unidades.',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  {
    title: 'Clientes',
    color: 'text-pink-400',
    desc: 'Empresas/plantas para las que realizas cargas y servicios.',
    button: 'bg-pink-600 hover:bg-pink-700',
  },
];


export default function TransporteConfiguracion() {
  const router = useRouter();

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Configuración de Transporte</h1>
        <p className="text-slate-400 mt-2">Gestiona todos los aspectos de tu empresa de transporte</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {transporteCards.map((card, idx) => (
          <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 flex flex-col items-center hover:bg-slate-700/50 transition-colors">
            <h2 className={`text-xl font-bold mb-2 ${card.color}`}>{card.title}</h2>
            <p className="text-slate-300 mb-4 text-center">{card.desc}</p>
            {card.title === 'Documentación' ? (
              <button className={`${card.button} text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium`} onClick={() => router.push('/transporte/documentacion')}>
                Gestionar
              </button>
            ) : card.title === 'Flota' ? (
              <button className={`${card.button} text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium`} onClick={() => router.push('/transporte/flota')}>
                Gestionar
              </button>
            ) : card.title === 'Choferes' ? (
              <button className={`${card.button} text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium`} onClick={() => router.push('/transporte/choferes')}>
                Gestionar
              </button>
            ) : card.title === 'Clientes' ? (
              <button className={`${card.button} text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium`} onClick={() => router.push('/configuracion/clientes')}>
                Gestionar
              </button>
            ) : (
              <button className={`${card.button} text-white px-4 py-3 rounded-lg opacity-50 cursor-not-allowed font-medium`} disabled>
                Gestionar
              </button>
            )}
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
