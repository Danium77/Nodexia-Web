import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔥 DESHABILITADO en dev para evitar doble montaje de componentes que causa reloads
  reactStrictMode: process.env.NODE_ENV === 'production',
  eslint: {
    // Lint rules should run during builds — re-enabled to fix remaining issues.
  },
  
  // 🔥 Permitir cookies en desarrollo HTTP (necesario para Supabase Auth)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Configuración para mejorar HMR y evitar problemas de reconexión
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Configuración más conservadora para evitar bucles infinitos
      config.watchOptions = {
        poll: 3000, // Aumentado de 2s a 3s para reducir recargas agresivas
        aggregateTimeout: 800, // Aumentado de 600ms a 800ms
        ignored: ['node_modules/**', '.next/**']
      };
      
      // Deshabilitar cache problemático en desarrollo
      config.cache = false;
    }
    return config;
  },
    turbopack: {},
  // Mejorar estabilidad de Fast Refresh
  onDemandEntries: {
    // Período en ms para que una página permanezca en memoria sin ser utilizada
    // 🔥 AUMENTADO A 10 MINUTOS para evitar pérdida de estado al cambiar de app
    maxInactiveAge: 600 * 1000,
    // Número de páginas a mantener simultaneamente - AUMENTADO a 10
    pagesBufferLength: 10,
  }
};

export default nextConfig;
