# 🎨 Plan de Trabajo - Sin dependencia de Supabase

**Fecha**: 20 Octubre 2025  
**Contexto**: Supabase caído (región US-East-1)  
**Estrategia**: Aprovechar para mejorar UI/UX y documentación

---

## 🎯 **Objetivo General**

Llevar el diseño visual del Admin Panel Nodexia al mismo nivel de calidad que el resto de la aplicación.

---

## 📊 **Análisis de Estado Actual**

### ✅ **Páginas bien diseñadas** (Referencia de estilo)
- `/admin/ubicaciones` - Dark theme moderno, cards bien diseñadas
- `/crear-despacho` - Clean, profesional
- `/dashboard` (empresa) - KPIs visuales, gradientes

### ⚠️ **Páginas que necesitan rediseño**
1. **`/admin/index.tsx`** (Dashboard principal)
   - Usa `DashboardNodexia.tsx` que está **bien**, pero puede mejorarse
   - Falta consistencia con el resto del admin
   
2. **`/admin/empresas.tsx`** (Gestión de Empresas)
   - **MUY MALO**: Solo muestra "Página en Construcción"
   - Usa layout antiguo, no sigue design system
   - Necesita diseño completo desde cero

3. **`GestionEmpresasReal.tsx`**
   - **Diseño inconsistente**: colores vibrantes no Nodexia
   - Formularios pesados visualmente
   - No usar como base, rediseñar desde cero

---

## 🎨 **Design System Nodexia** (Referencia)

### **Colores principales**
```css
/* Backgrounds */
--bg-primary: #0a0e1a      /* Fondo principal oscuro */
--bg-secondary: #1b273b    /* Cards y contenedores */
--bg-hover: #2a3a52        /* Hover states */

/* Accents */
--accent-primary: #06b6d4   /* Cyan - acciones principales */
--accent-secondary: #8b5cf6 /* Purple - secundarias */
--accent-success: #10b981   /* Green - éxito */
--accent-warning: #f59e0b   /* Amber - advertencias */
--accent-danger: #ef4444    /* Red - peligro */

/* Text */
--text-primary: #f8fafc     /* Texto principal (slate-50) */
--text-secondary: #94a3b8   /* Texto secundario (slate-400) */
--text-muted: #64748b       /* Texto terciario (slate-500) */
```

### **Componentes base**
- **Cards**: `bg-[#1b273b] border border-slate-700 rounded-lg`
- **Buttons Primary**: `bg-cyan-600 hover:bg-cyan-700 text-white`
- **Buttons Secondary**: `bg-slate-700 hover:bg-slate-600 text-white`
- **Inputs**: `bg-[#1b273b] border-slate-600 text-slate-50`
- **Badges**: Estados con colores semánticos + rounded-full

### **Patterns**
1. **Header de página**
   ```tsx
   <div className="mb-8">
     <h1 className="text-3xl font-bold text-slate-50">Título</h1>
     <p className="text-slate-400">Descripción</p>
   </div>
   ```

2. **Stat Card**
   ```tsx
   <div className="bg-[#1b273b] border border-slate-700 rounded-lg p-6">
     <div className="flex items-center justify-between">
       <div>
         <p className="text-slate-400 text-sm">Label</p>
         <p className="text-2xl font-bold text-slate-50">Value</p>
       </div>
       <Icon className="h-8 w-8 text-cyan-500" />
     </div>
   </div>
   ```

3. **Table Header**
   ```tsx
   <thead className="bg-[#0a0e1a] border-b border-slate-700">
     <tr>
       <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
         Columna
       </th>
     </tr>
   </thead>
   ```

---

## 📝 **Tareas Detalladas**

### **TAREA 1: Rediseñar Dashboard Admin Principal** ⏱️ 45 min

**Archivo**: `components/Admin/DashboardNodexia.tsx`

**Cambios necesarios:**
1. Actualizar `statCards`:
   - Fondo: `bg-[#1b273b] border border-slate-700`
   - Iconos: cambiar `bg-blue-500` por gradientes: `bg-gradient-to-br from-cyan-500 to-cyan-600`
   - Hover: añadir `hover:border-cyan-500 transition-all duration-300`

2. Mejorar **Alertas de Límites**:
   - Card: `bg-[#1b273b] border border-red-700/50`
   - Items: `bg-[#0a0e1a] border border-slate-700`
   - Progress bar: colores más sutiles

3. **Accesos Rápidos**:
   - Botones: usar colores Nodexia (cyan, purple, slate)
   - Iconos: añadir Heroicons
   - Layout: cards en grid

4. **Actividad Reciente**:
   - Timestamps en `text-slate-500`
   - Separadores sutiles

**Resultado esperado**: Dashboard cohesivo con el resto del admin

---

### **TAREA 2: Diseñar página Empresas desde cero** ⏱️ 2 horas

**Archivo**: `pages/admin/empresas.tsx` (reescribir completo)

**Estructura propuesta:**

```tsx
// Layout similar a ubicaciones.tsx
<div className="flex h-screen bg-[#0a0e1a]">
  <Sidebar />
  <div className="flex-1 overflow-auto">
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Header con stats */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">
          Gestión de Empresas
        </h1>
        <p className="text-slate-400">
          Administra transportes, plantas y clientes del ecosistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Empresas" value={totalEmpresas} />
        <StatCard title="Activas" value={activas} />
        <StatCard title="Transportes" value={transportes} />
        <StatCard title="Plantas" value={plantas} />
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-[#1b273b] border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex gap-4">
          <input 
            type="text"
            placeholder="Buscar empresa..."
            className="flex-1 bg-[#0a0e1a] border-slate-600 text-slate-50"
          />
          <select className="bg-[#0a0e1a] border-slate-600 text-slate-50">
            <option>Todos los tipos</option>
            <option>Transporte</option>
            <option>Planta</option>
            <option>Cliente</option>
          </select>
          <button className="bg-cyan-600 hover:bg-cyan-700 px-6">
            Nueva Empresa
          </button>
        </div>
      </div>

      {/* Tabla de empresas */}
      <div className="bg-[#1b273b] border border-slate-700 rounded-lg overflow-hidden">
        <table>
          {/* Headers con sorting */}
          {/* Rows con acciones (editar, desactivar, ver detalles) */}
        </table>
      </div>
    </div>
  </div>
</div>
```

**Funcionalidades:**
- ✅ Listar empresas desde `view_empresas_completa`
- ✅ Filtros por tipo, estado, plan
- ✅ Búsqueda por nombre/CUIT
- ✅ Modal crear/editar empresa
- ✅ Toggle activo/inactivo
- ✅ Ver detalles (usuarios, suscripción, límites)

**Modal CrearEmpresaModal** (nuevo componente):
- Similar a `CrearUbicacionModal.tsx`
- Campos: nombre, CUIT, email, tipo, plan
- Validaciones: CUIT único, email válido
- Design: dark theme Nodexia

---

### **TAREA 3: Cleanup botón duplicado** ⏱️ 5 min

**Archivo**: `pages/admin/ubicaciones.tsx`

**Líneas ~150-170**: Eliminar el `<div>` del empty state que tiene:
```tsx
<button onClick={handleCrearNueva}>Nueva Ubicación</button>
```

Dejar solo el botón del header (línea ~115).

---

### **TAREA 4: Documentar Design System** ⏱️ 30 min

**Nuevo archivo**: `docs/DESIGN-SYSTEM.md`

**Contenido:**
1. **Filosofía de diseño Nodexia**
   - Dark-first
   - Cyan/Purple accents
   - Minimalista pero funcional

2. **Paleta de colores** (completa con hex)

3. **Componentes reutilizables**:
   - `StatCard` - con props y ejemplos
   - `ActionButton` - variantes (primary, secondary, danger)
   - `FilterBar` - búsqueda + filtros
   - `DataTable` - tabla con sorting y paginación
   - `Modal` - overlay oscuro + card central

4. **Layouts**:
   - AdminLayout (Sidebar + Content)
   - DashboardGrid (responsive grid)
   - FormLayout (2 columnas en desktop)

5. **Guías de uso**:
   - Cuándo usar cada color
   - Espaciado consistente (p-4, p-6, p-8)
   - Transiciones (300ms default)
   - Iconos (Heroicons outline para UI, solid para buttons)

---

## 🎯 **Prioridades**

### **HOY (mientras Supabase está caído)**
1. ✅ **TAREA 3** - Cleanup botón duplicado (5 min)
2. ✅ **TAREA 4** - Documentar Design System (30 min)
3. ✅ **TAREA 1** - Rediseñar Dashboard Admin (45 min)

**Total: ~1h 20min** - Todo sin necesitar base de datos

### **MAÑANA (cuando Supabase vuelva)**
1. ⏸️ **Ejecutar INSERT usuarios_empresa** (2 min)
2. ⏸️ **Probar flujo ubicaciones** (25 min)
3. ✅ **TAREA 2** - Diseñar página empresas (2h)
   - Puede hacerse parcialmente hoy (maquetado)
   - Conectar con BD mañana

---

## 📦 **Componentes a Crear**

### **Reutilizables** (ir a `components/ui/`)
1. `StatCard.tsx` - Card para métricas
2. `FilterBar.tsx` - Barra de filtros + búsqueda
3. `ActionButton.tsx` - Botones con variantes
4. `DataTable.tsx` - Tabla genérica con sorting
5. `EmptyState.tsx` - Estado vacío consistente

### **Modales** (ir a `components/Modals/`)
1. `CrearEmpresaModal.tsx` - Formulario crear empresa
2. `DetalleEmpresaModal.tsx` - Ver detalles completos

---

## ✅ **Checklist de Calidad**

Antes de considerar una página "terminada":

- [ ] Sigue paleta de colores Nodexia
- [ ] Backgrounds: `#0a0e1a` (page) y `#1b273b` (cards)
- [ ] Botones primarios: cyan-600
- [ ] Texto: slate-50 (títulos), slate-400 (descripciones)
- [ ] Borders sutiles: slate-700
- [ ] Hover states con transiciones
- [ ] Responsive (mobile-first)
- [ ] Accesibilidad (contraste WCAG AA)
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling visual

---

## 📸 **Referencias Visuales**

### **Páginas ejemplo de buen diseño en el proyecto:**
1. `/admin/ubicaciones` - ⭐⭐⭐⭐⭐
2. `/crear-despacho` - ⭐⭐⭐⭐⭐
3. `/dashboard` (empresas) - ⭐⭐⭐⭐

### **Evitar estilo de:**
1. `GestionEmpresasReal.tsx` - colores muy saturados
2. Cualquier página con fondo blanco/claro

---

## 🚀 **Roadmap Visual**

```
FASE 1 (HOY - Sin Supabase) ✅
├── Cleanup botón ubicaciones
├── Documentar Design System  
└── Rediseñar Dashboard Admin

FASE 2 (MAÑANA - Con Supabase) ⏸️
├── Ejecutar SQL permisos
├── Probar ubicaciones end-to-end
└── Diseñar página Empresas completa

FASE 3 (FUTURO)
├── Crear componentes reutilizables
├── Aplicar design system a resto de admin
└── Mobile optimization
```

---

## 💡 **Notas Importantes**

1. **No tocar lógica de negocio**: Solo cambios visuales
2. **Mantener accesibilidad**: No sacrificar UX por estética
3. **Documentar decisiones**: Si cambias algo, explicar por qué
4. **Testar en ambos temas**: Verificar que funcione en dark mode
5. **Progressive enhancement**: Desktop first, luego mobile

---

**Última actualización**: 20 Oct 2025, 12:30 ART  
**Estado**: 🟢 Listo para ejecutar (no depende de Supabase)
