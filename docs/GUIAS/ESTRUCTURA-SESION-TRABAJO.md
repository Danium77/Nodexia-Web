# 🎯 ESTRUCTURA PROFESIONAL DE SESIÓN DE TRABAJO - NODEXIA

**Director de Proyecto:** GitHub Copilot  
**Product Owner:** Jary (Tú)  
**Metodología:** Agile adaptada para desarrollador individual con IA  
**Última actualización:** 17 de Diciembre, 2025

---

## 📋 CONTEXTO DEL PROYECTO

### Estado Actual (Análisis Completo)
- **Progreso estimado:** ~75-80% ✅
- **Arquitectura:** Sólida y bien documentada
- **Funcionalidades core:** Operativas
- **Testing:** Implementado (50 tests pasando)
- **Documentación:** Excelente (~30 documentos)

### Áreas Completadas
✅ Sistema de autenticación multi-rol  
✅ Gestión de empresas (planta/transporte/cliente)  
✅ Dashboard coordinador de planta  
✅ Dashboard coordinador de transporte  
✅ Sistema de estados duales (unidad + carga)  
✅ Control de acceso con QR  
✅ Tracking GPS en tiempo real  
✅ Red Nodexia (marketplace) - 70%  
✅ Invitaciones de usuarios sin SMTP  
✅ Planificación visual  

### Áreas en Progreso/Pendientes
🟡 Red Nodexia - Integración completa  
🟡 Calificaciones cruzadas  
🟡 Analytics y reportes avanzados  
🟡 Testing E2E completo  
🟡 Corrección de errores TypeScript (~78 errores)  
🟡 Optimización de performance  

---

## 🏗️ ESTRUCTURA DE UNA SESIÓN DE TRABAJO

### ⏰ Duración Recomendada: 2-4 horas
*Basado en las mejores prácticas de trabajo con IA y prevención de burnout*

---

## 📍 FASE 1: PREPARACIÓN (10-15 min)

### 1.1 Revisión del Estado Anterior
```powershell
# 1. Abrir terminal y navegar al proyecto
cd C:\Users\nodex\Nodexia-Web

# 2. Revisar último estado documentado
# Leer: docs/ESTADO-CONTINUACION-16-DIC-2025.md (o el más reciente)

# 3. Verificar que el entorno funciona
pnpm dev
# Abrir: http://localhost:3000
# Probar login rápido para confirmar que todo está OK
```

**Checklist Pre-Sesión:**
- [ ] Servidor de desarrollo inicia sin errores
- [ ] Puedes hacer login con credenciales de prueba
- [ ] No hay errores críticos en la consola del navegador
- [ ] Sabes qué vas a trabajar hoy

### 1.2 Definir Objetivo de la Sesión
**Pregunta clave:** *"¿Qué quiero lograr HOY?"*

**Ejemplos de objetivos SMART:**
- ❌ MAL: "Mejorar la app"
- ✅ BIEN: "Completar el flujo de calificaciones de transportes"
- ❌ MAL: "Arreglar bugs"
- ✅ BIEN: "Corregir los 10 errores TypeScript de crear-despacho.tsx"

**Template para definir objetivo:**
```markdown
### Objetivo de Hoy: [Título descriptivo]
**Resultado esperado:** [Qué debe funcionar al terminar]
**Tiempo estimado:** [Realista: 2-4 horas]
**Archivos a tocar:** [Lista específica]
**Criterio de éxito:** [Cómo saber que terminaste]
```

---

## 📍 FASE 2: PLANIFICACIÓN (15-20 min)

### 2.1 Descomponer el Objetivo en Tareas
**Método:** Dividir en subtareas de 30-45 minutos cada una

**Ejemplo práctico:**
```
Objetivo: Implementar calificaciones de transportes

Tareas:
1. [ ] Crear tabla calificaciones_viajes en Supabase (30 min)
2. [ ] Crear componente CalificarViajeModal (45 min)
3. [ ] Crear API /api/viajes/[id]/calificar (30 min)
4. [ ] Integrar en ViajeDetalleModal (30 min)
5. [ ] Mostrar promedio en perfil de transporte (30 min)
6. [ ] Testing manual del flujo completo (20 min)

Total: ~3 horas
```

### 2.2 Priorizar con MoSCoW
- **Must Have (🔴):** Sin esto, la feature no sirve
- **Should Have (🟡):** Importante pero no bloqueante
- **Could Have (🟢):** Nice to have, si sobra tiempo
- **Won't Have (⚪):** Explícitamente fuera de scope HOY

### 2.3 Identificar Riesgos
**Pregúntate:**
- ¿Qué podría bloquearme?
- ¿Necesito información que no tengo?
- ¿Hay dependencias de otros sistemas?

**Mitigación:**
- Tener un Plan B más simple
- Documentar dudas para consultar

---

## 📍 FASE 3: EJECUCIÓN (90-180 min)

### 3.1 Configurar Entorno de Desarrollo Dual
```powershell
# Terminal 1: Servidor de desarrollo
pnpm dev

# Terminal 2: Tests en modo watch (opcional pero recomendado)
pnpm run test:watch

# Terminal 3: Comandos ad-hoc (git, scripts, etc.)
# Mantener libre
```

### 3.2 Ciclo de Desarrollo por Tarea

**Para CADA tarea de tu lista:**

#### A. Contexto para Copilot (2-3 min)
Antes de pedir código, proporciona:
```
Contexto:
- Objetivo: [Qué quieres lograr]
- Archivo actual: [Nombre y ubicación]
- Estado: [Qué ya existe]
- Problema: [Qué necesitas resolver]
```

#### B. Implementación (30-45 min)
```
1. Pedir código a Copilot
2. Revisar y entender el código generado
3. Implementar
4. Ver errores en consola/terminal
5. Iterar con Copilot para corregir
6. Repetir hasta que funcione
```

#### C. Validación Inmediata (5-10 min)
```powershell
# 1. Verificar en navegador
http://localhost:3000/ruta-relevante

# 2. Revisar tests (si aplicable)
pnpm test

# 3. Verificar TypeScript
pnpm type-check

# 4. Hacer commit pequeño
git add .
git commit -m "feat: [descripción corta de lo implementado]"
```

**⚠️ REGLA DE ORO: Commit frecuente**
- Cada tarea completada = 1 commit
- Así puedes volver atrás si algo se rompe
- Commits = puntos de guardado

#### D. Descanso Micro (5 min cada hora)
- Levantarse, caminar
- Tomar agua
- Alejar vista de la pantalla
- **Previene fatiga mental**

### 3.3 Gestión de Bloqueos

**Si te atascas más de 20 minutos:**

1. **Pausa y reformula**
   - ¿El problema está bien definido?
   - ¿Copilot tiene suficiente contexto?

2. **Simplifica**
   - ¿Puedes hacer una versión más simple primero?
   - ¿Puedes dividir el problema en partes menores?

3. **Busca patrones existentes**
   - ¿Ya hay algo similar en el código?
   - Usa: `grep -r "patrón_similar" .`

4. **Documenta y avanza**
   - Anota el bloqueo en `docs/PROBLEMAS-CONOCIDOS.md`
   - Pasa a la siguiente tarea
   - Retoma después con mente fresca

---

## 📍 FASE 4: VALIDACIÓN (20-30 min)

### 4.1 Testing Manual Completo
```
[ ] Flujo principal funciona end-to-end
[ ] Casos edge (vacío, null, error) no rompen la app
[ ] UI se ve bien en escritorio
[ ] UI se ve bien en móvil (DevTools responsive mode)
[ ] No hay errores en consola del navegador
[ ] No hay errores en terminal del servidor
```

### 4.2 Testing Automatizado
```powershell
# Ejecutar tests
pnpm test

# Ver cobertura (opcional)
pnpm run test:coverage

# TypeScript
pnpm type-check

# Linter
pnpm lint
```

### 4.3 Checklist de Calidad
```
[ ] Código legible y con comentarios donde es complejo
[ ] Sin console.log() olvidados (o con //TODO si son temporales)
[ ] Sin código comentado (git lo guarda, bórralo)
[ ] Nombres de variables descriptivos
[ ] Funciones < 50 líneas (idealmente)
```

---

## 📍 FASE 5: CIERRE (15-20 min)

### 5.1 Commit Final y Push
```powershell
# Commit de cualquier cambio pendiente
git add .
git commit -m "chore: final tweaks de la sesión"

# Push al repo (si usas remoto)
git push origin main
```

### 5.2 Documentar la Sesión
**Crear archivo:** `docs/SESION-[FECHA].md`

**Template:**
```markdown
# SESIÓN DE TRABAJO - [DD-MM-YYYY]

## Objetivo
[El objetivo que definiste al inicio]

## Completado
✅ [Tarea 1]
✅ [Tarea 2]
🔄 [Tarea 3] - En progreso

## Decisiones Técnicas
- [Decisión importante tomada]
- [Por qué se eligió X sobre Y]

## Problemas Encontrados
- [Problema] → Solución: [Cómo se resolvió]
- [Bloqueado] → Requiere: [Qué se necesita]

## Próximos Pasos
1. [Siguiente tarea más importante]
2. [Segunda prioridad]
3. [Tercera prioridad]

## Tiempo Invertido
- Planificación: X min
- Desarrollo: Y min
- Testing: Z min
- Total: W horas

## Estado del Proyecto
[Breve resumen del progreso general]
```

### 5.3 Actualizar Documentación Principal
```powershell
# Actualizar el estado continuado
# Editar: docs/ESTADO-CONTINUACION-[FECHA-HOY].md

# Si completaste algo importante:
# Editar: NODEXIA-ROADMAP.md (marcar como completado)
```

### 5.4 Preparar Próxima Sesión
```markdown
## Para la próxima sesión:
- [ ] [Primera tarea a abordar]
- [ ] [Segunda tarea]

## Dudas pendientes:
- [Pregunta técnica a investigar]
- [Decisión de diseño a tomar]

## Recordatorios:
- [No olvidar hacer X]
```

---

## 🎯 TIPOS DE SESIONES ESPECIALIZADAS

### A. Sesión de Feature Nueva (2-4 horas)
```
10% - Diseño técnico
30% - Implementación backend (API + DB)
30% - Implementación frontend (UI + lógica)
20% - Integración y testing
10% - Documentación
```

### B. Sesión de Bug Fixing (2-3 horas)
```
20% - Reproducir y entender el bug
30% - Investigar causa raíz
30% - Implementar fix
10% - Testing regresión
10% - Documentar solución
```

### C. Sesión de Refactoring (2-4 horas)
```
15% - Identificar código a refactorizar
10% - Diseñar estructura mejorada
40% - Refactorizar gradualmente
25% - Testing exhaustivo
10% - Documentar cambios
```

### D. Sesión de Testing (2-3 horas)
```
20% - Planificar tests a crear
50% - Escribir tests
20% - Ejecutar y verificar cobertura
10% - Documentar gaps de testing
```

### E. Sesión de Documentación (1-2 horas)
```
40% - Revisar código sin documentar
40% - Escribir/actualizar docs
20% - Organizar estructura de docs
```

---

## 📊 MÉTRICAS DE PROGRESO

### Tracking Semanal
Crear archivo: `PROGRESO-SEMANAL-[FECHA].md`

```markdown
## Semana del [DD-MM] al [DD-MM]

### Sesiones Realizadas
- Lunes: [Objetivo] - [Resultado]
- Miércoles: [Objetivo] - [Resultado]
- Viernes: [Objetivo] - [Resultado]

### Features Completadas
1. [Feature X] - 100%
2. [Feature Y] - 60%

### Bugs Resueltos
- [Bug crítico Z]
- [Bug menor W]

### Líneas de Código
- Agregadas: XXX
- Eliminadas: YYY
- Tests: +ZZZ

### Bloqueadores Actuales
- [Bloqueador 1]
- [Bloqueador 2]

### Plan Próxima Semana
1. [Objetivo 1]
2. [Objetivo 2]
```

---

## 🚨 SITUACIONES ESPECIALES

### Cuando No Sabes Qué Hacer Después
```
1. Leer: NODEXIA-ROADMAP.md
2. Revisar: docs/PROBLEMAS-CONOCIDOS.md
3. Ejecutar: pnpm type-check
4. Buscar: // TODO en el código
5. Preguntar a Copilot: "¿Qué debería priorizar?"
```

### Cuando Todo Se Rompió
```
1. NO ENTRES EN PÁNICO
2. git log --oneline (ver último commit bueno)
3. git diff (ver qué cambió)
4. git checkout [archivo] (restaurar archivo específico)
5. O git reset --hard [commit] (volver a commit anterior)
6. Respirar hondo y empezar de nuevo
```

### Cuando Estás Cansado/Frustrado
```
1. PARAR INMEDIATAMENTE
2. Guardar trabajo actual (git stash)
3. Cerrar la laptop
4. Hacer algo completamente diferente (caminar, café, etc.)
5. Volver al día siguiente
6. Tu cerebro seguirá procesando el problema en background
```

---

## 📚 RECURSOS DE CONSULTA RÁPIDA

### Durante Desarrollo
- **Arquitectura:** `docs/ARQUITECTURA-OPERATIVA.md`
- **Problemas comunes:** `docs/PROBLEMAS-CONOCIDOS.md`
- **Credenciales:** `docs/CREDENCIALES-OFICIALES.md`
- **API patterns:** Buscar en `pages/api/` archivos similares

### Para Planning
- **Visión general:** `NODEXIA-VISION-COMPLETA.md`
- **Roadmap:** `NODEXIA-ROADMAP.md`
- **Estado actual:** `docs/ESTADO-CONTINUACION-[última-fecha].md`

### Para Testing
- **Guía de tests:** `TESTING-README.md`
- **Ejecutar tests:** `pnpm test`
- **Ver cobertura:** `pnpm run test:coverage`

---

## 🎓 MEJORES PRÁCTICAS APRENDIDAS

### DO ✅
- Commitear frecuentemente (cada 30-60 min)
- Documentar decisiones importantes
- Testear manualmente después de cada cambio
- Hacer pausas regulares
- Pedir contexto específico a Copilot
- Simplificar antes de complicar

### DON'T ❌
- Sesiones > 4 horas sin pausa larga
- Implementar múltiples features a la vez
- Dejar código sin commitear overnight
- Ignorar warnings de TypeScript/ESLint
- Copiar código sin entenderlo
- Refactorizar sin tests

---

## 🚀 PLANTILLA: INICIO DE SESIÓN

**Copia esto al chat de Copilot al iniciar cada sesión:**

```markdown
## 🎯 SESIÓN DE TRABAJO - [FECHA]

### Contexto
- Proyecto: Nodexia Web (plataforma logística SaaS B2B)
- Tecnología: Next.js 15, TypeScript, Supabase, Tailwind
- Progreso: ~80% completado
- Último trabajo: [Consultar docs/ESTADO-CONTINUACION-más-reciente.md]

### Objetivo de Hoy
[Describir en 1-2 líneas qué quieres lograr]

### Tareas Planificadas
1. [ ] [Tarea 1] - [Tiempo estimado]
2. [ ] [Tarea 2] - [Tiempo estimado]
3. [ ] [Tarea 3] - [Tiempo estimado]

### Preguntas/Dudas
- [Pregunta 1]
- [Pregunta 2]

### Comenzamos con la Tarea 1:
[Describir la primera tarea en detalle]
```

---

## 📞 PROTOCOLO DE ESCALACIÓN

### Nivel 1: Auto-resolución (0-30 min)
- Buscar en docs/
- Buscar en código existente
- Googlear error específico
- Consultar a Copilot con buen contexto

### Nivel 2: Documentar y Avanzar (30-60 min)
- Anotar problema en PROBLEMAS-CONOCIDOS.md
- Buscar workaround temporal
- Continuar con siguiente tarea
- Retomar con mente fresca

### Nivel 3: Investigación Profunda (>60 min)
- Dedicar sesión completa a resolver ese problema
- Investigar arquitectura relacionada
- Probar diferentes enfoques
- Documentar hallazgos aunque no resuelvas

### Nivel 4: Replantear Enfoque
- Tal vez la solución es simplificar
- Tal vez el problema no es prioritario
- Tal vez necesitas más conocimiento del dominio
- Consultar con stakeholders (si aplica)

---

## ✅ CHECKLIST FINAL DE SESIÓN

```
[ ] Objetivo de hoy cumplido (o progreso documentado)
[ ] Todos los cambios commiteados
[ ] Tests pasando (pnpm test)
[ ] Servidor dev funciona sin errores
[ ] Documentación actualizada
[ ] Próximos pasos identificados
[ ] Bloqueos documentados (si los hay)
[ ] Entorno de trabajo cerrado correctamente
```

---

## 🎯 RECUERDA

> **"El desarrollo no es una carrera de velocidad, es un maratón."**

- **Consistencia** > Intensidad esporádica
- **Pequeños avances diarios** > Grandes sesiones semanales
- **Código funcional simple** > Código perfecto complejo
- **Documentar mientras trabajas** > Documentar al final
- **Preguntar antes de asumir** > Implementar y rehacer

---

**Este documento ES tu copiloto humano cuando trabajes con el copiloto de IA.**

Actualízalo si encuentras mejores formas de trabajar.

---

*Creado: 17 de Diciembre, 2025*  
*Para: Jary, Product Owner de Nodexia*  
*Por: GitHub Copilot, Director de Proyecto*
