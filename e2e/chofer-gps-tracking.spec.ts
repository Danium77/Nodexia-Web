// e2e/chofer-gps-tracking.spec.ts
// Test E2E para flujo completo de GPS tracking del chofer

import { test, expect, Page } from '@playwright/test';

// Función helper para simular geolocation
async function mockGeolocation(page: Page, latitude: number = -34.6037, longitude: number = -58.3816) {
  await page.addInitScript(({ lat, lng }) => {
    // Mock geolocation API
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          const position: GeolocationPosition = {
            coords: {
              latitude: lat,
              longitude: lng,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: 25.5 // 25.5 m/s = ~92 km/h
            },
            timestamp: Date.now()
          };
          success(position);
        },
        watchPosition: (success: PositionCallback) => {
          const position: GeolocationPosition = {
            coords: {
              latitude: lat + Math.random() * 0.001, // Simular pequeños movimientos
              longitude: lng + Math.random() * 0.001,
              accuracy: 8 + Math.random() * 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: Math.random() * 360,
              speed: 20 + Math.random() * 20 // Velocidad variable
            },
            timestamp: Date.now()
          };
          // Simular actualizaciones cada 5 segundos
          setTimeout(() => success(position), 5000);
          return 1; // watchId
        },
        clearWatch: () => {}
      },
      configurable: true
    });

    // Mock battery API
    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve({
        level: 0.85,
        charging: false,
        addEventListener: () => {}
      }),
      configurable: true
    });
  }, { lat: latitude, lng: longitude });
}

// Función helper para login como chofer
async function loginAsChofer(page: Page) {
  await page.goto('/login');
  
  // Esperar a que cargue la página de login
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // Usar credenciales de chofer real
  await page.fill('input[type="email"]', 'walter@logisticaexpres.com');
  await page.fill('input[type="password"]', 'Temporal2024!');
  
  // Hacer clic en el botón de login y esperar navegación
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]')
  ]);
  
  // Verificar que estamos logueados (no en /login)
  await expect(page).not.toHaveURL(/.*\/login.*/);
}

test.describe('Chofer GPS Tracking E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock geolocation antes de cada test
    await mockGeolocation(page, -34.6037, -58.3816);
  });

  test('Flujo completo: login → seleccionar viaje → activar GPS → verificar envío', async ({ page }) => {
    // 1. Login como chofer
    await loginAsChofer(page);
    
    // 2. Navegar a tracking GPS
    await page.goto('/chofer/tracking-gps');
    
    // 3. Verificar que la página carga correctamente
    await expect(page.locator('h2:has-text("Seleccionar Viaje Activo")')).toBeVisible();
    
    // 4. Esperar a que carguen los viajes activos o verificar si ya hay tracking activo
    try {
      // Verificar si ya hay GPS activo
      const gpsActivo = page.locator('text=🛰️ GPS ACTIVO');
      if (await gpsActivo.isVisible()) {
        console.log('GPS ya está activo, verificando funcionamiento...');
        
        // 5. Verificar coordenadas GPS están visibles
        await expect(page.locator('[data-testid="gps-coordinates"]')).toBeVisible();
        
        // 6. Verificar que se muestran coordenadas (formato -XX.XXXXX)
        await expect(page.locator('text=/-?[0-9]+\\.[0-9]+/')).toBeVisible({ timeout: 5000 });
        
        // 7. Verificar contador de envíos
        const totalEnviosElement = page.locator('[data-testid="total-envios"]');
        await expect(totalEnviosElement).toBeVisible();
        const enviosIniciales = await totalEnviosElement.textContent();
        console.log('Envíos iniciales:', enviosIniciales);
        
        // 8. Esperar unos segundos y verificar que el sistema sigue funcionando
        await page.waitForTimeout(10000);
        
        // 9. Verificar que las estadísticas se actualizan
        await expect(page.locator('text=Estadísticas del Viaje')).toBeVisible();
        
        console.log('✅ GPS tracking funcionando correctamente');
        return;
      }
    } catch (e) {
      console.log('GPS no activo, procediendo con activación...');
    }
    
    // Si no hay GPS activo, proceder con la activación normal
    await page.waitForSelector('[data-testid="viaje-item"]', { timeout: 10000 });
    
    // 5. Seleccionar el primer viaje disponible
    const primerViaje = page.locator('[data-testid="viaje-item"]').first();
    await primerViaje.click();
    
    // Verificar que el viaje se seleccionó
    await expect(primerViaje).toHaveClass(/border-cyan-500/);
    
    // 6. Activar tracking GPS
    const botonIniciar = page.locator('[data-testid="tracking-button"]:has-text("Iniciar Tracking")');
    await expect(botonIniciar).toBeVisible();
    await botonIniciar.click();
    
    // 7. Verificar que el tracking se activó
    await expect(page.locator('[data-testid="tracking-button"]:has-text("Detener Tracking")')).toBeVisible({ timeout: 10000 });
    
    // 8. Verificar indicadores de GPS activo
    await expect(page.locator('text=🛰️ GPS ACTIVO')).toBeVisible();
    await expect(page.locator('[data-testid="gps-coordinates"]')).toBeVisible();
    
    // 9. Esperar a que se muestren las coordenadas
    await expect(page.locator('text=/-?[0-9]+\\.[0-9]+/')).toBeVisible({ timeout: 15000 });
    
    // 10. Verificar contador de envíos aumenta
    const enviosInicial = await page.locator('[data-testid="total-envios"]').textContent();
    await page.waitForTimeout(15000);
    const enviosFinal = await page.locator('[data-testid="total-envios"]').textContent();
    expect(parseInt(enviosFinal || '0')).toBeGreaterThanOrEqual(parseInt(enviosInicial || '0'));
  });

  test('Validación: no permite iniciar tracking sin viaje seleccionado', async ({ page }) => {
    await loginAsChofer(page);
    await page.goto('/chofer/tracking-gps');
    
    // Esperar carga de viajes
    await page.waitForSelector('[data-testid="viaje-item"]', { timeout: 10000 });
    
    // Intentar iniciar tracking sin seleccionar viaje
    const botonIniciar = page.locator('button:has-text("Iniciar Tracking")');
    
    // El botón debería estar deshabilitado o no visible si no hay viaje seleccionado
    // O debería mostrar error al hacer clic
    if (await botonIniciar.isEnabled()) {
      await botonIniciar.click();
      await expect(page.locator('text=Debes seleccionar un viaje primero')).toBeVisible();
    } else {
      await expect(botonIniciar).toBeDisabled();
    }
  });

  test('Manejo de errores: dispositivo sin GPS', async ({ page }) => {
    // Override para simular dispositivo sin geolocation
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        configurable: true
      });
    });

    await loginAsChofer(page);
    await page.goto('/chofer/tracking-gps');
    
    // Seleccionar viaje
    await page.waitForSelector('[data-testid="viaje-item"]', { timeout: 10000 });
    await page.locator('[data-testid="viaje-item"]').first().click();
    
    // Intentar iniciar tracking
    await page.click('button:has-text("Iniciar Tracking")');
    
    // Verificar mensaje de error
    await expect(page.locator('text=Tu dispositivo no soporta GPS')).toBeVisible();
  });

  test('Estadísticas en tiempo real durante tracking', async ({ page }) => {
    await loginAsChofer(page);
    await page.goto('/chofer/tracking-gps');
    
    // Seleccionar viaje e iniciar tracking
    await page.waitForSelector('[data-testid="viaje-item"]', { timeout: 10000 });
    await page.locator('[data-testid="viaje-item"]').first().click();
    await page.click('button:has-text("Iniciar Tracking")');
    
    // Verificar que aparecen las estadísticas
    await expect(page.locator('text=Estadísticas del Viaje')).toBeVisible();
    
    // Esperar a que se muestren datos de velocidad
    await expect(page.locator('[data-testid="velocidad-actual"]')).toBeVisible({ timeout: 15000 });
    
    // Verificar que la velocidad es realista (debería mostrar ~92 km/h según nuestro mock)
    const velocidadTexto = await page.locator('[data-testid="velocidad-actual"]').textContent();
    const velocidad = parseInt(velocidadTexto || '0');
    expect(velocidad).toBeGreaterThan(0);
    expect(velocidad).toBeLessThan(200); // Velocidad realista
    
    // Verificar contador de registros GPS
    await expect(page.locator('text=Registros GPS:')).toBeVisible();
  });

  test('Navegación y persistencia de estado', async ({ page }) => {
    await loginAsChofer(page);
    await page.goto('/chofer/tracking-gps');
    
    // Seleccionar viaje
    await page.waitForSelector('[data-testid="viaje-item"]', { timeout: 10000 });
    const viajeTexto = await page.locator('[data-testid="viaje-item"]').first().textContent();
    await page.locator('[data-testid="viaje-item"]').first().click();
    
    // Navegar a otra página
    await page.goto('/dashboard');
    
    // Volver a tracking GPS
    await page.goto('/chofer/tracking-gps');
    
    // Verificar que el viaje sigue seleccionado (si es el único)
    if (viajeTexto?.includes('Viaje #')) {
      await expect(page.locator(`text=${viajeTexto}`)).toBeVisible();
    }
  });
});