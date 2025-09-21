import React from 'react';

interface FormCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function FormCard({ children, className = '' }: FormCardProps) {
  return (
    <div className={`w-full bg-gray-700 p-6 rounded-lg shadow-md ${className}`}>
      {children}
    </div>
  );
}
