import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔥 DESHABILITADO en dev para evitar doble montaje de componentes que causa reloads
  reactStrictMode: process.env.NODE_ENV === 'production',
  
  // 🔥 Permitir cookies en desarrollo HTTP (necesario para Supabase Auth)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.googleapis.com https://*.gstatic.com https://*.openstreetmap.org https://unpkg.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://*.googleapis.com",
              "frame-src 'self' https://maps.googleapis.com https://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
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
