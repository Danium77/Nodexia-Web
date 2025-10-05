// components/ui/Card.tsx
// Standardized Card component for consistent UI

import React from 'react';
import { ComponentProps } from '@/types';

interface CardProps extends ComponentProps {
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg'
};

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  border = true,
  hover = false
}) => {
  const baseClasses = 'bg-slate-800/60 rounded-lg';
  const borderClasses = border ? 'border border-slate-700' : '';
  const hoverClasses = hover ? 'hover:bg-slate-800/80 transition-colors' : '';
  const combinedClasses = [
    baseClasses,
    borderClasses,
    paddingClasses[padding],
    shadowClasses[shadow],
    hoverClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={combinedClasses}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;