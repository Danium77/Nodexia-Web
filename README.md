# Nodexia-Web

**Plataforma B2B de Gestión Logística Multi-tenant**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.75.1-green)](https://supabase.com/)

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd Nodexia-Web
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Ejecutar en desarrollo
pnpm dev
```

**📖 Para guía completa de inicio, ver:** [`.jary/QUICK-START-COMPLETO.md`](./.jary/QUICK-START-COMPLETO.md)

---

## 📋 Documentación Esencial

### Para Nuevos Desarrolladores
1. **[.jary/QUICK-START-COMPLETO.md](./.jary/QUICK-START-COMPLETO.md)** - Guía de inicio en 15 minutos
2. **[.jary/ARCHITECTURE.md](./.jary/ARCHITECTURE.md)** - Arquitectura técnica completa
3. **[.jary/TROUBLESHOOTING.md](./.jary/TROUBLESHOOTING.md)** - Solución de problemas comunes

### Para Desarrolladores Existentes
1. **[.jary/CHANGELOG-SESION-4.md](./.jary/CHANGELOG-SESION-4.md)** - Cambios recientes y fixes
2. **[INDICE-DOCUMENTACION.md](./INDICE-DOCUMENTACION.md)** - Índice completo de docs

### Documentación Técnica
- `docs/ARQUITECTURA-OPERATIVA.md` - Arquitectura operativa del sistema
- `docs/CREDENCIALES-OFICIALES.md` - Credenciales de acceso
- `docs/DESIGN-SYSTEM.md` - Sistema de diseño
- `docs/REPORTE-TESTING-COMPLETO.md` - Reporte de testing

---

## 🏗️ Estructura Principal

```
Nodexia-Web/
├── components/        # Componentes React por dominio
│   ├── Admin/        # Componentes de administración
│   ├── Dashboard/    # Dashboards por rol
│   ├── forms/        # Formularios reutilizables
│   ├── layout/       # Layout (Sidebar, Header)
│   └── ui/           # Componentes UI base
├── lib/              # Lógica de negocio
│   ├── contexts/     # React Contexts (UserRoleContext)
│   ├── hooks/        # Custom hooks
│   ├── api/          # Funciones API
│   └── validation/   # Validación con Zod
├── pages/            # Páginas Next.js (Pages Router)
│   ├── api/         # API Routes
│   └── admin/       # Páginas de administración
├── types/            # TypeScript types centralizados
├── scripts/          # Scripts de mantenimiento y setup
├── sql/              # Migraciones SQL versionadas
└── docs/             # Documentación técnica
```

---

## 🎯 Características Principales

### ✅ Sistema de Roles Multi-nivel
- **super_admin**: Acceso total al sistema
- **coordinador**: Gestión de operaciones y despachos
- **control_acceso**: Control de ingresos/egresos
- **supervisor_carga**: Supervisión de cargas
- **chofer**: Acceso básico (app móvil)

### ✅ Gestión de Ubicaciones
- Plantas productoras
- Depósitos de almacenamiento
- Clientes destino final

### ✅ Gestión de Empresas
- Empresas de transporte
- Empresas coordinadoras
- Multi-tenant con RLS

### ✅ Performance Optimizado
- Caché de 5 minutos en UserRoleContext
- Persistencia en localStorage
- Carga <500ms al volver de otra app

---

## 🔧 Stack Tecnológico

**Frontend:**
- Next.js 15.5.6 (Pages Router)
- React 19.2.0
- TypeScript 5.x (strict mode)
- Tailwind CSS 4.x
- Heroicons

**Backend:**
- Supabase (PostgreSQL 14+)
- Supabase Auth (JWT)
- Row Level Security (RLS)
- Next.js API Routes

**Estado:**
- React Context API
- localStorage (persistencia)
- Caché optimizado (5 min)

---

## 📜 Scripts Disponibles

### Desarrollo
```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # Build de producción
pnpm start        # Servidor de producción
pnpm lint         # Linting con ESLint
pnpm type-check   # Verificación de tipos
```

### Base de Datos
```bash
node scripts/verify_and_assign_admin.js  # Asignar super_admin
node scripts/debug_user_role.js          # Debug de roles
node scripts/setup_roles.js              # Setup roles iniciales
```

### Data Seeding
```bash
node scripts/seed_demo_users.js          # Usuarios demo
node scripts/seed_choferes_flota_demo.js # Choferes y flota
```

---

## 🔐 Acceso al Sistema

### Super Administrador
```
Email: admin.demo@nodexia.com
Rol: super_admin
Dashboard: /admin/super-admin-dashboard
```

**Para más credenciales:** Ver `docs/CREDENCIALES-OFICIALES.md`

---

## 📊 Estado Actual (22 Oct 2025)

### ✅ Sistema Operativo
- Sistema 100% operativo
- Loops infinitos eliminados
- Detección de roles corregida
- Performance optimizado (95% más rápido)
- localStorage implementado
- Primera ubicación creada exitosamente

### 📈 Métricas
- 17 empresas registradas
- 1 ubicación creada
- 13 usuarios registrados
- 7 problemas críticos resueltos en Sesión #4

---

## 🐛 Troubleshooting

**Problemas comunes y soluciones:** Ver [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

### Problema: Página en loop de carga
```bash
# Limpiar localStorage y recargar
localStorage.clear()
# Ctrl + F5 para hard refresh
```

### Problema: Rol incorrecto detectado
```bash
node scripts/verify_and_assign_admin.js
```

---

## 🤝 Contribuir

### Workflow Recomendado
1. Fork del proyecto
2. Crear branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

### Convenciones
- TypeScript strict mode obligatorio
- ESLint sin errores
- Comentarios en español
- Tests para nuevas features

---

## 📚 Recursos de Aprendizaje

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [React 19 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📞 Soporte

### Documentación
- `QUICK-START-COMPLETO.md` - Inicio rápido
- `ARCHITECTURE.md` - Arquitectura técnica
- `TROUBLESHOOTING.md` - Solución de problemas
- `INDICE-DOCUMENTACION.md` - Índice completo

### Contacto
- Ver `docs/CREDENCIALES-OFICIALES.md`
- Issues: GitHub Issues

---

## 📝 Licencia

Proyecto privado - Todos los derechos reservados

---

## ✨ Changelog Reciente

### Sesión #4 - 22 Oct 2025: Estabilización Post-Outage
- ✅ Loops infinitos de navegación eliminados
- ✅ Sistema de roles corregido (primaryRole)
- ✅ Performance mejorado 95% con localStorage
- ✅ Caché optimizado de 60s a 300s
- ✅ 7 archivos refactorizados
- ✅ Documentación completa generada

**Ver changelog completo:** [`.jary/CHANGELOG-SESION-4.md`](./.jary/CHANGELOG-SESION-4.md)

---

**Desarrollado con ❤️ por el equipo de Nodexia**

**Última actualización:** 22 de Octubre, 2025