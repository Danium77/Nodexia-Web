import React from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { MapPinIcon, ArrowRightOnRectangleIcon, DocumentTextIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { SubirDocumento, ListaDocumentos } from '../Documentacion';

interface PerfilTabProps {
  choferData: any;
  userEmail: string;
  viajesCount: number;
  showUploadDoc: boolean;
  docRefreshKey: number;
  onToggleUpload: () => void;
  onUploadSuccess: () => void;
}

const PerfilTab: React.FC<PerfilTabProps> = ({
  choferData,
  userEmail,
  viajesCount,
  showUploadDoc,
  docRefreshKey,
  onToggleUpload,
  onUploadSuccess,
}) => {
  const router = useRouter();

  return (
    <div className="p-4 space-y-6">
      {/* Card de perfil principal */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded p-2 border border-slate-700 shadow-2xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex items-center space-x-4 mb-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-cyan-500/30">
            {choferData?.nombre?.charAt(0) || 'C'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {choferData?.nombre} {choferData?.apellido}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30">
                Chofer Profesional
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <span>📧</span>
              <span>{userEmail}</span>
            </p>
          </div>
        </div>

        {/* Información del chofer */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-sm">🪪 DNI</span>
            </div>
            <span className="text-white font-semibold">{choferData?.dni || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-sm">📱 Teléfono</span>
            </div>
            <span className="text-white font-semibold">{choferData?.telefono || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-sm">🚗 Licencia</span>
            </div>
            <span className="text-white font-semibold">{choferData?.licencia_numero || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
            <div className="flex items-center space-x-2">
              <span className="text-cyan-400 text-sm font-semibold">🚚 Viajes Activos</span>
            </div>
            <span className="text-cyan-400 font-bold text-lg">{viajesCount}</span>
          </div>
        </div>
      </div>

      {/* Mis Documentos */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-cyan-400" />
            Mis Documentos
          </h4>
          {choferData?.id && choferData?.empresa_id && (
            <button
              onClick={onToggleUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              Subir
            </button>
          )}
        </div>

        {/* Formulario de upload */}
        {showUploadDoc && choferData?.id && choferData?.empresa_id && (
          <div className="mb-4">
            <SubirDocumento
              entidadTipo="chofer"
              entidadId={choferData.id}
              empresaId={choferData.empresa_id}
              onUploadSuccess={onUploadSuccess}
              onCancel={onToggleUpload}
            />
          </div>
        )}

        {/* Lista de documentos */}
        {choferData?.id ? (
          <div key={docRefreshKey}>
            <ListaDocumentos
              entidadTipo="chofer"
              entidadId={choferData.id}
              showActions={false}
            />
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-4">Cargando documentos...</p>
        )}
      </div>

      {/* Botón GPS destacado */}
      <button
        onClick={() => router.push('/chofer/tracking-gps')}
        className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
        <MapPinIcon className="h-6 w-6 relative z-10" />
        <span className="relative z-10">🛰️ Activar Tracking GPS</span>
      </button>

      {/* Botón cerrar sesión */}
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
      >
        <ArrowRightOnRectangleIcon className="h-6 w-6" />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
};

export default PerfilTab;
