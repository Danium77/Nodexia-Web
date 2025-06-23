// components/Layout/Header.tsx
import React from 'react';
import Image from 'next/image';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // XMarkIcon ya no se necesita

interface HeaderProps {
  userEmail: string;
  userName: string;
  pageTitle: string; // La prop que recibe el título de la página actual
}

const Header: React.FC<HeaderProps> = ({ userEmail, userName, pageTitle }) => {
  const displayUserName = userName.split(' ')[0] || userEmail.split('@')[0] || 'Usuario';
  
  return (
    <header className="bg-[#1b273b] p-4 flex items-center justify-between shadow-md text-slate-100">
      <div className="flex items-center gap-4">
        {/* El logo X pequeño que aparecía al lado del título HA SIDO ELIMINADO DEFINITIVAMENTE */}
        {/* Título principal en el Header - Asegurado que pageTitle se muestra */}
        <h2 className="text-2xl font-bold text-white">{pageTitle}</h2> {/* Muestra pageTitle */}
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-base font-medium">Hola, {displayUserName}</span> 
        
        <button className="p-2 rounded-full hover:bg-[#0e1a2d] transition-colors">
          <BellIcon className="h-7 w-7 text-cyan-400" /> 
        </button>
        <button className="p-2 rounded-full hover:bg-[#0e1a2d] transition-colors">
          <UserCircleIcon className="h-7 w-7 text-cyan-400" />
        </button>
      </div>
    </header>
  );
};

export default Header;