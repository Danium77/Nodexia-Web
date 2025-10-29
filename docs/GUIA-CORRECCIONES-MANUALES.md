# 🔧 Guía de Correcciones Manuales

Esta guía contiene instrucciones para las correcciones que deben hacerse manualmente.

## 1. Actualizar Dependencias Críticas

```powershell
# Actualizar Next.js (URGENTE - vulnerabilidades de seguridad)
pnpm update next@latest

# Actualizar Supabase
pnpm update @supabase/supabase-js@latest

# Actualizar eslint-config-next
pnpm update eslint-config-next@latest

# Verificar actualizaciones
pnpm audit
```

## 2. Migrar ESLint

```powershell
# Ejecutar codemod para migrar a ESLint CLI
npx @next/codemod@canary next-lint-to-eslint-cli .
```

## 3. Correcciones TypeScript Comunes

### A. Variables No Utilizadas
Si una variable no se usa, eliminarla o prefijo con `_`:

```typescript
// ❌ Incorrecto
const { data, error } = await supabase.from('table').select();

// ✅ Correcto (si no usas data)
const { error } = await supabase.from('table').select();

// ✅ Correcto (si la variable es necesaria pero no usada aún)
const { data: _data, error } = await supabase.from('table').select();
```

### B. Valores Posiblemente Undefined
Siempre verificar antes de acceder:

```typescript
// ❌ Incorrecto
const count = cliente.alertas_count > 0;

// ✅ Correcto - Opción 1: Optional chaining con nullish coalescing
const count = (cliente.alertas_count ?? 0) > 0;

// ✅ Correcto - Opción 2: Verificación explícita
const count = cliente.alertas_count && cliente.alertas_count > 0;
```

### C. Propiedades Faltantes en Componentes

```typescript
// ❌ Incorrecto
<Header />

// ✅ Correcto
<Header 
  userEmail={user?.email ?? 'unknown'}
  userName={user?.name ?? 'Usuario'}
  pageTitle="Dashboard"
/>
```

### D. Type Assertions Incorrectas
Usar type guards en lugar de assertions:

```typescript
// ❌ Incorrecto
const isAdmin = (user?.roles as Role)?.name === 'admin';

// ✅ Correcto
import { hasProperty } from '@/lib/type-guards';

const isAdmin = user?.roles && 
                hasProperty(user.roles, 'name') && 
                user.roles.name === 'admin';
```

### E. Tipos Implícitos
Siempre declarar tipos explícitos:

```typescript
// ❌ Incorrecto
let items = [];

// ✅ Correcto
let items: ItemType[] = [];
```

## 4. Correcciones en Tests

### Envolver Updates en act()

```typescript
import { act, render } from '@testing-library/react';

test('should update state', async () => {
  const { result } = renderHook(() => useMyHook());
  
  await act(async () => {
    await result.current.updateData();
  });
  
  expect(result.current.data).toBeDefined();
});
```

## 5. Archivos con Mayor Prioridad

Corregir en este orden:

1. `pages/crear-despacho.tsx` (21 errores)
2. `components/SuperAdmin/SuscripcionesManager.tsx` (22 errores)
3. `lib/hooks/useNetwork.tsx` (15 errores)
4. `components/Network/NetworkManager.tsx` (6 errores)
5. `components/SuperAdmin/LogsManager.tsx` (15 errores)

## 6. Herramientas Útiles

```powershell
# Ver errores de un archivo específico
pnpm type-check 2>&1 | Select-String "pages/crear-despacho.tsx"

# Contar errores por archivo
pnpm type-check 2>&1 | Select-String "error TS" | Group-Object

# Ejecutar linting
pnpm lint
```

## 7. Checklist de Validación

- [ ] Actualizar Next.js y dependencias críticas
- [ ] Corregir jest.config.js
- [ ] Migrar a ESLint CLI
- [ ] Corregir errores TypeScript críticos
- [ ] Agregar tests para nuevas correcciones
- [ ] Verificar que todo compila: `pnpm type-check`
- [ ] Verificar que tests pasan: `pnpm test`
- [ ] Verificar que la app corre: `pnpm dev`
