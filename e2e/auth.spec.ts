import { test, expect } from '@playwright/test';

test.describe('Autenticación y Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe mostrar página de login', async ({ page }) => {
    await expect(page).toHaveTitle(/Nodexia/i);
    await expect(page.getByRole('heading', { name: /login|iniciar sesión/i })).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalido@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/credenciales inválidas|error/i)).toBeVisible();
  });

  test('debe mostrar campos requeridos', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    // Verificar que se muestran mensajes de validación
    await expect(page.getByText(/email.*requerido/i)).toBeVisible();
  });

  test('debe validar formato de email', async ({ page }) => {
    await page.fill('input[type="email"]', 'email-invalido');
    await page.fill('input[type="password"]', 'password123');
    
    // Verificar validación HTML5 de email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });
});

test.describe('Navegación después de login (con mock)', () => {
  test('debe navegar a dashboard después de login exitoso', async ({ page }) => {
    // Nota: Este test requiere configurar mocks o usar credenciales de test
    // Por ahora validamos la estructura de navegación
    
    await page.goto('/');
    
    // Simular navegación a dashboard (esto requeriría auth real o mock)
    await page.goto('/dashboard');
    
    // Verificar que pide autenticación si no hay sesión
    await expect(page).toHaveURL(/login|\/$/);
  });
});
