# ESTADO DEL PROYECTO — NODEXIA-WEB

**Última actualización:** 16-Mar-2026 (sesión 40)

---

## PRODUCCIÓN

- **URL:** www.nodexiaweb.com
- **Deploy:** Vercel (proyecto `nodexia-web-j6wl`, región `gru1`)
- **Supabase PROD:** `lkdcofsfjnltuzzzwoir`
- **Último commit:** pendiente push (16-Mar-2026)
- **Estado general:** Funcional con bugs menores
- **Supabase CLI:** Instalado (npx), logueado, linked a PROD

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
- ~~**12 refs a `roles_empresa`** en código~~ — 0 refs ✅
- ~~**88 usos de `.single()`** — migrados a `.maybeSingle()` (commit `f57583f`)~~ ✅
- ~~**Migración 063 no ejecutada**~~ — verificada aplicada en PROD ✅
- ~~**`ofertas_red_nodexia`** sin UPDATE policy RLS~~ — 2 UPDATE policies creadas (migración 075) ✅
- **7 pages con `supabase.from()` directo** — viola separación de capas

### Migraciones PROD
- 075 migraciones tracked vía tabla `schema_migrations` (+ 017v vista manual)
- Vista `vista_disponibilidad_unidades` registrada en tracking ✅
- Supabase CLI linked a PROD (`lkdcofsfjnltuzzzwoir`)

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
| Archivos >1000 líneas | 0 ✅ | 0 |
| Pages con queries directas | ~~7~~ 4 (A3 pending) | 0 |
| Refs a `roles_empresa` | ~~12~~ 0 ✅ | 0 |
| Usos de `.single()` (SELECT/UPDATE) | ~~88~~ 0 ✅ | 0 |
| Imports relativos `../../` | ~~114~~ 0 ✅ | 0 |
| IDOR vulnerabilities fijados | 6 ✅ | — |
| Migraciones SQL | 76 | — |
| Tests | 56 | — |

---

## ÚLTIMA SESIÓN (40 — 16-Mar-2026)

### Completado — A4 Import Alias Migration
- 430 imports relativos (`../`) migrados a alias `@/` en 166 archivos
- tsconfig.json ya tenía `@/` configurado — solo faltaba migrar uso
- Build verificado: 0 errores, 71 páginas generadas
- Commit `5d54da6` pushed

### Completado — A3 bonus: Split despachos-ofrecidos
- `despachos-ofrecidos.tsx`: 984→530 líneas (-46%)
- Nuevo hook `useDespachosOfrecidos` (398 líneas)
- Commit `3481f60` pushed

### Completado — A6 Security Audit
- **RLS audit**: 36 tablas analizadas, 6 con políticas sobre-permisivas (USING true)
- **Migración 076**: `076_rls_audit_restrict_permissive.sql` creada
  - Despachos: DELETE/INSERT/UPDATE restringidos por empresa
  - Empresas: INSERT solo admin_nodexia, UPDATE admin o coordinador de la empresa
  - Ubicaciones: WRITE restringido a coordinadores, SELECT abierto (legítimo)
  - Usuarios_empresa: INSERT/UPDATE solo admin o coordinador de esa empresa
  - Tracking_gps: SELECT para viajes propios, INSERT solo choferes
- **IDOR audit**: 7 rutas API vulnerables encontradas, 6 fixeadas:
  - `eliminar-usuario.ts` — CRITICAL: empresa ownership check añadido
  - `crear-usuario-sin-email.ts` — HIGH: empresa_id del caller forzado
  - `nueva-invitacion.ts` — HIGH: empresa_id validado contra caller
  - `actualizar-usuario.ts` — HIGH: verificación de empresa del target user
  - `editar-usuario.ts` — HIGH: verificación de empresa del target user
  - `asignar-unidad.ts` — HIGH: chofer/camión verificados contra empresa caller
- **Pendiente**: Ejecutar migración 076 en PROD (copia/pega en SQL Editor)

### Sesión 39 — A5 Sync PROD
- Supabase CLI instalado (via npx), logueado, linked a PROD
- 54 migraciones verificadas, migración 075 ejecutada
- Commit `a8cff30` pushed

### Sesión 38 — A3 Giant File Splits
- 3 pages gigantes partidos (crear-despacho, chofer-mobile, control-acceso)
- 3 hooks creados, 3 builds verified, zero regressions

### Hooks en el proyecto
| Hook | Líneas | State | Effects | Handlers |
|------|--------|-------|---------|----------|
| `useCrearDespacho` | 1536 | 41 useState | 2 | 17 |
| `useChoferMobile` | 580 | 25 useState | 9 | 12 |
| `useControlAcceso` | 610 | 16 useState | 2 | 9 |
| `useEstadosCamiones` | ~140 | — | — | — |
| `useSupervisorCarga` | ~270 | — | — | — |

### Próximos pasos sugeridos
- **A6**: Auditoría RLS completa
- **A3 bonus**: `despachos-ofrecidos.tsx` (1067 líneas), `lib/types.ts` (993 líneas)
- **A7**: Performance (índices, queries, connection pooling)
- **Bloque B**: Features (admin dinámico, reportes, turnos)
