import React, { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import NetworkManager from '../components/Network/NetworkManager';
import SuperAdminPanel from '../components/SuperAdmin/SuperAdminPanel';
import { useSuperAdminAccess } from '../lib/hooks/useSuperAdminAccess';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ConfiguracionPage = () => {
  const router = useRouter();
  const { primaryRole, loading } = useUserRole();
  const [showNetworkManager, setShowNetworkManager] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const { isSuperAdmin } = useSuperAdminAccess();

  if (loading) {
    return <AdminLayout pageTitle="Configuración"><LoadingSpinner text="Cargando configuración..." /></AdminLayout>;
  }

  // Definir tarjetas por rol
  const isAdmin = primaryRole === 'admin';
  const isCoordinador = primaryRole === 'coordinador' || primaryRole === 'coordinador_integral';
  const isSuperAdminRole = primaryRole === 'super_admin';

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
      title: '📍 Ubicaciones',
      color: 'text-pink-400',
      button: 'bg-pink-600 hover:bg-pink-700',
      desc: 'Vincula y gestiona plantas, depósitos y clientes para tus despachos.',
      action: 'ubicaciones'
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
      title: '📍 Ubicaciones',
      color: 'text-pink-400',
      button: 'bg-pink-600 hover:bg-pink-700',
      desc: 'Vincula y gestiona plantas, depósitos y clientes para tus despachos.',
      action: 'ubicaciones'
    },
    {
      title: 'Transportes',
      color: 'text-cyan-400',
      button: 'bg-cyan-600 hover:bg-cyan-700',
      desc: 'Consulta y gestiona tus transportistas',
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
  if (isSuperAdminRole || isAdmin) {
    cardsToShow = adminCards;
  } else if (isCoordinador) {
    cardsToShow = coordinadorCards;
  } else {
    // Fallback: mostrar tarjetas básicas para cualquier usuario autenticado
    cardsToShow = coordinadorCards;
  }

  // Navegación al hacer clic en Gestionar
  const handleGestionar = (card: any) => {
    if (card.action === 'network') {
      setShowNetworkManager(true);
    } else if (card.action === 'super-admin') {
      setShowSuperAdmin(true);
    } else if (card.action === 'ubicaciones') {
      router.push('/configuracion/ubicaciones');
    } else if (card.title === 'Transportes') {
      router.push('/configuracion/transportes');
    } else if (card.title === 'Plantas') {
      router.push('/configuracion/plantas');
    } else if (card.title === 'Clientes') {
      router.push('/configuracion/clientes');
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
              <strong>Rol detectado para este usuario:</strong> {primaryRole || 'Ninguno'}
            </div>
            {isSuperAdmin && (
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                SUPER ADMIN
              </div>
            )}
          </div>
          <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2">
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
