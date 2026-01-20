// components/ui/LoadingSpinner.tsx
// Standardized loading component with Nodexia logo

import React from 'react';
import { ComponentProps } from '@/types';
import Image from 'next/image';

interface LoadingSpinnerProps extends ComponentProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
  variant?: 'logo' | 'circle'; // Nueva opción: logo de Nodexia o spinner circular
}

const sizeClasses = {
  sm: 'w-12 h-12',    // 48px - Pequeño inline
  md: 'w-20 h-20',    // 80px - Medio inline
  lg: 'w-32 h-32',    // 128px - Grande (estándar Netflix/YouTube)
  xl: 'w-40 h-40'     // 160px - Extra grande fullscreen
};

const colorClasses = {
  primary: 'text-cyan-500',
  white: 'text-white',
  gray: 'text-gray-400'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
  variant = 'circle',
  className = ''
}) => {
  const spinnerClasses = [
    'animate-spin',
    sizeClasses[size],
    colorClasses[color],
    className
  ].filter(Boolean).join(' ');

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      {variant === 'logo' ? (
        // Logo Neon Nodexia con animación fade
        <div className={`relative ${sizeClasses[size]}`}>
          {/* Logo con efecto de fade (pulso suave) */}
          <div className="absolute inset-0 animate-pulse">
            <Image
              src="/logo-spinner.png"
              alt="Loading"
              width={160}
              height={160}
              className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]"
              priority
              unoptimized
            />
          </div>
        </div>
      ) : (
        // Spinner circular clásico (fallback)
        <svg 
          className={spinnerClasses} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {text && (
        <p className="mt-4 text-base text-slate-300 animate-pulse font-medium">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;