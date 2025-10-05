import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint rules should run during builds — re-enabled to fix remaining issues.
  },
  // Configuración para mejorar HMR y evitar problemas de reconexión
  webpack: (config, { dev }) => {
    if (dev) {
      // Configuración más conservadora para evitar bucles infinitos
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 600,
        ignored: ['node_modules/**', '.next/**']
      };
      
      // Deshabilitar cache problemático en desarrollo
      config.cache = false;
    }
    return config;
  },
  // Configuración experimental para mejorar Fast Refresh
  experimental: {
    turbo: undefined, // Deshabilitar Turbopack para mayor estabilidad
  },
  // Mejorar estabilidad de Fast Refresh
  onDemandEntries: {
    // Período en ms para que una página permanezca en memoria sin ser utilizada
    maxInactiveAge: 25 * 1000,
    // Número de páginas a mantener simultaneamente
    pagesBufferLength: 2,
  }
};

export default nextConfig;
