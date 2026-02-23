# DECISIONES TÉCNICAS

Registro de decisiones arquitectónicas y técnicas importantes.

---

## DEC-001: Sistema de Memoria Persistente (08-Feb-2026)

**Contexto:** Agentes IA no tienen memoria entre sesiones  
**Problema:** Pérdida de contexto al cerrar VS Code  
**Decisión:** Implementar "Memory As Code" con archivos .md  
**Alternativas consideradas:** 
- Base de datos externa (rechazada: complejidad)
- Comentarios en código (rechazada: dispersión)

**Impacto:** Positivo - Continuidad garantizada  
**Responsable:** Opus

---

## DEC-002: Enfoque MVP antes de Estabilización (08-Feb-2026)

**Contexto:** Presentación en 10 días + BD con problemas  
**Problema:** No hay tiempo para estabilización completa + features  
**Decisión:** Priorizar features funcionales end-to-end, estabilización post-MVP  
**Alternativas consideradas:**
- Estabilizar primero (rechazada: no llega a MVP)
- Solo arreglos visuales (rechazada: no funcionaría)

**Impacto:** Riesgo moderado pero alcanzable  
**Responsable:** Usuario (Product Owner)

---

## DEC-003: Arquitectura Modular para Features Nuevos (08-Feb-2026)

**Contexto:** Código legacy difícil de mantener  
**Problema:** Archivos de 1600+ líneas, lógica mezclada  
**Decisión:** Features nuevos en estructura modular (modules/)  
**Alternativas consideradas:**
- Refactorizar todo (rechazada: tiempo)
- Seguir con estructura actual (rechazada: insostenible)

**Impacto:** Positivo - Código nuevo profesional, legacy intacto  
**Responsable:** Opus

---

## DEC-004: Tabla documentos_entidad vs documentos_recursos (08-Feb-2026)

**Contexto:** Sonnet propuso SQL con problemas de seguridad  
**Problema:** Foreign keys sin validar, funciones sin permisos, auditoría faltante  
**Decisión:** SQL completamente reescrito con seguridad completa  
**Cambios clave:**
- Nombre: `documentos_entidad` (según SPEC)
- Trigger para validar foreign keys
- Tabla de auditoría completa
- RLS multi-tenant con permisos verificados
- Sistema de archivado (no DELETE)

**Impacto:** Alta seguridad, compliance, auditoría retrospectiva  
**Responsable:** Opus

---

## DEC-005: Protocolo de Trabajo con Múltiples Sonnet (08-Feb-2026)

**Contexto:** Usuario quiere equipo virtual sin perder memoria  
**Problema:** Sonnet puede alucinar sin contexto limitado  
**Decisión:** Sistema de tareas TASK-XXX.md con scope ultra-limitado  
**Protocolo:**
1. Opus crea TASK-XXX.md (1-2 archivos máx)
2. Usuario copia a nueva ventana Sonnet
3. Sonnet ejecuta y reporta en el mismo archivo
4. Opus revisa antes de aplicar
5. Usuario testea

**Impacto:** Minimiza alucinaciones, permite paralelismo  
**Responsable:** Opus

---

## DEC-006: FK columna correcta en tablas flota (08-Feb-2026)

**Contexto:** Las tablas `choferes`, `camiones`, `acoplados` tenían originalmente `id_transporte` como FK  
**Problema:** Migration 030 (02-Feb-2026) documentó que la columna se renombró/migró a `empresa_id`. Todo el código funcional existente usa `empresa_id`. En Sesión 3, Opus cometió el error de asumir que camiones/acoplados seguían usando `id_transporte` (solo mirando los CREATE TABLE originales sin verificar migraciones posteriores ni código funcional).  
**Decisión:** Las 3 tablas usan `empresa_id` como FK a `empresas`. La función SQL `verificar_documentacion_entidad` era CORRECTA. Documentación corregida en SONNET-GUIDELINES, PROJECT-STATE, WORK-LOG. Código corregido en DocumentosFlotaContent.tsx.  
**REGLA:** Siempre verificar código funcional existente antes de asumir esquema de BD desde archivos CREATE TABLE.  
**Impacto:** Evita bugs de FK en todo código futuro  
**Responsable:** Opus (corrección proactiva por observación del PO)

---

## DEC-007: NO insertar datos de procesos en BD — TODO desde UI (08-Feb-2026)

**Contexto:** Nodexia es una plataforma de gestión real, no un prototipo con datos de ejemplo  
**Decisión:** **NUNCA** crear scripts de seed/insert para datos de procesos funcionales. Todos los datos operativos se cargan EXCLUSIVAMENTE desde la UI usando los procesos funcionales de la aplicación.  
**Aplica a:** Choferes, camiones, acoplados, despachos, viajes, documentación, incidencias, empresas de transporte, unidades operativas, y cualquier dato de negocio.  
**Excepciones permitidas:**
- Estructura de BD (CREATE TABLE, ALTER, migrations)
- Configuración de roles/permisos (RLS policies)
- Datos de sistema (super_admins, configuración global)
- Usuarios iniciales de auth  
**Consecuencia:** Si un feature no puede probarse porque no hay datos, primero hay que asegurar que el feature de carga desde UI funciona. Los datos de demo para presentación también se cargan desde UI.  
**Responsable:** PO (directiva de producto)

---

## DEC-008: Criterios de Documentación Dinámicos por Tipo de Chofer (10-Feb-2026)

**Contexto:** Control de acceso bloqueaba choferes bajo relación de dependencia por "Seguro de Vida faltante"  
**Problema:** Los docs críticos estaban hardcodeados como `['licencia_conducir', 'art_clausula_no_repeticion']` para todos los choferes  
**Decisión:** Los docs requeridos se determinan dinámicamente:
- `choferes.empresa_id` → `empresas.tipo_empresa`
- Si tipo_empresa = 'transporte' → dependencia → requiere ART + cláusula
- Si no tiene empresa o tipo diferente → autónomo → requiere seguro de vida
- Licencia de conducir siempre requerida

**Impacto:** Positivo — cada chofer solo necesita los docs que le corresponden  
**Responsable:** Opus + PO (PO confirmó: "Se deduce de la empresa")

---

## DEC-009: Alias de Tipos de Documento para Compatibilidad (10-Feb-2026)

**Contexto:** Migración 046 original usaba tipos como 'vtv', 'tarjeta_verde'; la versión corregida usa 'rto', 'cedula'  
**Problema:** Docs cargados con tipos viejos no eran reconocidos por verificaciones que buscan tipos nuevos  
**Decisión:** `normalizarTipoDoc()` en todos los endpoints de verificación: vtv→rto, tarjeta_verde/cedula_verde→cedula  
**Alternativas:** Migrar datos en BD (rechazada: riesgo de romper otros procesos), mantener tipos viejos en código (rechazada: confuso)  
**Impacto:** Compatibilidad transparente sin tocar datos  
**Responsable:** Opus

---

## DEC-010: Seguridad Diferida a Post-MVP con Registro Formal (10-Feb-2026)

**Contexto:** Auditoría reveló 23+ endpoints vulnerables (6 críticos sin auth, 12 sin scope)  
**Problema:** No hay tiempo para fix completo antes de la demo (18-Feb)  
**Decisión:** Diferir a post-MVP PERO registrar formalmente en `docs/PENDIENTE-CRITICO-SEGURIDAD-API.md` con inventario completo, fases de acción, y cita del cliente  
**REGLA:** Este archivo debe consultarse al inicio de la primera sesión post-MVP  
**Impacto:** Riesgo aceptable para demo, pero DEBE resolverse antes de producción con datos reales  
**Responsable:** PO (decisión) + Opus (ejecución post-MVP)

---

## DEC-011: Modal de Docs usa API Server-Side, no Client RLS (10-Feb-2026)

**Contexto:** DocumentacionDetalle.tsx usaba `supabase` client → RLS bloqueaba acceso para usuario control-acceso  
**Problema:** Ciertos componentes necesitan ver datos cross-empresa que RLS no permite  
**Decisión:** Crear API endpoints autenticados que usen `supabaseAdmin` (bypasea RLS). El componente llama a la API con Bearer token.  
**REGLA:** Cuando un componente necesita datos que RLS no permite, SIEMPRE usar API route con supabaseAdmin + auth, NUNCA el client directo.  
**Impacto:** Datos accesibles de forma segura sin exponer todo  
**Responsable:** Opus

---

## DEC-012: Chofer Re-Link por UPDATE en vez de INSERT (15-Feb-2026)

**Contexto:** Chofer desvinculado (empresa_id=NULL) al intentar re-vincular daba error "DNI duplicado"  
**Problema:** INSERT fallaba porque el registro con ese DNI ya existía (desactivado pero presente)  
**Decisión:** Al vincular chofer, primero buscar por DNI. Si existe → UPDATE (re-link con empresa_id). Si no → INSERT.  
**Impacto:** Preserva historial, IDs, y datos del chofer original al re-vincular  
**Responsable:** Opus

---

## DEC-013: Botones Maps Siempre Visibles con Fallback (15-Feb-2026)

**Contexto:** Chofer-mobile no mostraba botones de navegación porque ubicaciones PROD no tenían coordenadas  
**Problema:** Rendering condicionado a `latitud && longitud` ocultaba los botones  
**Decisión:** Botones siempre visibles. Si hay coordenadas → abrir Maps con lat/lng. Si no → abrir Maps con búsqueda por dirección.  
**Impacto:** Mejor UX — chofer siempre puede navegar independiente de calidad de datos  
**Responsable:** Opus

---

## DEC-014: Auth Chofer por usuario_id, No por Email (15-Feb-2026)

**Contexto:** GPS tracking fallaba porque verificaba propiedad del viaje comparando `chofer.email` (inexistente)  
**Problema:** Tabla choferes NO tiene columna email. La vinculación correcta es `choferes.usuario_id ↔ auth.users.id`  
**Decisión:** Toda verificación de propiedad chofer↔usuario debe usar `chofer.usuario_id === authUserId`  
**REGLA:** Nunca usar email para vincular chofer con usuario de auth. El campo es `usuario_id`.  
**Impacto:** GPS tracking y cualquier verificación futura funciona correctamente  
**Responsable:** Opus

---

## DEC-015: CERO bypass RLS para usuarios autenticados (18-Feb-2026)

**Contexto:** APIs usaban `supabaseAdmin` para servir datos a usuarios autenticados (bypassing RLS)  
**Problema:** Violación de principios de seguridad profesional — datos cross-empresa accesibles sin autorización de BD  
**Decisión:** **MANDATO DEL PO — PERMANENTE.** Toda query para servir datos a usuario autenticado DEBE pasar por RLS. `supabaseAdmin` solo para: verificar JWT, obtener rol, storage signed URLs, migraciones, cron jobs.  
**Implementación:** `createUserSupabaseClient(token)` en `lib/supabaseServerClient.ts`, `AuthContext.token` en `withAuth.ts`  
**Impacto:** Seguridad profesional — autorización en capa de BD, no en código  
**Responsable:** PO (mandato) + Opus (implementación)

---

## DEC-016: Obsoleta DEC-011 — RLS reemplaza bypass cross-empresa (18-Feb-2026)

**Contexto:** DEC-011 establecía usar `supabaseAdmin` para datos cross-empresa  
**Problema:** Contradice DEC-015 (CERO bypass)  
**Decisión:** DEC-011 queda **OBSOLETA**. Reemplazada por: RLS policies con `get_visible_*_ids()` functions que evalúan visibilidad cross-company vía `ubicaciones.empresa_id` (CUIT como puente)  
**Migration:** 062_fix_rls_documentos_cross_company.sql  
**Impacto:** Elimina necesidad de bypass — la BD autoriza correctamente  
**Responsable:** Opus

---

## DEC-024: Badges estados-camiones unificados para todos los roles (21-Feb-2026)

**Contexto:** estados-camiones mostraba badges diferentes por rol (11 detallados vs 6 simplificados)  
**Problema:** Inconsistencia visual entre supervisor_carga y estados-camiones  
**Decisión:** Eliminar condicional `esControlAcceso`, todos los roles ven 6 badges unificados  
**Alternativas consideradas:** Mantener diferenciación (rechazada: confusión UX)  
**Impacto:** Consistencia visual en toda la plataforma  
**Responsable:** PO + Opus

---

## DEC-025: Estado visual de despacho computado desde viajes (21-Feb-2026)

**Contexto:** Campo `estado` de despachos en BD puede estar desactualizado (ej: "cancelado" cuando hay viajes activos)  
**Problema:** Despachos en tab incorrecto y badges mostrando estado DB crudo  
**Decisión:** Computar estado visual desde viajes: activos → `en_proceso`, todos completados → `completado`  
**Alternativas consideradas:** Sincronizar estado DB (rechazada: requiere triggers complejos y puede haber estados legítimos mixtos)  
**Impacto:** Tabs y badges muestran estado real del despacho  
**Responsable:** Opus

---

## DEC-026: supabaseAdmin permitido para INSERT incidencias (21-Feb-2026)

**Contexto:** RLS policies de incidencias_viaje son muy restrictivas para inserts cross-empresa  
**Problema:** Control de acceso no puede crear incidencias por RLS  
**Decisión:** Usar supabaseAdmin para insert de incidencias (tabla write-once, lectura sigue por RLS)  
**Alternativas consideradas:** Crear INSERT policy más permisiva (pendiente para profesionalización)  
**Impacto:** Incidencias se pueden crear desde cualquier rol autorizado  
**Responsable:** Opus  
**Nota:** Excepción temporal al principio DEC-015. La lectura sigue por RLS, solo el insert bypasea.
**ACTUALIZACIÓN (22-Feb-2026):** Revertido parcialmente — POST ahora usa createUserSupabaseClient para insert+viaje check. supabaseAdmin solo para user FK upsert, enrichment lookups, y notificaciones (DEC-027).

---

## DEC-027: Incidencias POST usa createUserSupabaseClient (22-Feb-2026)

**Contexto:** Auditoría de seguridad pre-deploy encontró que incidencias POST usaba supabaseAdmin para insert  
**Problema:** Violación del principio CERO bypass RLS para usuarios autenticados  
**Decisión:** Cambiar insert y viaje check a createUserSupabaseClient. supabaseAdmin solo para: user FK upsert (tabla sin RLS adecuada), enrichment lookups (viaje empresa), notificaciones (cross-company)  
**Alternativas consideradas:** Mantener supabaseAdmin (rechazada: viola principios)  
**Impacto:** Insert respeta RLS, datos más seguros  
**Responsable:** Opus

---

## DEC-028: Cross-empresa doc listing via param role-gated (22-Feb-2026)

**Contexto:** Coordinador de planta no podía ver docs de recursos de transporte desde incidencia detail  
**Problema:** listar.ts filtraba por empresa_id del usuario, pero docs pertenecen a empresa de transporte  
**Decisión:** Agregar param `cross_empresa=true` que skippea filtro empresa_id, gated a roles ['coordinador', 'supervisor', 'admin_nodexia', 'super_admin']  
**Alternativas consideradas:** RLS policy cross-company (rechazada: ya existe pero no cubre este caso sin refactor mayor)  
**Impacto:** Coordinadores pueden ver/gestionar docs de recursos de transporte para resolver incidencias  
**Responsable:** Opus

---

## DEC-029: Estados-camiones CA filters por origen/destino (22-Feb-2026)

**Contexto:** CA de planta veía vehículos incorrectos porque no se distinguía si la planta era origen o destino  
**Problema:** "En Planta" mostraba vehículos de destino, "Egresados" no mostraba post-egreso  
**Decisión:** Track origin/destination via `despachosOrigenIds`/`despachosDestinoIds` Sets. Rewrite completo de filtros CA con funciones nombradas (caEnPlantaFilter, caPorArribarFilter, etc.)  
**Alternativas consideradas:** Filtrar solo por empresa_id (rechazada: una empresa puede tener múltiples plantas)  
**Impacto:** CA ve solo vehículos relevantes a su planta y dirección (origen vs destino)  
**Responsable:** Opus

---

## Template para futuras decisiones:

```markdown
## DEC-XXX: [Título] ([Fecha])

**Contexto:** [Situación]  
**Problema:** [Qué resolver]  
**Decisión:** [Qué se decidió]  
**Alternativas consideradas:** [Opciones descartadas]  
**Impacto:** [Consecuencias]  
**Responsable:** [Quién decidió]
```
