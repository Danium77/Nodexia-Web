
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import NetworkManager from '../components/Network/NetworkManager';
import SuperAdminPanel from '../components/SuperAdmin/SuperAdminPanel';
import SimpleSuperAdminPanel from '../components/SuperAdmin/SimpleSuperAdminPanel';
import { useSuperAdminAccess } from '../lib/hooks/useSuperAdminAccess';
import { supabase } from '../lib/supabaseClient';

const ConfiguracionPage = () => {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNetworkManager, setShowNetworkManager] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdminAccess();

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Para setup inicial, permitir acceso sin autenticación
        console.warn('No hay usuario autenticado - modo setup');
        setRoles(['admin']); // Dar acceso admin temporal para configuración inicial
        setLoading(false);
        return;
      }
      
      const { data: profileUser } = await supabase
        .from('profile_users')
        .select('roles(name)')
        .eq('user_id', user.id)
        .single();
      let userRoles: string[] = [];
      if (profileUser && profileUser.roles) {
        const rolesRaw: any = profileUser.roles;
        userRoles = Array.isArray(rolesRaw)
          ? rolesRaw.map((r: any) => r.name)
          : [rolesRaw.name];
      }
      setRoles(userRoles);
      
      // Redirigir usuarios con rol "transporte" a su página específica
      if (userRoles.includes('transporte') && !userRoles.includes('admin') && !userRoles.includes('coordinador')) {
        router.push('/transporte/configuracion');
        return;
      }
      
      setLoading(false);
    };
    fetchRoles();
  }, [router]);

  if (loading) {
    return <AdminLayout pageTitle="Configuración"><div className="text-white">Cargando configuración...</div></AdminLayout>;
  }

  // Definir tarjetas por rol
  const isAdmin = roles.includes('admin');
  const isCoordinador = roles.includes('coordinador');

  // Tarjetas para admin
  const adminCards = [
    {
      title: 'Red de Empresas',
      color: 'text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700',
      desc: 'Gestiona la red de empresas transportistas y coordinadoras.',
      action: 'network'
    },
    {
      title: 'Transportes',
      color: 'text-cyan-400',
      button: 'bg-cyan-600 hover:bg-cyan-700',
      desc: 'Administra la base de datos de transportistas y vehículos.',
      action: 'navigate'
    },
    {
      title: 'Plantas',
      color: 'text-green-400',
      button: 'bg-green-600 hover:bg-green-700',
      desc: 'Administra los orígenes de despacho (plantas, sucursales, depósitos).',
      action: 'navigate'
    },
    {
      title: 'Clientes',
      color: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      desc: 'Administra los destinos y clientes de los despachos.',
      action: 'navigate'
    },
    // Super Admin card (siempre visible para admins durante la configuración inicial)
    ...(isAdmin ? [{
      title: 'Super Admin',
      color: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-700',
      desc: 'Administración central del sistema: empresas, usuarios, suscripciones y pagos.',
      action: 'super-admin'
    }] : [])
  ];

  // Tarjetas para coordinador (puedes personalizar)
  const coordinadorCards = [
    {
      title: 'Red de Empresas',
      color: 'text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700',
      desc: 'Gestiona tu red de transportistas y relaciones comerciales.',
      action: 'network'
    },
    {
      title: 'Transportes',
      color: 'text-cyan-400',
      button: 'bg-cyan-600 hover:bg-cyan-700',
      desc: 'Consulta y gestiona tus transportistas',
      action: 'navigate'
    },
    {
      title: 'Plantas',
      color: 'text-green-400',
      button: 'bg-green-600 hover:bg-green-700',
      desc: 'Consulta y gestiona tus origenes y destinos',
      action: 'navigate'
    },
    {
      title: 'Clientes',
      color: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      desc: 'Consulta y gestiona tu lista de clientes',
      action: 'navigate'
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
  const handleGestionar = (card: any) => {
    if (card.action === 'network') {
      setShowNetworkManager(true);
    } else if (card.action === 'super-admin') {
      setShowSuperAdmin(true);
    } else if (card.title === 'Transportes') {
      window.location.href = '/configuracion/transportes';
    } else if (card.title === 'Plantas') {
      window.location.href = '/configuracion/plantas';
    } else if (card.title === 'Clientes') {
      window.location.href = '/configuracion/clientes';
    }
  };

  return (
    <AdminLayout pageTitle="Configuración">
      {showSuperAdmin ? (
        <div className="p-6">
          <SuperAdminPanel onClose={() => setShowSuperAdmin(false)} />
        </div>
      ) : showNetworkManager ? (
        <div className="p-6">
          <NetworkManager onClose={() => setShowNetworkManager(false)} />
        </div>
      ) : (
        <>
          {/* Log visual temporal para depuración de roles */}
          <div className="mb-4 p-4 bg-gray-900 text-white rounded flex justify-between items-center">
            <div>
              <strong>Roles detectados para este usuario:</strong> {roles.join(', ') || 'Ninguno'}
            </div>
            {isSuperAdmin && (
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                SUPER ADMIN
              </div>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {cardsToShow.map((card, idx) => (
              <div key={idx} className="bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center">
                <h2 className={`text-xl font-bold mb-2 ${card.color}`}>{card.title}</h2>
                <p className="text-gray-300 mb-4 text-center">{card.desc}</p>
                <button
                  className={`${card.button} text-white px-4 py-2 rounded`}
                  onClick={() => handleGestionar(card)}
                >
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default ConfiguracionPage;
