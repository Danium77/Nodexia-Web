#!/usr/bin/env node

/**
 * Script de Corrección de Problemas Críticos - Nodexia Web
 * 
 * Este script ayuda a automatizar algunas correcciones identificadas en el testing completo
 * Ejecutar: node scripts/fix-critical-issues.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Script de Corrección de Problemas Críticos - Nodexia');
console.log('═══════════════════════════════════════════════════════\n');

let fixCount = 0;
let errorCount = 0;

// 1. Corregir jest.config.js
function fixJestConfig() {
  console.log('📝 Corrigiendo jest.config.js...');
  const jestConfigPath = path.join(__dirname, '..', 'jest.config.js');
  
  try {
    let content = fs.readFileSync(jestConfigPath, 'utf8');
    
    if (content.includes('moduleNameMapping')) {
      content = content.replace('moduleNameMapping', 'moduleNameMapper');
      fs.writeFileSync(jestConfigPath, content, 'utf8');
      console.log('  ✅ jest.config.js corregido (moduleNameMapping → moduleNameMapper)');
      fixCount++;
    } else {
      console.log('  ℹ️  jest.config.js ya está correcto');
    }
  } catch (error) {
    console.error('  ❌ Error al corregir jest.config.js:', error.message);
    errorCount++;
  }
}

// 2. Generar archivo de configuración de ESLint mejorado
function generateImprovedESLintConfig() {
  console.log('\n📝 Generando configuración mejorada de ESLint...');
  
  const eslintConfig = `import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Reglas personalizadas para mejorar calidad de código
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default eslintConfig;
`;

  const configPath = path.join(__dirname, '..', 'eslint.config.improved.mjs');
  
  try {
    fs.writeFileSync(configPath, eslintConfig, 'utf8');
    console.log('  ✅ Configuración mejorada creada en eslint.config.improved.mjs');
    console.log('  ℹ️  Renombrar a eslint.config.mjs para usar');
    fixCount++;
  } catch (error) {
    console.error('  ❌ Error al generar configuración ESLint:', error.message);
    errorCount++;
  }
}

// 3. Crear archivo de tipos faltantes
function generateMissingTypes() {
  console.log('\n📝 Generando archivo de tipos faltantes...');
  
  const typesContent = `/**
 * Tipos Faltantes Identificados en el Testing
 * Este archivo define tipos que están siendo usados pero no definidos
 */

// Tipos de Flota
export interface Camion {
  id: string;
  patente: string;
  marca?: string;
  modelo?: string;
  año?: number;
  estado: 'activo' | 'mantenimiento' | 'inactivo';
  id_transporte: string;
  created_at?: string;
  updated_at?: string;
}

export interface Acoplado {
  id: string;
  patente: string;
  tipo: 'semi' | 'completo' | 'portacontenedor';
  estado: 'activo' | 'mantenimiento' | 'inactivo';
  id_transporte: string;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Empresa
export interface Empresa {
  id: string;
  nombre: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  tipo_empresa: 'coordinador' | 'transporte' | 'ambos';
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  configuracion_empresa?: ConfiguracionEmpresa;
}

export interface ConfiguracionEmpresa {
  id: string;
  id_empresa: string;
  tipo_instalacion: 'planta' | 'cliente';
  permite_recepcionar: boolean;
  permite_despachar: boolean;
  requiere_documentacion_especial: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Roles y Auth
export type UserRole = 'super_admin' | 'admin' | 'coordinador' | 'supervisor_carga' | 'control_acceso' | 'chofer';

export interface Role {
  id: string;
  name: UserRole;
  description?: string;
  permisos?: Record<string, boolean>;
}

export interface Usuario {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  roles?: Role[];
  empresas?: Empresa[];
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Viajes y Despachos
export interface Viaje {
  id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  estado: string;
  fecha_despacho?: string;
  id_transporte?: string;
  id_chofer?: string;
  id_camion?: string;
  id_acoplado?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

// Re-exportar tipos existentes si es necesario
export * from './superadmin';
export * from './network';
`;

  const typesPath = path.join(__dirname, '..', 'types', 'missing-types.ts');
  
  try {
    fs.writeFileSync(typesPath, typesContent, 'utf8');
    console.log('  ✅ Archivo types/missing-types.ts creado');
    console.log('  ℹ️  Importar donde sea necesario: import { Camion, Acoplado } from "@/types/missing-types"');
    fixCount++;
  } catch (error) {
    console.error('  ❌ Error al generar tipos faltantes:', error.message);
    errorCount++;
  }
}

// 4. Crear archivo de utilidades para type guards
function generateTypeGuards() {
  console.log('\n📝 Generando utilidades de type guards...');
  
  const typeGuardsContent = `/**
 * Type Guards - Utilidades para verificación de tipos en runtime
 */

import type { UserRole } from '@/types/missing-types';

/**
 * Verifica si un valor es un rol de usuario válido
 */
export function isUserRole(value: unknown): value is UserRole {
  const validRoles: UserRole[] = [
    'super_admin',
    'admin',
    'coordinador',
    'supervisor_carga',
    'control_acceso',
    'chofer'
  ];
  return typeof value === 'string' && validRoles.includes(value as UserRole);
}

/**
 * Verifica si un objeto tiene una propiedad específica
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * Verifica si un valor no es null ni undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Verifica si un array contiene elementos
 */
export function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
  return array.length > 0;
}

/**
 * Extrae valor seguro con fallback
 */
export function safeValue<T>(value: T | null | undefined, fallback: T): T {
  return isDefined(value) ? value : fallback;
}

/**
 * Verifica si un objeto tiene la estructura esperada de Empresa
 */
export function isEmpresa(obj: any): obj is { id: string; nombre: string; tipo_empresa: string } {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.nombre === 'string' &&
    typeof obj.tipo_empresa === 'string'
  );
}
`;

  const guardsPath = path.join(__dirname, '..', 'lib', 'type-guards.ts');
  
  try {
    fs.writeFileSync(guardsPath, typeGuardsContent, 'utf8');
    console.log('  ✅ Archivo lib/type-guards.ts creado');
    console.log('  ℹ️  Usar: import { isDefined, isUserRole } from "@/lib/type-guards"');
    fixCount++;
  } catch (error) {
    console.error('  ❌ Error al generar type guards:', error.message);
    errorCount++;
  }
}

// 5. Crear guía de correcciones
function generateFixGuide() {
  console.log('\n📝 Generando guía de correcciones manuales...');
  
  const guideContent = `# 🔧 Guía de Correcciones Manuales

Esta guía contiene instrucciones para las correcciones que deben hacerse manualmente.

## 1. Actualizar Dependencias Críticas

\`\`\`powershell
# Actualizar Next.js (URGENTE - vulnerabilidades de seguridad)
pnpm update next@latest

# Actualizar Supabase
pnpm update @supabase/supabase-js@latest

# Actualizar eslint-config-next
pnpm update eslint-config-next@latest

# Verificar actualizaciones
pnpm audit
\`\`\`

## 2. Migrar ESLint

\`\`\`powershell
# Ejecutar codemod para migrar a ESLint CLI
npx @next/codemod@canary next-lint-to-eslint-cli .
\`\`\`

## 3. Correcciones TypeScript Comunes

### A. Variables No Utilizadas
Si una variable no se usa, eliminarla o prefijo con \`_\`:

\`\`\`typescript
// ❌ Incorrecto
const { data, error } = await supabase.from('table').select();

// ✅ Correcto (si no usas data)
const { error } = await supabase.from('table').select();

// ✅ Correcto (si la variable es necesaria pero no usada aún)
const { data: _data, error } = await supabase.from('table').select();
\`\`\`

### B. Valores Posiblemente Undefined
Siempre verificar antes de acceder:

\`\`\`typescript
// ❌ Incorrecto
const count = cliente.alertas_count > 0;

// ✅ Correcto - Opción 1: Optional chaining con nullish coalescing
const count = (cliente.alertas_count ?? 0) > 0;

// ✅ Correcto - Opción 2: Verificación explícita
const count = cliente.alertas_count && cliente.alertas_count > 0;
\`\`\`

### C. Propiedades Faltantes en Componentes

\`\`\`typescript
// ❌ Incorrecto
<Header />

// ✅ Correcto
<Header 
  userEmail={user?.email ?? 'unknown'}
  userName={user?.name ?? 'Usuario'}
  pageTitle="Dashboard"
/>
\`\`\`

### D. Type Assertions Incorrectas
Usar type guards en lugar de assertions:

\`\`\`typescript
// ❌ Incorrecto
const isAdmin = (user?.roles as Role)?.name === 'admin';

// ✅ Correcto
import { hasProperty } from '@/lib/type-guards';

const isAdmin = user?.roles && 
                hasProperty(user.roles, 'name') && 
                user.roles.name === 'admin';
\`\`\`

### E. Tipos Implícitos
Siempre declarar tipos explícitos:

\`\`\`typescript
// ❌ Incorrecto
let items = [];

// ✅ Correcto
let items: ItemType[] = [];
\`\`\`

## 4. Correcciones en Tests

### Envolver Updates en act()

\`\`\`typescript
import { act, render } from '@testing-library/react';

test('should update state', async () => {
  const { result } = renderHook(() => useMyHook());
  
  await act(async () => {
    await result.current.updateData();
  });
  
  expect(result.current.data).toBeDefined();
});
\`\`\`

## 5. Archivos con Mayor Prioridad

Corregir en este orden:

1. \`pages/crear-despacho.tsx\` (21 errores)
2. \`components/SuperAdmin/SuscripcionesManager.tsx\` (22 errores)
3. \`lib/hooks/useNetwork.tsx\` (15 errores)
4. \`components/Network/NetworkManager.tsx\` (6 errores)
5. \`components/SuperAdmin/LogsManager.tsx\` (15 errores)

## 6. Herramientas Útiles

\`\`\`powershell
# Ver errores de un archivo específico
pnpm type-check 2>&1 | Select-String "pages/crear-despacho.tsx"

# Contar errores por archivo
pnpm type-check 2>&1 | Select-String "error TS" | Group-Object

# Ejecutar linting
pnpm lint
\`\`\`

## 7. Checklist de Validación

- [ ] Actualizar Next.js y dependencias críticas
- [ ] Corregir jest.config.js
- [ ] Migrar a ESLint CLI
- [ ] Corregir errores TypeScript críticos
- [ ] Agregar tests para nuevas correcciones
- [ ] Verificar que todo compila: \`pnpm type-check\`
- [ ] Verificar que tests pasan: \`pnpm test\`
- [ ] Verificar que la app corre: \`pnpm dev\`
`;

  const guidePath = path.join(__dirname, '..', 'docs', 'GUIA-CORRECCIONES-MANUALES.md');
  
  try {
    fs.writeFileSync(guidePath, guideContent, 'utf8');
    console.log('  ✅ Guía creada en docs/GUIA-CORRECCIONES-MANUALES.md');
    fixCount++;
  } catch (error) {
    console.error('  ❌ Error al generar guía:', error.message);
    errorCount++;
  }
}

// Ejecutar todas las correcciones
async function main() {
  fixJestConfig();
  generateImprovedESLintConfig();
  generateMissingTypes();
  generateTypeGuards();
  generateFixGuide();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ Correcciones completadas: ${fixCount}`);
  console.log(`❌ Errores encontrados: ${errorCount}`);
  console.log('\n📋 Próximos pasos:');
  console.log('  1. Revisar docs/REPORTE-TESTING-COMPLETO.md');
  console.log('  2. Revisar docs/GUIA-CORRECCIONES-MANUALES.md');
  console.log('  3. Ejecutar: pnpm update next@latest');
  console.log('  4. Ejecutar: pnpm test');
  console.log('  5. Ejecutar: pnpm type-check');
  console.log('\n🎯 ¡Buena suerte con las correcciones!');
}

main().catch(console.error);
