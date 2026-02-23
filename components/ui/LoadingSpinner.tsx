// components/ui/LoadingSpinner.tsx
// Standardized loading component with Nodexia logo heartbeat

import React from 'react';
import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
  /** @deprecated Use default (logo) variant */
  variant?: 'logo' | 'circle';
  /** @deprecated Ignored, always cyan */
  color?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
  xl: 'w-36 h-36'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'lg',
  text,
  fullScreen = false,
  className = '',
}) => {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Logo Nodexia con heartbeat */}
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Glow ring behind logo */}
        <div className="absolute inset-0 rounded-full animate-nodexia-glow bg-cyan-500/10" />
        {/* Logo with heartbeat scale */}
        <Image
          src="/logo X gruesa.png"
          alt="Cargando"
          width={160}
          height={160}
          className="relative w-full h-full object-contain animate-nodexia-heartbeat drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
          priority
          unoptimized
        />
      </div>
      {text && (
        <p className="text-sm text-slate-400 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

/** Inline tiny spinner for buttons — keeps the old border-spin pattern */
export const ButtonSpinner: React.FC<{ className?: string }> = ({ className = 'h-4 w-4 border-white' }) => (
  <div className={`animate-spin rounded-full border-2 border-t-transparent ${className}`} />
);

export default LoadingSpinner;