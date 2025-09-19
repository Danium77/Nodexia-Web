
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import { supabase } from '../lib/supabaseClient';

const ConfiguracionPage = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileUser } = await supabase
        .from('profile_users')
        .select('roles(name)')
        .eq('user_id', user.id)
        .single();
      let userRoles: string[] = [];
      if (profileUser && profileUser.roles) {
        userRoles = Array.isArray(profileUser.roles)
          ? profileUser.roles.map((r: any) => r.name)
          : [profileUser.roles.name];
      }
      setRoles(userRoles);
      setLoading(false);
    };
    fetchRoles();
  }, []);

  if (loading) {
    return <AdminLayout pageTitle="Configuración"><div className="text-white">Cargando configuración...</div></AdminLayout>;
  }

  // Definir tarjetas por rol
  const isAdmin = roles.includes('admin');
  const isCoordinador = roles.includes('coordinador');

  // Tarjetas para admin
  const adminCards = [
    {
      title: 'Transportes',
      color: 'text-cyan-400',
      button: 'bg-cyan-600 hover:bg-cyan-700',
      desc: 'Administra la base de datos de transportistas y vehículos.'
    },
    {
      title: 'Plantas',
      color: 'text-green-400',
      button: 'bg-green-600 hover:bg-green-700',
      desc: 'Administra los orígenes de despacho (plantas, sucursales, depósitos).'
    },
    {
      title: 'Clientes',
      color: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      desc: 'Administra los destinos y clientes de los despachos.'
    },
    // Aquí puedes agregar más tarjetas exclusivas de admin
  ];

  // Tarjetas para coordinador (puedes personalizar)
  const coordinadorCards = [
    {
      title: 'Transportes',
      color: 'text-cyan-400',
      button: 'bg-cyan-600 hover:bg-cyan-700',
      desc: 'Consulta y gestiona tus transportistas'
    },
    {
      title: 'Plantas',
      color: 'text-green-400',
      button: 'bg-green-600 hover:bg-green-700',
      desc: 'Consulta y gestiona tus origenes y destinos'
    },
    {
      title: 'Clientes',
      color: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      desc: 'Consulta y gestiona tu lista de clientes'
    },
  ];


  // Mostrar solo la visual correspondiente al rol principal
  let cardsToShow = [];
  if (isAdmin) {
    cardsToShow = adminCards;
  } else if (isCoordinador) {
    cardsToShow = coordinadorCards;
  }

  // Navegación al hacer clic en Gestionar
  const handleGestionar = (cardTitle: string) => {
    if (cardTitle === 'Transportes') {
      window.location.href = '/configuracion/transportes';
    } else if (cardTitle === 'Plantas') {
      window.location.href = '/configuracion/plantas';
    } else if (cardTitle === 'Clientes') {
      window.location.href = '/configuracion/clientes';
    }
  };

  return (
    <AdminLayout pageTitle="Configuración">
      {/* Log visual temporal para depuración de roles */}
      <div className="mb-4 p-4 bg-gray-900 text-white rounded">
        <strong>Roles detectados para este usuario:</strong> {roles.join(', ') || 'Ninguno'}
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {cardsToShow.map((card, idx) => (
          <div key={idx} className="bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center">
            <h2 className={`text-xl font-bold mb-2 ${card.color}`}>{card.title}</h2>
            <p className="text-gray-300 mb-4 text-center">{card.desc}</p>
            <button
              className={`${card.button} text-white px-4 py-2 rounded`}
              onClick={() => handleGestionar(card.title)}
            >
              Gestionar
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default ConfiguracionPage;
