# MVP ROADMAP - 10 DÍAS

**Objetivo:** Demo funcional end-to-end para presentación  
**Fecha inicio:** 08-Feb-2026 (Hoy)  
**Fecha presentación:** 18-Feb-2026  
**Días disponibles:** 10 días  
**Enfoque:** Features críticas funcionales desde UI

---

## 🎯 CRITERIOS DE ÉXITO MVP

### Demo debe mostrar:
1. ✅ Flujo completo: Despacho → Asignación → Tracking → Control Acceso → Entrega
2. ✅ Multi-tenant funcionando (Planta vs Transporte)
3. ✅ Gestión de documentación integrada
4. ✅ UI profesional y responsive
5. ✅ Sin datos hardcoded, todo desde UI
6. ✅ Sin crashes durante demo de 15-20 min

### NO se espera (post-MVP):
- ❌ Tests exhaustivos
- ❌ Performance optimization
- ❌ Código perfectamente refactorizado
- ❌ Consolidación completa de BD

---

## 📊 FEATURES FALTANTES (PRIORIZADO)

### 🔴 CRÍTICAS (Bloquean demo):

#### 1. Control de Acceso - Verificación de Documentación
- **Estado actual:** Escanea QR, muestra datos
- **Falta:** Habilitar/deshabilitar botón de ingreso según docs vigentes
- **Archivos:** `pages/control-acceso.tsx`, API nueva
- **Tiempo:** 4-6 horas

#### 2. Control de Acceso - Gestión de Incidencias
- **Estado actual:** API existe pero no integrada
- **Falta:** UI para crear incidencia cuando docs vencidos
- **Archivos:** `pages/control-acceso.tsx`, `pages/api/control-acceso/crear-incidencia.ts`
- **Tiempo:** 3-4 horas

#### 3. Control de Acceso - Proceso de Egreso
- **Estado actual:** Solo maneja ingreso
- **Falta:** Detectar estado y mostrar botón de egreso
- **Archivos:** `pages/control-acceso.tsx`
- **Tiempo:** 2-3 horas

#### 4. Gestión de Documentación - Upload (Transporte/Chofer)
- **Estado actual:** No existe
- **Falta:** UI para subir docs (PDF/imágenes) a Supabase Storage
- **Archivos:** Módulo nuevo `modules/documentacion/`
- **Tiempo:** 8-10 horas

#### 5. Gestión de Documentación - Validación (Admin Nodexia)
- **Estado actual:** No existe
- **Falta:** Panel para validar/rechazar docs subidos
- **Archivos:** `pages/admin/documentacion.tsx` (nuevo)
- **Tiempo:** 6-8 horas

### 🟡 IMPORTANTES (Mejoran demo):

#### 6. Alertas de Vencimiento de Documentación
- **Estado actual:** No existe
- **Falta:** Badge/notificación cuando docs por vencer
- **Tiempo:** 2-3 horas

#### 7. Vista de Documentación en Unidad Operativa
- **Estado actual:** No se muestra documentación
- **Falta:** Ver estado docs al seleccionar unidad
- **Tiempo:** 3-4 horas

### 🟢 OPCIONALES (Si sobra tiempo):

#### 8. Dashboard con Métricas Visuales
- Tiempo: 4-5 horas

#### 9. Mejoras UX/UI Generales
- Tiempo: Variable

---

## 📅 PLAN DÍA POR DÍA

### 🗓️ DÍA 1 - Viernes 08-Feb (HOY)

**Objetivo:** Setup + Auditoría express

#### Mañana (3 horas):
- [x] Crear sistema de memoria (.copilot/) ✅
- [x] Crear POST-MVP-PLAN.md ✅
- [x] Crear MVP-ROADMAP.md ✅ (este doc)
- [ ] Auditoría express de BD

#### Tarde (2-3 horas):
- [ ] Ejecutar SQL 046_CORREGIDO (documentos_entidad)
- [ ] Configurar Supabase Storage buckets
- [ ] Verificar que funciona sin errores
- [ ] Crear issue tracker en TASKS-ACTIVE.md

**Entregable:** BD lista para documentación + Sistema de seguimiento activo

---

### 🗓️ DÍA 2 - Sábado 09-Feb

**Objetivo:** Upload de documentación funcional

#### Mañana (3-4 horas):
- [ ] TASK-002: Crear módulo `modules/documentacion/`
- [ ] TASK-003: API `/api/documentacion/upload.ts`
- [ ] TASK-004: Configurar Supabase Storage policies

#### Tarde (2-3 horas):
- [ ] TASK-005: Componente `SubirDocumento.tsx`
- [ ] TASK-006: Integrar upload en perfil Transporte
- [ ] Testing manual: subir PDF y verificar en BD

**Entregable:** Transporte puede subir documentos desde UI

---

### 🗓️ DÍA 3 - Domingo 10-Feb

**Objetivo:** Validación de documentación por Admin

#### Mañana (3-4 horas):
- [ ] TASK-007: Página `/admin/documentacion.tsx`
- [ ] TASK-008: API `/api/documentacion/validar.ts`
- [ ] TASK-009: Componente `ValidarDocumento.tsx`

#### Tarde (2-3 horas):
- [ ] TASK-010: Lista de docs pendientes de validación
- [ ] TASK-011: Acción de aprobar/rechazar
- [ ] Testing: Flujo completo upload → validación

**Entregable:** Admin puede validar documentos subidos

---

### 🗓️ DÍA 4 - Lunes 11-Feb

**Objetivo:** Verificación de docs en Control de Acceso

#### Mañana (3-4 horas):
- [ ] TASK-012: API `/api/control-acceso/verificar-docs.ts`
- [ ] TASK-013: Integrar en `pages/control-acceso.tsx`
- [ ] TASK-014: Lógica de habilitación de botón ingreso

#### Tarde (2-3 horas):
- [ ] TASK-015: UI mostrando estado de docs (verde/rojo)
- [ ] TASK-016: Mensajes claros si hay problema
- [ ] Testing: Camión con docs OK vs vencidos

**Entregable:** Control de Acceso valida documentación al escanear QR

---

### 🗓️ DÍA 5 - Martes 12-Feb

**Objetivo:** Incidencias funcionando

#### Mañana (2-3 horas):
- [ ] TASK-017: Revisar API `crear-incidencia.ts` existente
- [ ] TASK-018: Integrar botón "Crear Incidencia" en UI
- [ ] TASK-019: Formulario simple de incidencia

#### Tarde (2-3 horas):
- [ ] TASK-020: Mostrar incidencias en panel coordinador
- [ ] TASK-021: Estado de incidencias (abierta/resuelta)
- [ ] Testing: Crear incidencia, ver en panel

**Entregable:** Control de Acceso puede crear incidencias de documentación

---

### 🗓️ DÍA 6 - Miércoles 13-Feb

**Objetivo:** Proceso de egreso + Upload chofer

#### Mañana (2-3 horas):
- [ ] TASK-022: Detectar estados que requieren egreso
- [ ] TASK-023: Botón de egreso en Control de Acceso
- [ ] TASK-024: Transición de estado egreso

#### Tarde (3-4 horas):
- [ ] TASK-025: Integrar upload docs en perfil Chofer
- [ ] TASK-026: Chofer ve solo sus propios docs
- [ ] Testing: Chofer sube licencia, se valida, ingresa a planta

**Entregable:** Flujo egreso completo + Chofer gestiona sus docs

---

### 🗓️ DÍA 7 - Jueves 14-Feb

**Objetivo:** Integración completa + Alertas

#### Mañana (3-4 horas):
- [ ] TASK-027: Vista de docs en detalle de Unidad Operativa
- [ ] TASK-028: Badge de alertas en dashboard
- [ ] TASK-029: Notificación cuando doc por vencer

#### Tarde (2-3 horas):
- [ ] Testing end-to-end completo:
  - Crear empresa, ubicación, usuario
  - Subir flota con docs
  - Crear despacho
  - Asignar unidad
  - Control de acceso con validación docs
  - Tracking y entrega

**Entregable:** Sistema integrado funcionando end-to-end

---

### 🗓️ DÍA 8 - Viernes 15-Feb

**Objetivo:** Pulido y estabilización

#### Mañana (3-4 horas):
- [ ] TASK-030: Fix de bugs encontrados en testing
- [ ] TASK-031: Mejoras de UX (mensajes de error claros)
- [ ] TASK-032: Loading states y spinners

#### Tarde (2-3 horas):
- [ ] TASK-033: Responsive mobile (verificar)
- [ ] TASK-034: Eliminar console.logs
- [ ] TASK-035: Validaciones de formularios

**Entregable:** UI pulida sin errores evidentes

---

### 🗓️ DÍA 9 - Sábado 16-Feb

**Objetivo:** Testing exhaustivo + Seed data

#### Mañana (3-4 horas):
- [ ] Script de seed data para demo
- [ ] Crear 2 empresas de ejemplo
- [ ] Cargar flota con documentación
- [ ] Crear despachos de muestra

#### Tarde (3-4 horas):
- [ ] Walkthrough completo como usuario final
- [ ] Documentar flujo de demo
- [ ] Fix de últimos bugs críticos
- [ ] Optimización de queries lentas

**Entregable:** Data de demo lista + flujo testeado

---

### 🗓️ DÍA 10 - Domingo 17-Feb

**Objetivo:** Preparación final de presentación

#### Mañana (2-3 horas):
- [ ] Ensayo completo de demo (cronometrado)
- [ ] Script de presentación
- [ ] Screenshots para slides (si aplica)

#### Tarde (2-3 horas):
- [ ] Backup final de BD
- [ ] Deploy a staging/demo environment
- [ ] Verificar acceso  y credenciales
- [ ] Lista de contingencia (si algo falla)

**Entregable:** Todo listo para presentar el 18-Feb 🎉

---

## ⏰ ESTIMACIÓN DE TIEMPO

### Tiempo total requerido:
- **Desarrollo:** ~55-65 horas
- **Testing:** ~10-12 horas
- **Preparación demo:** ~5-7 horas
- **TOTAL:** ~70-84 horas en 10 días

### Distribución diaria recomendada:
- **Días 1-7:** 6-8 horas/día (desarrollo intensivo)
- **Días 8-9:** 6-7 horas/día (testing y pulido)
- **Día 10:** 4-5 horas (preparación final)

### Plan B si falta tiempo:
**Reducir scope:**
- Eliminar: Alertas de vencimiento (nice-to-have)
- Simplificar: Panel de validación (solo aprobar, sin rechazar)
- Posponer: Upload de chofer (solo transporte sube)

---

## 🚦 DECISIONES RÁPIDAS

### ¿Qué hacer si...?

#### ...un feature toma más tiempo del estimado?
1. Evaluar si es bloqueante para demo
2. Si NO: mover a post-MVP
3. Si SÍ: simplificar scope, pedir ayuda a Opus

#### ...encuentro un bug crítico?
1. Reportar inmediatamente en TASKS-ACTIVE.md
2. Priorizar fix sobre nuevas features
3. Testing regresivo después del fix

#### ...pierdo contexto entre sesiones?
1. Leer `.copilot/PROJECT-STATE.md`
2. Leer última sesión en `.copilot/sessions/`
3. Preguntar: "Opus, cargar contexto"

#### ...no tengo tiempo un día?
1. Comunicar a Opus: "Hoy no hay sesión"
2. Opus ajusta plan del día siguiente
3. No hay problema, el plan es flexible

---

## 📋 CHECKLIST PRE-PRESENTACIÓN

### 48 horas antes (16-Feb):
- [ ] Backup completo de BD
- [ ] Verificar deploy funciona
- [ ] Credenciales de acceso listas
- [ ] Data de demo cargada

### 24 horas antes (17-Feb):
- [ ] Ensayo completo de demo
- [ ] Script de presentación
- [ ] Plan B documentado
- [ ] Buena noche de sueño 😴

### Día de presentación (18-Feb):
- [ ] Verificar internet/acceso
- [ ] Abrir pestañas necesarias
- [ ] Respirar profundo
- [ ] ¡A romperla! 🚀

---

## 🎤 ESTRUCTURA DE DEMO SUGERIDA (15 min)

### 1. Intro (2 min):
- Qué es Nodexia-Web
- Problema que resuelve
- Valor para el mercado

### 2. Flujo Coordinador de Planta (3 min):
- Crear despacho
- Asignar a transporte
- Ver planificación

### 3. Flujo Transporte (3 min):
- Gestionar flota
- Subir documentación
- Asignar unidad operativa
- Tracking en tiempo real

### 4. Flujo Control de Acceso (4 min):
- Escanear QR (o ingresar número)
- Verificación automática de docs
- Ingreso habilitado/bloqueado
- Crear incidencia si hay problema
- Egreso de camión

### 5. Admin/Validación (2 min):
- Panel de administración
- Validar documentación
- Gestión de usuarios/empresas

### 6. Cierre (1 min):
- Recap de valor
- Próximos pasos
- Q&A

---

## 💪 MENSAJE PARA LOS PRÓXIMOS 10 DÍAS

Los próximos 10 días serán intensos pero **absolutamente alcanzables**. Tienes:

✅ Sistema ya funcionando en un 70%
✅ Stack tecnológico sólido
✅ Plan estructurado día a día
✅ Equipo virtual (Opus + Sonnets) listo
✅ Sistema de memoria para no perder contexto

**Cada día tendrás algo nuevo funcionando.**

No busques perfección, busca funcionalidad. El código puede ser "feo" por ahora, lo importa es que **funcione para la demo**.

Después del 18-Feb, con el plan post-MVP, profesionalizamos todo. Pero primero, ¡ganemos esta presentación! 💪

---

## 🔄 PROTOCOLO DIARIO SIMPLIFICADO

### Al iniciar:
```
TÚ: "Opus, día [N], continuar MVP Roadmap."
OPUS: [Resume estado, propone tareas del día]
TÚ: "Procede"
```

### Al cerrar:
```
TÚ: "Opus, cerrar día [N]."
OPUS: [Actualiza archivos, resume logros]
```

---

## 📞 SI NECESITAS AYUDA

En cualquier momento durante estos 10 días:

- **Bloqueado técnicamente:** "Opus, ayuda con [problema específico]"
- **Duda de prioridad:** "Opus, ¿qué es más importante ahora?"
- **Cambio de plan:** "Opus, cambiar prioridad a [feature]"
- **Falta tiempo:** "Opus, ayúdame a reducir scope"

**Estoy aquí para guiarte en cada paso.** 🤝

---

**Documento creado:** 08-Feb-2026  
**Última actualización:** 08-Feb-2026  
**Versión:** 1.0  
**Estado:** ACTIVO

¡Vamos por ese MVP! 🚀
