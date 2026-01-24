# 🤖 PROTOCOLO DE INICIO DE SESIÓN - COPILOT

**Para:** GitHub Copilot  
**Objetivo:** Arrancar cada sesión de trabajo de forma autónoma y estructurada  
**Última actualización:** 17-Dic-2025

---

## 📋 PASO A PASO AL INICIAR SESIÓN

### FASE 1: LEER CONTEXTO (2-3 minutos)

#### 1.1 Lee SIEMPRE estos archivos primero:

```
OBLIGATORIO (en este orden):
1. .session/PROXIMA-SESION.md          ← Estado y tareas preparadas por sesión anterior
2. .session/CONTEXTO-ACTUAL.md         ← Contexto completo del proyecto
3. docs/PROBLEMAS-CONOCIDOS.md         ← Bugs y limitaciones actuales
4. QUICK-START-PROXIMA-SESION.md       ← Opciones de trabajo disponibles

SI VAS A TRABAJAR CON BD (choferes, camiones, acoplados, viajes):
5. docs/ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md  ← OBLIGATORIO - Estructura oficial de tablas
```

#### 1.2 Confirma con el usuario:

```markdown
👋 Hola! He leído el contexto de la sesión anterior.

📍 **Última sesión:** [FECHA de PROXIMA-SESION.md]
✅ **Completado:** [Resumen de lo que se hizo]
🎯 **Pendiente:** [Tareas identificadas para hoy]

**Estado del proyecto:**
- Progreso: [X]% completado
- Tests: [X/X] pasando
- Errores TS: [X] pendientes

**Opciones sugeridas para hoy:**
1. [Opción A con justificación]
2. [Opción B con justificación]
3. [Opción C con justificación]

¿Con cuál quieres empezar? (o dime otro objetivo)
```

#### 1.3 Si NO existe `.session/PROXIMA-SESION.md`:

```markdown
⚠️ No encontré el archivo de sesión anterior.

Voy a revisar el estado del proyecto...
[Lee: ESTADO-CONTINUACION-*.md más reciente]
[Lee: NODEXIA-ROADMAP.md]
[Lee: docs/PROBLEMAS-CONOCIDOS.md]

Estoy listo. ¿Qué quieres trabajar hoy?
```

#### 1.4 Verificación especial para trabajo con Base de Datos:

**⚠️ SI VAS A TRABAJAR CON RECURSOS DE TRANSPORTE** (choferes, camiones, acoplados, viajes):

```markdown
⚠️ IMPORTANTE: Veo que vas a trabajar con recursos de transporte.

📚 **LECTURA OBLIGATORIA antes de continuar:**
→ `docs/ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md`

Este documento contiene:
✅ Nombres EXACTOS de columnas (dni NO documento, anio NO tipo)
✅ Nombres EXACTOS de FKs (chofer_id NO id_chofer)
✅ Patrón Dictionary correcto para queries
✅ Errores comunes a evitar
✅ Código de referencia que funciona

**Regla de Oro:** Copiar patrón de `pages/crear-despacho.tsx` líneas 1210-1252

He leído el documento. Listo para trabajar con estructura oficial. ✅
```

---

### FASE 2: PLANIFICAR SESIÓN (5 minutos)

#### 2.1 Una vez el usuario define el objetivo:

```markdown
Perfecto! Vamos a trabajar en: [OBJETIVO]

Déjame planificar la sesión...
```

#### 2.2 Crea TODO List usando `manage_todo_list`:

```typescript
// Ejemplo para "Completar Red Nodexia"
manage_todo_list({
  todoList: [
    {
      id: 1,
      title: "Revisar estado actual Red Nodexia",
      description: "Leer docs/red-nodexia/, revisar archivos en pages/api/red-nodexia/ y components/",
      status: "not-started"
    },
    {
      id: 2,
      title: "Implementar algoritmo de matching",
      description: "Crear lib/matching-algorithm.ts con lógica de proximidad geográfica",
      status: "not-started"
    },
    {
      id: 3,
      title: "Crear endpoint de notificaciones",
      description: "pages/api/red-nodexia/notificar-transportes.ts",
      status: "not-started"
    },
    {
      id: 4,
      title: "Testing del flujo completo",
      description: "Probar desde UI: publicar oferta → notificar → aceptar",
      status: "not-started"
    },
    {
      id: 5,
      title: "Documentar y commitear",
      description: "Crear doc de sesión, actualizar PROXIMA-SESION.md, commit con mensaje claro",
      status: "not-started"
    }
  ]
})
```

#### 2.3 Muestra plan al usuario:

```markdown
📋 **Plan de la sesión:**

**Objetivo:** [OBJETIVO DEL USUARIO]

**Tareas:**
1. ⚪ [Tarea 1]
2. ⚪ [Tarea 2]
3. ⚪ [Tarea 3]
4. ⚪ [Tarea 4]
5. ⚪ [Tarea 5]

**Áreas técnicas involucradas:**
- 🗄️ Base de Datos: [Sí/No - qué tablas]
- ⚙️ Backend: [Sí/No - qué APIs]
- 🎨 Frontend: [Sí/No - qué componentes]

**Duración estimada:** [X-Y] horas

¿Te parece bien? (puedes ajustar prioridades)
```

---

### FASE 3: VERIFICAR AMBIENTE (1 minuto)

Antes de empezar a programar, verifica:

```bash
# 1. Estamos en el directorio correcto
pwd

# 2. Servidor funciona
# (solo si usuario no lo tiene corriendo)
pnpm dev

# 3. Tests pasan
pnpm test -- --silent

# 4. Ver errores TypeScript actuales (primeras 10 líneas)
pnpm type-check | Select-Object -First 10
```

**Si algo falla:**
- Servidor no inicia → Reportar problema, preguntar si continuar
- Tests fallan → Identificar qué test, preguntar si arreglar primero o continuar
- Muchos errores TS nuevos → Algo se rompió, investigar antes de continuar

---

### FASE 4: COMENZAR TRABAJO (según plan)

#### 4.1 Marca primera tarea como `in-progress`:

```typescript
manage_todo_list({
  todoList: [
    { id: 1, title: "...", description: "...", status: "in-progress" },
    { id: 2, title: "...", description: "...", status: "not-started" },
    // ...
  ]
})
```

#### 4.2 Trabaja en la tarea:

- Lee archivos necesarios
- Implementa cambios
- Testea que funciona
- Commitea si es significativo

#### 4.3 Al completar, marca como `completed` INMEDIATAMENTE:

```typescript
manage_todo_list({
  todoList: [
    { id: 1, title: "...", description: "...", status: "completed" },
    { id: 2, title: "...", description: "...", status: "in-progress" }, // ← siguiente
    // ...
  ]
})
```

#### 4.4 Repite para cada tarea

---

## 🎯 REGLAS IMPORTANTES

### ❗ SIEMPRE:

1. **Lee `.session/PROXIMA-SESION.md` primero** (es tu hoja de ruta)
2. **Usa `manage_todo_list`** para trackear progreso
3. **Marca tareas como completadas INMEDIATAMENTE** al terminarlas
4. **Commitea cambios significativos** cada 30-60 min
5. **Documenta decisiones técnicas** en comentarios del código
6. **Al finalizar, EJECUTA PROTOCOLO-CIERRE-SESION-COPILOT.md**

### ❌ NUNCA:

1. **No borres archivos** sin confirmar con usuario
2. **No hagas cambios a la BD en producción** sin confirmación explícita
3. **No asumas que tests viejos están mal** si fallan - investiga primero
4. **No continúes si algo está muy roto** - reporta y espera instrucciones
5. **No olvides el cierre de sesión** - es crítico para continuidad

---

## 📁 DONDE GUARDAR DOCUMENTOS

### Durante la sesión:

```
.session/
├── PROXIMA-SESION.md              ← Actualizar al finalizar
├── CONTEXTO-ACTUAL.md             ← Actualizar si hay cambios arquitectónicos
├── en-progreso/
│   └── notas-sesion-[FECHA].md    ← Notas temporales (opcional)
```

### Al finalizar la sesión:

```
.session/history/
└── sesion-[YYYY-MM-DD].md         ← Documento completo de la sesión

docs/
├── PROBLEMAS-CONOCIDOS.md         ← Actualizar si encontraste bugs
└── [area]/                        ← Docs técnicos específicos si aplicable
```

**Detalles en:** `ESTRUCTURA-DOCUMENTACION.md`

---

## 🚨 SITUACIONES ESPECIALES

### Si encuentras un bug crítico:

1. **Documenta inmediatamente** en `docs/PROBLEMAS-CONOCIDOS.md`
2. **Agrega al TODO list** como tarea prioritaria
3. **Pregunta al usuario** si cambiar objetivo de sesión

### Si te trabas >20 minutos:

1. **Simplifica el approach**
2. **Documenta el bloqueo** en notas de sesión
3. **Pregunta al usuario** por dirección alternativa

### Si el usuario se va (cierre inesperado):

1. **Ejecuta PROTOCOLO-CIERRE-SESION-COPILOT.md** parcialmente
2. **Guarda trabajo actual** aunque esté incompleto
3. **Actualiza PROXIMA-SESION.md** con estado real

---

## 📊 CHECKLIST DE INICIO

Copia esto al empezar cada sesión:

```markdown
## ✅ Checklist de Inicio de Sesión

- [ ] Leí .session/PROXIMA-SESION.md
- [ ] Leí .session/CONTEXTO-ACTUAL.md
- [ ] Leí docs/PROBLEMAS-CONOCIDOS.md
- [ ] Confirmé objetivo con usuario
- [ ] Creé TODO list con manage_todo_list
- [ ] Mostré plan de sesión al usuario
- [ ] Usuario aprobó el plan
- [ ] Verifiqué que servidor/tests funcionan
- [ ] Marqué primera tarea como in-progress

🎯 TODO LISTO - EMPEZAR A TRABAJAR
```

---

## 🎓 EJEMPLOS DE INICIO

### Ejemplo 1: Sesión normal con contexto

```markdown
👋 Hola! He leído el contexto de la sesión anterior.

📍 **Última sesión:** 16-Dic-2025
✅ **Completado:** Testing implementado (50 tests pasando)
🎯 **Pendiente:** Decidir entre completar Red Nodexia o estabilizar código

**Estado del proyecto:**
- Progreso: 80% completado
- Tests: 49/50 pasando
- Errores TS: 78 pendientes

**Opciones sugeridas para hoy:**
1. **Completar Red Nodexia** (3-4h, alta prioridad, feature core)
2. **Estabilizar código** (2-3h, corregir errores TS, setup CI/CD)
3. **Pulir UI/UX** (2-3h, mejoras visuales, loading states)

¿Con cuál quieres empezar?
```

### Ejemplo 2: Primera sesión sin contexto

```markdown
⚠️ No encontré el archivo de sesión anterior.

Revisando el estado del proyecto...

📊 **Estado actual:**
- Proyecto: Nodexia (plataforma logística SaaS B2B)
- Stack: Next.js 15, TypeScript, Supabase
- Progreso estimado: ~80%
- Tests: 50 configurados
- Docs: Excelente (30+ archivos)

📋 **Áreas pendientes** (según NODEXIA-ROADMAP.md):
- Red Nodexia: 70% (falta matching + notificaciones)
- Estabilización: 78 errores TypeScript
- CI/CD: No configurado
- E2E tests: Escritos pero no ejecutados

Estoy listo. ¿Qué quieres trabajar hoy?
```

---

## 🔗 PRÓXIMO PASO

Una vez completada la sesión, ejecuta:
**`PROTOCOLO-CIERRE-SESION-COPILOT.md`**

---

**Recuerda:** Este protocolo existe para que trabajes de forma autónoma y estructurada, manteniendo continuidad entre sesiones. Síguelo en cada sesión para máxima eficiencia.

---

*Última actualización: 17-Dic-2025*  
*Owner: Jary (usuario no-técnico)*  
*Builder: GitHub Copilot (tú)*
