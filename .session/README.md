# 📁 Carpeta `.session/` - Sistema de Sesiones Estructuradas

Esta carpeta contiene el contexto de trabajo entre sesiones para que **GitHub Copilot pueda trabajar de forma autónoma y estructurada**.

---

## 📂 Estructura

```
.session/
├── PROXIMA-SESION.md           # Qué hacer en la siguiente sesión
├── CONTEXTO-ACTUAL.md          # Estado completo del proyecto
├── README.md                   # Este archivo
├── history/                    # Historial de sesiones
│   ├── sesion-2025-12-17.md
│   ├── sesion-2025-12-18.md
│   └── [más sesiones...]
└── en-progreso/                # Notas temporales (no versionadas)
    └── *.temp.md
```

---

## 📄 Archivos Principales

### `PROXIMA-SESION.md`
**Propósito:** Guía para Copilot al iniciar la próxima sesión

**Contenido:**
- Resumen de última sesión
- Tareas pendientes priorizadas
- Opciones sugeridas de trabajo
- Contexto específico necesario
- Problemas activos que resolver

**Actualización:** Al FINALIZAR cada sesión (automático por Copilot)

---

### `CONTEXTO-ACTUAL.md`
**Propósito:** Fuente de verdad del estado completo del proyecto

**Contenido:**
- Arquitectura técnica actual
- Features completadas/en progreso/pendientes
- Stack tecnológico
- Métricas del proyecto (tests, errores, etc.)
- Decisiones técnicas importantes
- Roadmap y milestones

**Actualización:** Solo cuando hay cambios arquitectónicos significativos

---

### `history/sesion-YYYY-MM-DD.md`
**Propósito:** Documentación completa de cada sesión de trabajo

**Contenido:**
- Objetivo de la sesión
- Tareas completadas/pendientes
- Cambios técnicos (BD/Backend/Frontend)
- Bugs encontrados/resueltos
- Decisiones técnicas tomadas
- Métricas de la sesión
- Preparación para siguiente sesión

**Creación:** Al FINALIZAR cada sesión (automático por Copilot)

---

### `en-progreso/` (carpeta)
**Propósito:** Notas temporales durante la sesión

**Contenido:**
- Notas de debugging
- Hipótesis y pruebas
- TODOs temporales
- Investigaciones en progreso

**⚠️ IMPORTANTE:** Estos archivos NO se versionan (están en `.gitignore`)

**Limpieza:** Borrar o mover a `history/` al finalizar sesión

---

## 🚀 Cómo Usar Este Sistema

### Para el Usuario (Jary)

**Al iniciar una sesión:**

```markdown
Hola Copilot! Voy a trabajar en Nodexia hoy.

Lee GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md y empecemos.
```

Copilot leerá automáticamente:
1. `.session/PROXIMA-SESION.md`
2. `.session/CONTEXTO-ACTUAL.md`
3. `docs/PROBLEMAS-CONOCIDOS.md`

Y te presentará opciones de trabajo estructuradas.

---

### Para Copilot

**Al iniciar sesión:**
1. Lee `GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md`
2. Sigue el protocolo paso a paso
3. Lee estos archivos en orden:
   - `.session/PROXIMA-SESION.md`
   - `.session/CONTEXTO-ACTUAL.md`
   - `docs/PROBLEMAS-CONOCIDOS.md`

**Al finalizar sesión:**
1. Lee `GUIAS/PROTOCOLO-CIERRE-SESION-COPILOT.md`
2. Sigue el protocolo paso a paso
3. Crea/actualiza:
   - `.session/history/sesion-[FECHA-HOY].md`
   - `.session/PROXIMA-SESION.md`
   - `.session/CONTEXTO-ACTUAL.md` (si aplica)

---

## 📋 Checklist Rápida

### Inicio de Sesión
- [ ] Leí `.session/PROXIMA-SESION.md`
- [ ] Leí `.session/CONTEXTO-ACTUAL.md`
- [ ] Confirmé objetivo con usuario
- [ ] Creé TODO list

### Cierre de Sesión
- [ ] Creé `.session/history/sesion-[FECHA].md`
- [ ] Actualicé `.session/PROXIMA-SESION.md`
- [ ] Actualicé `.session/CONTEXTO-ACTUAL.md` (si aplica)
- [ ] Borré archivos temporales de `en-progreso/`

---

## 🎯 Beneficios de Este Sistema

### ✅ Para el Usuario
- Copilot sabe exactamente qué hacer al empezar
- Continuidad perfecta entre sesiones
- Historial completo de decisiones
- No necesitas explicar contexto cada vez

### ✅ Para Copilot
- Contexto siempre disponible
- Protocolos claros a seguir
- Menos ambigüedad
- Trabajo más autónomo

### ✅ Para el Proyecto
- Documentación automática
- Trazabilidad de cambios
- Análisis retrospectivo fácil
- Onboarding rápido de nuevos colaboradores

---

## 🔄 Flujo de Trabajo Visual

```
┌─────────────────────────────────────────────────────┐
│  USUARIO INICIA SESIÓN                              │
│  "Hola Copilot, voy a trabajar en Nodexia"         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  COPILOT LEE CONTEXTO                               │
│  1. .session/PROXIMA-SESION.md                      │
│  2. .session/CONTEXTO-ACTUAL.md                     │
│  3. docs/PROBLEMAS-CONOCIDOS.md                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  COPILOT PRESENTA OPCIONES                          │
│  "Última sesión: X"                                 │
│  "Opciones sugeridas: A, B, C"                      │
│  "¿Con cuál empezamos?"                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  TRABAJO EN LA SESIÓN                               │
│  - Implementación                                    │
│  - Testing                                           │
│  - Documentación                                     │
│  - Commits                                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  COPILOT CIERRA SESIÓN                              │
│  1. Crea history/sesion-[FECHA].md                  │
│  2. Actualiza PROXIMA-SESION.md                     │
│  3. Actualiza CONTEXTO-ACTUAL.md (si aplica)        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  SIGUIENTE SESIÓN LISTA                             │
│  Todo documentado y preparado                       │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Documentos Relacionados

**Protocolos:**
- `GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md` - Cómo arrancar sesión
- `GUIAS/PROTOCOLO-CIERRE-SESION-COPILOT.md` - Cómo cerrar sesión
- `GUIAS/ESTRUCTURA-DOCUMENTACION.md` - Dónde guardar cada documento

**Guías:**
- `GUIAS/ESTRUCTURA-SESION-TRABAJO.md` - Framework de 5 fases
- `GUIAS/QUICK-START-PROXIMA-SESION.md` - Inicio rápido
- `GUIAS/GUIA-AREAS-TECNICAS.md` - BD/Frontend/Backend

---

## ⚠️ IMPORTANTE

### ✅ SÍ versionar (commit a Git)
- `.session/PROXIMA-SESION.md`
- `.session/CONTEXTO-ACTUAL.md`
- `.session/history/*.md`
- `.session/README.md`

### ❌ NO versionar (en .gitignore)
- `.session/en-progreso/*.temp.md`
- `.session/en-progreso/notas-*.md`
- Cualquier archivo temporal

### 🗑️ Limpiar regularmente
- Borrar archivos en `en-progreso/` al finalizar sesión
- Revisar `history/` cada 10-20 sesiones (mover antiguos a archivo si es necesario)

---

## 🆘 Troubleshooting

### "Copilot no encuentra el contexto"
→ Verifica que exista `.session/PROXIMA-SESION.md`
→ Si no existe, Copilot usará documentación general

### "Los archivos no se actualizan"
→ Copilot debe ejecutar PROTOCOLO-CIERRE-SESION al terminar
→ Recuérdale cerrar sesión formalmente

### "Hay información desactualizada"
→ Usuario puede actualizar manualmente `.session/PROXIMA-SESION.md`
→ O Copilot lo hará en próxima sesión

### "Quiero resetear todo"
→ Borrar `.session/PROXIMA-SESION.md` y `CONTEXTO-ACTUAL.md`
→ Copilot los regenerará desde documentación general

---

**Sistema implementado:** 17-Dic-2025  
**Versión:** 1.0  
**Mantenido por:** GitHub Copilot (automático)

---

*Este sistema permite trabajo autónomo y estructurado entre sesiones, maximizando la eficiencia del desarrollo con IA.*
