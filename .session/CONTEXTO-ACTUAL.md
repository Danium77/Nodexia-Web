# 📖 CONTEXTO ACTUAL DEL PROYECTO

**Última actualización:** 17 de Enero, 2026  
**Versión:** MVP 0.9 (88% completado)  
**Sistema implementado:** Sesiones estructuradas para Copilot  
**Producción:** ✅ ACTIVA en www.nodexiaweb.com

---

## 🌐 ENTORNOS

| Entorno | URL | Hosting |
|---------|-----|---------|
| Desarrollo | `localhost:3000` | Tu computadora |
| Producción | `www.nodexiaweb.com` | Vercel |

**Flujo:** DEV → GitHub → Vercel (auto-deploy) → PROD

---

## 🏗️ ARQUITECTURA ACTUAL

### Stack Tecnológico

**Frontend:**
- Next.js 15.5.6
- React 19
- TypeScript 5.x
- Tailwind CSS 3.x
- Leaflet (mapas GPS)

**Backend:**
- Next.js API Routes
- Supabase Edge Functions
- Node.js 18+

**Base de Datos:**
- Supabase (PostgreSQL 15)
- Row Level Security (RLS) habilitado
- Realtime subscriptions activas

**Autenticación:**
- Supabase Auth
- Sistema de invitaciones con contraseñas temporales

**Testing:**
- Jest (unit tests) - 50 tests
- Playwright (E2E tests) - Configurado
- React Testing Library

**Deployment:**
- Desarrollo: localhost:3000
- Producción: [Pendiente de configurar]
- CI/CD: Sin configurar

---

## 📂 ESTRUCTURA DEL PROYECTO

```
Nodexia-Web/
├── pages/                  # Páginas Next.js y API routes
│   ├── api/               # Endpoints backend
│   ├── dashboard-*.tsx    # Dashboards por rol
│   └── [otras páginas]
│
├── components/            # Componentes React
│   ├── ui/               # Componentes base reutilizables
│   ├── Dashboard/        # Componentes de dashboards
│   ├── forms/            # Formularios
│   ├── Modals/           # Ventanas modales
│   └── [otros]
│
├── lib/                   # Utilidades y lógica de negocio
│   ├── supabase.ts       # Cliente Supabase
│   ├── validations/      # Validadores
│   └── utils/            # Helpers generales
│
├── types/                 # Tipos TypeScript
├── sql/                   # Schema y migraciones BD
├── __tests__/             # Tests (Jest + Playwright)
│
├── .session/              # ← NUEVO: Contexto de sesiones
│   ├── PROXIMA-SESION.md
│   ├── CONTEXTO-ACTUAL.md (este archivo)
│   └── history/
│
├── GUIAS/                 # ← NUEVO: Guías y protocolos
│   ├── PROTOCOLO-INICIO-SESION-COPILOT.md
│   ├── PROTOCOLO-CIERRE-SESION-COPILOT.md
│   └── [otras guías]
│
└── docs/                  # Documentación técnica
    ├── PROBLEMAS-CONOCIDOS.md
    ├── ARQUITECTURA-OPERATIVA.md
    └── [otras docs]
```

---

## 🎯 FEATURES IMPLEMENTADAS

### ✅ COMPLETADO (100%)

#### Autenticación y Usuarios
- ✅ Login/logout multi-rol
- ✅ Sistema de invitaciones (admins invitan usuarios)
- ✅ Contraseñas temporales (sin SMTP configurado)
- ✅ Gestión de usuarios por empresa
- ✅ Validación de roles centralizada

#### Dashboards por Rol
- ✅ Dashboard SuperAdmin (gestión global)
- ✅ Dashboard Admin/Planta (operaciones de su empresa)
- ✅ Dashboard Transporte (ofertas y operaciones)
- ✅ Dashboard Chofer Mobile (GPS tracking, estados)
- ✅ Dashboard Cliente (visibilidad de sus operaciones)

#### Operaciones de Transporte
- ✅ CRUD completo de operaciones (despachos)
- ✅ Asignación de transportes/choferes
- ✅ Estados duales (origen/destino) para cross-border
- ✅ Cambio de estados con validaciones
- ✅ Historial de cambios
- ✅ **Sistema de recepciones multi-empresa** (NUEVO - 05-Ene-2026)
  - ✅ Migración 023: Agregadas columnas origen_id/destino_id UUID
  - ✅ Detección automática de recepciones en planificación
  - ✅ API endpoints con supabaseAdmin para ubicaciones
  - ✅ UI distingue origen (recepciones) vs destino (despachos)
  - ✅ Fallback a búsqueda por texto para datos antiguos
  - 📄 Ver: [sesion-2026-01-05.md](.session/history/sesion-2026-01-05.md)
- 🟡 Control de acceso (ingreso/egreso con QR) - 95% completo

#### GPS Tracking
- ✅ Tracking en tiempo real (choferes)
- ✅ Visualización en mapa (Leaflet)
- ✅ Actualización automática de posición
- ✅ Historial de rutas

#### Sistema de Roles
- ✅ 5 roles: SuperAdmin, Admin, Transporte, Chofer, Cliente
- ✅ Permisos granulares por rol
- ✅ Row Level Security (RLS) en Supabase
- ✅ Validaciones centralizadas

---

### 🟡 EN PROGRESO (50-90%)

#### Red Nodexia (Marketplace) - 70%
**Estado:**
- ✅ Estructura de datos (tablas ofertas_red_nodexia, matches)
- ✅ UI básica para publicar ofertas
- ✅ Listado de ofertas disponibles
- ⏳ Algoritmo de matching por proximidad geográfica
- ⏳ Notificaciones automáticas a transportes cercanos
- ⏳ Testing E2E del flujo completo

**Archivos principales:**
- `pages/api/red-nodexia/`
- `components/Dashboard/RedNodexiaSection.tsx`
- SQL: `sql/schema/red_nodexia.sql`

#### Estabilización de Código - 50%
**Estado:**
- ✅ 50 tests unitarios implementados (49 pasando)
- ✅ Playwright configurado para E2E
- ⏳ 78 errores TypeScript pendientes
- ⏳ CI/CD sin configurar
- ⏳ Error monitoring sin configurar (Sentry)
- ⏳ Automated backups sin configurar

---

### ❌ PENDIENTE (0-30%)

#### Analytics y Reportes - 0%
- ❌ Dashboard de métricas de negocio
- ❌ Reportes de operaciones
- ❌ Exportación a PDF/Excel
- ❌ Gráficos de performance

#### Sistema de Facturación - 0%
- ❌ Integración con Stripe
- ❌ Planes de pago
- ❌ Gestión de suscripciones
- ❌ Facturas automáticas

#### Optimizaciones - 20%
- ⏳ Performance optimization
- ⏳ Code splitting mejorado
- ❌ Service Workers (PWA completo)
- ❌ Dark mode
- ❌ Internacionalización (i18n)

#### Marketing - 0%
- ❌ Landing page comercial
- ❌ Onboarding interactivo
- ❌ Tour del producto
- ❌ Documentación para usuarios finales

---

## 👥 ROLES Y PERMISOS

### Roles Implementados

| Rol | Descripción | Permisos principales |
|-----|-------------|---------------------|
| **SuperAdmin** | Control total | Ver/editar todo el sistema |
| **Admin** | Administrador de planta | Gestionar operaciones de su empresa |
| **Transporte** | Empresa de transporte | Aceptar/rechazar ofertas, ver sus operaciones |
| **Chofer** | Conductor | GPS tracking, cambiar estados, ver sus viajes |
| **Cliente** | Cliente final | Visibilidad de sus operaciones |

### Sistema de Permisos (RLS)

**Principios:**
- Usuarios solo ven datos de su(s) empresa(s)
- Choferes solo ven operaciones asignadas a ellos
- Clientes solo ven operaciones que los involucran
- Admins NO pueden ver datos de otras plantas
- SuperAdmin tiene acceso completo (solo para soporte)

**Implementación:**
- PostgreSQL Row Level Security (RLS)
- Políticas en cada tabla crítica
- Validaciones adicionales en API routes

---

## 🗄️ BASE DE DATOS

### Tablas Principales

```sql
-- Usuarios y autenticación
auth.users                    # Usuarios de Supabase Auth
usuarios                      # Datos extendidos de usuarios
usuarios_empresa              # Relación many-to-many usuarios-empresas

-- Empresas
empresas                      # Empresas (plantas, transportes, clientes)

-- Operaciones
operaciones                   # Operaciones de transporte
unidades                      # Unidades de carga en operaciones
historial_cambios             # Auditoría de cambios de estado

-- Red Nodexia (Marketplace)
ofertas_red_nodexia           # Ofertas publicadas por plantas
matches_red_nodexia           # Matches entre ofertas y transportes

-- GPS y Tracking
gps_tracking                  # Historial de posiciones GPS

-- Control de Acceso
accesos                       # Registro de ingresos/egresos
incidencias                   # Incidencias en accesos
```

### Políticas RLS Activas

**Política general:** Cada tabla tiene políticas que limitan el acceso según el rol y la empresa del usuario.

**Ejemplos:**
- `operaciones`: Solo ver operaciones de tu empresa (o asignadas a ti si eres chofer)
- `usuarios`: Admins solo ven usuarios de su empresa
- `empresas`: Solo ver tu propia empresa (excepto SuperAdmin)
- `ofertas_red_nodexia`: Transportes ven ofertas públicas

---

## 🔗 INTEGRACIONES

### Activas

| Servicio | Estado | Uso |
|----------|--------|-----|
| Supabase Auth | ✅ Activo | Autenticación |
| Supabase Realtime | ✅ Activo | GPS tracking en tiempo real |
| Leaflet Maps | ✅ Activo | Visualización de mapas |

### Configuradas pero Inactivas

| Servicio | Estado | Motivo |
|----------|--------|--------|
| SMTP | 🟡 Configurado | Credenciales listas, sin activar |

### Pendientes

| Servicio | Prioridad | Para qué |
|----------|-----------|----------|
| Sentry | 🔴 Alta | Error monitoring |
| Stripe | 🟡 Media | Facturación |
| Google Analytics | 🟡 Media | Métricas de uso |
| SendGrid/SES | 🟢 Baja | Emails transaccionales |

---

## 📊 MÉTRICAS ACTUALES

### Código

- **Archivos TypeScript:** ~150 archivos
- **Componentes React:** ~80 componentes
- **API Routes:** ~35 endpoints
- **Líneas de código:** ~15,000 líneas (estimado)

### Testing

- **Tests unitarios:** 50 tests (49 pasando, 1 skipped)
- **Tests E2E:** 3 tests escritos (skipped, pendiente auth setup)
- **Cobertura:** ~40% (estimado)

### Calidad

- **Errores TypeScript:** 78 errores
- **Warnings ESLint:** ~15
- **Deuda técnica:** Media

### Base de Datos

- **Tablas:** 15+ tablas
- **Políticas RLS:** 30+ políticas
- **Funciones SQL:** 5+ funciones
- **Triggers:** 3+ triggers

---

## 🚀 ROADMAP Y MILESTONES

### Milestone 1: MVP Comercializable (2-3 semanas)

**Objetivo:** Producto listo para primeros clientes beta

**Tareas críticas:**
- [ ] Completar Red Nodexia (30% restante)
- [ ] Resolver 78 errores TypeScript
- [ ] Configurar CI/CD básico
- [ ] Implementar error monitoring (Sentry)
- [ ] Setup de backups automáticos
- [ ] Testing E2E de flujos críticos

**Criterio de éxito:**
- ✅ 0 errores TypeScript
- ✅ 80%+ tests pasando
- ✅ Build sin warnings
- ✅ Deployed en producción con monitoring

---

### Milestone 2: Beta Privado (4-6 semanas)

**Objetivo:** 3-5 clientes usando el sistema activamente

**Tareas:**
- [ ] Onboarding mejorado
- [ ] Analytics básico
- [ ] Reportes de operaciones
- [ ] Soporte activo y corrección de bugs
- [ ] Documentación para usuarios

**Criterio de éxito:**
- ✅ 3+ empresas usando diariamente
- ✅ NPS > 8/10
- ✅ 95%+ uptime

---

### Milestone 3: Launch Comercial (8-12 semanas)

**Objetivo:** Producto comercializable con facturación

**Tareas:**
- [ ] Sistema de facturación (Stripe)
- [ ] Marketing site público
- [ ] SEO optimizado
- [ ] Plan de precios definido
- [ ] Legal y términos de servicio

**Criterio de éxito:**
- ✅ 10+ clientes pagando
- ✅ MRR > $1000 USD
- ✅ CAC < LTV * 3

---

## 💡 DECISIONES TÉCNICAS RECIENTES

### 1. Sistema de Recepciones Multi-Empresa (05-Ene-2026)

**Decisión:** Implementar tracking bidireccional de despachos con origen_id/destino_id

**Razón:** Empresas receptoras necesitan visibilidad de despachos que llegan a sus instalaciones, no solo los que generan.

**Implementación:**
- Migración 023: Agregadas columnas UUID origen_id/destino_id
- API endpoints con supabaseAdmin para bypass de RLS en ubicaciones
- Detección automática dual: por ID y por texto (fallback)
- UI condicional: recepciones muestran origen, despachos muestran destino

**Impacto:** Sistema ahora soporta flujos inter-empresas completos.

---

### 2. Sistema de Sesiones Estructuradas (17-Dic-2025)

**Decisión:** Implementar protocolos de inicio/cierre de sesión para Copilot

**Razón:** Usuario no-técnico necesita que Copilot trabaje de forma autónoma con continuidad entre sesiones.

**Implementación:**
- `.session/` para contexto entre sesiones
- `GUIAS/` para protocolos de trabajo
- Templates de documentación estandarizados

---

### 3. Sistema de Testing (16-Dic-2025)

**Decisión:** Implementar testing con Jest + Playwright

**Razón:** Asegurar calidad antes de lanzar a clientes reales.

**Estado:** 50 tests implementados, E2E configurado pero pendiente de activar.

---

### 3. Contraseñas Temporales sin SMTP (Nov-2025)

**Decisión:** Generar contraseñas temporales sin enviar emails

**Razón:** SMTP no configurado aún, pero necesitamos sistema de invitaciones funcional.

**Workaround:** Admins copian contraseña temporal y la comunican manualmente.

---

## 🐛 PROBLEMAS CONOCIDOS CRÍTICOS

Para lista completa ver: `docs/PROBLEMAS-CONOCIDOS.md`

### Críticos

1. **78 errores TypeScript** - Bloquea build optimizado
2. **Sin CI/CD** - Deployments manuales propensos a errores
3. **Sin error monitoring** - No sabemos cuando algo falla en producción

### Altos

4. **E2E tests sin ejecutar** - Auth setup pendiente
5. **Performance no optimizada** - Queries lentas en tablas grandes

### Medios

6. **Inconsistencias UI** - Algunos modales tienen diseños diferentes
7. **Deuda técnica en validaciones** - Lógica duplicada en varios lugares

---

## 📚 DOCUMENTACIÓN IMPORTANTE

### Para Copilot (empezar sesión)

1. **`.session/PROXIMA-SESION.md`** - Qué hacer hoy
2. **`GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md`** - Cómo arrancar
3. **`docs/PROBLEMAS-CONOCIDOS.md`** - Bugs activos

### Para Desarrolladores

- **`NODEXIA-VISION-COMPLETA.md`** - Visión del negocio
- **`NODEXIA-ROADMAP.md`** - Plan de desarrollo
- **`docs/ARQUITECTURA-OPERATIVA.md`** - Arquitectura técnica
- **`GUIAS/GUIA-AREAS-TECNICAS.md`** - Cuándo tocar BD/Frontend/Backend

### Para Usuario Final (pendiente)

- ❌ Manual de usuario (por crear)
- ❌ Guías de onboarding (por crear)
- ❌ FAQs (por crear)

---

## 🎓 CONVENCIONES DEL PROYECTO

### Commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
refactor: Refactorización sin cambios funcionales
docs: Solo documentación
test: Agregar o corregir tests
style: Cambios de formato/estilos
```

### Nombres de archivos

- Componentes React: `PascalCase.tsx`
- Utilidades: `camelCase.ts`
- Páginas: `kebab-case.tsx`
- API routes: `kebab-case.ts`
- Docs: `UPPER-KEBAB-CASE.md`

### Estructura de componentes

```tsx
// 1. Imports
import React from 'react';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 6. Render
  return (
    // ...
  );
}
```

---

## 🔄 FLUJO DE TRABAJO

### Para cada sesión

```
1. Leer .session/PROXIMA-SESION.md
2. Confirmar objetivo con usuario
3. Crear TODO list con manage_todo_list
4. Trabajar en tareas
5. Commitear cambios
6. Actualizar documentación
7. Preparar próxima sesión
```

### Para cada feature

```
1. Planificar (definir alcance)
2. BD (si necesita tablas/columnas nuevas)
3. Backend (APIs)
4. Frontend (UI)
5. Testing (unit + E2E)
6. Documentar
7. Deploy
```

---

## ⚙️ COMANDOS ÚTILES

```bash
# Desarrollo
pnpm dev                    # Iniciar servidor (localhost:3000)
pnpm build                  # Build de producción
pnpm start                  # Iniciar producción

# Testing
pnpm test                   # Run tests unitarios
pnpm test:watch             # Tests en modo watch
pnpm test:e2e               # Tests E2E (Playwright)

# Calidad
pnpm type-check             # Verificar errores TypeScript
pnpm lint                   # ESLint
pnpm format                 # Prettier

# Base de datos
pnpm supabase:types         # Generar tipos de Supabase
pnpm supabase:migrate       # Correr migraciones
```

---

## 📝 NOTAS FINALES

### Para Copilot

**Cuando leas este archivo al iniciar una sesión:**

1. Verifica que las métricas sigan siendo correctas (tests, errores TS)
2. Lee también `.session/PROXIMA-SESION.md` para contexto específico
3. Si hay cambios arquitectónicos en la sesión, actualiza este archivo
4. Mantén este documento como fuente de verdad del estado del proyecto

### Para el Usuario

**Este documento se actualiza solo cuando hay cambios arquitectónicos significativos, no cada sesión.**

Para contexto de sesión a sesión, lee `.session/PROXIMA-SESION.md`

---

**Última revisión:** 17-Dic-2025  
**Próxima revisión:** Cuando se complete Milestone 1 o cambios arquitectónicos mayores  
**Mantenido por:** GitHub Copilot (automático en cierres de sesión)

---

*Este archivo es parte del sistema de sesiones estructuradas para trabajo autónomo con Copilot.*
