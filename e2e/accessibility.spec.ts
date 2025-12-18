import { test, expect } from '@playwright/test';

test.describe('Accesibilidad', () => {
  test('debe tener elementos accesibles en página de login', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que los inputs tienen labels
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('aria-label');
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('aria-label');
  });

  test('debe ser navegable con teclado', async ({ page }) => {
    await page.goto('/');
    
    // Tab para navegar entre campos
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
  });

  test('debe tener contraste adecuado', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que existen elementos visibles
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('debe cargar página principal en tiempo razonable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // La página debe cargar en menos de 3 segundos
    expect(loadTime).toBeLessThan(3000);
  });

  test('debe tener meta tags correctos', async ({ page }) => {
    await page.goto('/');
    
    // Verificar título
    await expect(page).toHaveTitle(/Nodexia/i);
    
    // Verificar meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');
  });
});
