
import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';



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

  return (
    <AdminLayout pageTitle="Configuración de Transporte">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {transporteCards.map((card, idx) => (
          <div key={idx} className="bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center">
            <h2 className={`text-xl font-bold mb-2 ${card.color}`}>{card.title}</h2>
            <p className="text-gray-300 mb-4 text-center">{card.desc}</p>
            {card.title === 'Documentación' ? (
              <button
                className={`${card.button} text-white px-4 py-2 rounded`}
                onClick={() => window.location.href = '/transporte/documentacion'}
              >
                Gestionar
              </button>
            ) : card.title === 'Flota' ? (
              <button
                className={`${card.button} text-white px-4 py-2 rounded`}
                onClick={() => window.location.href = '/transporte/flota'}
              >
                Gestionar
              </button>
            ) : card.title === 'Choferes' ? (
              <button
                className={`${card.button} text-white px-4 py-2 rounded`}
                onClick={() => window.location.href = '/transporte/choferes'}
              >
                Gestionar
              </button>
            ) : card.title === 'Choferes' ? (
              <button
                className={`${card.button} text-white px-4 py-2 rounded`}
                onClick={() => window.location.href = '/transporte/flota?tab=chofer'}
              >
                Gestionar
              </button>
            ) : (
              <button
                className={`${card.button} text-white px-4 py-2 rounded`}
                disabled
              >
                Gestionar
              </button>
            )}
          </div>
        ))}
      </div>

    </AdminLayout>
  );
}
