import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Nodexia Chofer" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nodexia" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#06b6d4" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Icons para diferentes dispositivos */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo X gruesa.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo X gruesa.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/logo X gruesa.png" />
        
        {/* Apple Splash Screens */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Descripción para SEO */}
        <meta name="description" content="Sistema de gestión logística para choferes - Nodexia" />
        <meta name="keywords" content="logística, transporte, chofer, viajes, entregas" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
