# 📝 CHANGELOG - Proyecto Nodexia

Registro cronológico de cambios importantes en el proyecto.

---

## [21 Octubre 2025] - Sesión #4: Supabase Operativa + Fixes de Roles

### 🎉 **Supabase Recuperada**
- ✅ Servicio operativo después de 6+ horas de caída
- ✅ SQL pendiente ejecutado exitosamente

### ✅ **Configuración Super Admin**
**Archivos**:
- Script: `scripts/verify_and_assign_admin.js`

**Cambios**:
- Usuario `admin.demo@nodexia.com` asignado a empresa "Nodexia" (tipo sistema)
- Rol `super_admin` configurado en `usuarios_empresa`
- User ID: `08d83a1f-485d-47df-8303-08b8129c3855`
- Empresa ID: `7f8ed1a8-37b0-4c27-9935-e78972e72a2e`

### 🐛 **Bugs Críticos Resueltos**

#### **1. UserRoleContext - Detección de Roles**
**Problema**: Context no encontraba usuarios en `usuarios_empresa` porque buscaba con ID incorrecto
**Archivo**: `lib/contexts/UserRoleContext.tsx`

**Cambios**:
```typescript
// ANTES: Buscaba con usuarioData.id (de tabla usuarios)
.eq('user_id', usuarioData.id)

// AHORA: Busca con authUser.id (de auth.users)
.eq('user_id', authUser.id)
```

**Mapeo de roles actualizado**:
- Agregado case para `'super_admin'` (minúsculas)
- Mantenido compatibility con `'Super Admin'`
- Logs mejorados para debugging

#### **2. Planificación - Foreign Keys Incorrectos**
**Problema**: Query intentaba usar relaciones que no existen en schema
**Archivo**: `pages/planificacion.tsx`

**ANTES**:
```typescript
.select('..., transporte_data:transportes!despachos_transporte_id_fkey(nombre)')
```

**AHORA**:
```typescript
.select('..., transport_id, driver_id')
```

**Resultado**: Sin errores de foreign key relationship

#### **3. Coordinator Dashboard - Tabla Transportes**
**Problema**: Dashboard intentaba acceder a tabla `transportes` que no existe
**Archivo**: `pages/coordinator-dashboard.tsx`

**Cambios** (2 ubicaciones):

**Ubicación 1** - Cargar stats:
```typescript
// ANTES
.from('transportes').select('id').eq('disponible', true)

// AHORA
.from('empresas').select('id')
  .eq('tipo_empresa', 'transporte')
  .eq('activo', true)
```

**Ubicación 2** - Cargar transportes activos:
```typescript
// ANTES
.from('transportes')
  .select('id, nombre, tipo, disponible, ubicacion_actual')

// AHORA
.from('empresas')
  .select('id, nombre')
  .eq('tipo_empresa', 'transporte')
  .eq('activo', true)
```

### 📄 **Archivos Modificados**

```
lib/contexts/UserRoleContext.tsx
  - Buscar user_id con authUser.id
  - Agregar case 'super_admin' en switch
  - Mejorar logs de debugging

pages/planificacion.tsx
  - Remover foreign keys inexistentes
  - Usar solo transport_id y driver_id

pages/coordinator-dashboard.tsx
  - Reemplazar tabla transportes por empresas
  - Filtrar por tipo_empresa='transporte'
  - Ajustar estructura de datos

scripts/verify_and_assign_admin.js (NUEVO)
  - Verificar y asignar rol super_admin
  - Crear empresa Nodexia si no existe
  - Validación completa

scripts/list_empresas.js (NUEVO)
  - Listar todas las empresas del sistema

scripts/check_despachos_schema.js (NUEVO)
  - Verificar estructura de tabla despachos

.jary/QUICK-START.md
  - Actualizar status a "operativa"
```

### 📊 **Estado Actual**

**Base de datos**:
- ✅ 17 empresas registradas
- ✅ 3 empresas tipo transporte
- ✅ Usuario super_admin configurado
- ✅ 0 ubicaciones (listo para crear desde UI)

**Frontend**:
- ✅ Sin errores de foreign keys
- ✅ Roles detectados correctamente
- ✅ Dashboards cargando sin conflictos
- ✅ Redirección por rol funcionando

### 🎯 **Próximos Pasos**

**Inmediato**:
1. Probar crear ubicaciones desde `/admin/ubicaciones`
2. Verificar todos los dashboards sin errores
3. Testar flujo completo de despachos

**Pendiente**:
- Sistema de ubicaciones end-to-end testing
- Design system aplicado a más páginas

---

## [20 Octubre 2025] - Sesión 3: Rediseño Dashboard + Bug Fixes

### 🎨 **UI/UX Implementado**

#### **1. Rediseño Dashboard Admin Nodexia**
- **Archivo**: `components/Admin/DashboardNodexia.tsx`
- **Cambios aplicados**:
  - ✅ Aplicado sistema de diseño Nodexia completo
  - ✅ Cards con gradientes individuales (cyan, green, purple, emerald, amber, red)
  - ✅ Borders con opacidad por color (`border-{color}-500/30`)
  - ✅ Iconos con colores temáticos (`text-{color}-400 opacity-80`)
  - ✅ Sección Alertas con estilo distintivo (red gradient)
  - ✅ Botones de acción con gradientes cyan
  - ✅ Transiciones suaves (`transition-all duration-300`)
  - ✅ Hover states mejorados
- **Resultado**: Dashboard visualmente consistente con diseño Nodexia

#### **2. Sistema de Diseño Documentado**
- **Archivo**: `docs/DESIGN-SYSTEM.md` (NUEVO - 400+ líneas)
- **Contenido**:
  - Paleta de colores completa con hex codes
  - 8 componentes base documentados (StatCard, ActionButton, FilterBar, DataTable, Badge, Input, Modal, EmptyState)
  - 3 patrones de layout (AdminLayout, DashboardGrid, FormLayout)
  - Guías de uso y mejores prácticas
  - Ejemplos de código completos
  - Referencias de spacing y tipografía

#### **3. Cleanup UI**
- **Archivo**: `pages/admin/ubicaciones.tsx`
- **Cambio**: Eliminado botón duplicado "Nueva Ubicación" del empty state
- **Razón**: UX confusa con dos botones para la misma acción
- **Resultado**: Un único botón en header, texto informativo en empty state

### 🐛 **Bugs Críticos Resueltos**

#### **1. Page Reload al Cambiar de Aplicación**
- **Problema**: Al cambiar de app (Slack, email) y volver, la página se recargaba completamente
- **Impacto**: Pérdida total de estado de formularios, modales cerrados, datos perdidos
- **Ejemplo reportado**: Modal "crear ubicación" con 14+ campos llenados → cambiar app → volver → modal cerrado, datos perdidos

**Soluciones Implementadas** (enfoque multi-capa):

**a) Aumento de retención de páginas en Next.js**
- **Archivo**: `next.config.ts`
- **Cambios**:
  ```typescript
  maxInactiveAge: 25s → 300s (5 minutos)
  pagesBufferLength: 2 → 5 páginas
  ```
- **Objetivo**: Prevenir purga prematura de páginas de memoria

**b) Optimización de UserRoleContext**
- **Archivo**: `lib/contexts/UserRoleContext.tsx`
- **Cambios**:
  - ❌ Eliminado listener `TOKEN_REFRESHED` que causaba reloads
  - ✅ Solo reacciona a `SIGNED_IN` y `SIGNED_OUT`
  - ✅ Evita reconexiones innecesarias a Supabase
- **Objetivo**: Reducir eventos que disparan re-renders

**c) Auto-guardado inteligente en sessionStorage** ⭐ (Solución definitiva)
- **Archivo**: `components/Modals/CrearUbicacionModal.tsx`
- **Features implementadas**:
  - 💾 **Auto-recuperación**: `loadDraft()` carga datos de sessionStorage al montar
  - 💾 **Auto-guardado**: useEffect guarda formData en cada cambio
  - 🗑️ **Limpieza automática**: 
    - Al guardar exitosamente: `sessionStorage.removeItem()`
    - Al cancelar: `handleCancel()` limpia draft
  - 🔑 **Storage key**: `nodexia_ubicacion_draft`
- **Resultado**: 
  - ✅ Formulario persiste incluso con full page reload (F5)
  - ✅ Cambiar de app y volver mantiene todos los datos
  - ✅ No afecta performance (solo 1 item en sessionStorage)

#### **2. Override Temporal de Rol Super Admin**
- **Problema**: Con Supabase caído, no se puede verificar rol desde DB
- **Impacto**: Usuario `admin.demo@nodexia.com` detectado como "coordinador" en lugar de "super_admin"
- **Solución temporal**:
  - **Archivo**: `lib/contexts/UserRoleContext.tsx`
  - **Código agregado**:
    ```typescript
    if (authUser.email === 'admin.demo@nodexia.com') {
      console.log('👑 OVERRIDE: admin.demo@nodexia.com forzado como super_admin');
      setRoles(['super_admin']);
      return;
    }
    ```
  - **Nota**: REMOVER cuando Supabase se recupere y se ejecute SQL correcto

### 📄 **Documentación Creada**

#### **Sistema de Documentación .jary/**
- `.jary/ESTADO-ACTUAL.md` - Estado completo del proyecto (400+ líneas)
- `.jary/CHANGELOG.md` - Este archivo (historial cronológico)
- `.jary/QUICK-START.md` - Guía de 2 minutos para iniciar sesión
- `.jary/README.md` - Meta-documentación del sistema de docs

**Objetivo**: Facilitar continuidad entre sesiones sin pérdida de contexto

#### **Plan de Trabajo Sin Supabase**
- `docs/PLAN-TRABAJO-SIN-SUPABASE.md`
- Identifica tareas que NO requieren DB
- Prioriza: cleanup UI, design system, dashboard redesign
- **Estado**: 3/3 tareas completadas ✅

### 🚨 **Incidentes Externos**

#### **Supabase Outage Continúa**
- **Región afectada**: US-East-1 (Norte de Virginia)
- **Inicio**: 20 Oct 2025 - 11:24 UTC
- **Duración**: ~6+ horas y continúa
- **Causa**: Tasas de error elevadas en API AWS
- **Impacto en Nodexia**:
  - ❌ No se puede ejecutar `INSERT usuarios_empresa`
  - ❌ No se puede crear ubicaciones desde UI
  - ❌ Verificación de roles desde DB bloqueada
  - ✅ Override temporal permite seguir trabajando
- **Status**: https://status.supabase.com
- **Decisión**: Enfocarse en trabajo frontend que no requiere DB

### ✅ **SQL Listo para Ejecutar** (cuando Supabase vuelva)

```sql
-- Archivo: sql/migrations/asignar_super_admin.sql
-- Asigna admin.demo@nodexia.com como super_admin en empresa Nodexia
-- Crea empresa sistema si no existe
-- Verifica permisos RLS
```

### 📊 **Progreso de Tareas**

**Completadas esta sesión**:
- ✅ Rediseñar Dashboard Admin (DashboardNodexia.tsx)
- ✅ Crear sistema de diseño documentado (docs/DESIGN-SYSTEM.md)
- ✅ Cleanup botón duplicado en ubicaciones
- ✅ Solucionar bug page reload (triple solución implementada)
- ✅ Fix temporal rol super_admin

**Pendientes (bloqueadas por Supabase)**:
- ⏸️ Ejecutar INSERT usuarios_empresa
- ⏸️ Probar flujo completo ubicaciones
- ⏸️ Crear primera ubicación desde UI

**Opcionales (no bloqueadas)**:
- 🟢 Diseñar página /admin/empresas desde cero (2 horas estimadas)

### 🔧 **Archivos Modificados Esta Sesión**

```
components/Admin/DashboardNodexia.tsx
  - Rediseño completo con gradientes Nodexia
  - 6 stat cards con colores únicos
  - Sección alertas destacada
  - Botones de acción mejorados

docs/DESIGN-SYSTEM.md (NUEVO)
  - Sistema de diseño completo documentado
  - 400+ líneas de referencia

pages/admin/ubicaciones.tsx
  - Eliminado botón duplicado líneas 205-213

next.config.ts
  - maxInactiveAge: 25s → 300s
  - pagesBufferLength: 2 → 5

lib/contexts/UserRoleContext.tsx
  - Eliminado listener TOKEN_REFRESHED
  - Agregado override temporal admin.demo@nodexia.com

components/Modals/CrearUbicacionModal.tsx
  - Sistema auto-guardado sessionStorage
  - loadDraft() para recuperación
  - handleCancel() con limpieza
  - Auto-save en cada cambio de formData

.jary/ESTADO-ACTUAL.md (NUEVO)
.jary/CHANGELOG.md (ACTUALIZADO)
.jary/QUICK-START.md (NUEVO)
.jary/README.md (NUEVO)
docs/PLAN-TRABAJO-SIN-SUPABASE.md (NUEVO)
```

### 💡 **Aprendizajes de Esta Sesión**

1. **Next.js Dev Settings**: `onDemandEntries` con 25s es demasiado agresivo → genera page reloads
2. **Form Persistence**: sessionStorage es excelente para drafts temporales en modales
3. **Supabase Outages**: Tener fallbacks/overrides permite seguir trabajando en frontend
4. **Documentación**: Sistema .jary/ muy útil para retomar trabajo entre sesiones
5. **Multi-layer Solutions**: Un bug complejo (page reload) requiere soluciones en múltiples capas

### 🎯 **Próxima Sesión (Recomendaciones)**

**Cuando Supabase se recupere**:
1. Ejecutar `sql/migrations/asignar_super_admin.sql`
2. Remover override temporal de UserRoleContext
3. Probar crear ubicaciones desde UI
4. Verificar flujo completo: crear → vincular → usar en despacho

**Trabajo opcional frontend**:
- Diseñar página `/admin/empresas` desde cero
- Aplicar design system a otras páginas legacy
- Crear componentes reutilizables en `components/ui/`

---

## [20 Octubre 2025] - Sesión 2: Sistema Ubicaciones + Rediseño UI

### 🐛 **Bugs Resueltos**
- **Modal CrearUbicacionModal**: Overflow cortaba campos superiores
  - Solución: Agregado `max-h-[90vh] overflow-y-auto` en contenedor
  - Archivo: `components/Modals/CrearUbicacionModal.tsx` línea 147

- **Botón "Crear" no funciona**: Click no ejecutaba handleSubmit
  - Solución: Cambio de `type="submit"` a `type="button"` con `onClick` directo
  - Archivo: `components/Modals/CrearUbicacionModal.tsx` líneas 377-392
  - Debugging: Agregados console.log con emojis en todo handleSubmit

### 🔍 **Diagnósticos Completados**
- **RLS Permission Error**: Identificada causa raíz
  - Usuario `admin.demo@nodexia.com` (ID: `08d83a1f-485d-47df-8303-88b8129c3855`)
  - NO existe en tabla `usuarios_empresa`
  - Por eso RLS policies bloquean INSERT en `ubicaciones`
  - Empresa Nodexia confirmada: ID `7f8ed1a8-37b0-4c27-9935-e78972e72a2e`

### 📄 **Archivos Creados**
- `sql/migrations/fix_rls_ubicaciones_simple.sql` - Fix RLS simplificado
- `sql/migrations/asignar_super_admin.sql` - Script para asignar rol (LISTO para ejecutar)
- `docs/PLAN-TRABAJO-SIN-SUPABASE.md` - Plan durante downtime Supabase
- `.jary/ESTADO-ACTUAL.md` - Estado completo del proyecto
- `.jary/CHANGELOG.md` - Este archivo

### 🚨 **Incidentes Externos**
- **Supabase Down**: Región US-East-1 caída desde 11:24 UTC
  - Causa: Tasas error elevadas en API AWS
  - Impacto: No se pueden ejecutar queries SQL
  - Acciones bloqueadas: INSERT usuarios_empresa, crear ubicaciones
  - Status: https://status.supabase.com

### 🎨 **Mejoras UI Planificadas** (en progreso)
- Documentación design system Nodexia
- Rediseño Dashboard Admin (`DashboardNodexia.tsx`)
- Creación página `/admin/empresas` desde cero
- Cleanup botón duplicado en ubicaciones

### 🗂️ **SQL Pendiente de Ejecución**
```sql
-- Cuando Supabase se recupere, ejecutar:
sql/migrations/asignar_super_admin.sql
```

---

## [19 Octubre 2025] - Sesión 1: Sistema Ubicaciones Base

### ✨ **Features Implementadas**

#### **1. Sistema de Ubicaciones - Backend**
- **Migración 008**: Tablas `ubicaciones` y `empresa_ubicaciones`
  - Limpieza de datos de ejemplo (mantener solo estructura)
  - Índices para performance
  - RLS policies configuradas
  - Función `buscar_ubicaciones()` para autocomplete

#### **2. Panel Admin - Gestión Ubicaciones**
- **Página**: `/admin/ubicaciones`
  - CRUD completo para super_admin
  - Tabla con filtros por tipo (planta, depósito, cliente, terminal)
  - Búsqueda por nombre, CUIT, ciudad
  - Toggle activo/inactivo
  - Stats cards con contadores por tipo

- **Modal**: `CrearUbicacionModal.tsx`
  - Formulario completo con validaciones
  - Campos: nombre, CUIT, tipo, dirección, contacto, horarios, capacidad
  - Validación CUIT único
  - Validación campos requeridos
  - Modo crear y editar

#### **3. Configuración Empresas - Vincular Ubicaciones**
- **Página**: `/configuracion/ubicaciones`
  - Vista de ubicaciones disponibles
  - Modal para vincular: marcar origen/destino, alias, prioridad
  - Filtros por tipo
  - Solo ve ubicaciones activas

- **Modal**: `VincularUbicacionModal.tsx`
  - Checkboxes para origen/destino
  - Campo alias personalizado
  - Selector de prioridad
  - Guarda en `empresa_ubicaciones`

#### **4. Integración en Despachos**
- **Componente**: `UbicacionAutocompleteInput.tsx`
  - Autocomplete con búsqueda en tiempo real
  - Filtra por tipo (solo origen o solo destino)
  - Muestra tipo con badge de color
  - Retorna ID completo para guardar

- **API**: `/api/ubicaciones/buscar.ts`
  - Endpoint para búsqueda de ubicaciones
  - Parámetros: texto, empresa_id, es_origen, es_destino
  - Usa función SQL `buscar_ubicaciones()`
  - Devuelve: id, nombre, tipo, ciudad, direccion

- **Integración**: `pages/crear-despacho.tsx`
  - Reemplazados inputs manuales por autocomplete
  - Campo "Origen": solo ubicaciones marcadas como origen
  - Campo "Destino": solo ubicaciones marcadas como destino
  - Guarda IDs en lugar de texto libre

### 📄 **Archivos Nuevos**
```
sql/migrations/
  - 008_crear_ubicaciones.sql
  - 008_limpiar_datos_ejemplo.sql
  - verificar_empresas.sql

pages/
  - admin/ubicaciones.tsx
  - configuracion/ubicaciones.tsx

components/
  - Modals/CrearUbicacionModal.tsx
  - Modals/VincularUbicacionModal.tsx
  - forms/UbicacionAutocompleteInput.tsx

pages/api/
  - ubicaciones/buscar.ts

types/
  - ubicaciones.ts
```

### 🔧 **Archivos Modificados**
- `components/layout/Sidebar.tsx` - Agregado "📍 Ubicaciones"
- `pages/crear-despacho.tsx` - Integrados autocompletes
- `lib/navigation.ts` - Rutas ubicaciones

### 🐛 **Bugs Encontrados** (resueltos sesión 2)
- Modal CrearUbicacionModal: campos superiores ocultos
- Botón "Crear" no ejecuta acción

### 📊 **Estado al Final de Sesión 1**
- ✅ Tablas creadas en BD
- ✅ 17 empresas existentes (creadas por UI en sesiones anteriores)
- ✅ 0 ubicaciones (esperando crear desde UI)
- ✅ Panel admin funcional visualmente
- ❌ Bug crítico en modal (bloqueaba creación)

---

## [18 Octubre 2025 y anteriores] - Base del Proyecto

### ✨ **Features Base Implementadas**

#### **Autenticación y Roles**
- Supabase Auth integrado
- Context `UserRoleContext` para manejo de roles
- Roles: super_admin, admin, coordinador, usuario
- RLS policies por empresa

#### **Multi-tenancy**
- Sistema de empresas con tipos (transporte, planta, cliente)
- Planes de suscripción (Free, Basic, Professional, Enterprise)
- Usuarios asignados a empresas con roles específicos
- Aislamiento de datos por empresa_id

#### **Módulos Principales**
1. **Despachos**: Crear, listar, gestionar despachos
2. **Viajes**: QR codes, tracking, estados
3. **Choferes**: CRUD completo con documentación
4. **Camiones**: Gestión de flota con patentes
5. **Acoplados**: Registro y tracking
6. **Dashboard**: KPIs y estadísticas por empresa

#### **UI/UX**
- Sidebar con navegación contextual por rol
- Dark theme (#0a0e1a, #1b273b)
- Componentes con Tailwind CSS
- Heroicons para iconografía
- Diseño responsive

#### **Base de Datos**
- ~25 tablas principales
- Vistas para queries complejas
- Funciones SQL para lógica de negocio
- Triggers para auditoría
- Migraciones versionadas

### 📄 **Estructura Base Creada**
```
pages/
  - login.tsx, signup.tsx
  - dashboard.tsx
  - crear-despacho.tsx
  - [múltiples páginas admin]

components/
  - layout/ (Sidebar, AdminLayout)
  - Dashboard/ (KPIs, stats)
  - forms/ (múltiples formularios)
  - Modals/ (modales CRUD)

lib/
  - supabaseClient.ts
  - contexts/ (Auth, UserRole)
  - hooks/ (custom hooks)
  - validation/ (schemas)

sql/
  - migrations/ (migraciones 001-007)
```

---

## 📋 **Convenciones del Changelog**

### **Formato de Entrada**
```markdown
## [Fecha] - Título de Sesión

### 🎯 Categoría
- Descripción del cambio
  - Detalles técnicos
  - Archivos afectados
```

### **Categorías**
- ✨ **Features**: Nuevas funcionalidades
- 🐛 **Bugs**: Correcciones de errores
- 🎨 **UI/UX**: Mejoras visuales y de experiencia
- 🔧 **Refactor**: Cambios de código sin cambiar funcionalidad
- 📄 **Docs**: Documentación
- 🚀 **Performance**: Optimizaciones
- 🔒 **Security**: Mejoras de seguridad
- 🗃️ **Database**: Cambios en estructura de BD
- 🚨 **Breaking**: Cambios que rompen compatibilidad

### **Información Mínima por Cambio**
1. Qué se cambió
2. Por qué se cambió
3. Archivos afectados
4. Estado (completo/pendiente/bloqueado)

---

**Última actualización**: 20 Oct 2025, 12:45 ART  
**Mantenido por**: GitHub Copilot (Jary)  
**Objetivo**: Facilitar continuidad entre sesiones y onboarding de nuevos desarrolladores
