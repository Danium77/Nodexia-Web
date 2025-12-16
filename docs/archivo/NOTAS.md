# 📓 NOTAS Y OBSERVACIONES - Para Jary

**Propósito**: Notas rápidas, ideas, observaciones no categorizadas

---

## 💡 IDEAS PARA IMPLEMENTAR

### Idea #1: Sistema de Notificaciones
**Fecha**: 19-Oct-2025  
**Descripción**: Cuando un transporte toma una oferta de Red Nodexia, notificar al coordinador de planta  
**Prioridad**: Media  
**Depende de**: Red Nodexia implementada  
**Tecnología sugerida**: Supabase Realtime o Websockets

---

### Idea #2: Dashboard de Métricas
**Fecha**: 19-Oct-2025  
**Descripción**: Panel con KPIs para coordinadores (viajes completados, en tránsito, etc.)  
**Prioridad**: Alta  
**Ubicación**: Mejorar `pages/dashboard.tsx`  
**Datos necesarios**: Agregaciones desde tabla despachos

---

### Idea #3: App Móvil para Choferes
**Fecha**: 19-Oct-2025  
**Descripción**: App nativa (React Native?) para que choferes gestionen viajes  
**Prioridad**: Baja (futuro)  
**Alternativa actual**: Progressive Web App (PWA)

---

## 🔍 OBSERVACIONES TÉCNICAS

### Observación #1: Multi-rol Complejo
**Fecha**: 19-Oct-2025  
**Descripción**: La tabla `usuarios_empresa` permite multi-rol pero puede generar confusión en UI  
**Sugerencia**: Crear selector de rol activo si un usuario tiene múltiples roles  
**Ubicación**: Context `UserRoleContext` podría manejar esto

---

### Observación #2: RLS Policies
**Fecha**: 19-Oct-2025  
**Descripción**: Las políticas RLS son complejas, dificultan debugging  
**Sugerencia**: Documentar todas las policies en un archivo central  
**Ubicación**: Crear `docs/SUPABASE-POLICIES.md`

---

### Observación #3: Componentes Grandes
**Fecha**: 19-Oct-2025  
**Descripción**: Algunos componentes tienen 500+ líneas (ej: SuscripcionesManager)  
**Sugerencia**: Refactorizar en componentes más pequeños  
**Prioridad**: Baja (después de corregir TypeScript)

---

## 🐛 BUGS MENORES (No Críticos)

### Bug Menor #1: React act() Warnings
**Fecha**: 19-Oct-2025  
**Ubicación**: Tests de `UserRoleContext`  
**Descripción**: Warnings sobre state updates no wrapeados en act()  
**Impacto**: Solo visual en tests, no afecta funcionalidad  
**Prioridad**: Baja

---

### Bug Menor #2: ESLint Deprecation
**Fecha**: 19-Oct-2025  
**Descripción**: `next lint` será removido en Next.js 16  
**Solución**: Ya generé `eslint.config.improved.mjs`, migrar en Sesión #3  
**Prioridad**: Media

---

## 📚 RECURSOS ÚTILES

### Recurso #1: Next.js Migration Guide
URL: https://nextjs.org/docs/app/building-your-application/upgrading  
Útil para: Actualizar Next.js sin romper cosas

### Recurso #2: Supabase RLS Cheatsheet
URL: https://supabase.com/docs/guides/auth/row-level-security  
Útil para: Entender y debuggear policies

### Recurso #3: TypeScript Utility Types
URL: https://www.typescriptlang.org/docs/handbook/utility-types.html  
Útil para: Corregir tipos complejos

---

## 🤔 PREGUNTAS SIN RESPONDER

### Pregunta #1: ¿Cómo se calculan tarifas?
**Contexto**: Tabla `planta_transportes` tiene campo `tarifa_acordada`  
**Duda**: ¿Es tarifa fija o por km/ton?  
**Impacto**: Afecta diseño de Red Nodexia  
**Preguntar al usuario**: En sesión futura

---

### Pregunta #2: ¿Qué pasa si un viaje se cancela?
**Contexto**: No veo lógica de cancelación de viajes  
**Duda**: ¿Se permite? ¿Qué estados tiene?  
**Impacto**: Puede afectar métricas  
**Investigar**: En tabla `despachos`, ver campo `estado`

---

### Pregunta #3: ¿Hay integración con terceros?
**Contexto**: No veo APIs externas  
**Duda**: ¿Hay integración con sistemas de tracking GPS? ¿APIs de clientes?  
**Impacto**: Puede afectar arquitectura  
**Preguntar al usuario**: En sesión futura

---

## 🎨 MEJORAS DE UX (Futuro)

### Mejora UX #1: Loading States
**Descripción**: Agregar skeletons en vez de spinners  
**Ubicación**: Componentes Dashboard, Planning, Network  
**Prioridad**: Baja

---

### Mejora UX #2: Toast Notifications
**Descripción**: Reemplazar `alert()` con toast moderno  
**Librería sugerida**: react-hot-toast o sonner  
**Prioridad**: Media

---

### Mejora UX #3: Dark Mode
**Descripción**: Implementar tema oscuro  
**Tecnología**: Tailwind CSS ya tiene soporte  
**Prioridad**: Baja

---

## 🔐 SEGURIDAD

### Nota de Seguridad #1: Validación de Inputs
**Fecha**: 19-Oct-2025  
**Observación**: Algunos formularios no validan inputs en backend  
**Recomendación**: Agregar validación con Zod en APIs  
**Ejemplo**: `pages/api/admin/empresas/crear.ts`

---

### Nota de Seguridad #2: Rate Limiting
**Fecha**: 19-Oct-2025  
**Observación**: No hay rate limiting en APIs  
**Recomendación**: Implementar con Upstash o similar  
**Prioridad**: Media (antes de producción)

---

## 📊 OPTIMIZACIONES (Futuro)

### Optimización #1: Lazy Loading
**Descripción**: Algunos componentes grandes podrían lazy loadear  
**Ejemplo**: Componentes de SuperAdmin no se usan en todos los roles  
**Tecnología**: React.lazy() + Suspense  
**Archivo**: Ya existe `lib/lazy-components.tsx` (revisar)

---

### Optimización #2: Caching
**Descripción**: Cachear queries frecuentes (listado de empresas, transportes)  
**Tecnología**: React Query o SWR  
**Prioridad**: Baja

---

## 📝 RECORDATORIOS

- [ ] Antes de cada sesión: Leer archivos .jary/
- [ ] Después de cada sesión: Actualizar JARY-ESTADO-ACTUAL.md
- [ ] Siempre ejecutar tests antes de commit
- [ ] Documentar decisiones importantes en JARY-DECISIONES.md
- [ ] Mantener JARY-PROXIMOS-PASOS.md actualizado

---

## 🎯 METAS PERSONALES (Como Jary)

1. **Reducir errores TS a 0** en 2-3 semanas
2. **Resolver bug crítico** en próxima sesión
3. **Aumentar cobertura tests** a 70% en 4 semanas
4. **Documentar todo** para facilitar handoff futuro
5. **Mantener código limpio** y siguiendo best practices

---

## 💭 REFLEXIONES

### Reflexión #1: Proyecto Bien Estructurado
**Fecha**: 19-Oct-2025  
El proyecto tiene buena arquitectura base. Los 325 errores TypeScript no son por mal diseño, sino por falta de type safety durante desarrollo rápido. Es completamente solucionable.

### Reflexión #2: Usuario Sin Conocimientos Técnicos
**Fecha**: 19-Oct-2025  
Necesito ser muy claro en explicaciones, usar lenguaje natural, y mantener sistema de memoria robusto. El sistema .jary/ es crucial para continuidad.

### Reflexión #3: Priorización es Clave
**Fecha**: 19-Oct-2025  
Con 325 errores, es tentador querer arreglar todo a la vez. La priorización del PLAN-DE-ACCION.md es acertada: Seguridad → Bug Crítico → TypeScript → Tests → Features.

---

**Este archivo es mi "cuaderno de notas" - Anoto ideas y observaciones rápidas aquí.**

---

*Última actualización: 19-Oct-2025*
