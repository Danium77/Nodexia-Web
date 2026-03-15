# ESTADO DEL PROYECTO — NODEXIA-WEB

**Última actualización:** 16-Mar-2026

---

## PRODUCCIÓN

- **URL:** www.nodexiaweb.com
- **Deploy:** Vercel (proyecto `nodexia-web-j6wl`, región `gru1`)
- **Supabase PROD:** `lkdcofsfjnltuzzzwoir`
- **Último commit:** `691c418` (16-Mar-2026)
- **Estado general:** Funcional con bugs menores

### Qué funciona en PROD
- Login/signup con roles multi-empresa
- Crear despachos desde coordinador de planta
- Flujo completo: despacho → asignación → tracking → control acceso → entrega
- Red Nodexia: publicar viaje, aceptar oferta desde transporte
- Gestión de flota: camiones, acoplados, choferes
- Unidades operativas: crear, activar/desactivar (vista creada hoy)
- Control de acceso: QR, ingreso/egreso con verificación de documentación
- Documentación: upload, validación, alertas vencimiento
- Chofer mobile: vista viajes, GPS tracking, cambio de estados
- Incidencias: CRUD básico
- Coordinador integral PyME: hereda 4 roles

### Qué está roto o incompleto en PROD
- **FK `usuarios_empresa.rol_empresa_id` roto** — migración 070 destruyó FK (DROP CASCADE). Campo dead. No restaurar.
- **12 refs a `roles_empresa`** en código — join embebido falla en PROD. Limpiar.
- ~~**88 usos de `.single()`** — migrados a `.maybeSingle()` (commit `f57583f`)~~ ✅
- **Migración 063 no ejecutada** — RLS `documentos_viaje_planta`
- **`ofertas_red_nodexia`** sin UPDATE policy RLS (bypaseado por API service role)
- **7 pages con `supabase.from()` directo** — viola separación de capas

### Migraciones PROD
- 074 migraciones tracked vía tabla `schema_migrations`
- Vista `vista_disponibilidad_unidades` creada manualmente hoy (no tracking)
- Migración 063 pendiente de ejecución

---

## DESARROLLO

- **Supabase DEV:** `yllnzkjpvaukeeqzuxit`
- **Schema divergencia:** Mínima (4 tablas backup + 1 policy cosmética)

---

## MÉTRICAS DEL CODEBASE

| Métrica | Valor | Meta |
|---------|-------|------|
| Archivos TS/TSX | 286 | — |
| API routes | 60 | — |
| Páginas | 25+ | — |
| Componentes | ~80 | — |
| Archivos >400 líneas | ~42 (-6) | 0 |
| Pages con queries directas | ~~7~~ 4 (A3 pending) | 0 |
| Refs a `roles_empresa` | ~~12~~ 0 ✅ | 0 |
| Usos de `.single()` (SELECT/UPDATE) | ~~88~~ 0 ✅ | 0 |
| Imports relativos `../../` | 114 | 0 (migrar a `@/`) |
| Tests | 56 | — |

---

## SESIÓN ACTUAL (16-Mar-2026)

### Completado hoy — A3 Giant File Splits
- `crear-despacho.tsx`: 1908 → ~190 líneas (hook `useCrearDespacho` 1536l + `DespachoModals` 219l)
- `chofer-mobile.tsx`: 1440 → ~380 líneas (hook `useChoferMobile` 580l)
- `control-acceso.tsx`: 1409 → ~350 líneas (hook `useControlAcceso` 610l)
- 3 builds verified, 3 commits pushed, zero regressions

### Hooks creados
| Hook | Líneas | State | Effects | Handlers |
|------|--------|-------|---------|----------|
| `useCrearDespacho` | 1536 | 41 useState | 2 | 17 |
| `useChoferMobile` | 580 | 25 useState | 9 | 12 |
| `useControlAcceso` | 610 | 16 useState | 2 | 9 |
| `useEstadosCamiones` | ~140 | — | — | — |
| `useSupervisorCarga` | ~270 | — | — | — |
