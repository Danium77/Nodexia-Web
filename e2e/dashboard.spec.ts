import { test, expect } from '@playwright/test';

// Helper para simular login
async function login(page: any, email: string, password: string) {
  await page.goto('/');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Esperar a que redirija al dashboard
  await page.waitForURL(/dashboard/);
}

test.describe('Gestión de Empresas (requiere auth)', () => {
  test.skip('debe listar empresas existentes', async ({ page }) => {
    // Este test requiere autenticación real
    // Usar test.skip() hasta tener env de testing configurado
    
    await login(page, 'admin@nodexia.com', 'password');
    await page.goto('/admin/empresas');
    
    // Verificar que se muestra la tabla de empresas
    await expect(page.getByRole('heading', { name: /empresas/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test.skip('debe abrir modal de crear empresa', async ({ page }) => {
    await login(page, 'admin@nodexia.com', 'password');
    await page.goto('/admin/empresas');
    
    // Click en botón de crear
    await page.click('button:has-text("Nueva Empresa")');
    
    // Verificar que se abre el modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/crear empresa/i)).toBeVisible();
  });

  test.skip('debe validar formulario de empresa', async ({ page }) => {
    await login(page, 'admin@nodexia.com', 'password');
    await page.goto('/admin/empresas');
    
    await page.click('button:has-text("Nueva Empresa")');
    
    // Intentar guardar sin llenar campos
    await page.click('button:has-text("Guardar")');
    
    // Verificar mensajes de validación
    await expect(page.getByText(/nombre.*requerido/i)).toBeVisible();
    await expect(page.getByText(/cuit.*requerido/i)).toBeVisible();
  });
});

test.describe('Gestión de Despachos', () => {
  test.skip('debe mostrar lista de despachos', async ({ page }) => {
    await login(page, 'coordinador@lacteos.com', 'password');
    await page.goto('/dashboard');
    
    // Verificar que se muestra la lista
    await expect(page.getByText(/despachos/i)).toBeVisible();
  });

  test.skip('debe filtrar despachos por estado', async ({ page }) => {
    await login(page, 'coordinador@lacteos.com', 'password');
    await page.goto('/dashboard');
    
    // Aplicar filtro
    await page.selectOption('select[name="estado"]', 'pendiente');
    
    // Verificar que se actualiza la lista
    await expect(page.getByText(/pendiente/i)).toBeVisible();
  });
});

test.describe('Asignación de Transporte', () => {
  test.skip('debe abrir modal de asignación', async ({ page }) => {
    await login(page, 'coordinador@lacteos.com', 'password');
    await page.goto('/dashboard');
    
    // Click en asignar transporte del primer despacho
    await page.click('button:has-text("Asignar")');
    
    // Verificar modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/asignar transporte/i)).toBeVisible();
  });

  test.skip('debe buscar transportes disponibles', async ({ page }) => {
    await login(page, 'coordinador@lacteos.com', 'password');
    await page.goto('/dashboard');
    
    await page.click('button:has-text("Asignar")');
    
    // Buscar transporte
    await page.fill('input[placeholder*="Buscar"]', 'Camión');
    
    // Verificar que se filtran los resultados
    await expect(page.getByText(/Camión/i)).toBeVisible();
  });

  test.skip('debe asignar transporte exitosamente', async ({ page }) => {
    await login(page, 'coordinador@lacteos.com', 'password');
    await page.goto('/dashboard');
    
    await page.click('button:has-text("Asignar")');
    
    // Seleccionar un transporte
    await page.click('button:has-text("Seleccionar")');
    
    // Confirmar asignación
    await page.click('button:has-text("Confirmar")');
    
    // Verificar mensaje de éxito
    await expect(page.getByText(/asignado correctamente/i)).toBeVisible();
  });
});

test.describe('Navegación Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('debe ser responsive en móvil', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que el layout es responsive
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Verificar que no hay overflow horizontal
    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });
});
