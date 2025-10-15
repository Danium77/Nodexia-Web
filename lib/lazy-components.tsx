import { lazy } from 'react';

// === LAZY LOADING DE COMPONENTES PESADOS ===

// Admin Components
export const GestionEmpresasReal = lazy(() => import('../components/Admin/GestionEmpresasReal'));
export const WizardOnboarding = lazy(() => import('../components/Admin/WizardOnboarding'));
export const WizardUsuario = lazy(() => import('../components/Admin/WizardUsuario'));

// SuperAdmin Components
export const EmpresasManager = lazy(() => import('../components/SuperAdmin/EmpresasManager'));
export const LogsManager = lazy(() => import('../components/SuperAdmin/LogsManager'));
export const PagosManager = lazy(() => import('../components/SuperAdmin/PagosManager'));
export const SuscripcionesManager = lazy(() => import('../components/SuperAdmin/SuscripcionesManager'));

// Testing Components
export const TestInteraccionUsuarios = lazy(() => import('../components/Testing/TestInteraccionUsuarios'));

// Network Components
export const NetworkManager = lazy(() => import('../components/Network/NetworkManager'));
export const UsuariosEmpresaManager = lazy(() => import('../components/Network/UsuariosEmpresaManager'));

// Modal Components
export const AssignTransportModal = lazy(() => import('../components/Modals/AssignTransportModal'));

// Planning Components
export const PlanningGrid = lazy(() => import('../components/Planning/PlanningGrid'));

// === COMPONENTE WRAPPER CON SUSPENSE ===
import React, { Suspense } from 'react';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <LazyLoadingSpinner /> 
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// === SPINNER DE CARGA ===
const LazyLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
    <span className="ml-2 text-gray-400">Cargando componente...</span>
  </div>
);

// === HOOK PARA INTERSECTION OBSERVER ===
import { useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (
  options: IntersectionObserverInit = { threshold: 0.1 }
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setIsIntersecting(entry.isIntersecting);
      }
    }, options);

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [options]);

  return { isIntersecting, targetRef };
};

// === COMPONENTE LAZY CON INTERSECTION OBSERVER ===
interface LazyComponentProps {
  children: React.ReactNode;
  height?: string | number;
  className?: string;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({ 
  children, 
  height = 200, 
  className = '' 
}) => {
  const { isIntersecting, targetRef } = useIntersectionObserver();

  return (
    <div 
      ref={targetRef} 
      style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
      className={className}
    >
      {isIntersecting ? children : <LazyLoadingSpinner />}
    </div>
  );
};