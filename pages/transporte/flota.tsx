import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const UnidadesFlotaUnificado = dynamic(() => import('../../components/Transporte/UnidadesFlotaUnificado'), { ssr: false });
const DocumentosFlotaContent = dynamic(() => import('../../components/Transporte/DocumentosFlotaContent'), { ssr: false });

type TabType = 'unidades' | 'documentos';

export default function FlotaTransporte() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('unidades');

  useEffect(() => {
    if (router.query.tab === 'documentos') {
      setActiveTab('documentos');
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
          <div className="flex gap-2">
            <button
              onClick={() => handleTabChange('unidades')}
              className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === 'unidades'
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              🚛 Unidades
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
          {activeTab === 'unidades' && <UnidadesFlotaUnificado />}
          {activeTab === 'documentos' && <DocumentosFlotaContent />}
        </div>
      </div>
    </AdminLayout>
  );
}
