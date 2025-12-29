# 🧪 Testing en Nodexia Web

## 📊 Estado Actual

✅ **50 tests unitarios pasando**
- 4 test suites configurados
- Cobertura de APIs críticas
- Tests de validadores y servicios
- Tests de contextos de React

## 🛠️ Herramientas Configuradas

### Jest (Tests Unitarios)
- **Testing de APIs**: Validación de endpoints
- **Testing de Servicios**: Lógica de negocio
- **Testing de Validadores**: Validación de roles y datos
- **Mocks de Supabase**: Sin tocar BD real

### Playwright (Tests E2E)
- **Tests end-to-end**: Flujos completos de usuario
- **Tests en múltiples navegadores**: Chrome, Firefox, Safari
- **Tests móviles**: iOS y Android
- **Tests de accesibilidad**: A11y

## 🚀 Comandos Disponibles

### Tests Unitarios (Jest)
```bash
# Ejecutar todos los tests
npm test

# Modo watch (auto-rerun al guardar)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

### Tests E2E (Playwright)
```bash
# Instalar navegadores (solo primera vez)
npm run playwright:install

# Ejecutar tests E2E
npm run test:e2e

# Con UI interactiva
npm run test:e2e:ui

# Ver los tests ejecutándose
npm run test:e2e:headed

# Modo debug
npm run test:e2e:debug
```

## 📁 Estructura de Tests

```
__tests__/
├── api/
│   └── admin/
│       └── nueva-invitacion.test.ts    # Tests de creación de usuarios
├── lib/
│   └── validators/
│       └── roleValidator.test.ts        # Tests de validación de roles
├── setup.test.tsx                        # Setup básico
└── sync-usuarios.test.ts                 # Tests de transiciones de estados

e2e/
├── auth.spec.ts                          # Tests de autenticación
├── dashboard.spec.ts                     # Tests de dashboard
└── accessibility.spec.ts                 # Tests de accesibilidad
```

## ✅ Tests Implementados

### APIs
- ✅ `/api/admin/nueva-invitacion` - Creación de usuarios
  - Validación de campos requeridos
  - Validación de roles por tipo de empresa
  - Gestión de passwords temporales
  - Rollback en caso de error

### Validadores
- ✅ `roleValidator` - Validación de roles
  - Roles válidos por tipo de empresa
  - Detección de roles incompatibles
  - Manejo de errores de BD

### Servicios
- ✅ `estadosService` - Transiciones de estados
  - Validación de transiciones permitidas
  - Detección de estados finales
  - Próximos estados disponibles

## 🎯 Características de los Tests

### 1. Aislamiento Total
- ✅ No tocan base de datos real
- ✅ No envían emails reales  
- ✅ Usan mocks para todas las dependencias externas
- ✅ No afectan el código de producción

### 2. Passwords Temporales (Sin SMTP)
```typescript
// Los tests verifican que sin SMTP configurado:
expect(responseData.metodo).toBe('password_temporal');
expect(responseData.password_temporal).toBe('Temporal2024!');
```

### 3. Validación de Roles
```typescript
// Tests validan que solo roles válidos se asignen:
- planta → coordinador_planta, acceso_planta
- transporte → coordinador_transporte, chofer
- cliente → visor
```

## 🔍 Próximos Pasos

### Tests E2E Pendientes (requieren auth)
Los tests E2E están creados pero marcados como `.skip()` porque requieren:
1. Configurar credenciales de test en Supabase
2. O implementar sistema de auth mock

Para activarlos:
```typescript
// Quitar .skip() y configurar credenciales de test
test.skip('debe listar empresas', async ({ page }) => {
  // Cambiar a:
test('debe listar empresas', async ({ page }) => {
```

### Componentes UI
Los tests de componentes están pendientes de:
- Resolver imports de componentes complejos
- Configurar mocks adicionales para hooks personalizados

## 📝 Buenas Prácticas

### 1. Escribir tests para nuevas features
Cada nueva API o componente debe tener su test:
```typescript
// __tests__/api/mi-nueva-api.test.ts
describe('/api/mi-nueva-api', () => {
  it('debe funcionar correctamente', async () => {
    // Test aquí
  });
});
```

### 2. Mockear dependencias externas
```typescript
jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));
```

### 3. Usar beforeEach para cleanup
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.SMTP_HOST; // Limpiar env vars
});
```

## 🐛 Debugging

### Ver por qué falla un test
```bash
npm test -- --verbose
```

### Ejecutar un test específico
```bash
npm test -- --testNamePattern="debe crear usuario"
```

### Ver cobertura de un archivo
```bash
npm run test:coverage -- --collectCoverageFrom="pages/api/admin/*.ts"
```

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## ⚠️ Importante

**Los tests NO afectan la aplicación en producción:**
- Solo se ejecutan manualmente con `npm test`
- No se incluyen en el build de producción
- Usan mocks para todas las operaciones
- No modifican datos reales

---

**Última actualización**: 17 de Diciembre, 2025
**Tests pasando**: 50/50 ✅
**Cobertura**: En progreso
