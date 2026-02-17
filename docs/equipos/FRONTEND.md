# GUÍA DEL EQUIPO FRONTEND

**Proyecto:** Nodexia-Web  
**Stack:** Next.js 16 (Pages Router) + React 19 + TypeScript + Tailwind CSS v4  
**Última actualización:** 16-Feb-2026

---

## 1. ARQUITECTURA FRONTEND

### Stack tecnológico
- **Framework:** Next.js 16 con Pages Router (`pages/`)
- **UI:** React 19 + TypeScript
- **Estilos:** Tailwind CSS v4 (via PostCSS)
- **Iconos:** Heroicons (`@heroicons/react`) + Lucide React (`lucide-react`)
- **Componentes accesibles:** Headless UI (`@headlessui/react`)
- **Mapas:** React Google Maps API + Leaflet (react-leaflet)
- **Compatibilidad Shadcn:** `components/ui/shadcn-compat.tsx`

### Estructura de carpetas

```
pages/                          ← Páginas (cada archivo = 1 ruta)
├── _app.tsx                    ← Layout global + ErrorBoundary + UserRoleProvider
├── _document.tsx               ← HTML base
├── index.tsx                   ← Landing / redirect
├── login.tsx                   ← Autenticación
├── signup.tsx                  ← Registro
├── dashboard.tsx               ← Dashboard principal
├── crear-despacho.tsx          ← Gestión de despachos (⚠️ 2,400 líneas — refactorizar)
├── chofer-mobile.tsx           ← Vista móvil del chofer (⚠️ 1,800 líneas)
├── control-acceso.tsx          ← Control de acceso en planta (⚠️ 1,125 líneas)
├── supervisor-carga.tsx        ← Supervisión de carga (⚠️ 1,037 líneas)
├── planificacion.tsx           ← Planificación semanal/mensual
├── admin/                      ← Panel de administración
├── transporte/                 ← Vistas de empresa de transporte
├── chofer/                     ← Vistas del chofer (web)
├── configuracion/              ← Configuración de plantas, clientes
├── despachos/                  ← Detalle de despachos
├── red-nodexia/                ← Marketplace de cargas
├── reportes/                   ← Reportes y auditoría
└── api/                        ← ⛔ NO TOCAR — es del equipo Backend

components/                     ← Componentes reutilizables
├── Admin/          (8 files)   ← Panel admin (wizards, dashboard, gestión)
├── ControlAcceso/  (1 file)    ← Componentes de control de acceso
├── Dashboard/      (2 files)   ← Widgets del dashboard
├── Despachos/      (1 file)    ← Timeline de despachos
├── Documentacion/  (6 files)   ← Upload, lista, cards de documentos
├── forms/          (1 file)    ← Formularios genéricos
├── layout/         (6 files)   ← Sidebar, AdminLayout, headers
├── Maps/           (3 files)   ← Componentes de mapas
├── Modals/         (6 files)   ← Modales reutilizables
├── Network/        (2 files)   ← Red Nodexia
├── Planning/      (10 files)   ← Planificación, tracking, calendarios
├── SuperAdmin/     (1 file)    ← Panel super admin
├── Transporte/    (19 files)   ← Flota, unidades, asignación, docs
├── ui/            (10 files)   ← Primitivos: Button, SearchInput, Spinner, etc.
├── ErrorBoundary.tsx           ← Error boundary global
└── DocumentacionDetalle.tsx    ← Detalle de documentación

styles/
└── globals.css                 ← Estilos globales + Tailwind
```

---

## 2. PATRONES Y CONVENCIONES

### Estructura de una página típica

```tsx
// pages/mi-pagina.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';     // ← Cliente Supabase compartido
import { fetchWithAuth } from '../lib/api/fetchWithAuth'; // ← Para llamar APIs protegidas
import Sidebar from '../components/layout/Sidebar';

export default function MiPagina() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Opción A: Query directa (solo lecturas simples)
      const { data, error } = await supabase.from('tabla').select('col1, col2');
      // Opción B: Via API route (para operaciones protegidas)
      const res = await fetchWithAuth('/api/mi-endpoint');
      setData(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-6">
        {loading && <p>Cargando...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {/* UI aquí */}
      </main>
    </div>
  );
}
```

### Reglas críticas

| Regla | Detalle |
|-------|---------|
| **NUNCA crear un nuevo `createClient()`** | Siempre importar de `lib/supabaseClient.ts` |
| **Escrituras → API routes** | Los INSERT/UPDATE/DELETE deben ir por `/api/` routes, no directo |
| **Lecturas → pueden ser directas** | `supabase.from('tabla').select()` está OK para lecturas |
| **Dark theme** | Toda la app usa fondo `bg-gray-900`, textos `text-white/gray-300` |
| **Responsive** | Mobile-first para `chofer-mobile.tsx`, desktop-first para el resto |

### Hooks disponibles (`lib/hooks/`)

| Hook | Uso |
|------|-----|
| `useSearch` | Búsqueda y filtrado genérico |
| `useForm` | Manejo de formularios |
| `useDispatches` | Fetch de despachos |
| `useChoferes` | Fetch de choferes |
| `useTransports` | Fetch de transportes |
| `useGPSTracking` | Tracking GPS en tiempo real |
| `useDocAlerts` | Alertas de documentación vencida |
| `useNetwork` | Estado de conexión (online/offline) |
| `usePWA` | Service Worker / PWA |
| `usePageVisibility` | Detectar si la pestaña está activa |
| `useAutoReload` | Auto-refresh periódico |
| `useIncidencias` | CRUD de incidencias |
| `useRedNodexia` | Marketplace Red Nodexia |
| `useUbicacionActual` | Geolocalización del browser |
| `useSuperAdminAccess` | Verificar acceso super admin |
| `useUsuariosEmpresa` | Usuarios de una empresa |

### Contexto global

```tsx
// Disponible en toda la app (excepto páginas públicas)
import { useUserRole } from '../lib/contexts/UserRoleContext';

const { user, rolInterno, empresaId, tipoEmpresa } = useUserRole();
```

---

## 3. SISTEMA DE ESTADOS

El sistema de estados está centralizado en `lib/estados/config.ts` — **FUENTE ÚNICA DE VERDAD**.

```tsx
import { ESTADO_DISPLAY, getEstadoDisplay } from '../lib/estados/config';

// Obtener label y color para un estado
const { label, color, bgColor, icon } = getEstadoDisplay('en_transito_origen');
```

**17 estados + cancelado** organizados en 7 fases:
- Fase 0: Creación (pendiente)
- Fase 1: Asignación (transporte_asignado, camion_asignado, confirmado_chofer)
- Fase 2: Tránsito Origen (en_transito_origen)
- Fase 3: Planta Origen (ingresado_origen → egreso_origen)
- Fase 4: Tránsito Destino (en_transito_destino)
- Fase 5: Planta Destino (ingresado_destino → egreso_destino)
- Fase 6: Cierre (completado)

---

## 4. DESIGN SYSTEM

### Componentes UI disponibles (`components/ui/`)

| Componente | Archivo |
|-----------|---------|
| `Button` | `Button.tsx` |
| `SearchInput` | `SearchInput.tsx` |
| `LoadingSpinner` | `LoadingSpinner.tsx` |
| `Card`, `CardHeader`, `CardContent`, `Badge` | `shadcn-compat.tsx` |
| `StatusBadge` | `StatusBadge.tsx` |
| `DocStatusBadge` | `DocStatusBadge.tsx` |
| `ConfirmModal` | `ConfirmModal.tsx` |
| `ProtectedRoute` | `ProtectedRoute.tsx` |

### Paleta de colores (Tailwind)

```
Fondo principal:    bg-gray-900
Fondo tarjetas:     bg-gray-800
Fondo hover:        bg-gray-700
Bordes:             border-gray-700
Texto principal:    text-white
Texto secundario:   text-gray-400
Acento primario:    blue-600
Éxito:              green-500
Warning:            yellow-500
Error:              red-500
```

---

## 5. DEUDA TÉCNICA CONOCIDA

| Problema | Prioridad | Acción |
|----------|-----------|--------|
| 4 páginas > 1,000 líneas | ALTA | Extraer componentes |
| `strict: false` en TypeScript | ALTA | Habilitar gradualmente |
| `any` en 100+ lugares | MEDIA | Tipar progresivamente |
| `components/ui/index.ts` solo exporta 2 componentes | BAJA | Completar barrel exports |
| 2 librerías de iconos (Heroicons + Lucide) | BAJA | Estandarizar en una |
| Leaflet carga estáticamente (~350KB) | MEDIA | Dynamic import |

---

## 6. TESTING

- **Unit tests:** Jest + React Testing Library (configurado, cobertura <3%)
- **E2E tests:** Playwright (4 specs: auth, dashboard, accessibility, GPS)
- **Ejecutar:** `pnpm test` (unit) / `pnpm test:e2e` (Playwright)

---

## 7. DESARROLLO LOCAL

```bash
pnpm install         # Instalar dependencias
pnpm dev             # Servidor de desarrollo (http://localhost:3000)
pnpm build           # Build de producción
pnpm lint            # Linting
```

Variables de entorno necesarias en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
