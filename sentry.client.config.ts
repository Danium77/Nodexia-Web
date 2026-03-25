import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Solo enviar errores en producción
  enabled: process.env.NODE_ENV === 'production',

  // Porcentaje de transacciones para performance monitoring (10% en free tier)
  tracesSampleRate: 0.1,

  // Capturar replays solo cuando hay error (gratis: 50/mes)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // No enviar errores de extensiones del browser
  beforeSend(event) {
    if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
      (frame) => frame.filename?.includes('chrome-extension://')
    )) {
      return null;
    }
    return event;
  },

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
});
