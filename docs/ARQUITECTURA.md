# Arquitectura del Proyecto — Nodexia Web

> Última actualización: Feb 2026

## Estructura de carpetas

```
lib/
  estados/            ← FUENTE DE VERDAD: estados, transiciones, reglas
    config.ts         ← EstadoViaje enum, TRANSICIONES_VALIDAS, tabs, UI
    index.ts          ← Barrel export
  services/           ← Lógica de negocio (backend)
    viajeEstado.ts    ← Cambio de estado + sync despacho 1:1
    notificaciones.ts ← Notificaciones a chofer/usuario
    estadosService.ts ← Bridge de compatibilidad
    geocoding.ts      ← Geocodificación (Nominatim)
  hooks/              ← Hooks React (frontend)
  api/                ← Wrappers cliente para APIs
  types.ts            ← Tipos de entidades (Empresa, Viaje, Chofer, etc.)
  helpers/            ← Bridges de compatibilidad
  validators/         ← Validación de roles, datos

types/
  common.ts           ← BaseEntity, ApiResponse, User, ComponentProps
  network.ts          ← Red de empresas, relaciones
  superadmin.ts       ← Suscripciones, pagos, admin
  red-nodexia.ts      ← Marketplace de viajes (Red Nodexia)
  ubicaciones.ts      ← Plantas, depósitos, clientes

pages/
  api/                ← Rutas API (thin — delegan a services)
  *.tsx               ← Páginas (presentación)

components/           ← Componentes UI puros

docs/
  API-CONTRACT-MOBILE.md ← Contrato API para devs mobile
```

## Reglas de arquitectura

### 1. Estados → `lib/estados/config.ts`
- NUNCA hardcodear estados como strings fuera de este archivo
- Usar `EstadoViaje.PENDIENTE` en vez de `'pendiente'`
- Validar transiciones con `validarTransicion(actual, nuevo)`

### 2. Lógica de negocio → `lib/services/`
- Los API routes (`pages/api/`) son **thin**: reciben request → llaman servicio → devuelven respuesta
- Los servicios reciben `SupabaseClient` como parámetro (testeable)
- Los servicios NO manejan HTTP (no `res.status()`)

### 3. Tipos → un solo lugar por dominio
- Entidades core: `lib/types.ts`
- Estados: `lib/estados/config.ts`
- Ubicaciones: `types/ubicaciones.ts`
- Red Nodexia: `types/red-nodexia.ts`
- NO crear interfaces duplicadas

### 4. Despacho:Viaje → 1:1
- Un despacho tiene exactamente UN viaje
- El despacho NO tiene estado propio — se sincroniza automáticamente
- Multi-destino → tabla `paradas` (máx 4 paradas por viaje)

### 5. Tabs → calculados, no almacenados
- Pendiente, Asignado, En Proceso, Completado, Demorado, Expirado
- Se derivan del estado del viaje + tolerancia horaria
- Función: `calcularTab()` en `lib/estados/config.ts`

## Servicios disponibles

| Servicio | Archivo | Función |
|----------|---------|---------|
| ViajeEstado | `lib/services/viajeEstado.ts` | `cambiarEstadoViaje()`, `asignarUnidad()`, `verificarChoferViaje()` |
| Notificaciones | `lib/services/notificaciones.ts` | `notificarCambioEstado()`, `notificarUsuario()` |
| Estados | `lib/estados/config.ts` | `validarTransicion()`, `getProximosEstados()`, `calcularTab()`, `esEstadoFinal()` |

## Para devs mobile

Ver [docs/API-CONTRACT-MOBILE.md](API-CONTRACT-MOBILE.md) para el contrato completo de API.
