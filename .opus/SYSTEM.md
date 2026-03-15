# OPUS MEMORY SYSTEM — NODEXIA-WEB

**Versión:** 1.1 — 15-Mar-2026
**Propósito:** Contexto persistente entre sesiones para desarrollo autónomo.
**REGLA CERO:** Opus NO hace NADA sin leer primero STATE.md + ARCHITECTURE.md + BACKLOG.md.

---

## PROTOCOLO DE SESIÓN

### Inicio (OBLIGATORIO — sin excepciones)
1. Usuario dice: "Opus, nueva sesión. Lee .opus/SYSTEM.md"
2. Opus lee COMPLETOS (no resumen): STATE.md → ARCHITECTURE.md → BACKLOG.md
3. Opus reporta exactamente:
   - Estado PROD (último commit, qué está roto)
   - Próxima tarea según BACKLOG.md
   - Bloqueos si los hay
4. Usuario confirma o redirige
5. **SI el usuario pide algo sin haber cargado contexto → Opus pide leer .opus/ primero**

### Durante
- Opus decide qué área trabajar (front/back/BD) según el feature
- Cada cambio: código → build verify → push → usuario testea
- Opus actualiza STATE.md y BACKLOG.md después de cada deploy exitoso

### Cierre (OBLIGATORIO — usuario debe solicitarlo)
1. Usuario dice: "Opus, cerrar sesión"
2. Opus actualiza TODOS estos archivos con datos reales de la sesión:
   - STATE.md: último commit, qué cambió, qué está roto
   - BACKLOG.md: mover tareas completadas, actualizar estado
   - CHANGELOG.md: append con fecha + cambios + commits
3. Opus hace commit: `chore: update .opus/ memory — session [fecha]`
4. Push a main

### Protección anti-olvido
- Si el usuario cierra sin pedir cierre → los archivos quedan desactualizados
- Si Opus detecta que STATE.md tiene fecha vieja → advertir al usuario

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

## PROTOCOLO BD — ANTI-DUPLICACIÓN (CRÍTICO)

Antes de generar CUALQUIER SQL (tabla, columna, vista, función, policy, índice):

### Checklist obligatorio
1. **Buscar en ARCHITECTURE.md** si la tabla/vista ya está documentada
2. **Buscar en `sql/migrations/`** si ya existe una migración para esto
3. **Generar SQL con `IF NOT EXISTS`** siempre (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS)
4. **Usar `DROP ... IF EXISTS` antes de CREATE** para vistas y funciones
5. **Nunca ALTER TABLE ADD COLUMN sin verificar**: generar SQL que primero chequea `information_schema.columns`
6. **Numerar migración**: siguiente número disponible después de la última en `sql/migrations/`
7. **Documentar en ARCHITECTURE.md** toda tabla/vista nueva
8. **Registrar en CHANGELOG.md** toda migración generada

### Formato SQL obligatorio para columnas
```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tabla' AND column_name = 'columna') THEN
    ALTER TABLE tabla ADD COLUMN columna tipo;
  END IF;
END $$;
```

### Lo que el usuario ejecuta en PROD
- Opus genera el SQL completo y testeado
- Usuario copia y pega en SQL Editor de Supabase PROD
- Usuario reporta resultado (éxito/error)
- Opus registra en STATE.md si se ejecutó o no

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

---

## PROTOCOLO ANTI-REGRESIÓN

Antes de modificar cualquier archivo:
1. **Leer el archivo completo** (o la sección relevante) antes de editar
2. **Entender qué hace** antes de cambiar
3. **No asumir** que un patrón es incorrecto sin verificar contexto
4. **Build después de cada cambio** — nunca acumular cambios sin verificar
5. **Si un cambio rompe build** → revertir inmediatamente, no apilar fixes

### Antes de crear archivo nuevo
- Buscar si ya existe uno con función similar
- Verificar que no duplique lógica de otro archivo
- Documentar en ARCHITECTURE.md si es un archivo estructural
