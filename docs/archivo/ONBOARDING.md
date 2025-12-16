# 👋 Bienvenido a Nodexia Web - Guía de Onboarding

**Última actualización:** 22 de Octubre, 2025  
**Tiempo estimado de onboarding:** 2-4 horas

Esta guía te llevará paso a paso desde cero hasta tu primer commit en el proyecto Nodexia.

---

## 📋 Checklist de Onboarding

Usa este checklist para seguir tu progreso:

```markdown
## Día 1: Setup y Familiarización (2-3 horas)

### Setup Técnico (30 min)
- [ ] Node.js >= 18.x instalado
- [ ] pnpm >= 8.x instalado
- [ ] Git configurado
- [ ] Editor VS Code instalado
- [ ] Extensiones recomendadas instaladas

### Clonar y Configurar (30 min)
- [ ] Repositorio clonado
- [ ] Dependencias instaladas (`pnpm install`)
- [ ] Variables de entorno configuradas (.env.local)
- [ ] Proyecto corriendo en localhost:3000
- [ ] Login exitoso con credenciales demo

### Lectura Esencial (1-2 horas)
- [ ] README.md leído
- [ ] QUICK-START.md leído
- [ ] ARCHITECTURE.md leído (al menos la mitad)
- [ ] CHANGELOG-SESION-4.md hojeado

## Día 2: Exploración y Primera Tarea (3-4 horas)

### Exploración del Sistema (1 hora)
- [ ] Navegado por todos los dashboards
- [ ] Creado una ubicación de prueba
- [ ] Revisado diferentes roles de usuario
- [ ] Explorado código de UserRoleContext
- [ ] Revisado estructura de carpetas

### Primera Tarea Simple (2-3 horas)
- [ ] Asignada tarea simple (ej: fix typo, mejorar UI)
- [ ] Branch creado para la tarea
- [ ] Cambios implementados
- [ ] Tests verificados (si aplica)
- [ ] Commit realizado
- [ ] Pull Request creado
- [ ] Code review recibido

## Día 3+: Desarrollo Activo

- [ ] Primera feature completa implementada
- [ ] Código revisado por senior
- [ ] Merge a main exitoso
- [ ] Celebración del primer merge 🎉
```

---

## 🚀 Paso 1: Setup del Entorno (30 min)

### 1.1 Prerrequisitos

```bash
# Verificar versiones
node --version  # Debe ser >= 18.x
pnpm --version  # Debe ser >= 8.x
git --version   # Cualquier versión reciente
```

Si no tienes pnpm:
```bash
npm install -g pnpm
```

### 1.2 Extensiones de VS Code Recomendadas

Instala estas extensiones:

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **Prettier** (`esbenp.prettier-vscode`)
3. **TypeScript Hero** (`rbbit.typescript-hero`)
4. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
5. **GitLens** (`eamodio.gitlens`)
6. **Error Lens** (`usernamehw.errorlens`)

### 1.3 Configuración de VS Code

Crea `.vscode/settings.json` si no existe:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## 📦 Paso 2: Clonar y Configurar (30 min)

### 2.1 Clonar el Repositorio

```bash
git clone <repo-url>
cd Nodexia-Web
```

### 2.2 Instalar Dependencias

```bash
pnpm install
```

Esto instalará:
- Next.js 15.5.6
- React 19.2.0
- TypeScript 5.x
- Supabase 2.75.1
- Tailwind CSS 4.x
- Y todas las dependencias necesarias

### 2.3 Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env.local
```

Edita `.env.local` con las credenciales de Supabase:

```env
# Supabase (pedir al líder técnico)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**⚠️ IMPORTANTE:** Nunca commitear `.env.local` al repositorio

### 2.4 Ejecutar el Proyecto

```bash
pnpm dev
```

Abre http://localhost:3000

Deberías ver la página de login.

### 2.5 Primer Login

Credenciales demo:
```
Email: admin.demo@nodexia.com
Password: [Consultar docs/CREDENCIALES-OFICIALES.md]
```

Si el login es exitoso, verás el dashboard de super admin. ✅

---

## 📚 Paso 3: Lectura Esencial (1-2 horas)

### 3.1 Documentos Obligatorios

Lee en este orden:

1. **README.md** (10 min)
   - Visión general del proyecto
   - Stack tecnológico
   - Scripts disponibles

2. **QUICK-START.md** (15 min)
   - Setup rápido
   - Arquitectura básica
   - Flujos principales
   - Troubleshooting básico

3. **ARCHITECTURE.md** (30-45 min)
   - Arquitectura técnica completa
   - Sistema de roles
   - Gestión de estado
   - Patrones y convenciones
   - Base de datos

4. **CHANGELOG-SESION-4.md** (15 min)
   - Cambios recientes
   - Problemas resueltos
   - Lecciones aprendidas

### 3.2 Documentos de Referencia (tener a mano)

- **TROUBLESHOOTING.md** - Para cuando encuentres problemas
- **INDICE-DOCUMENTACION.md** - Índice de toda la documentación
- **docs/CREDENCIALES-OFICIALES.md** - Credenciales de acceso

---

## 🔍 Paso 4: Exploración del Sistema (1 hora)

### 4.1 Navegar por los Dashboards

Como super_admin puedes ver todos los dashboards:

1. **Dashboard Principal** (`/admin/super-admin-dashboard`)
   - Ver estadísticas generales
   - Links a todas las secciones

2. **Gestión de Ubicaciones** (`/admin/ubicaciones`)
   - Click en "+ Nueva Ubicación"
   - Crear una ubicación de prueba:
     - Nombre: "Mi Primera Ubicación"
     - CUIT: 30-12345678-9
     - Tipo: Depósito
     - Ciudad: Buenos Aires
   - Verificar que aparece en la lista

3. **Gestión de Empresas** (`/admin/empresas`)
   - Ver empresas existentes
   - Entender tipos: transporte, coordinador, sistema

4. **Gestión de Usuarios** (`/admin/usuarios`)
   - Ver usuarios existentes
   - Entender roles y permisos

### 4.2 Explorar el Código

Abre estos archivos y familiarízate:

```typescript
// 1. Context principal de autenticación
lib/contexts/UserRoleContext.tsx
// Entender: roles, primaryRole, caché, localStorage

// 2. Dashboard redirector
pages/dashboard.tsx
// Entender: cómo redirige según rol

// 3. Sidebar
components/layout/Sidebar.tsx
// Entender: cómo se generan los menús por rol

// 4. Ejemplo de página protegida
pages/admin/super-admin-dashboard.tsx
// Entender: verificación de rol, loading states

// 5. Tipos centralizados
types/common.ts
lib/types.ts
// Entender: UserRole, Empresa, Ubicacion
```

### 4.3 Ejecutar Scripts de Debug

```bash
# Ver rol de un usuario
node scripts/debug_user_role.js

# Ver empresas en DB
node scripts/check_solicitudes.js
```

---

## 💻 Paso 5: Primera Tarea (2-3 horas)

### 5.1 Tarea Sugerida: Fix de UI Simple

**Objetivo:** Mejorar el texto de un botón o corregir un typo

Ejemplo:
```typescript
// Archivo: pages/admin/ubicaciones.tsx
// Buscar: "+ Nueva Ubicación"
// Cambiar a: "➕ Crear Nueva Ubicación"
```

### 5.2 Workflow de Git

```bash
# 1. Crear branch
git checkout -b feature/mejorar-boton-ubicaciones

# 2. Hacer cambios en el código
# Editar archivo...

# 3. Verificar que funciona
pnpm dev
# Probar en browser

# 4. Verificar tipos
pnpm type-check

# 5. Lint
pnpm lint

# 6. Commit
git add .
git commit -m "feat: mejorar texto del botón de nueva ubicación"

# 7. Push
git push origin feature/mejorar-boton-ubicaciones

# 8. Crear Pull Request en GitHub
# Ir a GitHub → Compare & Pull Request
```

### 5.3 Descripción del Pull Request

Template:

```markdown
## 🎯 Objetivo
Mejorar UX del botón de crear ubicación

## 📝 Cambios
- Cambio de texto: "+ Nueva Ubicación" → "➕ Crear Nueva Ubicación"
- Emoji más descriptivo

## ✅ Testing
- [ ] Verificado en localhost
- [ ] pnpm type-check sin errores
- [ ] pnpm lint sin errores

## 📸 Screenshots
[Adjuntar screenshot del antes y después]

## 👤 Asignado a
@lider-tecnico para code review
```

---

## 🎓 Conceptos Clave a Entender

### 1. Sistema de Roles

```typescript
// Jerarquía de roles
super_admin > coordinador > control_acceso/supervisor_carga > chofer

// Verificación de roles
const { primaryRole, hasRole, hasAnyRole } = useUserRole();

if (primaryRole === 'super_admin') {
  // Mostrar opciones de admin
}

if (hasAnyRole(['super_admin', 'coordinador'])) {
  // Permitir crear despachos
}
```

### 2. Navegación y Redirects

```typescript
// ✅ CORRECTO - Para redirects automáticos
router.replace('/dashboard');

// ❌ INCORRECTO - Para redirects automáticos
router.push('/dashboard');

// ✅ CORRECTO - Para navegación manual (clicks)
router.push('/ubicaciones');
```

### 3. Gestión de Estado

```typescript
// UserRoleContext - Context global de autenticación
const { user, primaryRole, loading } = useUserRole();

// localStorage - Persistencia automática
// No necesitas tocar esto, ya está implementado

// Caché - 5 minutos automático
// Reduce consultas a DB innecesarias
```

### 4. Consultas a Supabase

```typescript
// Para operaciones de usuarios normales
import { supabase } from '@/lib/supabaseClient';

// Para operaciones administrativas (bypassa RLS)
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Ejemplo: Obtener ubicaciones
const { data, error } = await supabase
  .from('ubicaciones')
  .select('*')
  .eq('activo', true);
```

---

## 🐛 Problemas Comunes

### "No me funciona el login"
```bash
# Verificar variables de entorno
cat .env.local

# Debe tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### "Página en loop de carga"
```javascript
// En browser console
localStorage.clear()
// Luego Ctrl + F5
```

### "Rol incorrecto"
```bash
node scripts/verify_and_assign_admin.js
```

### "TypeScript errors"
```bash
# Verificar tipos
pnpm type-check

# Si hay errores, consultar TROUBLESHOOTING.md
```

---

## 📞 Pedir Ayuda

### Antes de preguntar:

1. ✅ Buscar en `TROUBLESHOOTING.md`
2. ✅ Buscar en `CHANGELOG-SESION-4.md`
3. ✅ Revisar `ARCHITECTURE.md`
4. ✅ Buscar en el código similar

### Al preguntar:

Incluye:
- ❓ ¿Qué estás intentando hacer?
- 🐛 ¿Qué error obtienes? (screenshot)
- 🔍 ¿Qué intentaste ya?
- 💻 ¿Qué dice la consola del browser?

### Canales:

- GitHub Issues (para bugs)
- Slack/Discord (para preguntas rápidas)
- Code review en PRs (para feedback de código)

---

## 🎉 Celebrar Hitos

### Primer Hito: Setup Completo ✅
- Proyecto corriendo
- Login exitoso
- Documentación leída

**Celebración:** Café ☕

### Segundo Hito: Primer PR ✅
- Branch creado
- Código escrito
- PR abierto
- Code review positivo

**Celebración:** 🎉 Tweet/LinkedIn opcional

### Tercer Hito: Primer Merge ✅
- PR mergeado a main
- Feature en producción
- Feedback positivo

**Celebración:** 🍕 Pizza con el equipo

---

## 📚 Siguientes Pasos

Después del onboarding:

1. **Semana 1-2**: Tareas simples de UI y fixes
2. **Semana 3-4**: Features pequeñas
3. **Mes 2+**: Features medianas y code reviews
4. **Mes 3+**: Arquitectura y diseño de features

---

## 🎯 Objetivos de Onboarding

Al finalizar este onboarding deberías poder:

- ✅ Correr el proyecto localmente
- ✅ Navegar por el código sin perderte
- ✅ Entender el flujo de autenticación
- ✅ Crear un PR simple
- ✅ Saber dónde buscar documentación
- ✅ Resolver problemas comunes

---

## 💡 Tips de Productividad

### VS Code Shortcuts
```
Ctrl + P: Buscar archivo
Ctrl + Shift + F: Buscar en todos los archivos
F12: Ir a definición
Alt + ←: Volver atrás
Ctrl + `: Abrir terminal
```

### Git Aliases Útiles
```bash
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
```

### Comandos Frecuentes
```bash
pnpm dev           # Desarrollo
pnpm type-check    # Verificar tipos
pnpm lint          # Linting
git status         # Ver cambios
git diff           # Ver diff
```

---

## ✨ Última Palabra

**Bienvenido al equipo!** 👋

No tengas miedo de:
- ❓ Hacer preguntas
- 💡 Proponer mejoras
- 🐛 Reportar bugs
- 📖 Actualizar documentación

El código es de todos, y todos estamos aprendiendo constantemente.

**¡Éxito en tu primer día!** 🚀

---

**Creado por:** Líder de Desarrollo  
**Última actualización:** 22 de Octubre, 2025  
**Feedback:** Bienvenido para mejorar este doc
