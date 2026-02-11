// components/Layout/Header.tsx
import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import NotificationBell from './NotificationBell';
import UbicacionSelector from '../ControlAcceso/UbicacionSelector';
import { useUserRole } from '../../lib/contexts/UserRoleContext';

interface HeaderProps {
  userEmail: string;
  userName: string;
  pageTitle: string;
  empresaNombre?: string; // Nombre de la empresa del usuario
}

const Header: React.FC<HeaderProps> = ({ userEmail, userName, pageTitle, empresaNombre }) => {
  const { role } = useUserRole();
  
  const handleProfileClick = () => {
    // TODO: Implementar menú de perfil
    console.log('👤 Abrir perfil');
  };
  
  return (
    <header className="bg-[#1b273b] p-4 flex items-center justify-between shadow-md text-slate-100">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-white">{pageTitle}</h2>
      </div>
      <div className="flex items-center space-x-4">
        {/* Campana de notificaciones con badge */}
        <NotificationBell />
        {/* Selector de ubicación para Control de Acceso */}
        {role === 'control_acceso' && <UbicacionSelector />}
        
        
        <button 
          onClick={handleProfileClick}
          className="flex flex-col items-center p-2 rounded-lg hover:bg-[#0e1a2d] transition-colors"
          title="Perfil de usuario"
        >
          <UserCircleIcon className="h-7 w-7 text-cyan-400" />
          {empresaNombre && (
            <span className="text-xs text-slate-300 mt-1 max-w-[120px] truncate">
              {empresaNombre}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;