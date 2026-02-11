# LOG DE TRABAJO

Registro cronológico de todas las actividades del proyecto.

---

## 📅 2026-02-10 (Lunes) - Sesión 11

### Sesión 11 - Flujo Operativo Completo E2E

**Tiempo:** ~3 horas  
**Equipo:** Opus (Tech Lead) + Usuario (PO/Tester)

#### Logros:
1. ✅ Upload de foto remito por supervisor (API route + storage bucket)
2. ✅ Validación de remito en Control de Acceso (preview + botón validar)
3. ✅ Egreso de origen con validación de remito condicional
4. ✅ Chofer ve viajes en web app móvil (API route bypass RLS)
5. ✅ Chofer inicia viaje a destino, arriba, y finaliza
6. ✅ API estado-unidad reescrita sin RPC inexistente
7. ✅ Display de estados corregido en crear-despacho y viajes-activos
8. ✅ FLUJO COMPLETO E2E TESTEADO: Supervisor → CA egreso → Chofer viaje → Destino → Vacío
9. ✅ Documento ESQUEMA-GENERAL-NODEXIA.md creado (mapa operativo completo)

#### Archivos Creados (4):
- `pages/api/upload-remito.ts` — Upload foto remito (service_role)
- `pages/api/consultar-remito.ts` — Consulta remito (service_role)
- `pages/api/chofer/viajes.ts` — Viajes del chofer (service_role)
- `docs/ESQUEMA-GENERAL-NODEXIA.md` — Mapa operativo 6 fases

#### Archivos Modificados (7):
- `pages/supervisor-carga.tsx` — subirFotoRemito via API
- `pages/control-acceso.tsx` — Remito preview + validación + estados
- `pages/chofer/viajes.tsx` — cargarViajes via API
- `pages/api/viajes/[id]/estado-unidad.ts` — Reescrito sin RPC
- `pages/crear-despacho.tsx` — Labels + tabs corregidos
- `pages/transporte/viajes-activos.tsx` — Filtros + estilos corregidos
- `docs/PENDIENTE-CRITICO-SEGURIDAD-API.md` — Fases 5-8 post-MVP

#### Bugs Resueltos (11):
1. Bucket remitos no existía
2-4. RLS bloqueaba remitos (upload, lectura, chofer viajes)
5. Tabla documentos_viaje → real: documentos_viaje_seguro
6. RPC actualizar_estado_unidad no existía
7. Columna fecha_salida_destino no existía
8. Transición arribado_destino → vacio no permitida
9. arribado_destino no aparecía en viajes-activos
10. fuera_de_horario excluía despachos de tabs
11. Labels faltantes en crear-despacho

#### Decisiones Técnicas:
- API route + service_role como patrón estándar para bypass RLS (deuda técnica post-MVP)
- Transiciones de estado en JS (tabla TRANSICIONES_VALIDAS) en vez de RPC PostgreSQL
- Destino sin Nodexia: chofer finaliza directo (arribado_destino → vacio)

---

## 📅 2026-02-08 (Viernes)

### Sesión 1 - Setup Inicial

**Tiempo:** ~2 horas  
**Equipo:** Opus (Tech Lead) + Usuario (Product Owner)

#### Logros:
1. ✅ Evaluación completa del proyecto actual
2. ✅ Análisis de stack tecnológico y arquitectura
3. ✅ Revisión de SQL (046_sistema_documentacion_recursos.sql)
4. ✅ Identificación de problemas de seguridad en SQL
5. ✅ Creación de SQL corregido (046_CORREGIDO.sql)
6. ✅ Definición de plan de trabajo (MVP + Post-MVP)
7. ✅ Sistema de memoria persistente implementado
8. ✅ Plan post-MVP completo documentado (8 semanas)
9. ✅ MVP Roadmap de 10 días creado
10. ✅ Quick Start Guide para usuario
11. ✅ Script de auditoría de BD creado

#### Problemas Identificados:
- 96 archivos de migraciones SQL (descontrol)
- RLS con recursión infinita (fixes múltiples)
- Código sin refactorizar (control-acceso.tsx: 1609 líneas)
- Tests mínimos (solo 3 archivos)
- Documentación escasa en código

#### Decisiones Técnicas:
- Enfoque en MVP funcional (10 días) antes de estabilización completa
- Sistema de memoria externa (.copilot/) para continuidad de contexto
- Arquitectura modular para features nuevos (modules/)
- Plan post-MVP para profesionalización profunda

#### Features Faltantes para MVP:
1. Control de Acceso: habilitación según docs, incidencias, egreso
2. Gestión de Documentación: upload, validación, alertas
3. Integración completa Control de Acceso + Documentación

#### Próximos Pasos (Día 1 - FINALIZADO ✅):
- [x] Ejecutar script de auditoría: `node scripts/audit-db.js` ✅
- [x] Revisar resultados (ver resumen abajo)

**Resultados Auditoría:**
- ✅ 12/17 tablas críticas encontradas (faltan: registros_acceso, tracking_gps, docs nuevas)
- ⚠️ 106 archivos SQL (necesita consolidación)
- ⚠️ 40+ duplicados/versiones detectados
- ✅ Reporte completo en `.copilot/BD-AUDIT-REPORT.md`

#### Próximos Pasos (Día 2): COMPLETADOS ✅
- [x] Ejecutar migración 046_CORREGIDO.sql (documentación)
- [x] Configurar Supabase Storage buckets
- [x] Iniciar features: Upload de documentación
- [x] Seguir MVP Roadmap día 2

---

## 📅 2026-02-08 (Viernes) - Sesión 2

### Sesión 2 - Día 2: Migración + Features Documentación

**Tiempo:** ~3 horas  
**Equipo:** Opus (Tech Lead/Director) + Sonnet x2 (Devs) + Usuario (PO)

#### Logros:
1. ✅ Migración 046_CORREGIDO ejecutada exitosamente (4 intentos, 3 rondas de debug)
2. ✅ Storage buckets creados: documentacion-entidades, documentacion-viajes
3. ✅ TASK-S01: 3 APIs backend (upload, listar, [id]) - Sonnet + revisión Opus (7 bugs)
4. ✅ TASK-S02: 4 componentes frontend (SubirDocumento, ListaDocumentos, DocumentoCard, index) - Sonnet + revisión Opus (5 bugs)
5. ✅ TASK-S03: 2 APIs admin (validar, pendientes) - Sonnet + revisión Opus (3 bugs)
6. ✅ TASK-S04: 3 archivos panel admin (page + 2 components) - Sonnet + revisión Opus (4 bugs)
7. ✅ Sistema director/delegación establecido (Opus revisa, Sonnet implementa)

#### Problemas Encontrados:
- Migración falló 3 veces antes de ejecutar: indexes sin IF NOT EXISTS, rol_global inexistente, empresa_transporte_id inexistente, activo inexistente en choferes/camiones/acoplados
- Sonnet repite los mismos bugs: response parsing incorrecto, tablas/columnas inventadas, sin auth
- Bucket 100MB excedía plan → reducido a 10MB

#### Bugs Corregidos por Opus (19 total):
**S01 (7):** maxFileSize, getPublicUrl en privado, sin auth, imports, subido_por, filtro activo, signed URLs
**S02 (5):** 10MB, response parsing, error field, dynamic imports, auth headers
**S03 (3):** tabla transportes→empresas, ano→anio, empresa_nombre faltante
**S04 (4):** response parsing, vehiculo→camion (x3), tipo transporte faltante, filtro labels

#### Decisiones Técnicas:
- Auth pattern: `supabaseAdmin.auth.getUser(token)` via `@/lib/supabaseAdmin`
- Frontend auth: `supabase` from `lib/supabaseClient` + Bearer token
- Buckets privados: signed URLs (1h) generadas server-side
- file_url=null en insert, URLs bajo demanda

#### Código Creado (12 archivos nuevos):
- pages/api/documentacion/{upload,listar,[id],validar,pendientes}.ts
- components/Documentacion/{SubirDocumento,ListaDocumentos,DocumentoCard,index}.tsx
- pages/admin/documentacion.tsx
- components/Admin/{DocumentacionAdmin,DocumentoPendienteCard}.tsx

#### Próximos Pasos (Día 3): COMPLETADOS ✅
- [x] Integrar componentes en página de flota (para probar UI)
- [x] TASK-S05: Verificación docs en Control de Acceso
- [x] Levantar dev server y test E2E del flujo

---

## 📅 2026-02-08 (Viernes) - Sesión 3

### Sesión 3 - Día 3: Integración Documentación + Control de Acceso

**Tiempo:** ~2 horas  
**Equipo:** Opus (Tech Lead/Director directo)

#### Logros:
1. ✅ DocumentosFlotaContent.tsx reescrito completamente (509→~200 líneas)
2. ✅ TASK-S05: API nueva verificar-documentacion.ts (222 líneas)
3. ✅ Control de Acceso: verificarDocumentacionRecursos() reescrita (RPC→API)
4. ✅ Fix useState faltantes: metricas, filtroTipo
5. ✅ Fix typo: `docsC arga` → `docsCarga`
6. ✅ Botón "Validar Documentación" verifica estado real antes de marcar como válida
7. ✅ Ingreso bloqueado cuando documentación está en estado `bloqueado`
8. ✅ 0 errores TypeScript en todos los archivos modificados
9. ✅ Memoria .copilot/ actualizada (PROJECT-STATE, TASKS-ACTIVE)

#### Problemas Encontrados:
- RPC `verificar_documentacion_viaje` no existe (nunca se ejecutó, era de migración 046 original)
- ⚠️ Las 3 tablas (choferes, camiones, acoplados) usan `empresa_id` como FK (NO `id_transporte`). El `id_transporte` original fue migrado a `empresa_id` (ver migration 030). La función SQL `verificar_documentacion_entidad` era CORRECTA.
- DocumentosFlotaContent usaba tabla inexistente `documentos_recursos`, getPublicUrl en bucket privado, FK incorrecta
- control-acceso.tsx: useState faltantes causarían crash en runtime, typo en variable

#### Decisiones Técnicas:
- DEC: API route verifica docs consultando `documentos_entidad` directamente (interfaz más simple que RPC)
- DEC: Opus implementó S05 directamente (sin delegar a Sonnet) por complejidad de integración
- DEC: Documentación crítica definida: chofer=[licencia,art], camion/acoplado=[seguro,rto,cedula]
- CORRECCIÓN: Las 3 tablas flota usan `empresa_id` (no `id_transporte`). Error original corregido en DocumentosFlotaContent y docs .copilot/

#### Código Creado/Modificado:
- **NUEVO:** `pages/api/control-acceso/verificar-documentacion.ts` (222 líneas)
- **REESCRITO:** `components/Transporte/DocumentosFlotaContent.tsx` (509→~200 líneas)
- **MODIFICADO:** `pages/control-acceso.tsx` (~8 cambios puntuales)
- **ACTUALIZADOS:** `.copilot/PROJECT-STATE.md`, `.copilot/TASKS-ACTIVE.md`

#### Tests Ejecutados:
- ✅ TypeScript compilation: 0 errors en archivos modificados
- ⏳ Test manual: pendiente (dev server activo)

#### Próximos Pasos (Día 4-5):
- [ ] Test manual completo del flujo documentación + control acceso
- [ ] TASK-S06: Incidencias de documentación (Sonnet, Día 5)
- [ ] TASK-S07: Proceso de Egreso (Sonnet, Día 6)
- [ ] Preparar specs detallados S06/S07 para Sonnet

---

---

## 📅 2026-02-09 (Domingo) - Sesión 7

### Sesión 7 - Features UX + Bugs de Testing en Vivo

**Tiempo:** ~3 horas  
**Equipo:** Opus (Tech Lead/Director directo) + Usuario (PO/Tester)

#### Logros:

**Features nuevos (5):**
1. ✅ **UX Documentos requeridos por entidad** — DocumentosFlotaContent.tsx rediseñado con DOCUMENTOS_REQUERIDOS config, docs pre-listados por tipo de entidad, upload inline, badges de estado, resumen Completo/Incompleto
2. ✅ **Página Validación Documentos (Admin)** — pages/admin/validacion-documentos.tsx nueva (~400 líneas). Filtros por estado, aprobar con 1 click, rechazar con motivo obligatorio. Roles: super_admin, admin_nodexia
3. ✅ **Link "Validar Documentos" en Sidebar** — Para super_admin y admin_nodexia
4. ✅ **Card "Validar Documentos" en Super Admin Dashboard** — Con link directo
5. ✅ **Tab "Ingresados" en Despachos** — crear-despacho.tsx con 🏭 Ingresados, detecta viajes ingresados por estado_unidad y estado

**Bugs corregidos de testing en vivo (6):**
6. ✅ **estado_unidad "expirado" al re-escanear** — Whitelist ESTADOS_UNIDAD_VALIDOS + fallback a campo estado
7. ✅ **Historial N/A en todos los campos** — cargarHistorial() reescrito con queries separadas (no nested joins)
8. ✅ **Estado no se propagaba a Despachos/Planning** — estado-unidad.ts ahora actualiza AMBAS columnas (estado + estado_unidad)
9. ✅ **Tab Ingresados vacía** — Detección chequea ambos campos + más estados en ESTADOS_INGRESADOS
10. ✅ **Alerta "Ya ingresado"** — Muestra alerta cyan al re-escanear viaje ya ingresado
11. ✅ **UTF-8 mojibake en Super Admin Dashboard** — Todos los caracteres corruptos corregidos

#### Problemas Encontrados:
- Supabase nested joins (`.select('viaje:viajes_despacho(chofer:choferes(...))')`) fallan silenciosamente retornando null — workaround: queries separadas
- estado_unidad puede tener valores inválidos como "expirado" que no son EstadoUnidadViaje — necesita whitelist
- Dual state columns (estado + estado_unidad) en viajes_despacho causa desincronización si solo se actualiza uno

#### Decisiones Técnicas:
- DEC: Actualizar SIEMPRE ambas columnas `estado` y `estado_unidad` en viajes_despacho (tanto RPC como fallback)
- DEC: Whitelist de estados válidos con fallback progresivo (estado_unidad → estado → default)
- DEC: Documentos requeridos definidos por config en frontend (DOCUMENTOS_REQUERIDOS por tipo de entidad)
- DEC: Validación admin separada de upload (admin valida, transporte sube)

#### Código Creado/Modificado:
**Nuevos:**
- `pages/admin/validacion-documentos.tsx` (~400 líneas)
- `sql/migrations/050_crear_tabla_registros_acceso.sql`

**Modificados:**
- `pages/control-acceso.tsx` (whitelist estados, cargarHistorial reescrito, alerta ya ingresado)
- `lib/api/estado-unidad.ts` (sync dual columns estado + estado_unidad)
- `pages/crear-despacho.tsx` (tab Ingresados, fetch estado_unidad, badge colors)
- `components/Transporte/DocumentosFlotaContent.tsx` (rediseño completo)
- `components/layout/Sidebar.tsx` (link Validar Documentos)
- `pages/admin/super-admin-dashboard.tsx` (UTF-8 fixes + card Validar Documentos)

#### Migraciones:
- ✅ **049 ejecutada** — RPC overload validar_transicion_estado_unidad
- ✅ **050 ejecutada** — Tabla registros_acceso con RLS

#### Tests Ejecutados:
- ✅ TypeScript compilation: sin errores críticos
- ✅ Dev server: funcional en localhost:3000
- ✅ Testing manual por usuario (4 bugs encontrados y corregidos)

#### Próximos Pasos:
- [ ] Testing completo post-migrations de todos los flujos
- [ ] Polish para demo (seed data, pruebas E2E)
- [ ] Dashboard Coordinador de Planta (incidencias)
- [ ] Deploy staging

---

## 📅 2026-02-10 (Martes) - Sesión 9

### Sesión 9 - Fix Criterios Docs + Modal Detalle + Seguridad + Cierre

**Tiempo:** ~3 horas
**Equipo:** Opus (Tech Lead/Director directo) + Usuario (PO/Tester)

#### Logros:

**Fixes de seguridad (4):**
1. ✅ **API auth corregido** — 3 APIs de documentación (validar, preview-url, pendientes) cambiadas de `usuarios.rol` a `usuarios_empresa.rol_interno`
2. ✅ **RLS corregido** — Migration 052 aplicada: `get_visible_chofer_ids()`, `get_visible_camion_ids()`, `get_visible_acoplado_ids()` con branches correctos + admin bypass
3. ✅ **API bypass eliminado** — `/api/recursos/por-ids` eliminado, 4 archivos revertidos a queries directas con RLS
4. ✅ **Auditoría de seguridad completa** — 55+ endpoints auditados, hallazgos registrados en `docs/PENDIENTE-CRITICO-SEGURIDAD-API.md`

**Fixes funcionales (3):**
5. ✅ **Criterios de documentación dinámicos** — Verificación de docs para chofer ahora depende del tipo de empresa: transporte→ART+cláusula, autónomo→seguro de vida. Aplicado en verificar-documentacion.ts, alertas.ts, estado-batch.ts
6. ✅ **Alias de tipos de documento** — `normalizarTipoDoc()` reconoce vtv→rto, tarjeta_verde→cedula. Docs cargados con nombres del esquema viejo ahora se reconocen
7. ✅ **Modal documentación detallada** — Antes vacío porque usaba supabase client (RLS sin permisos). Nuevo endpoint `documentos-detalle.ts` con supabaseAdmin. DocumentacionDetalle.tsx actualizado

**Documentación (1):**
8. ✅ **Tarea de seguridad registrada** — `docs/PENDIENTE-CRITICO-SEGURIDAD-API.md` creado (23+ endpoints, 4 fases, prioridad CRÍTICA post-MVP)

#### Problemas Encontrados:
- Tipos de documento en BD pueden tener nombres del esquema viejo (vtv, tarjeta_verde) vs nuevos (rto, cedula) — solucionado con aliases
- DocumentacionDetalle.tsx usaba supabase client → RLS bloquea acceso para control-acceso → modal vacío
- APIs de documentación verificaban `usuarios.rol` (siempre 'user') en vez de `usuarios_empresa.rol_interno` → 403 para todos
- RLS functions tenían branches rotos y no tenían bypass para admin_nodexia

#### Decisiones Técnicas:
- DEC-008: Criterios de documentación son DINÁMICOS por tipo de chofer (dependencia vs autónomo), determinado por empresa_id → empresas.tipo_empresa
- DEC-009: Tipos de documento aceptan ALIASES para compatibilidad con datos legacy (vtv→rto, tarjeta_verde→cedula)
- DEC-010: Pase de seguridad diferido a post-MVP pero REGISTRADO como tarea crítica con inventario completo
- DEC-011: Modal de documentación usa API server-side (supabaseAdmin) — los componentes que necesitan bypasear RLS deben usar APIs autenticadas, no queries del client

#### Código Creado/Modificado:
**Nuevos:**
- `pages/api/control-acceso/documentos-detalle.ts` (API para modal)
- `docs/PENDIENTE-CRITICO-SEGURIDAD-API.md` (registro de tarea crítica)
- `sql/migrations/052_fix_rls_visible_recursos.sql` (aplicada por usuario)

**Modificados:**
- `pages/api/control-acceso/verificar-documentacion.ts` (criterios dinámicos + alias)
- `pages/api/documentacion/alertas.ts` (criterios dinámicos + alias)
- `pages/api/documentacion/estado-batch.ts` (criterios dinámicos + alias)
- `components/DocumentacionDetalle.tsx` (API server-side en vez de client)
- `pages/api/documentacion/validar.ts` (auth fix)
- `pages/api/documentacion/preview-url.ts` (auth fix)
- `pages/api/documentacion/pendientes.ts` (auth fix)
- `pages/control-acceso.tsx` (revertido a queries directas)
- `pages/crear-despacho.tsx` (revertido + estado badge mejorado)
- `pages/planificacion.tsx` (revertido a queries directas)

**Eliminados:**
- `pages/api/recursos/por-ids.ts` (bypass inseguro)

#### Tests Ejecutados:
- ✅ TypeScript compilation: 0 errores en todos los archivos
- ✅ Dev server: funcional en localhost:3000
- ✅ Testing manual por usuario: flujos funcionando (coord planta, coord transporte, admin nodexia, control acceso)
- ⚠️ Bugs pendientes reportados por usuario al cierre de sesión

#### Bugs Pendientes (próxima sesión):
1. Control de acceso bloquea por docs "por vencer" (solo debería bloquear por vencidos/faltantes)
2. Incidencias retorna 500 (circuito no definido)
3. Upload docs da error 500 (SubirDocumento.tsx falla)

#### Próximos Pasos (Sesión 10):
- [ ] Fix BUG-01: por vencer no debe bloquear acceso
- [ ] Fix BUG-02: investigar error 500 en incidencias
- [ ] Fix BUG-03: investigar error 500 en upload
- [ ] Definir circuito de incidencias
- [ ] Polish para demo

---

## Template para próximas sesiones:

```markdown
## 📅 [FECHA]

### Sesión N - [Título]

**Tiempo:** [duración]
**Equipo:** [quiénes]

#### Logros:
- 

#### Problemas Encontrados:
- 

#### Decisiones Técnicas:
- 

#### Código Modificado:
- 

#### Tests Ejecutados:
- 

#### Próximos Pasos:
- 
```