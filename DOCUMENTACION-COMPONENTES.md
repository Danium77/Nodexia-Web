# 📚 Documentación de Componentes - Nodexia Web

## 🎯 Arquitectura de Componentes

### 📁 Estructura de Carpetas

```
components/
├── Admin/                 # Componentes de administración
├── context/              # Proveedores de contexto React
├── Dashboard/            # Componentes del dashboard
├── forms/               # Formularios reutilizables
├── layout/              # Layouts y navegación
├── Modals/              # Ventanas modales
├── Network/             # Gestión de red y empresas
├── Planning/            # Planificación y logística
├── SuperAdmin/          # Panel de super administrador
├── Testing/             # Componentes de testing/debug
└── ui/                  # Componentes UI básicos
```

## 🧩 Componentes Principales

### 🔐 Sistema de Autenticación

#### `UserContext` (`components/context/UserContext.tsx`)
**Propósito**: Maneja el estado global del usuario autenticado

**Props**: 
- `children: React.ReactNode` - Componentes hijos

**Estado**:
```typescript
interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

**Uso**:
```jsx
import { useUser } from '@/components/context/UserContext';

function MyComponent() {
  const { user, profile, loading } = useUser();
  
  if (loading) return <div>Cargando...</div>;
  if (!user) return <div>No autenticado</div>;
  
  return <div>Hola {profile?.nombre}</div>;
}
```

### 🏢 Gestión de Empresas

#### `GestionEmpresasReal` (`components/Admin/GestionEmpresasReal.tsx`)
**Propósito**: CRUD completo para gestión de empresas

**Funcionalidades**:
- ✅ Crear nuevas empresas
- ✅ Asignar usuarios a empresas
- ✅ Gestionar roles y permisos
- ✅ Activar/desactivar empresas

**Props**:
```typescript
interface Props {
  onEmpresaCreated?: (empresa: Empresa) => void;
  filterType?: 'transporte' | 'cliente' | 'coordinador';
}
```

### 📋 Formularios

#### `BaseForm` (`components/forms/BaseForm.tsx`)
**Propósito**: Componente base para formularios con validación

**Props**:
```typescript
interface BaseFormProps<T> {
  onSubmit: (data: T) => Promise<void>;
  validationSchema: ValidationSchema<T>;
  initialValues?: Partial<T>;
  children: React.ReactNode;
}
```

**Ejemplo de uso**:
```jsx
<BaseForm
  onSubmit={handleSubmit}
  validationSchema={userSchema}
  initialValues={{ nombre: '', email: '' }}
>
  <Input name="nombre" label="Nombre" />
  <Input name="email" label="Email" type="email" />
  <SubmitButton>Guardar</SubmitButton>
</BaseForm>
```

### 🖥️ Layouts

#### `AdminLayout` (`components/layout/AdminLayout.tsx`)
**Propósito**: Layout principal para páginas de administración

**Props**:
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  showSidebar?: boolean;
  requiresAuth?: boolean;
}
```

**Características**:
- ✅ Navegación lateral responsive
- ✅ Control de acceso por roles
- ✅ Breadcrumbs automáticos
- ✅ Indicador de estado de conexión

## 🎨 Componentes UI

### 📝 Formularios
- `Input` - Campo de texto con validación
- `Select` - Selector con opciones
- `Textarea` - Área de texto
- `FileUpload` - Subida de archivos
- `DatePicker` - Selector de fechas

### 🔘 Botones
- `Button` - Botón principal
- `SubmitButton` - Botón de envío de formulario
- `ActionButton` - Botón de acción específica
- `LoadingButton` - Botón con estado de carga

### 📊 Visualización de Datos
- `DataTable` - Tabla de datos con paginación
- `StatCard` - Tarjeta de estadística
- `ProgressBar` - Barra de progreso
- `StatusBadge` - Insignia de estado

## 🔧 Hooks Personalizados

### `useForm` (`lib/hooks/useForm.ts`)
**Propósito**: Manejo de estado y validación de formularios

```typescript
const { values, errors, handleChange, handleSubmit, isValid } = useForm({
  initialValues: { name: '', email: '' },
  validationSchema: schema,
  onSubmit: async (data) => {
    // Lógica de envío
  }
});
```

### `useDispatches` (`lib/hooks/useDispatches.tsx`)
**Propósito**: Gestión de despachos y logística

```typescript
const { 
  dispatches, 
  loading, 
  createDispatch, 
  updateDispatch, 
  deleteDispatch 
} = useDispatches();
```

## 🚀 Guías de Desarrollo

### ✨ Creando un Nuevo Componente

1. **Crear el archivo**: `components/[categoria]/MiComponente.tsx`
2. **Definir tipos**: Interfaces TypeScript para props
3. **Implementar**: Componente funcional con hooks
4. **Estilos**: Clases Tailwind CSS
5. **Exportar**: Agregar al index si es necesario
6. **Documentar**: Comentarios JSDoc
7. **Testing**: Archivo de pruebas correspondiente

### 📋 Template de Componente

```tsx
import React from 'react';
import type { FC } from 'react';

/**
 * Descripción del componente
 * 
 * @param props - Props del componente
 * @returns JSX Element
 */
interface MiComponenteProps {
  /** Descripción de la prop */
  titulo: string;
  /** Prop opcional */
  opcional?: boolean;
  /** Callback function */
  onAction: (data: string) => void;
}

const MiComponente: FC<MiComponenteProps> = ({ 
  titulo, 
  opcional = false, 
  onAction 
}) => {
  // Lógica del componente
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">{titulo}</h2>
      {opcional && <p>Contenido opcional</p>}
      <button 
        onClick={() => onAction('test')}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Acción
      </button>
    </div>
  );
};

export default MiComponente;
```

## 🧪 Testing

### 🔍 Pruebas de Componentes

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithUserContext } from '@/lib/test-utils';
import MiComponente from './MiComponente';

describe('MiComponente', () => {
  it('renders correctly', () => {
    render(
      <MiComponente 
        titulo="Test" 
        onAction={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', () => {
    const mockAction = jest.fn();
    
    render(
      <MiComponente 
        titulo="Test" 
        onAction={mockAction} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockAction).toHaveBeenCalledWith('test');
  });
});
```

## 📱 Responsive Design

### 🖥️ Breakpoints (Tailwind CSS)
- `sm`: 640px+
- `md`: 768px+
- `lg`: 1024px+
- `xl`: 1280px+
- `2xl`: 1536px+

### 📏 Guías de Responsive
```tsx
// Mobile-first approach
<div className="
  w-full           // Mobile: ancho completo
  md:w-1/2         // Tablet: mitad del ancho
  lg:w-1/3         // Desktop: tercio del ancho
  p-4              // Padding en todos los tamaños
  md:p-6           // Más padding en tablet+
">
  Contenido responsive
</div>
```

## 🎨 Tokens de Diseño

### 🎨 Colores Principales
```css
/* Colores del tema */
--primary: #1f2937;      /* Gray-800 */
--secondary: #fbbf24;    /* Yellow-400 */
--accent: #3b82f6;       /* Blue-500 */
--success: #10b981;      /* Green-500 */
--warning: #f59e0b;      /* Amber-500 */
--error: #ef4444;        /* Red-500 */
```

### 📝 Tipografía
```css
/* Jerarquía de texto */
h1: text-3xl font-bold   /* 30px, bold */
h2: text-2xl font-bold   /* 24px, bold */
h3: text-xl font-semibold /* 20px, semibold */
body: text-base          /* 16px, normal */
small: text-sm           /* 14px, normal */
```

---

## 🔄 Actualizaciones

**Última actualización**: Octubre 2025  
**Versión de documentación**: 1.0  
**Mantenedor**: Equipo Nodexia