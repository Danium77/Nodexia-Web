# SISTEMA DE MEMORIA PERSISTENTE

Esta carpeta contiene el "cerebro externo" de Opus (y del equipo virtual de agentes).

## 🧠 ¿Qué es esto?

Como los agentes IA no tienen memoria entre sesiones, estos archivos actúan como memoria persistente. **Son actualizados automáticamente** por Opus al inicio y cierre de cada sesión.

## 📁 Estructura

```
.copilot/
├── PROJECT-STATE.md         # Estado general del proyecto
├── TASKS-ACTIVE.md          # Tareas activas y pendientes
├── WORK-LOG.md              # Log cronológico de trabajo
├── DECISIONS.md             # Decisiones técnicas importantes
├── sessions/                # Log detallado por sesión
│   ├── 2026-02-08.md
│   └── ...
└── tasks/                   # Tareas específicas para Sonnet
    ├── TASK-001-xxx.md
    └── ...
```

## 🚫 NO MODIFICAR MANUALMENTE

Estos archivos son gestionados automáticamente por Opus. Modificarlos manualmente puede causar pérdida de contexto.

**Excepción:** Si Opus te pide explícitamente que edites algo.

## 📖 CÓMO USAR

### Al iniciar sesión:
```
Usuario: "Opus, nueva sesión. Cargar contexto."
```

Opus leerá automáticamente estos archivos y continuará desde donde quedó.

### Al cerrar sesión:
```
Usuario: "Opus, cerrar sesión."
```

Opus actualizará todos los archivos con el progreso de hoy.

## 🔍 SOLO LECTURA

Puedes leer estos archivos cuando quieras para ver:
- En qué estado está el proyecto
- Qué tareas están pendientes
- Qué decisiones se tomaron y por qué
- Qué pasó en sesiones anteriores

Pero **no los edites** a menos que Opus te lo indique.

## 📜 GIT

Se recomienda **NO subir esta carpeta a git público** (puede contener información sensible).

Agregar a `.gitignore`:
```
.copilot/
```

Pero **SÍ hacer backup local** periódicamente.

---

**Más info:** Ver `docs/QUICK-START-OPUS.md`
