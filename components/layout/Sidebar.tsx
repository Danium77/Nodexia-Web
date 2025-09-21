// components/Layout/Sidebar.tsx
import React from 'react'; // Quitamos useEffect y useState
import Link from 'next/link';
import Image from 'next/image';
import { HomeIcon, CalendarDaysIcon, TruckIcon, ChartBarIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUserContext } from '../context/UserContext';

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userEmail, userName }) => {
  const router = useRouter();
  const { email, name, role: userRole, loading } = useUserContext();
  // allow override via props (some pages pass them)
  userEmail = userEmail || email;
  userName = userName || name;
  // Log para depuración
  console.log('Sidebar userRole:', userRole);

  if (loading) {
    // Loader o sidebar vacío mientras se carga el rol
    return (
      <aside className="w-64 bg-[#1b273b] pt-0 pb-6 flex flex-col shadow-lg text-slate-100 min-h-screen" />
    );
  }

  // Definir los ítems según el rol
  let navItems = [
    { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
  ];
  if (userRole === 'coordinador') {
    navItems = [
      ...navItems,
      { name: 'Planificación', icon: CalendarDaysIcon, href: '/planificacion' },
      { name: 'Despachos', icon: TruckIcon, href: '/crear-despacho' },
      { name: 'Estadísticas', icon: ChartBarIcon, href: '/estadisticas' },
      { name: 'Configuración', icon: Cog6ToothIcon, href: '/configuracion' },
    ];
  } else if (userRole === 'transporte') {
    navItems = [
      ...navItems,
      { name: 'Despachos', icon: TruckIcon, href: '/crear-despacho' },
      { name: 'Configuración', icon: Cog6ToothIcon, href: '/transporte/configuracion' },
    ];
  } else {
    // Si el rol es vacío o desconocido, mostrar todas las solapas (modo depuración)
    navItems = [
      { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
      { name: 'Planificación', icon: CalendarDaysIcon, href: '/planificacion' },
      { name: 'Despachos', icon: TruckIcon, href: '/crear-despacho' },
      { name: 'Estadísticas', icon: ChartBarIcon, href: '/estadisticas' },
      { name: 'Configuración', icon: Cog6ToothIcon, href: '/configuracion' },
    ];
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/login');
    } else {
      console.error("Error al cerrar sesión:", error.message);
    }
  };

  return (
    <aside className="w-64 bg-[#1b273b] pt-0 pb-6 flex flex-col shadow-lg text-slate-100 min-h-screen"> {/* Mantenemos pt-0 */}
      <div className="text-center mb-4 transform -translate-y-6 mx-auto" style={{ width: 'fit-content' }}> {/* Mantenemos -translate-y-6 */}
        <Image 
          src="/logo X gruesa.png" 
          alt="Nodexia Logo" 
          width={100} 
          height={100} 
          className="mx-auto block -mb-8" 
        />
        <span className="text-xl font-bold text-white block">NODEXIA</span> 
      </div>
      
      <nav className="flex-1 mt-8"> {/* Mantenemos mt-8 */}
        <ul>
          {navItems.map((item) => (
            <li key={item.name} className="mb-3">
              <Link href={item.href} className={`flex items-center p-3 rounded-lg hover:bg-[#0e1a2d] transition-colors duration-200 ${router.pathname === item.href ? 'bg-[#0e1a2d] text-cyan-400' : 'text-slate-300'}`}>
                <item.icon className="h-6 w-6 mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-700">
        <div className="flex items-center p-3">
            <UserCircleIcon className="h-8 w-8 text-cyan-400 mr-3" />
            <span className="text-sm font-medium">{userName || userEmail.split('@')[0] || 'Usuario'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center p-3 mt-2 w-full rounded-lg text-red-400 hover:bg-red-900/30 transition-colors duration-200"
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-6 mr-3" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;