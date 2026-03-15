# ESTADO DEL PROYECTO — NODEXIA-WEB

**Última actualización:** 15-Mar-2026

---

## PRODUCCIÓN

- **URL:** www.nodexiaweb.com
- **Deploy:** Vercel (proyecto `nodexia-web-j6wl`, región `gru1`)
- **Supabase PROD:** `lkdcofsfjnltuzzzwoir`
- **Último commit:** `e8746d3` (15-Mar-2026)
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
| Archivos >400 líneas | 48 | 0 |
| Pages con queries directas | ~~7~~ 4 (A3 pending) | 0 |
| Refs a `roles_empresa` | ~~12~~ 0 ✅ | 0 |
| Usos de `.single()` (SELECT/UPDATE) | ~~88~~ 0 ✅ | 0 |
| Imports relativos `../../` | 114 | 0 (migrar a `@/`) |
| Tests | 56 | — |

---

## SESIÓN ACTUAL (15-Mar-2026)

### Completado hoy
- Fix: RED button coordinador planta (3 iteraciones — FK roto por migración 070)
- Fix: "Ver Estado" button (broadened condition, `.maybeSingle()`, logging)
- Fix: CrearUnidadModal dropdowns vacíos (query `unidades_operativas` bloqueaba carga)
- Fix: `vista_disponibilidad_unidades` creada en PROD (SQL manual)
- Auditoría completa del codebase (286 archivos, 48 >400 líneas, 7 anti-patterns)
- Feedback MVP: validación exitosa con empresas transporte + planta
- Plan de refactorización definido (Bloque A: refactor+enterprise, Bloque B: features)
