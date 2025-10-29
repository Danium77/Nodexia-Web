# 🎨 Design System Nodexia

**Versión**: 1.0  
**Fecha**: 20 Octubre 2025  
**Propósito**: Guía visual y técnica para mantener consistencia en toda la plataforma

---

## 🌈 **Paleta de Colores**

### **Backgrounds (Fondos)**

```css
/* Fondo principal de páginas */
--bg-primary: #0a0e1a;        /* bg-[#0a0e1a] */

/* Cards y contenedores */
--bg-secondary: #1b273b;      /* bg-[#1b273b] */

/* Hover states */
--bg-hover: #2a3a52;          /* bg-[#2a3a52] */

/* Overlay de modales */
--bg-overlay: rgba(10, 14, 26, 0.8);  /* bg-[#0a0e1a]/80 */
```

**Uso**:
```tsx
// Página completa
<div className="min-h-screen bg-[#0a0e1a]">
  
  // Card/contenedor
  <div className="bg-[#1b273b] rounded-lg border border-slate-700">
    // Contenido
  </div>
</div>
```

---

### **Colors (Acentos y Estados)**

```css
/* Primario - Acciones principales */
--color-primary: #06b6d4;     /* cyan-600 */
--color-primary-hover: #0891b2; /* cyan-700 */

/* Secundario - Acciones secundarias */
--color-secondary: #8b5cf6;   /* purple-600 */
--color-secondary-hover: #7c3aed; /* purple-700 */

/* Success - Estados exitosos */
--color-success: #10b981;     /* green-600 */
--color-success-light: #34d399; /* green-500 */

/* Warning - Advertencias */
--color-warning: #f59e0b;     /* amber-500 */
--color-warning-light: #fbbf24; /* amber-400 */

/* Danger - Errores y acciones destructivas */
--color-danger: #ef4444;      /* red-600 */
--color-danger-hover: #dc2626; /* red-700 */

/* Info - Información */
--color-info: #3b82f6;        /* blue-600 */
```

**Mapeo por tipo**:
```tsx
// Ubicaciones - Tipos
planta    → blue-400    (#60a5fa)
deposito  → purple-400  (#c084fc)
cliente   → green-400   (#4ade80)
terminal  → orange-400  (#fb923c)
```

---

### **Text (Textos)**

```css
/* Títulos principales */
--text-primary: #f8fafc;      /* slate-50 */

/* Descripciones y textos secundarios */
--text-secondary: #94a3b8;    /* slate-400 */

/* Texto terciario y placeholders */
--text-muted: #64748b;        /* slate-500 */

/* Texto deshabilitado */
--text-disabled: #475569;     /* slate-600 */
```

**Jerarquía**:
```tsx
<h1 className="text-3xl font-bold text-slate-50">Título Principal</h1>
<p className="text-slate-400">Descripción secundaria</p>
<span className="text-sm text-slate-500">Texto terciario</span>
```

---

### **Borders (Bordes)**

```css
/* Bordes sutiles para cards */
--border-default: #334155;    /* slate-700 */

/* Bordes en foco */
--border-focus: #06b6d4;      /* cyan-600 */

/* Bordes de inputs */
--border-input: #475569;      /* slate-600 */
```

---

## 🧩 **Componentes Base**

### **1. StatCard** - Tarjetas de Métricas

**Uso**: Mostrar KPIs y estadísticas

```tsx
// Básica
<div className="bg-[#1b273b] rounded-lg p-6 border border-slate-700">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-sm">Label</p>
      <p className="text-2xl font-bold text-slate-50">42</p>
    </div>
    <Icon className="h-8 w-8 text-cyan-500" />
  </div>
</div>

// Con gradiente
<div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg p-6 border border-cyan-500/30">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-cyan-400 text-sm font-medium">Label</p>
      <p className="text-3xl font-bold text-slate-50">42</p>
      <p className="text-xs text-slate-500 mt-1">+12% vs mes anterior</p>
    </div>
    <Icon className="h-10 w-10 text-cyan-400" />
  </div>
</div>
```

**Variantes**:
- `default` - Fondo oscuro con borde
- `gradient` - Gradiente sutil con borde de color
- `compact` - Versión más pequeña para dashboards densos

---

### **2. ActionButton** - Botones de Acción

**Primario** (acciones principales):
```tsx
<button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors">
  Crear Nuevo
</button>
```

**Secundario** (acciones secundarias):
```tsx
<button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-semibold transition-colors">
  Cancelar
</button>
```

**Danger** (acciones destructivas):
```tsx
<button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
  Eliminar
</button>
```

**Outline** (acciones terciarias):
```tsx
<button className="px-6 py-2 border border-cyan-600 text-cyan-600 hover:bg-cyan-600/10 rounded-lg font-semibold transition-colors">
  Ver Detalles
</button>
```

**Small** (botones en tablas):
```tsx
<button className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">
  Editar
</button>
```

---

### **3. FilterBar** - Barra de Filtros

**Con búsqueda + filtros + acción**:
```tsx
<div className="bg-[#1b273b] rounded-lg p-4 border border-slate-700">
  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
    {/* Búsqueda */}
    <div className="flex-1 max-w-md">
      <input
        type="text"
        placeholder="Buscar..."
        className="w-full px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </div>

    {/* Filtro */}
    <select className="px-4 py-2 bg-[#0a0e1a] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500">
      <option>Todos</option>
      <option>Opción 1</option>
    </select>

    {/* Acción principal */}
    <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors">
      + Nuevo
    </button>
  </div>
</div>
```

---

### **4. DataTable** - Tabla de Datos

```tsx
<div className="bg-[#1b273b] rounded-lg border border-slate-700 overflow-hidden">
  <table className="w-full">
    {/* Header */}
    <thead className="bg-[#0a0e1a]">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
          Columna
        </th>
      </tr>
    </thead>

    {/* Body */}
    <tbody className="divide-y divide-slate-700">
      <tr className="hover:bg-[#0a0e1a]/50 transition-colors">
        <td className="px-4 py-4 text-sm text-slate-50">
          Dato
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Estados de fila**:
```tsx
// Normal
<tr className="hover:bg-[#0a0e1a]/50">

// Inactiva/deshabilitada
<tr className="opacity-50 hover:bg-[#0a0e1a]/50">

// Seleccionada
<tr className="bg-cyan-500/10 border-l-2 border-cyan-500">
```

---

### **5. Badge** - Insignias de Estado

**Por tipo**:
```tsx
// Success
<span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
  Activo
</span>

// Warning
<span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
  Pendiente
</span>

// Danger
<span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
  Inactivo
</span>

// Info
<span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
  En proceso
</span>
```

---

### **6. Input** - Campos de Formulario

**Text Input**:
```tsx
<input
  type="text"
  className="w-full px-4 py-2 bg-[#1b273b] border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
  placeholder="Ingresa texto..."
/>
```

**Select**:
```tsx
<select className="w-full px-4 py-2 bg-[#1b273b] border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500">
  <option>Seleccionar...</option>
  <option>Opción 1</option>
</select>
```

**Textarea**:
```tsx
<textarea
  rows={4}
  className="w-full px-4 py-2 bg-[#1b273b] border border-slate-600 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
  placeholder="Descripción..."
/>
```

**Con error**:
```tsx
<input
  className="... border-red-500 focus:ring-red-500"
/>
<p className="mt-1 text-sm text-red-400">Mensaje de error</p>
```

---

### **7. Modal** - Ventanas Modales

```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
  
  {/* Modal Container */}
  <div className="bg-[#1b273b] rounded-xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    
    {/* Header */}
    <div className="border-b border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-50">Título Modal</h2>
        <button className="text-slate-400 hover:text-slate-50">✕</button>
      </div>
    </div>

    {/* Body */}
    <div className="p-6">
      {/* Contenido */}
    </div>

    {/* Footer */}
    <div className="border-t border-slate-700 p-6 flex justify-end gap-4">
      <button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">
        Cancelar
      </button>
      <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">
        Guardar
      </button>
    </div>
  </div>
</div>
```

---

### **8. EmptyState** - Estado Vacío

```tsx
<div className="p-12 text-center">
  <div className="text-4xl mb-4">📦</div>
  <h3 className="text-xl font-bold text-slate-50 mb-2">
    No hay datos
  </h3>
  <p className="text-slate-400 mb-6">
    Comienza creando tu primer registro
  </p>
  <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold">
    + Crear Nuevo
  </button>
</div>
```

---

## 📐 **Patrones de Layout**

### **1. Admin Layout** - Layout Principal con Sidebar

```tsx
<div className="flex h-screen bg-[#0a0e1a]">
  {/* Sidebar */}
  <Sidebar />
  
  {/* Main Content */}
  <div className="flex-1 overflow-auto">
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">
          Título de Página
        </h1>
        <p className="text-slate-400">
          Descripción breve de la sección
        </p>
      </div>

      {/* Content */}
      {/* ... */}
    </div>
  </div>
</div>
```

---

### **2. Dashboard Grid** - Grid de Métricas

```tsx
{/* 4 columnas en desktop, 2 en tablet, 1 en mobile */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</div>
```

---

### **3. Form Layout** - Formularios

```tsx
{/* 2 columnas en desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Campo 1
    </label>
    <input type="text" className="..." />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Campo 2
    </label>
    <input type="text" className="..." />
  </div>
</div>

{/* Campo full width */}
<div className="md:col-span-2">
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Campo Largo
  </label>
  <textarea className="..." />
</div>
```

---

## 🎯 **Guías de Uso**

### **Cuándo usar cada color**

| Contexto | Color | Ejemplo |
|----------|-------|---------|
| Acción principal | Cyan | Crear, Guardar, Confirmar |
| Acción secundaria | Purple | Ver más, Detalles |
| Neutral | Slate | Cancelar, Volver |
| Éxito | Green | Completado, Activo |
| Advertencia | Amber | Pendiente, Revisión |
| Error/Peligro | Red | Eliminar, Inactivo, Error |
| Información | Blue | Notificación, Info |

---

### **Espaciado Consistente**

```tsx
// Padding cards
p-4   → Cards pequeños/compactos
p-6   → Cards estándar
p-8   → Cards con mucho contenido

// Gap entre elementos
gap-2  → Elementos muy juntos
gap-4  → Espaciado estándar
gap-6  → Secciones separadas
gap-8  → Bloques diferentes

// Margin bottom
mb-2   → Entre label e input
mb-4   → Entre inputs
mb-6   → Entre secciones de form
mb-8   → Entre bloques de página
```

---

### **Transiciones**

```tsx
// Duración estándar
transition-colors        // 150ms por defecto
transition-all           // 150ms para múltiples propiedades

// Duración custom
duration-300            // Para animaciones más suaves
duration-500            // Para cambios importantes

// Ejemplo completo
className="bg-cyan-600 hover:bg-cyan-700 transition-colors duration-300"
```

---

### **Responsividad**

```tsx
// Mobile first approach
<div className="
  flex flex-col          // Mobile: vertical
  md:flex-row            // Tablet+: horizontal
  gap-4                  // Mobile: gap-4
  md:gap-6               // Tablet+: gap-6
  px-4                   // Mobile: padding 1rem
  md:px-6                // Tablet+: padding 1.5rem
  lg:px-8                // Desktop: padding 2rem
">
```

**Breakpoints**:
- `sm`: 640px (móvil grande)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (desktop grande)
- `2xl`: 1536px (pantalla ancha)

---

### **Iconografía**

**Librería**: Heroicons (outline para UI, solid para buttons)

```tsx
import { HomeIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';

// Tamaños
<Icon className="h-4 w-4" />   // Pequeño (en badges)
<Icon className="h-5 w-5" />   // Estándar (en buttons)
<Icon className="h-6 w-6" />   // Mediano (en headers)
<Icon className="h-8 w-8" />   // Grande (en stat cards)
<Icon className="h-10 w-10" /> // Extra grande (destacados)
```

---

## ✅ **Checklist de Componente**

Antes de considerar un componente "listo":

- [ ] Sigue paleta de colores Nodexia
- [ ] Backgrounds correctos (#0a0e1a, #1b273b)
- [ ] Botones primarios en cyan-600
- [ ] Texto en slate-50 (títulos) y slate-400 (descripciones)
- [ ] Borders sutiles en slate-700
- [ ] Hover states con transiciones
- [ ] Responsive (funciona en móvil)
- [ ] Estados de loading/error/empty
- [ ] Focus states para accesibilidad
- [ ] Contraste WCAG AA mínimo

---

## 🚀 **Ejemplos de Páginas Completas**

### **Página Admin Estándar**

```tsx
export default function PaginaAdmin() {
  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">
              Gestión de Recursos
            </h1>
            <p className="text-slate-400">
              Administra los recursos del sistema
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total" value="42" />
            <StatCard title="Activos" value="38" />
            <StatCard title="Pendientes" value="4" />
            <StatCard title="Completados" value="156" />
          </div>

          {/* Filters */}
          <div className="bg-[#1b273b] rounded-lg p-4 mb-6 border border-slate-700">
            <FilterBar />
          </div>

          {/* Table */}
          <div className="bg-[#1b273b] rounded-lg border border-slate-700">
            <DataTable />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📚 **Referencias**

**Páginas ejemplo bien diseñadas**:
- `/admin/ubicaciones` ⭐⭐⭐⭐⭐ (referencia principal)
- `/crear-despacho` ⭐⭐⭐⭐⭐
- `/dashboard` ⭐⭐⭐⭐

**Evitar estilos de**:
- `GestionEmpresasReal.tsx` ❌ (colores saturados, no Nodexia)

---

## 🔄 **Versionado**

**v1.0** - 20 Octubre 2025
- Versión inicial del Design System
- Paleta de colores definida
- Componentes base documentados
- Patrones de layout establecidos
- Guías de uso

**Próximas mejoras**:
- Componentes React reutilizables en `components/ui/`
- Storybook para visualizar componentes
- Variantes dark/light (futuro)
- Animaciones avanzadas

---

**Mantenido por**: Equipo Nodexia  
**Última actualización**: 20 Octubre 2025  
**Contacto**: Ver documentación de proyecto
