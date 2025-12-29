# 🗂️ GUÍA DE ÁREAS TÉCNICAS - NODEXIA

**Para:** Desarrolladores no-técnicos construyendo con Copilot  
**Objetivo:** Entender qué área tocar según lo que necesites hacer  
**Fecha:** 17 de Diciembre, 2025

---

## 📖 ÍNDICE

1. [🗄️ BASE DE DATOS (Supabase)](#-base-de-datos-supabase)
2. [🎨 FRONTEND (React/Next.js)](#-frontend-reactnextjs)
3. [⚙️ BACKEND (API Routes)](#️-backend-api-routes)
4. [🔗 Cómo se conectan las áreas](#-cómo-se-conectan-las-áreas)
5. [📋 Ejemplos prácticos](#-ejemplos-prácticos)

---

## 🗄️ BASE DE DATOS (Supabase)

### ¿Qué es?
La base de datos es donde se **guardan todos los datos** de tu aplicación: usuarios, operaciones, empresas, notificaciones, etc.

### ¿Cuándo trabajas aquí?

| Situación | Ejemplo |
|-----------|---------|
| Necesitas guardar nuevo tipo de información | "Quiero guardar historial de notificaciones" |
| Necesitas agregar campo a datos existentes | "Cada operación debe tener un campo 'prioridad'" |
| Necesitas mejorar velocidad de consultas | "El dashboard de Admin carga muy lento" |
| Necesitas cambiar permisos de acceso | "Los transportes no deberían ver datos de otras empresas" |

### Archivos principales

```
sql/
├── schema/
│   ├── 01_initial_schema.sql        # Estructura base de tablas
│   ├── 02_usuarios.sql              # Tablas de usuarios y roles
│   ├── 03_operaciones.sql           # Operaciones de transporte
│   └── 04_red_nodexia.sql           # Red de ofertas/demandas
│
├── migrations/
│   └── [timestamp]_descripcion.sql  # Cambios incrementales a la BD
│
├── policies/
│   ├── usuarios_policies.sql        # Quién puede ver/editar usuarios
│   ├── operaciones_policies.sql     # Permisos de operaciones
│   └── empresas_policies.sql        # Permisos de empresas
│
└── functions/
    └── helpers.sql                   # Funciones SQL reutilizables
```

### Conceptos clave

#### 1. **Tablas**
Son como hojas de Excel. Cada tabla guarda un tipo de información.

**Ejemplo:**
```sql
-- Tabla de operaciones
CREATE TABLE operaciones (
  id UUID PRIMARY KEY,
  numero_operacion TEXT NOT NULL,
  empresa_id UUID REFERENCES empresas(id),
  estado TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**En palabras simples:**
- Cada operación tiene un ID único
- Tiene un número de operación
- Pertenece a una empresa
- Tiene un estado (pendiente, en tránsito, etc.)
- Guarda cuándo se creó

#### 2. **Políticas RLS (Row Level Security)**
Son reglas que dicen "quién puede ver qué".

**Ejemplo:**
```sql
-- Los usuarios solo ven operaciones de su empresa
CREATE POLICY "usuarios_ven_su_empresa"
ON operaciones
FOR SELECT
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios_empresa 
    WHERE user_id = auth.uid()
  )
);
```

**En palabras simples:**
- Solo ves operaciones de tu propia empresa
- No puedes ver datos de la competencia

#### 3. **Migraciones**
Son cambios controlados a la estructura de la base de datos.

**Ejemplo:**
```sql
-- Agregar columna nueva
ALTER TABLE operaciones 
ADD COLUMN prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta'));

-- Valor por defecto para registros existentes
UPDATE operaciones SET prioridad = 'media' WHERE prioridad IS NULL;
```

### ⚠️ RIESGOS y PRECAUCIONES

| Riesgo | Prevención |
|--------|------------|
| 🔴 Borrar datos por error | Siempre usa `WHERE` en `DELETE`, prueba en dev primero |
| 🔴 Romper queries existentes | No borres columnas sin verificar que no se usan |
| 🟡 Hacer BD lenta | Agrega índices en columnas que usas en `WHERE` |
| 🟡 Políticas RLS complejas | Documenta bien la lógica, testea con diferentes roles |

### 🛠️ Comandos útiles

```bash
# Ver todas las tablas
# Desde Supabase Dashboard > SQL Editor:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

# Ver estructura de una tabla
\d operaciones

# Ver políticas RLS de una tabla
SELECT * FROM pg_policies WHERE tablename = 'operaciones';
```

### 📚 Documentación útil
- [Supabase SQL Reference](https://supabase.com/docs/guides/database)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- Tu doc interna: `docs/ARQUITECTURA-OPERATIVA.md`

---

## 🎨 FRONTEND (React/Next.js)

### ¿Qué es?
El frontend es **todo lo que ve el usuario**: botones, formularios, dashboards, menús, colores, animaciones.

### ¿Cuándo trabajas aquí?

| Situación | Ejemplo |
|-----------|---------|
| Algo se ve mal o confuso | "El botón de cancelar está muy escondido" |
| Necesitas crear nueva pantalla | "Quiero agregar página de reportes" |
| Quieres mejorar la experiencia | "Agregar loading spinner al guardar" |
| Diseño responsive no funciona | "En móvil se ve cortado" |

### Archivos principales

```
components/
├── ui/                          # Componentes reutilizables base
│   ├── Button.tsx               # Botones estandarizados
│   ├── Input.tsx                # Campos de texto
│   ├── Modal.tsx                # Ventanas emergentes
│   ├── Card.tsx                 # Tarjetas de contenido
│   └── Spinner.tsx              # Loading indicators
│
├── Dashboard/                   # Dashboards por rol
│   ├── DashboardAdmin.tsx       # Vista administrador
│   ├── DashboardChofer.tsx      # Vista chofer
│   ├── RedNodexiaSection.tsx    # Sección Red Nodexia
│   └── StatsCard.tsx            # Tarjetas de estadísticas
│
├── forms/                       # Formularios
│   ├── NuevaOperacionForm.tsx   # Crear operación
│   ├── EditarUsuarioForm.tsx    # Editar usuario
│   └── FiltrosForm.tsx          # Filtros de búsqueda
│
├── Modals/                      # Modales específicos
│   ├── ConfirmarAccionModal.tsx
│   ├── DetalleOperacionModal.tsx
│   └── InvitarUsuarioModal.tsx
│
└── Maps/                        # Componentes de mapas
    ├── MapaTracking.tsx         # Mapa con tracking GPS
    └── MarkerOperacion.tsx      # Marcadores personalizados

pages/
├── index.tsx                    # Página de inicio (/)
├── login.tsx                    # Página de login
├── dashboard-admin.tsx          # Dashboard admin
├── dashboard-chofer.tsx         # Dashboard chofer
└── dashboard-transporte.tsx     # Dashboard transporte
```

### Conceptos clave

#### 1. **Componentes**
Son piezas reutilizables de interfaz.

**Ejemplo simple:**
```tsx
// components/ui/Button.tsx
export function Button({ children, onClick, variant = 'primary' }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-blue-600' : 'bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

// Uso:
<Button onClick={handleSave}>Guardar</Button>
<Button onClick={handleCancel} variant="secondary">Cancelar</Button>
```

#### 2. **Estado (State)**
Son datos que pueden cambiar y actualizar la interfaz.

**Ejemplo:**
```tsx
import { useState } from 'react';

function FormularioOperacion() {
  // Estado: guarda el valor del input
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await guardarOperacion({ numero: numeroOperacion });
    setLoading(false);
  };

  return (
    <div>
      <input
        value={numeroOperacion}
        onChange={(e) => setNumeroOperacion(e.target.value)}
      />
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  );
}
```

#### 3. **Estilos con Tailwind**
Clases CSS que aplican estilos directamente.

**Ejemplo:**
```tsx
<div className="
  bg-white          /* fondo blanco */
  shadow-lg         /* sombra grande */
  rounded-lg        /* bordes redondeados */
  p-6               /* padding de 6 unidades */
  hover:shadow-xl   /* sombra más grande al pasar mouse */
  transition        /* animar cambios */
">
  Contenido de la tarjeta
</div>
```

**Referencia rápida Tailwind:**
- `p-4` = padding
- `m-4` = margin
- `bg-blue-500` = fondo azul
- `text-white` = texto blanco
- `flex` = layout flexible
- `grid` = layout grid
- `hidden` / `md:block` = responsive (oculto en móvil, visible en tablet+)

#### 4. **Páginas (Pages)**
En Next.js, los archivos en `pages/` se convierten automáticamente en rutas.

**Ejemplo:**
```
pages/dashboard-admin.tsx  →  /dashboard-admin
pages/operaciones/[id].tsx →  /operaciones/123
pages/api/operaciones.ts   →  /api/operaciones (backend)
```

### ⚠️ RIESGOS y PRECAUCIONES

| Riesgo | Prevención |
|--------|------------|
| 🟡 Componente muy lento | Usa `React.memo()` para componentes pesados |
| 🟡 Estado se pierde al navegar | Usa Context API o estado global (Zustand) |
| 🟢 Estilos inconsistentes | Usa componentes de `components/ui/` |
| 🟢 No responsive | Prueba en móvil con DevTools (F12 → Toggle Device) |

### 🛠️ Comandos útiles

```bash
# Levantar servidor de desarrollo
pnpm dev

# Ver en navegador
# http://localhost:3000

# Ver en móvil (misma red WiFi)
# http://[tu-ip-local]:3000
```

### 📚 Documentación útil
- [React Docs (español)](https://es.react.dev/)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- Tu doc interna: `docs/DESIGN-SYSTEM.md`

---

## ⚙️ BACKEND (API Routes)

### ¿Qué es?
El backend es **la lógica que se ejecuta en el servidor**: validar datos, procesar pagos, enviar emails, comunicarse con la base de datos.

### ¿Cuándo trabajas aquí?

| Situación | Ejemplo |
|-----------|---------|
| Necesitas procesar datos antes de guardar | "Validar que el email sea único" |
| Necesitas comunicarte con servicios externos | "Enviar email de confirmación" |
| Necesitas lógica compleja de negocio | "Calcular precio según distancia + peso" |
| Necesitas proteger acciones sensibles | "Solo admins pueden borrar usuarios" |

### Archivos principales

```
pages/api/
├── admin/
│   ├── nueva-invitacion.ts      # Invitar usuarios (POST)
│   ├── usuarios.ts               # Gestionar usuarios (GET, PUT, DELETE)
│   └── estadisticas.ts           # Stats del sistema (GET)
│
├── auth/
│   ├── login.ts                  # Iniciar sesión
│   ├── logout.ts                 # Cerrar sesión
│   └── verify.ts                 # Verificar token
│
├── operaciones/
│   ├── index.ts                  # Listar/crear operaciones
│   ├── [id].ts                   # Ver/editar operación específica
│   ├── cambiar-estado.ts         # Cambiar estado de operación
│   └── asignar-chofer.ts         # Asignar chofer a operación
│
├── transporte/
│   ├── operaciones.ts            # Operaciones disponibles
│   ├── aceptar.ts                # Aceptar operación
│   └── tracking.ts               # Enviar posición GPS
│
└── red-nodexia/
    ├── publicar-oferta.ts        # Publicar oferta
    ├── buscar-transportes.ts     # Buscar transportes cercanos
    └── notificar.ts              # Notificar nuevas ofertas

lib/
├── supabase.ts                   # Cliente Supabase
├── auth.ts                       # Helpers autenticación
├── validations/
│   ├── operacion.ts              # Validar datos de operación
│   └── usuario.ts                # Validar datos de usuario
└── utils/
    ├── email.ts                  # Enviar emails
    ├── distance.ts               # Calcular distancias
    └── errors.ts                 # Manejo de errores
```

### Conceptos clave

#### 1. **API Routes**
Son endpoints que reciben requests HTTP y devuelven respuestas.

**Ejemplo básico:**
```typescript
// pages/api/operaciones/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: Obtener lista de operaciones
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('operaciones')
      .select('*');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ operaciones: data });
  }
  
  // POST: Crear nueva operación
  if (req.method === 'POST') {
    const { numero_operacion, empresa_id } = req.body;
    
    // Validar datos
    if (!numero_operacion || !empresa_id) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }
    
    const { data, error } = await supabaseAdmin
      .from('operaciones')
      .insert({ numero_operacion, empresa_id })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(201).json({ operacion: data });
  }
  
  // Método no permitido
  return res.status(405).json({ error: 'Method not allowed' });
}
```

#### 2. **Validaciones**
Verificar que los datos recibidos sean correctos.

**Ejemplo:**
```typescript
// lib/validations/operacion.ts
export function validarOperacion(data: any) {
  const errores: string[] = [];
  
  if (!data.numero_operacion) {
    errores.push('Número de operación es requerido');
  }
  
  if (data.numero_operacion && data.numero_operacion.length < 3) {
    errores.push('Número de operación muy corto');
  }
  
  if (!data.empresa_id) {
    errores.push('Empresa es requerida');
  }
  
  if (!['pendiente', 'en_transito', 'completada'].includes(data.estado)) {
    errores.push('Estado inválido');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// Uso en API:
const validacion = validarOperacion(req.body);
if (!validacion.valido) {
  return res.status(400).json({ 
    error: 'Datos inválidos',
    detalles: validacion.errores 
  });
}
```

#### 3. **Autenticación y Autorización**
Verificar quién es el usuario y qué puede hacer.

**Ejemplo:**
```typescript
// lib/auth.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No autenticado');
  }
  
  return { user: session.user, supabase };
}

export async function requireRole(
  req: NextApiRequest, 
  res: NextApiResponse, 
  rolesPermitidos: string[]
) {
  const { user, supabase } = await requireAuth(req, res);
  
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();
  
  if (!rolesPermitidos.includes(usuario?.rol)) {
    throw new Error('No autorizado');
  }
  
  return { user, usuario, supabase };
}

// Uso en API:
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Solo admins pueden acceder
    const { user } = await requireRole(req, res, ['superadmin', 'admin']);
    
    // ... resto de la lógica
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
}
```

#### 4. **Manejo de errores**
Capturar y responder errores de forma consistente.

**Ejemplo:**
```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
  }
}

export function handleApiError(error: any, res: NextApiResponse) {
  console.error('API Error:', error);
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code
    });
  }
  
  // Error no esperado
  return res.status(500).json({
    error: 'Error interno del servidor'
  });
}

// Uso en API:
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!req.body.email) {
      throw new AppError('Email es requerido', 400, 'MISSING_EMAIL');
    }
    
    // ... lógica
  } catch (error) {
    return handleApiError(error, res);
  }
}
```

### ⚠️ RIESGOS y PRECAUCIONES

| Riesgo | Prevención |
|--------|------------|
| 🔴 Exponer datos sensibles | Nunca devuelvas contraseñas, tokens, etc. |
| 🔴 SQL Injection | Usa Supabase queries, nunca SQL raw con datos de usuario |
| 🟡 API lenta | Usa índices en BD, cachea resultados pesados |
| 🟡 Errores sin manejar | Usa try/catch, devuelve errores claros |

### 🛠️ Comandos útiles

```bash
# Probar API con curl
curl http://localhost:3000/api/operaciones

# Probar POST
curl -X POST http://localhost:3000/api/operaciones \
  -H "Content-Type: application/json" \
  -d '{"numero_operacion":"OP-001","empresa_id":"123"}'

# Ver logs del servidor
# En la terminal donde corre `pnpm dev`
```

### 📚 Documentación útil
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- Tu doc interna: `docs/ARQUITECTURA-OPERATIVA.md`

---

## 🔗 CÓMO SE CONECTAN LAS ÁREAS

### Flujo completo: Crear una operación

```
1. FRONTEND
   Usuario llena formulario en dashboard
   ↓
   components/forms/NuevaOperacionForm.tsx
   ↓
   Al hacer submit, llama a API
   
2. BACKEND
   ↓
   pages/api/operaciones/index.ts
   ↓
   Valida datos (lib/validations/operacion.ts)
   ↓
   Verifica autenticación y permisos
   ↓
   Si todo OK, guarda en BD
   
3. BASE DE DATOS
   ↓
   INSERT en tabla 'operaciones'
   ↓
   Políticas RLS verifican permisos
   ↓
   Si pasa RLS, se guarda
   ↓
   Retorna operación creada
   
4. BACKEND (respuesta)
   ↓
   Envía JSON con operación al frontend
   
5. FRONTEND (actualización)
   ↓
   Recibe respuesta
   ↓
   Actualiza lista de operaciones en UI
   ↓
   Muestra mensaje de éxito al usuario
```

### Diagrama visual

```
┌─────────────────────┐
│   🎨 FRONTEND       │
│  (Lo que ve el      │
│   usuario)          │
│                     │
│  - Formularios      │
│  - Botones          │
│  - Tablas           │
│  - Mapas            │
└──────────┬──────────┘
           │
           │ HTTP Request
           │ (fetch/axios)
           ↓
┌─────────────────────┐
│   ⚙️ BACKEND        │
│  (Lógica del        │
│   servidor)         │
│                     │
│  - Validaciones     │
│  - Autenticación    │
│  - Procesamiento    │
│  - APIs             │
└──────────┬──────────┘
           │
           │ SQL Queries
           │ (Supabase Client)
           ↓
┌─────────────────────┐
│   🗄️ BASE DE DATOS  │
│  (Donde se guardan  │
│   los datos)        │
│                     │
│  - Tablas           │
│  - Políticas RLS    │
│  - Funciones SQL    │
│  - Triggers         │
└─────────────────────┘
```

---

## 📋 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Agregar campo "Prioridad" a operaciones

**Paso 1: BASE DE DATOS**
```sql
-- sql/migrations/add_prioridad_operaciones.sql
ALTER TABLE operaciones 
ADD COLUMN prioridad TEXT 
CHECK (prioridad IN ('baja', 'media', 'alta'))
DEFAULT 'media';

-- Actualizar operaciones existentes
UPDATE operaciones 
SET prioridad = 'media' 
WHERE prioridad IS NULL;
```

**Paso 2: BACKEND (actualizar tipos)**
```typescript
// types/operacion.ts
export interface Operacion {
  id: string;
  numero_operacion: string;
  empresa_id: string;
  estado: EstadoOperacion;
  prioridad: 'baja' | 'media' | 'alta'; // ← NUEVO
  created_at: string;
}

// lib/validations/operacion.ts
export function validarPrioridad(prioridad: string) {
  if (!['baja', 'media', 'alta'].includes(prioridad)) {
    throw new Error('Prioridad inválida');
  }
}
```

**Paso 3: BACKEND (actualizar API)**
```typescript
// pages/api/operaciones/index.ts
if (req.method === 'POST') {
  const { numero_operacion, empresa_id, prioridad = 'media' } = req.body;
  
  validarPrioridad(prioridad); // Validar
  
  const { data, error } = await supabaseAdmin
    .from('operaciones')
    .insert({
      numero_operacion,
      empresa_id,
      prioridad // ← NUEVO
    })
    .select()
    .single();
  
  // ...
}
```

**Paso 4: FRONTEND (actualizar UI)**
```tsx
// components/forms/NuevaOperacionForm.tsx
export function NuevaOperacionForm() {
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta'>('media');
  
  return (
    <form>
      {/* ... otros campos ... */}
      
      <label>Prioridad</label>
      <select 
        value={prioridad} 
        onChange={(e) => setPrioridad(e.target.value as any)}
      >
        <option value="baja">🟢 Baja</option>
        <option value="media">🟡 Media</option>
        <option value="alta">🔴 Alta</option>
      </select>
      
      {/* ... resto del formulario ... */}
    </form>
  );
}
```

**Paso 5: FRONTEND (mostrar en tabla)**
```tsx
// components/Dashboard/TablaOperaciones.tsx
<table>
  <thead>
    <tr>
      <th>Número</th>
      <th>Estado</th>
      <th>Prioridad</th> {/* ← NUEVO */}
    </tr>
  </thead>
  <tbody>
    {operaciones.map(op => (
      <tr key={op.id}>
        <td>{op.numero_operacion}</td>
        <td>{op.estado}</td>
        <td>
          <span className={`badge ${
            op.prioridad === 'alta' ? 'badge-red' :
            op.prioridad === 'media' ? 'badge-yellow' :
            'badge-green'
          }`}>
            {op.prioridad}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### Ejemplo 2: Agregar notificaciones push

**Paso 1: BASE DE DATOS**
```sql
-- sql/schema/notificaciones.sql
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('info', 'warning', 'error', 'success')),
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para consultas rápidas
CREATE INDEX idx_notificaciones_user 
ON notificaciones(user_id, created_at DESC);

-- Política RLS: usuarios ven solo sus notificaciones
CREATE POLICY "usuarios_ven_sus_notificaciones"
ON notificaciones FOR SELECT
USING (user_id = auth.uid());
```

**Paso 2: BACKEND (crear utilidad)**
```typescript
// lib/utils/notificaciones.ts
import { supabaseAdmin } from '@/lib/supabase';

export async function crearNotificacion({
  userId,
  titulo,
  mensaje,
  tipo = 'info'
}: {
  userId: string;
  titulo: string;
  mensaje: string;
  tipo?: 'info' | 'warning' | 'error' | 'success';
}) {
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .insert({
      user_id: userId,
      titulo,
      mensaje,
      tipo
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creando notificación:', error);
    return null;
  }
  
  return data;
}
```

**Paso 3: BACKEND (usar en API)**
```typescript
// pages/api/operaciones/asignar-chofer.ts
import { crearNotificacion } from '@/lib/utils/notificaciones';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... lógica de asignación ...
  
  // Notificar al chofer
  await crearNotificacion({
    userId: choferId,
    titulo: 'Nueva operación asignada',
    mensaje: `Se te asignó la operación ${operacion.numero_operacion}`,
    tipo: 'info'
  });
  
  return res.status(200).json({ success: true });
}
```

**Paso 4: FRONTEND (crear componente)**
```tsx
// components/ui/NotificacionesBadge.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function NotificacionesBadge() {
  const [noLeidas, setNoLeidas] = useState(0);
  
  useEffect(() => {
    cargarNoLeidas();
    
    // Suscribirse a nuevas notificaciones
    const subscription = supabase
      .channel('notificaciones')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones'
      }, () => {
        cargarNoLeidas();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  async function cargarNoLeidas() {
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);
    
    setNoLeidas(count || 0);
  }
  
  return (
    <button className="relative">
      🔔
      {noLeidas > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {noLeidas}
        </span>
      )}
    </button>
  );
}
```

---

## 🎓 RESUMEN EJECUTIVO

### ¿Qué área tocar según tu objetivo?

| Quiero... | Área | Archivos típicos |
|-----------|------|------------------|
| Cambiar colores/diseño | 🎨 Frontend | `components/`, `styles/` |
| Agregar nueva pantalla | 🎨 Frontend | `pages/`, `components/` |
| Guardar nuevo tipo de dato | 🗄️ BD | `sql/schema/`, `sql/migrations/` |
| Cambiar permisos de acceso | 🗄️ BD | `sql/policies/` |
| Crear nuevo endpoint | ⚙️ Backend | `pages/api/` |
| Validar datos de formulario | ⚙️ Backend | `lib/validations/` |
| Integrar servicio externo | ⚙️ Backend | `lib/utils/`, `pages/api/` |
| Optimizar performance | 🗄️ BD + ⚙️ Backend | `sql/`, `pages/api/` |

### Flujo de trabajo recomendado

1. **Planea en papel** (5-10 min)
   - ¿Qué quieres lograr?
   - ¿Qué área(s) necesitas tocar?
   - ¿En qué orden?

2. **Empieza por la BD si es necesario** (20-30 min)
   - Agrega tablas/columnas
   - Crea políticas RLS
   - Testea queries

3. **Luego Backend** (30-60 min)
   - Crea/actualiza APIs
   - Agrega validaciones
   - Testea con curl/Postman

4. **Finalmente Frontend** (30-60 min)
   - Actualiza componentes
   - Conecta con APIs
   - Testea en navegador

5. **Documenta y commitea** (10 min)
   - Qué hiciste
   - Por qué
   - Próximos pasos

---

## 📚 RECURSOS ADICIONALES

### Tutoriales recomendados
- [Next.js Tutorial oficial](https://nextjs.org/learn)
- [Supabase Quick Start](https://supabase.com/docs/guides/getting-started)
- [React Beta Docs](https://react.dev/learn)

### Herramientas útiles
- **Supabase Dashboard**: Ver/editar datos, ejecutar SQL
- **VS Code Extensions**: ES7 React snippets, Tailwind IntelliSense
- **DevTools (F12)**: Inspeccionar elementos, ver Network requests

### Tus docs internas
- `ARQUITECTURA-OPERATIVA.md` - Estructura completa del sistema
- `DESIGN-SYSTEM.md` - Guía de componentes UI
- `PROBLEMAS-CONOCIDOS.md` - Bugs y soluciones
- `QUICK-START-PROXIMA-SESION.md` - Cómo empezar cada sesión

---

**Última actualización:** 17-Dic-2025  
**Próxima revisión:** Cuando agregues nuevas features significativas

---

¿Tienes dudas sobre qué área tocar para tu próxima tarea? Consulta este documento! 🚀
