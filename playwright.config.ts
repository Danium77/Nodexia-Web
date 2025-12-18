import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Tiempo máximo por test */
  timeout: 30 * 1000,
  
  /* Correr tests en paralelo */
  fullyParallel: true,
  
  /* Fallar el build si dejaste test.only() en el código */
  forbidOnly: !!process.env.CI,
  
  /* Retry en CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Número de workers */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: 'html',
  
  /* Configuración compartida para todos los proyectos */
  use: {
    /* URL base */
    baseURL: 'http://localhost:3000',
    
    /* Capturar screenshot solo cuando falla */
    screenshot: 'only-on-failure',
    
    /* Capturar video solo cuando falla */
    video: 'retain-on-failure',
    
    /* Tracing */
    trace: 'on-first-retry',
  },

  /* Configurar proyectos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Tests en móviles */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Servidor de desarrollo */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
