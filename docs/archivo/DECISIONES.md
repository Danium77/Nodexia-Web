# 📝 DECISIONES TÉCNICAS - Para Jary

**Propósito**: Registro de decisiones importantes para no repetir debates

---

## 🎯 DECISIONES DE ARQUITECTURA

### Decisión #1: Mantener Pages Router
**Fecha**: 19-Oct-2025  
**Contexto**: Next.js tiene App Router nuevo, pero el proyecto usa Pages Router  
**Decisión**: Mantener Pages Router  
**Razón**: 
- Proyecto ya avanzado
- Migración sería costosa
- Pages Router es estable y funcional
- No hay necesidad inmediata de App Router

**Alternativas consideradas**:
- Migrar a App Router (descartado por tiempo/costo)

---

### Decisión #2: Supabase como Backend
**Fecha**: Decisión previa (heredada)  
**Contexto**: Backend completo en Supabase  
**Decisión**: Continuar con Supabase  
**Razón**: 
- Infraestructura ya configurada
- RLS implementado
- Auth funcionando
- Base de datos operativa

---

### Decisión #3: TypeScript Strict Mode
**Fecha**: 19-Oct-2025  
**Contexto**: 325 errores TypeScript con strictNullChecks  
**Decisión**: Mantener strict mode, corregir errores  
**Razón**: 
- Mejor type safety a largo plazo
- Previene bugs
- Estándar de la industria

**Alternativas consideradas**:
- Desactivar strict mode (descartado - mala práctica)

---

### Decisión #4: Jest como Framework de Testing
**Fecha**: Decisión previa (heredada)  
**Contexto**: Jest ya configurado  
**Decisión**: Continuar con Jest + React Testing Library  
**Razón**: 
- Estándar de la industria
- Buena integración con Next.js
- Ya configurado

---

## 🔧 DECISIONES DE IMPLEMENTACIÓN

### Decisión #5: Crear types/missing-types.ts
**Fecha**: 19-Oct-2025  
**Contexto**: Muchos tipos faltantes causaban errores  
**Decisión**: Centralizar tipos compartidos en un archivo  
**Razón**: 
- Evita duplicación
- Fácil de mantener
- Re-exporta desde fuentes originales

---

### Decisión #6: Crear lib/type-guards.ts
**Fecha**: 19-Oct-2025  
**Contexto**: Necesidad de validación runtime de tipos  
**Decisión**: Crear utilidades de type guards  
**Razón**: 
- TypeScript no valida runtime
- Necesario para datos de API
- Patrón estándar

---

### Decisión #7: Estructura de Carpeta .jary/
**Fecha**: 19-Oct-2025  
**Contexto**: Necesidad de memoria persistente para IA  
**Decisión**: Crear carpeta oculta .jary/ con documentación interna  
**Razón**: 
- Separar docs internas de docs del proyecto
- Facilitar continuidad entre sesiones
- No interferir con estructura del proyecto

**Estructura**:
```
.jary/
├── JARY-MEMORIA.md           (manual personal)
├── JARY-CONTEXTO-NODEXIA.md  (qué es Nodexia)
├── JARY-ESTADO-ACTUAL.md     (estado del proyecto)
├── JARY-PROXIMOS-PASOS.md    (plan de trabajo)
├── JARY-DECISIONES.md        (este archivo)
├── JARY-SESIONES.md          (registro de sesiones)
└── JARY-NOTAS.md             (notas varias)
```

---

## 🚫 DECISIONES DE "NO HACER"

### NO Hacer #1: No usar any
**Fecha**: 19-Oct-2025  
**Razón**: Anula TypeScript, causa bugs  
**Alternativa**: Usar unknown y type guards

---

### NO Hacer #2: No desactivar ESLint rules
**Fecha**: 19-Oct-2025  
**Razón**: ESLint previene bugs comunes  
**Excepción**: Solo en casos muy justificados con comentario

---

### NO Hacer #3: No hacer commits sin tests
**Fecha**: 19-Oct-2025  
**Razón**: Prevenir regresiones  
**Proceso**: Siempre ejecutar `pnpm test` antes de commit

---

## 📋 DECISIONES PENDIENTES

### Pendiente #1: Migración ESLint
**Contexto**: `next lint` deprecado en Next.js 16  
**Opciones**:
1. Usar `eslint.config.improved.mjs` que ya generé
2. Usar codemod oficial de Next.js
3. Configurar desde cero

**Próximo paso**: Investigar en Sesión #3

---

### Pendiente #2: Estructura de Tests
**Contexto**: Solo 3 tests actualmente  
**Opciones**:
1. Tests por componente (/__tests__/components/)
2. Tests junto a archivos (.test.tsx)
3. Mixto

**Próximo paso**: Decidir en Sesión #4

---

## 🔄 DECISIONES REVISADAS

*Ninguna aún - primera sesión*

---

## 💡 PATRONES DE CÓDIGO ESTABLECIDOS

### Patrón #1: Manejo de Estados Undefined
```typescript
// ❌ Incorrecto
const nombre = empresa.nombre;

// ✅ Correcto
const nombre = empresa?.nombre ?? 'Sin nombre';

// O con type guard
if (!empresa) return null;
const nombre = empresa.nombre;
```

---

### Patrón #2: Type Guards
```typescript
// ❌ Incorrecto
if (typeof rol === 'string') { ... }

// ✅ Correcto
import { isUserRole } from '@/lib/type-guards';
if (isUserRole(rol)) { ... }
```

---

### Patrón #3: Imports de Tipos
```typescript
// ❌ Incorrecto (tipos duplicados)
interface Empresa { ... }

// ✅ Correcto (import desde types/)
import type { Empresa } from '@/types/missing-types';
```

---

### Patrón #4: Manejo de Errores en APIs
```typescript
// ❌ Incorrecto
const { data } = await supabase.from('...').select();

// ✅ Correcto
const { data, error } = await supabase.from('...').select();
if (error) {
  console.error('Error:', error);
  return res.status(500).json({ error: error.message });
}
```

---

## 🎨 CONVENCIONES DE CÓDIGO

### Naming Conventions
- **Componentes**: PascalCase (ej: `AssignTransportModal`)
- **Hooks**: camelCase con prefijo use (ej: `useUserRole`)
- **Archivos**: kebab-case para páginas (ej: `crear-despacho.tsx`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `MAX_RETRIES`)
- **Variables**: camelCase (ej: `empresaId`)

### Estructura de Componentes
```typescript
// 1. Imports externos
import React from 'react';
import { useState } from 'react';

// 2. Imports internos (absolutos con @/)
import { Button } from '@/components/ui/Button';
import type { Empresa } from '@/types/missing-types';

// 3. Imports relativos (si es necesario)
import './styles.css';

// 4. Tipos locales
interface Props {
  empresaId: string;
}

// 5. Componente
export default function MiComponente({ empresaId }: Props) {
  // Hooks primero
  const [loading, setLoading] = useState(false);
  
  // Funciones
  const handleClick = () => { ... };
  
  // Render
  return <div>...</div>;
}
```

---

## 🎯 FILOSOFÍA DE COMUNICACIÓN CON USUARIO

### Decisión #8: Comunicación Enfocada en Resultados
**Fecha**: 19-Oct-2025  
**Contexto**: Usuario no necesita informes técnicos detallados  
**Decisión**: Comunicar solo RESULTADOS visibles en la app  

**Qué SÍ comunicar**:
- ✅ "Listo. Probalo en [pantalla]"
- ✅ "Funcionalidad X implementada en [lugar]"
- ✅ "Bug corregido. Validá [acción]"

**Qué NO comunicar** (salvo que pregunte):
- ❌ Detalles de archivos modificados
- ❌ Errores TypeScript resueltos
- ❌ Procesos internos de desarrollo
- ❌ Tests ejecutados

**Usuario evalúa**: La app funcionando (UI, procesos, funcionalidades)  
**Yo me encargo**: Código, testing, buenas prácticas, arquitectura

---

## 📚 RECURSOS DE REFERENCIA

### Documentación Oficial
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/docs
- Supabase: https://supabase.com/docs
- Jest: https://jestjs.io/docs

### Guías Internas
- `docs/GUIA-CORRECCIONES-MANUALES.md` - Patrones de corrección
- `PLAN-DE-ACCION.md` - Plan de 5 semanas
- `INDICE-DOCUMENTACION.md` - Índice de toda la documentación

---

**Este archivo registra decisiones importantes para no repetir debates.**

---

*Última actualización: 19-Oct-2025*
