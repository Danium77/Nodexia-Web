import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import FlotaGestion from '../../components/Dashboard/FlotaGestion';
import { TruckIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Importar componentes de contenido sin layout
const ChoferesContent = dynamic(() => import('../../components/Transporte/ChoferesContent'), { ssr: false });
const UnidadesContent = dynamic(() => import('../../components/Transporte/UnidadesContent'), { ssr: false });
const DocumentosFlotaContent = dynamic(() => import('../../components/Transporte/DocumentosFlotaContent'), { ssr: false });

type TabType = 'camiones' | 'acoplados' | 'choferes' | 'unidades' | 'documentos';

export default function FlotaTransporte() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('camiones');

  // Sincronizar con query string
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab as TabType);
    }
  }, [router.query.tab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/transporte/flota?tab=${tab}`, undefined, { shallow: true });
  };

  return (
    <AdminLayout pageTitle="Gestión de Flota">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 px-4 sm:px-6 lg:px-8 py-4">
        {/* Tabs Navigation */}
        <div className="mb-2 border-b border-gray-700">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleTabChange('camiones')}
              className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === 'camiones'
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              🚛 Camiones
            </button>
            <button
              onClick={() => handleTabChange('acoplados')}
              className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === 'acoplados'
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              🔗 Acoplados
            </button>
            <button
              onClick={() => handleTabChange('choferes')}
              className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === 'choferes'
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              👥 Choferes
            </button>
            <button
              onClick={() => handleTabChange('unidades')}
              className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === 'unidades'
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              ⚡ Unidades Operativas
            </button>
            <button
              onClick={() => handleTabChange('documentos')}
              className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === 'documentos'
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              📄 Documentación
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/30 rounded-b-xl shadow-2xl border border-gray-700">
          {(activeTab === 'camiones' || activeTab === 'acoplados') && (
            <div className="p-4">
              <FlotaGestion key={activeTab} hideInternalTabs={true} />
            </div>
          )}
          
          {activeTab === 'choferes' && (
            <ChoferesContent />
          )}
          
          {activeTab === 'unidades' && (
            <UnidadesContent />
          )}

          {activeTab === 'documentos' && (
            <DocumentosFlotaContent />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
