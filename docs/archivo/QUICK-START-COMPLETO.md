# 🚀 Guía de Inicio Rápido - Nodexia Web

**Última actualización:** 22 de Octubre, 2025  
**Estado del sistema:** ✅ 100% Operativo  
**Versión:** Next.js 15.5.6 + React 19 + Supabase 2.75.1

---

## 📋 Tabla de Contenidos
1. [Setup Inicial](#setup-inicial)
2. [Credenciales de Acceso](#credenciales-de-acceso)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Flujos Principales](#flujos-principales)
5. [Troubleshooting](#troubleshooting)
6. [Scripts Útiles](#scripts-útiles)

---

## 🔧 Setup Inicial

### Prerrequisitos
```bash
Node.js: >= 18.x
pnpm: >= 8.x
PostgreSQL: >= 14.x (via Supabase)
```

### Instalación
```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Nodexia-Web

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Ejecutar en desarrollo
pnpm dev
```

### Variables de Entorno Requeridas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth (si aplica)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

---

## 🔐 Credenciales de Acceso

### Super Administrador
```
Email: admin.demo@nodexia.com
Password: [Consultar docs/CREDENCIALES-OFICIALES.md]
Rol: super_admin
Permisos: Acceso total al sistema
Dashboard: /admin/super-admin-dashboard
```

### Coordinador
```
Email: coordinador.demo@nodexia.com
Password: [Consultar docs/CREDENCIALES-OFICIALES.md]
Rol: coordinador
Permisos: Gestión de despachos y operaciones
Dashboard: /coordinator-dashboard
```

### Otros Usuarios
Consultar `docs/CREDENCIALES-OFICIALES.md` para lista completa

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
```
Frontend:
├── Next.js 15.5.6 (Pages Router)
├── React 19.2.0
├── TypeScript (strict mode)
├── Tailwind CSS 4.x
└── Heroicons

Backend:
├── Supabase (PostgreSQL + Auth + RLS)
├── API Routes (Next.js)
└── Server-side rendering

Estado:
├── UserRoleContext (roles y auth)
├── React Context API
└── localStorage (persistencia)
```

### Estructura de Carpetas
```
Nodexia-Web/
├── components/          # Componentes React
│   ├── Admin/          # Componentes de administración
│   ├── Dashboard/      # Componentes de dashboards
│   ├── forms/          # Formularios reutilizables
│   ├── layout/         # Layout (Sidebar, Header, etc)
│   ├── Modals/         # Modales del sistema
│   └── ui/             # Componentes UI base
├── lib/                # Lógica de negocio
│   ├── contexts/       # React Contexts
│   ├── hooks/          # Custom hooks
│   ├── api/            # Funciones API
│   └── validation/     # Validación de datos
├── pages/              # Páginas Next.js
│   ├── api/           # API Routes
│   ├── admin/         # Páginas de admin
│   └── ...            # Otras páginas
├── types/              # TypeScript types
├── scripts/            # Scripts de mantenimiento
├── sql/                # Migraciones SQL
└── docs/               # Documentación
```

### Flujo de Autenticación
```
1. Usuario → Login (/login)
2. Supabase Auth → Verificar credenciales
3. UserRoleContext → Cargar roles desde usuarios_empresa
4. localStorage → Persistir user + roles
5. Dashboard → Redirect según primaryRole
   ├── super_admin → /admin/super-admin-dashboard
   ├── coordinador → /coordinator-dashboard
   ├── control_acceso → /control-acceso
   └── supervisor_carga → /supervisor-carga
```

---

## 🔄 Flujos Principales

### 1. Gestión de Ubicaciones

#### Crear Ubicación
```typescript
// Página: /admin/ubicaciones
// Componente: components/Admin/Ubicaciones.tsx

Flujo:
1. Click en "+ Nueva Ubicación"
2. Modal con formulario aparece
3. Completar datos:
   - Nombre (requerido)
   - CUIT (requerido, validación formato)
   - Tipo: Planta | Depósito | Cliente
   - Dirección completa
4. Submit → POST /api/ubicaciones/create
5. Validación server-side
6. Insert en tabla ubicaciones
7. Refresh lista automático
```

#### Editar Ubicación
```typescript
Flujo:
1. Click en botón "Editar" en fila
2. Modal pre-poblado con datos
3. Modificar campos
4. Submit → PUT /api/ubicaciones/update
5. Update en DB
6. Refresh lista
```

### 2. Gestión de Empresas

```typescript
// Tabla: empresas
// Tipos: transporte | coordinador | sistema

Flujo crear transporte:
1. /admin/empresas → "+ Nueva Empresa"
2. Seleccionar tipo: "Transporte"
3. Completar datos empresa
4. Submit → Crear en tabla empresas
5. Vincular usuarios en usuarios_empresa
```

### 3. Sistema de Roles

```typescript
// Tabla: usuarios_empresa
// Roles disponibles:
const ROLES = [
  'super_admin',      // Acceso total
  'coordinador',      // Gestión operativa
  'control_acceso',   // Control de ingresos
  'supervisor_carga', // Supervisión de cargas
  'chofer'           // Acceso básico
];

// Jerarquía de roles (más alto = más permisos)
const ROLE_HIERARCHY = {
  super_admin: 100,
  coordinador: 80,
  control_acceso: 60,
  supervisor_carga: 60,
  chofer: 20
};
```

---

## 🐛 Troubleshooting

### Problema: Página en loop de carga
```
Síntoma: "Cargando tablero..." infinito
Causa: Cache desactualizado o redirect loop
Solución:
1. Limpiar localStorage:
   localStorage.clear()
2. Hard refresh: Ctrl + F5
3. Verificar rol en DB:
   SELECT * FROM usuarios_empresa WHERE user_id = 'xxx'
```

### Problema: Rol incorrecto detectado
```
Síntoma: Super admin ve dashboard de coordinador
Causa: usuarios_empresa sin registro o rol incorrecto
Solución:
1. Ejecutar: node scripts/verify_and_assign_admin.js
2. Verificar en Supabase:
   - Tabla: usuarios_empresa
   - Campo: rol_interno = 'super_admin'
3. Limpiar cache: localStorage.clear()
```

### Problema: 404 en tabla "transportes"
```
Síntoma: Error "relation transportes does not exist"
Causa: Código legacy con referencia a tabla antigua
Solución:
Cambiar:
  .from('transportes')
Por:
  .from('empresas').eq('tipo_empresa', 'transporte')
```

### Problema: Lentitud al volver de otra app
```
Síntoma: 5-10 segundos para cargar
Causa: localStorage no implementado
Solución:
✅ Ya implementado en última versión
- Cache de 5 minutos
- Persistencia automática en localStorage
```

---

## 🔨 Scripts Útiles

### Desarrollo
```bash
# Iniciar servidor dev
pnpm dev

# Build de producción
pnpm build

# Iniciar en producción
pnpm start

# Linting
pnpm lint

# Testing
pnpm test
```

### Database Management
```bash
# Asignar super_admin a usuario
node scripts/verify_and_assign_admin.js

# Debug rol de usuario
node scripts/debug_user_role.js

# Setup roles iniciales
node scripts/setup_roles.js

# Crear usuario admin
node scripts/create_admin.js
```

### Data Seeding
```bash
# Seed usuarios demo
node scripts/seed_demo_users.js

# Seed choferes y flota
node scripts/seed_choferes_flota_demo.js

# Seed viajes y QR
node scripts/seed_viajes_qr_demo.js

# Setup sistema QR
node scripts/setup_qr_system.js
```

### Migraciones
```bash
# Ejecutar migración específica
node scripts/run_migrations.js --file=002_migracion_arquitectura_completa.sql

# Ejecutar todas las migraciones
node scripts/run_migrations.js --all

# Ver migraciones pendientes
node scripts/run_migrations.js --list
```

---

## 📚 Documentación Adicional

### Guías Técnicas
- `CHANGELOG-SESION-4.md` - Cambios recientes y fixes
- `docs/ARQUITECTURA-OPERATIVA.md` - Arquitectura completa
- `docs/DESIGN-SYSTEM.md` - Sistema de diseño
- `docs/CREDENCIALES-OFICIALES.md` - Credenciales de acceso

### Guías de Desarrollo
- `docs/guides/GUIA-CORRECCIONES-MANUALES.md` - Fixes comunes
- `docs/PLAN-PRUEBAS-UI.md` - Testing UI
- `TESTING-COMPLETADO.md` - Resultados de testing

### Referencias
- `INDICE-DOCUMENTACION.md` - Índice maestro
- `NODEXIA-ROADMAP.md` - Roadmap del proyecto
- `scripts/README.md` - Documentación de scripts

---

## 🎯 Quick Commands

```bash
# Setup completo desde cero
pnpm install && \
node scripts/setup_roles.js && \
node scripts/create_admin.js && \
pnpm dev

# Reset database (¡CUIDADO!)
node scripts/reset_database.js

# Verificar estado del sistema
node scripts/check_system_health.js

# Backup de datos
node scripts/backup_database.js
```

---

## 🆘 Soporte

### Problemas Comunes
1. **Error de autenticación**: Verificar variables de entorno
2. **Roles incorrectos**: Ejecutar verify_and_assign_admin.js
3. **Performance lento**: Limpiar localStorage y cache
4. **404 en rutas**: Verificar estructura de páginas en /pages

### Contacto
- Documentación: `docs/`
- Issues: GitHub Issues
- Email: [Ver docs/CREDENCIALES-OFICIALES.md]

---

**Estado del sistema:** ✅ Operativo  
**Última verificación:** 22 de Octubre, 2025  
**Próxima revisión:** Según necesidad
