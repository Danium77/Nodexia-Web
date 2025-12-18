# 📁 ESTRUCTURA DE DOCUMENTACIÓN - NODEXIA

**Para:** GitHub Copilot  
**Objetivo:** Saber exactamente dónde guardar cada tipo de documento  
**Última actualización:** 17-Dic-2025

---

## 🗂️ ESTRUCTURA COMPLETA

```
Nodexia-Web/
│
├── .session/                           ← CONTEXTO DE SESIONES (crítico)
│   ├── PROXIMA-SESION.md              ← Qué hacer en la próxima sesión
│   ├── CONTEXTO-ACTUAL.md             ← Estado completo del proyecto
│   ├── history/                       ← Historial de sesiones
│   │   ├── sesion-2025-12-17.md
│   │   ├── sesion-2025-12-16.md
│   │   └── [sesion-YYYY-MM-DD.md]
│   └── en-progreso/                   ← Notas temporales
│       └── notas-temp.md              (opcional, borrar al finalizar)
│
├── docs/                               ← DOCUMENTACIÓN TÉCNICA
│   ├── PROBLEMAS-CONOCIDOS.md         ← Bugs y limitaciones
│   ├── ARQUITECTURA-OPERATIVA.md      ← Cómo funciona el sistema
│   ├── DESIGN-SYSTEM.md               ← Guía de componentes UI
│   ├── FLUJO-ESTADOS-OPERACIONES.md   ← Lógica de estados
│   └── [otros docs técnicos].md
│
├── GUIAS/                              ← GUÍAS Y PROTOCOLOS
│   ├── PROTOCOLO-INICIO-SESION-COPILOT.md
│   ├── PROTOCOLO-CIERRE-SESION-COPILOT.md
│   ├── ESTRUCTURA-SESION-TRABAJO.md
│   ├── GUIA-AREAS-TECNICAS.md
│   └── QUICK-START-PROXIMA-SESION.md
│
├── RAIZ/                               ← DOCUMENTOS RAÍZ (solo esenciales)
│   ├── README.md                       ← Descripción del proyecto
│   ├── NODEXIA-VISION-COMPLETA.md      ← Visión y propuesta de valor
│   ├── NODEXIA-ROADMAP.md              ← Plan de desarrollo
│   └── INICIO-RAPIDO.md                ← Quick start para desarrollo
│
└── [código fuente]                     ← Tu código TypeScript/React
    ├── pages/
    ├── components/
    ├── lib/
    └── etc.
```

---

## 📋 REGLAS DE GUARDADO POR TIPO DE DOCUMENTO

### 1. CONTEXTO DE SESIÓN ← `.session/`

**Qué va aquí:** Información que cambia cada sesión

| Tipo de documento | Nombre del archivo | Cuándo actualizar |
|-------------------|-------------------|-------------------|
| Próxima sesión | `PROXIMA-SESION.md` | Al FINALIZAR cada sesión |
| Contexto actual | `CONTEXTO-ACTUAL.md` | Cuando hay cambios arquitectónicos |
| Historial de sesión | `history/sesion-[YYYY-MM-DD].md` | Al FINALIZAR cada sesión |
| Notas temporales | `en-progreso/notas-temp.md` | Durante sesión (opcional) |

**Ejemplos:**
```bash
.session/PROXIMA-SESION.md                    # Siempre actualizar al cerrar
.session/CONTEXTO-ACTUAL.md                   # Solo si cambió arquitectura
.session/history/sesion-2025-12-17.md         # Una por sesión
.session/en-progreso/notas-debugging.md       # Temporal, borrar luego
```

---

### 2. DOCUMENTACIÓN TÉCNICA ← `docs/`

**Qué va aquí:** Documentación que explica cómo funciona el sistema

| Tipo de documento | Nombre sugerido | Cuándo crear/actualizar |
|-------------------|-----------------|-------------------------|
| Bugs y limitaciones | `PROBLEMAS-CONOCIDOS.md` | Cuando encuentres bugs |
| Arquitectura | `ARQUITECTURA-OPERATIVA.md` | Cambios arquitectónicos |
| Flujos de estados | `FLUJO-ESTADOS-[FEATURE].md` | Al implementar lógica compleja |
| Diseño UI | `DESIGN-SYSTEM.md` | Al crear patrones UI |
| Integraciones | `INTEGRACION-[SERVICIO].md` | Al integrar servicios externos |
| Análisis UX | `ANALISIS-UX-[FEATURE].md` | Al diseñar flujos de usuario |

**Ejemplos:**
```bash
docs/PROBLEMAS-CONOCIDOS.md                   # Lista maestra de bugs
docs/ARQUITECTURA-OPERATIVA.md                # Cómo funciona todo
docs/FLUJO-ESTADOS-OPERACIONES.md             # Estados de operaciones
docs/INTEGRACION-SMTP-COMPLETA.md             # Cómo integrar SMTP
docs/GPS-TRACKING-IMPLEMENTACION.md           # Cómo funciona GPS tracking
```

---

### 3. GUÍAS Y PROTOCOLOS ← `GUIAS/` (NUEVO)

**Qué va aquí:** Guías de cómo trabajar, protocolos, frameworks

| Tipo de documento | Nombre del archivo | Cuándo actualizar |
|-------------------|-------------------|-------------------|
| Protocolo inicio | `PROTOCOLO-INICIO-SESION-COPILOT.md` | Raramente (ya está definido) |
| Protocolo cierre | `PROTOCOLO-CIERRE-SESION-COPILOT.md` | Raramente (ya está definido) |
| Estructura de trabajo | `ESTRUCTURA-SESION-TRABAJO.md` | Si mejoras el proceso |
| Guías técnicas | `GUIA-[TEMA].md` | Al crear guías nuevas |
| Quick starts | `QUICK-START-[TEMA].md` | Al simplificar procesos |

**Ejemplos:**
```bash
GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md      # Cómo arrancar sesión
GUIAS/PROTOCOLO-CIERRE-SESION-COPILOT.md      # Cómo cerrar sesión
GUIAS/GUIA-AREAS-TECNICAS.md                  # BD/Frontend/Backend
GUIAS/QUICK-START-PROXIMA-SESION.md           # Inicio rápido
```

---

### 4. DOCUMENTOS RAÍZ ← `/` (Root)

**Qué va aquí:** Solo documentos esenciales de alto nivel

| Tipo de documento | Nombre del archivo | Cuándo actualizar |
|-------------------|-------------------|-------------------|
| README principal | `README.md` | Cambios mayores al proyecto |
| Visión del proyecto | `NODEXIA-VISION-COMPLETA.md` | Cambios en visión de negocio |
| Roadmap | `NODEXIA-ROADMAP.md` | Al completar milestones |
| Inicio rápido dev | `INICIO-RAPIDO.md` | Setup nuevo o cambios mayores |
| Índice de docs | `INDICE-DOCUMENTACION.md` | Al agregar docs importantes |

**⚠️ REGLA:** Solo documentos que TODOS deben leer van en la raíz.

**Ejemplos:**
```bash
README.md                                      # Qué es Nodexia
NODEXIA-VISION-COMPLETA.md                     # Visión del negocio
NODEXIA-ROADMAP.md                             # Plan de desarrollo
INICIO-RAPIDO.md                               # Cómo empezar a desarrollar
INDICE-DOCUMENTACION.md                        # Mapa de toda la doc
```

---

## 🎯 FLOWCHART DE DECISIÓN

```
¿Qué tipo de documento necesitas crear/actualizar?
│
├─ ¿Es información de la sesión actual/siguiente?
│  └─ SÍ → .session/
│     ├─ ¿Es para la próxima sesión? → .session/PROXIMA-SESION.md
│     ├─ ¿Es resumen de esta sesión? → .session/history/sesion-[FECHA].md
│     ├─ ¿Es contexto general? → .session/CONTEXTO-ACTUAL.md
│     └─ ¿Son notas temporales? → .session/en-progreso/
│
├─ ¿Es documentación técnica del sistema?
│  └─ SÍ → docs/
│     ├─ ¿Es un bug? → docs/PROBLEMAS-CONOCIDOS.md
│     ├─ ¿Es arquitectura? → docs/ARQUITECTURA-OPERATIVA.md
│     ├─ ¿Es flujo de estados? → docs/FLUJO-ESTADOS-[FEATURE].md
│     └─ ¿Es integración? → docs/INTEGRACION-[SERVICIO].md
│
├─ ¿Es una guía o protocolo de trabajo?
│  └─ SÍ → GUIAS/
│     ├─ ¿Es protocolo? → GUIAS/PROTOCOLO-[TIPO].md
│     └─ ¿Es guía? → GUIAS/GUIA-[TEMA].md
│
└─ ¿Es documento de alto nivel del proyecto?
   └─ SÍ → / (raíz)
      ├─ ¿Visión/negocio? → NODEXIA-VISION-COMPLETA.md
      ├─ ¿Roadmap? → NODEXIA-ROADMAP.md
      └─ ¿README? → README.md
```

---

## 📝 TEMPLATES POR TIPO

### Template: Sesión Completa
**Ubicación:** `.session/history/sesion-[YYYY-MM-DD].md`

```markdown
# 📝 SESIÓN - [DD-MMM-YYYY]
**Duración:** [X] horas
**Objetivo inicial:** [...]
**Estado final:** [Completado/Parcial/Bloqueado]

## 🎯 OBJETIVO
[...]

## ✅ COMPLETADO
- [x] [Tarea 1]
- [x] [Tarea 2]

## 🔄 EN PROGRESO
- [ ] [Tarea X]

## ❌ NO COMPLETADO
- [ ] [Tarea Y]

## 🧪 TESTING
[Estado de tests]

## 🐛 BUGS ENCONTRADOS
[Lista de bugs]

## 💡 DECISIONES TÉCNICAS
[Decisiones importantes]

## 📚 DOCUMENTACIÓN ACTUALIZADA
- [ ] PROXIMA-SESION.md
- [ ] CONTEXTO-ACTUAL.md
- [ ] [Otros]

## 🎯 PRÓXIMA SESIÓN
[Qué hacer después]
```

---

### Template: Próxima Sesión
**Ubicación:** `.session/PROXIMA-SESION.md`

```markdown
# 🚀 PRÓXIMA SESIÓN - [FECHA]

## 📊 ESTADO ACTUAL
### Lo que se completó hoy:
- ✅ [...]

### Lo que quedó pendiente:
- ⏳ [...]

### Salud del proyecto:
- Tests: [X/Y]
- Errores TS: [X]
- Servidor: ✅

## 🎯 OBJETIVOS SUGERIDOS

### Opción A: [Título] ⭐ RECOMENDADO
**Por qué:** [...]
**Qué hacer:**
1. [Paso 1]
2. [Paso 2]

**Archivos a modificar:**
- 🗄️ BD: [...]
- ⚙️ Backend: [...]
- 🎨 Frontend: [...]

## 🐛 PROBLEMAS CONOCIDOS ACTIVOS
[Lista de bugs críticos]

## 💡 NOTAS IMPORTANTES
[Recordatorios]
```

---

### Template: Bug en PROBLEMAS-CONOCIDOS
**Ubicación:** `docs/PROBLEMAS-CONOCIDOS.md`

```markdown
### [TÍTULO DEL BUG] 🐛
**Descubierto:** [FECHA]
**Severidad:** [Crítico/Alto/Medio/Bajo]
**Afecta a:** [Funcionalidad]

**Descripción:**
[Qué pasa]

**Reproducción:**
1. [Paso 1]
2. [Paso 2]

**Workaround temporal:**
[Si existe]

**Solución propuesta:**
[Ideas]

**Archivos involucrados:**
- `[archivo1]` línea [X]
```

---

## 🔄 FLUJO DE TRABAJO CON DOCUMENTACIÓN

### Durante la sesión:

```
1. INICIO
   ├─ Leer .session/PROXIMA-SESION.md
   ├─ Leer .session/CONTEXTO-ACTUAL.md
   └─ Leer docs/PROBLEMAS-CONOCIDOS.md

2. TRABAJO
   ├─ (Opcional) Crear .session/en-progreso/notas-temp.md
   ├─ Si encuentras bug → Agregar a docs/PROBLEMAS-CONOCIDOS.md
   ├─ Si cambias arquitectura → Actualizar docs/ARQUITECTURA-OPERATIVA.md
   └─ Si creas feature compleja → Crear docs/FLUJO-[FEATURE].md

3. CIERRE
   ├─ Crear .session/history/sesion-[FECHA].md
   ├─ Actualizar .session/PROXIMA-SESION.md
   ├─ Actualizar .session/CONTEXTO-ACTUAL.md (si aplica)
   └─ Borrar .session/en-progreso/ (si usaste)
```

---

## 🧹 LIMPIEZA Y MANTENIMIENTO

### Cada 5-10 sesiones:

```bash
# 1. Revisar que no haya documentación duplicada
# 2. Mover docs muy antiguos a archivo/
# 3. Actualizar INDICE-DOCUMENTACION.md
# 4. Revisar que .gitignore incluya .session/en-progreso/
```

### Qué NO versionar (agregar a `.gitignore`):

```
.session/en-progreso/
.session/*.temp.md
```

### Qué SÍ versionar:

```
.session/PROXIMA-SESION.md
.session/CONTEXTO-ACTUAL.md
.session/history/*.md
docs/**/*.md
GUIAS/**/*.md
```

---

## 📊 CHECKLIST DE DOCUMENTACIÓN

### Al finalizar cada sesión:

```markdown
- [ ] Creé .session/history/sesion-[FECHA].md
- [ ] Actualicé .session/PROXIMA-SESION.md
- [ ] Actualicé .session/CONTEXTO-ACTUAL.md (si aplica)
- [ ] Documenté bugs en docs/PROBLEMAS-CONOCIDOS.md (si aplica)
- [ ] Actualicé docs técnicos relevantes (si aplica)
- [ ] Borré archivos temporales de .session/en-progreso/
- [ ] Todo commiteado con mensajes claros
```

---

## 🎓 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Sesión normal

```bash
# INICIO
- Leo .session/PROXIMA-SESION.md → "Completar Red Nodexia"
- Leo .session/CONTEXTO-ACTUAL.md → Progreso 80%
- Leo docs/PROBLEMAS-CONOCIDOS.md → 78 errores TS

# DURANTE
- Trabajo en Red Nodexia
- Encuentro bug en notificaciones
  → Documento en docs/PROBLEMAS-CONOCIDOS.md

# CIERRE
- Creo .session/history/sesion-2025-12-17.md
- Actualizo .session/PROXIMA-SESION.md con:
  - Opción A: Terminar testing Red Nodexia
  - Opción B: Arreglar bug de notificaciones
```

---

### Ejemplo 2: Feature nueva compleja

```bash
# INICIO
- Leo .session/PROXIMA-SESION.md → "Implementar facturación"

# DURANTE
- Creo nueva tabla en BD
- Implemento lógica de Stripe
- Es complejo, documento:
  → docs/INTEGRACION-STRIPE.md
  → docs/FLUJO-FACTURACION.md

# CIERRE
- Actualizo .session/CONTEXTO-ACTUAL.md (nueva integración)
- Creo .session/history/sesion-2025-12-17.md
- Actualizo .session/PROXIMA-SESION.md con próximos pasos
```

---

### Ejemplo 3: Sesión de debugging

```bash
# INICIO
- Leo .session/PROXIMA-SESION.md → "Investigar errores TS"

# DURANTE
- Uso .session/en-progreso/notas-debugging.md
  (anoto hipótesis, pruebas, resultados)
- Encuentro 3 bugs:
  → Documento en docs/PROBLEMAS-CONOCIDOS.md

# CIERRE
- Borro .session/en-progreso/notas-debugging.md
- Creo .session/history/sesion-2025-12-17.md
  (incluyo análisis de errores encontrados)
- Actualizo .session/PROXIMA-SESION.md
  (propongo plan para arreglar los bugs)
```

---

## 🚀 SIGUIENTE PASO

Ahora que tienes la estructura definida:

1. ✅ Carpetas creadas
2. ✅ Protocolos listos
3. ✅ Templates definidos

**Para iniciar tu próxima sesión con este sistema:**

→ Lee `GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md`

---

**Esta estructura te permite:**
- ✅ Continuidad perfecta entre sesiones
- ✅ Documentación organizada y encontrable
- ✅ Contexto siempre disponible para Copilot
- ✅ Historial completo de decisiones

---

*Última actualización: 17-Dic-2025*  
*Siguiente revisión: Cuando agregues tipos de documentos nuevos*
