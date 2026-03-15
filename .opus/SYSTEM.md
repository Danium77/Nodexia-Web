# OPUS MEMORY SYSTEM — NODEXIA-WEB

**Versión:** 1.0 — 15-Mar-2026
**Propósito:** Contexto persistente entre sesiones para desarrollo autónomo.

---

## PROTOCOLO DE SESIÓN

### Inicio
1. Usuario dice: "Opus, nueva sesión. Lee .opus/SYSTEM.md"
2. Opus lee: STATE.md → ARCHITECTURE.md → BACKLOG.md (en ese orden)
3. Opus reporta: estado actual + próxima tarea + bloqueos
4. Usuario confirma o redirige

### Durante
- Opus decide qué área trabajar (front/back/BD) según el feature
- Cada cambio: código → build → push → usuario testea
- Opus actualiza STATE.md y BACKLOG.md después de cada deploy

### Cierre
1. Usuario dice: "Opus, cerrar sesión"
2. Opus actualiza: STATE.md, BACKLOG.md, CHANGELOG.md
3. Opus hace commit final con archivos de memoria actualizados

---

## MAPA DE ARCHIVOS

| Archivo | Lee al inicio | Contenido |
|---------|:---:|-----------|
| `.opus/SYSTEM.md` | 1° | Este archivo. Protocolo + principios |
| `.opus/STATE.md` | 2° | Qué funciona, qué está roto, PROD vs DEV |
| `.opus/ARCHITECTURE.md` | 3° | Stack, DB, archivos clave, patrones |
| `.opus/BACKLOG.md` | 4° | Trabajo priorizado con estado |
| `.opus/CHANGELOG.md` | Bajo demanda | Log cronológico de cambios |

---

## PRINCIPIOS INQUEBRANTABLES

1. **CERO bypass RLS** para usuarios autenticados (supabaseAdmin solo para: webhooks, cron, migraciones)
2. **CERO inserts directos** desde frontend — siempre vía API con validación backend
3. **CERO parches** — arreglar la raíz, cada cambio mejora la arquitectura
4. **Separación estricta**: BD autoriza (RLS) → Backend valida → Frontend presenta
5. **Un dato, un lugar** — sin duplicación de tipos, estados, o lógica
6. **Build antes de push** — todo cambio se verifica con `npx next build`

---

## ROLES

- **Opus:** Arquitecto + Tech Lead + Desarrollador (4 áreas: front, back, BD, mobile)
- **Usuario:** Product Owner + QA + Soporte (testea en PROD, ejecuta SQL en Supabase, da feedback)

---

## REGLAS DE CÓDIGO

- Imports: usar `@/` alias (migrar progresivamente desde `../../`)
- Queries en pages: PROHIBIDO `supabase.from()` directo — usar hooks
- `.single()`: PROHIBIDO — usar `.maybeSingle()` siempre
- Archivos >500 líneas: dividir en componentes + hook
- API routes: thin — delegan a `lib/services/`
- Estados: solo desde `lib/estados/config.ts` — nunca strings hardcoded
