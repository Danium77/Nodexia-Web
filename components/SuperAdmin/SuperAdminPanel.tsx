import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface SuperAdminPanelProps {
  onClose?: () => void;
}

export default function SuperAdminPanel({ onClose }: SuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState('empresas');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user?.id, user?.email);
        
        if (!user) {
          console.log('No user found');
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('super_admins')
          .select('*')
          .eq('user_id', user.id)
          .eq('activo', true);

        console.log('Super admin query result:', { data, error });

        if (error) {
          console.error('Error querying super_admins:', error);
          setIsSuperAdmin(false);
        } else {
          const isSuperAdminUser = data && data.length > 0;
          console.log('Is super admin?', isSuperAdminUser);
          setIsSuperAdmin(isSuperAdminUser);
        }
      } catch (error) {
        console.error('Error verificando super admin:', error);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdmin();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="text-white">Verificando permisos de super administrador...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-400 mb-4">Acceso Denegado</div>
        <div className="text-gray-300">No tienes permisos de super administrador.</div>
      </div>
    );
  }

  const tabs = [
    { id: 'empresas', label: 'Empresas', icon: '🏢' },
    { id: 'suscripciones', label: 'Suscripciones', icon: '📋' },
    { id: 'pagos', label: 'Pagos', icon: '💳' },
    { id: 'logs', label: 'Logs', icon: '📊' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'empresas':
        return (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Gestión de Empresas</h3>
            <div className="bg-gray-700 p-4 rounded">
              <p className="text-gray-300">Sistema de gestión de empresas en desarrollo...</p>
            </div>
          </div>
        );
      case 'suscripciones':
        return (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Gestión de Suscripciones</h3>
            <div className="bg-gray-700 p-4 rounded">
              <p className="text-gray-300">Sistema de suscripciones configurado y listo.</p>
            </div>
          </div>
        );
      case 'pagos':
        return (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Gestión de Pagos</h3>
            <div className="bg-gray-700 p-4 rounded">
              <p className="text-gray-300">Sistema de pagos configurado y listo.</p>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Logs del Sistema</h3>
            <div className="bg-gray-700 p-4 rounded">
              <p className="text-gray-300">Sistema de auditoría configurado y listo.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Panel Super Administrador</h1>
            <p className="text-gray-400">Administración central del sistema multi-tenant</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}