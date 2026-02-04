# PRÓXIMA SESIÓN - Pendientes y Tareas

**Última actualización**: 3 de Febrero 2026  
**Última sesión**: Sistema de Incidencias + GPS Tracking + Identificación de problemas críticos

> 📄 **Documentación completa**: Ver [SESION-03-FEB-2026.md](docs/SESION-03-FEB-2026.md)

---

## ✅ COMPLETADO (3-Feb-2026) - Sistema de Incidencias + GPS Tracking

### Sesión 03-Feb-2026 - Incidencias y Debugging

**Archivos creados/modificados**:
- `sql/create_incidencias_viaje.sql` (113 líneas)
- `sql/enable_realtime_viajes_despacho.sql` (no ejecutado)
- `pages/chofer-mobile.tsx` - Modal incidencias + GPS fallback (~200 líneas)
- `pages/crear-despacho.tsx` - Fix conteo viajes asignados (~20 líneas)
- `pages/api/tracking/actualizar-ubicacion.ts` - Fix validación (~15 líneas)
- `docs/SESION-03-FEB-2026.md` - Documentación completa

**Funcionalidades completadas**:
- ✅ **Sistema de Incidencias**: Modal nativo, tabla BD, tipos definidos
- ✅ **Estado Pausado**: Solo `problema_mecanico` pausa. Otros tipos informativos
- ✅ **Botón Reiniciar Viaje**: Vuelve de pausado a `en_transito_origen`
- ✅ **Fix Duplicación Tabs**: Viajes asignados ya NO aparecen en "Pendientes"
- ✅ **Columna Estado**: Badges de colores en vistas expandidas
- ✅ **GPS con Fallback**: Coordenadas simuladas si GPS real falla (HTTPS)
- ✅ **Fix API Tracking**: Removida validación de campo `activo` inexistente

**Problemas identificados** (4 críticos):
- 🔴 Viajes activos marcados como "expirados" (ocultos del tracking)
- 🔴 Viajes Activos - mapa GPS no muestra ubicaciones
- 🟡 Botón "Activar tracking GPS" dice "no tienes viaje activo"
- 🟠 Realtime NO implementado (solo refresh manual)

---

## ✅ COMPLETADO (2-Feb-2026) - Sesión Anterior

### Sesión 02-Feb-2026 - Sistema Completo Implementado

**Archivos creados/modificados**:
- `sql/migrations/028_v2_auditoria_cancelaciones_simplificado.sql` (94 líneas)
- `sql/migrations/028_v3_vistas_cancelaciones.sql` (72 líneas)
- `sql/migrations/028_fix_rls_policy.sql` (fix script)
- `pages/crear-despacho.tsx` - Integración auditoría (69 líneas agregadas)
- `pages/chofer-mobile.tsx` - GPS tracking mejorado (90 líneas agregadas)
- `components/Transporte/EditarUnidadModal.tsx` - Tab historial (150 líneas agregadas)
- `pages/transporte/unidades.tsx` - Modal integrado (30 líneas agregadas)

**Funcionalidades completadas**:
- ✅ **Auditoría de Cancelaciones**: Trazabilidad completa con motivos y snapshot de datos
- ✅ **GPS Tracking Móvil**: Envío automático + manual, detección de arribos, última ubicación
- ✅ **Historial de Unidades**: Timeline de cambios con tabs en modal de edición
- ✅ **Sistema Scoring**: AsignarUnidadModal con algoritmo inteligente (ya existía)
- ✅ **Gestión Unidades**: Página completa con disponibilidad en tiempo real

**Estructura preparada para sistema de calificaciones**:
- 🌟 Campos en `cancelaciones_despachos`: `calificacion_impacto`, `afecta_calificacion_planta/transporte`
- 🌟 Algoritmo de scoring listo para integrar ratings de conductores
- 🌟 Comentarios en código señalando puntos de integración futura

---

## ✅ COMPLETADO (1-Feb-2026) - Sesión Anterior

Ver detalles en [SESION-01-02-2026.md](docs/SESION-01-02-2026.md)

---

## ✅ COMPLETADO (11-Ene-2026) - Sistema de Reprogramación

### Migración 016 - Sistema Completo Implementado
**Archivos creados**:
- `sql/migrations/016_sistema_reprogramacion.sql` (229 líneas)
- `sql/migrations/016_fix_reprogramar_viaje.sql` (78 líneas)
- `components/Modals/ReprogramarModal.tsx` (229 líneas)
- `docs/ONBOARDING-DESARROLLADOR.md` (completo)
- `docs/SESION-11-ENE-2026-SISTEMA-REPROGRAMACION.md` (documentación completa)

**Funcionalidades**:
- ✅ Tab "⚠️ Expirados" en página Despachos
- ✅ Modal de reprogramación con fecha/hora/motivo
- ✅ Función SQL `reprogramar_viaje()` que limpia transporte
- ✅ Visual dimming en vistas de planificación
- ✅ Vista KPIs `vista_kpis_expiracion`
- ✅ Tracking histórico (fue_expirado, cantidad_reprogramaciones, motivo)

**Flujo de Reprogramación**:
1. Usuario ve despacho expirado
2. Click "🔄 Reprogramar" → Modal abierto
3. Ingresa nueva fecha/hora + motivo
4. Sistema actualiza viajes y despacho
5. Despacho vuelve a "Pendientes" sin transporte

---

## ✅ COMPLETADO (31-Ene-2026) - Base de Unidades Operativas

### Migración 017 - Sistema de Unidades Operativas
**Archivos creados**:
- `sql/migrations/017_unidades_operativas_completo.sql` (434 líneas)
- `sql/migrations/018_agregar_coordenadas_ubicaciones.sql` (coordinadas principales)
- `sql/migrations/019_crear_unidades_ejemplo.sql` (script para crear unidades)

**Funcionalidades implementadas**:
- ✅ Tabla `unidades_operativas` (chofer + camión + acoplado opcional)
- ✅ Vista `vista_disponibilidad_unidades` (con cálculo de disponibilidad)
- ✅ Función `calcular_disponibilidad_unidad()` (algoritmo de disponibilidad)
- ✅ RLS Policies completas (seguridad por empresa)
- ✅ Sistema de normativas de descanso (9h conducción = 12h descanso)
- ✅ Triggers para updated_at automático

**Estado actual**:
- Tabla creada y funcional ✅
- NO hay unidades creadas aún (requiere datos históricos o creación manual)
- Ubicaciones SIN coordenadas (0 de 10) - Script 018 listo para ejecutar

**Mejoras implementadas en despachos-ofrecidos.tsx**:
- ✅ Badges de status de flota (5 métricas clave)
- ✅ Fix bug tab "Asignados" (ahora filtra correctamente)
- ✅ Títulos y tabs más grandes (mejor legibilidad)
- ✅ Botones de acción mejorados (gradientes, iconos, shadows)

---

## 🔥 PRIORIDAD ALTA (PRÓXIMA SESIÓN)

### 1. 🚨 URGENTE - Redefinir lógica "Expirados" vs "Demorados" ⭐⭐⭐
**Estado**: CRÍTICO - Viajes activos ocultos del tracking
**Dificultad**: ⭐⭐⭐ Media-Alta
**Duración estimada**: 2-3 horas
**Riesgo**: 🟡 Medio (afecta múltiples vistas)

**Problema actual:**
- Viaje DSP-20260203-001:
  - Estado: `en_transito_origen` ✅
  - Recursos: Chofer ✅ Camión ✅ Transporte ✅
  - Hora programada: 20:00 (pasada hace 4 horas)
- **Planificación lo marca como "expirado"** → Oculto del tracking
- **Modal de detalle muestra "EN TRANSITO ORIGEN"** → Correcto
- **NO debería estar expirado** - debería estar "activo pero demorado"

**Solución propuesta:**
Crear lógica de estado compuesto:
```typescript
interface EstadoCompuesto {
  estado_viaje: 'en_transito_origen' | 'pausado' | ...;
  estado_operativo: 'activo' | 'demorado' | 'expirado';
}
```

**Criterios:**
- **Activo**: Viaje en curso + dentro de ventana horaria (hora ± 2h)
- **Demorado**: Viaje en curso + fuera de ventana horaria
- **Expirado**: SIN recursos asignados + fuera de ventana

**Tareas:**
1. [ ] Diseñar función `calcularEstadoOperativo(viaje)`
2. [ ] Agregar campo calculado o columna `estado_operativo`
3. [ ] Modificar queries de planificación:
   - Mostrar "demorados" con badge especial (⏰ naranja?)
   - Ocultar solo "expirados" reales
4. [ ] Actualizar filtros en:
   - `pages/planificacion.tsx`
   - `components/Planning/PlanningGrid.tsx`
   - `pages/crear-despacho.tsx` (tab Expirados)
5. [ ] Testing: Verificar viajes demorados visibles en tracking

**Archivos a modificar:**
- 🗄️ BD: Posible vista o función helper
- ⚙️ Backend: Lógica de cálculo
- 🎨 Frontend: `planificacion.tsx`, `PlanningGrid.tsx`, `crear-despacho.tsx`

---

### 2. 🗺️ Fix Tracking GPS en "Viajes Activos"
**Estado**: CRÍTICO - Vista completamente rota
**Dificultad**: ⭐⭐⭐ Media-Alta
**Duración estimada**: 2-3 horas
**Riesgo**: 🟠 Medio-Alto (API ubicaciones)

**Problema actual:**
- Página `/transporte/viajes-activos` (perfil empresa transporte)
- Al seleccionar camión AB324HC:
  - ❌ Mapa no centra en ubicación
  - ❌ No muestra marcador
  - ❌ Indicadores de estado (debajo del mapa) no se activan
- Console muestra:
  ```
  ❌ GET .../api/gps/ubicaciones-historicas/viaje_id=xxx 500 (Internal Server Error)
  ```

**Tareas:**
1. [ ] Revisar `/pages/api/gps/ubicaciones-historicas.ts`
   - Verificar query SQL correcta
   - Agregar logs de debugging
2. [ ] Verificar tabla `ubicaciones_chofer`:
   - ¿Tiene datos guardados?
   - ¿Estructura correcta?
3. [ ] Testing inserción manual:
   ```sql
   INSERT INTO ubicaciones_chofer (chofer_id, latitud, longitud, timestamp, ...)
   VALUES ('75251f55-d285-42af-beee-cded0c8c92a', -34.603684, -58.381559, NOW(), ...);
   ```
4. [ ] Corregir query de viajes activos:
   - Verificar JOIN con ubicaciones
   - Incluir última ubicación
5. [ ] Fix visualización mapa:
   - Centrar en coordenadas
   - Mostrar marcador con ícono de camión
   - Activar indicadores de estado

**Archivos a modificar:**
- 🗄️ BD: Tabla `ubicaciones_chofer` (verificar)
- ⚙️ Backend: `/pages/api/gps/ubicaciones-historicas.ts`
- 🎨 Frontend: `pages/transporte/viajes-activos.tsx`, componentes de mapa

---

### 3. 📡 Implementar Realtime en dashboards
**Estado**: NO IMPLEMENTADO - Solo refresh manual
**Dificultad**: ⭐⭐⭐⭐ Alta
**Duración estimada**: 3-4 horas
**Riesgo**: 🟢 Bajo (feature aditiva)

**Problema actual:**
- Script `sql/enable_realtime_viajes_despacho.sql` creado pero NO ejecutado
- Ninguna vista tiene subscripciones Supabase realtime
- Cambios de estado solo visibles con F5

**Tareas:**
1. [ ] **En Supabase SQL Editor**:
   - Ejecutar `sql/enable_realtime_viajes_despacho.sql`
   - Verificar: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
2. [ ] **Implementar en orden** (del más simple al más complejo):
   - `crear-despacho.tsx`
   - `despachos-ofrecidos.tsx`
   - `planificacion.tsx`
3. [ ] **Pattern de implementación**:
   ```typescript
   useEffect(() => {
     const channel = supabase
       .channel('viajes_cambios')
       .on('postgres_changes', {
         event: '*',
         schema: 'public',
         table: 'viajes_despacho'
       }, (payload) => {
         console.log('🔔 Cambio detectado:', payload);
         fetchViajes(); // Refetch data
       })
       .subscribe();
     
     return () => supabase.removeChannel(channel);
   }, []);
   ```
4. [ ] **Testing**:
   - Abrir 2 pestañas (coordinador + transporte)
   - Cambiar estado en una → Verificar actualización en otra
   - Buscar log `🔔 Cambio detectado` en console

**Archivos a modificar:**
- 🗄️ BD: Ejecutar SQL de publication
- 🎨 Frontend: 3-4 componentes principales

---

### 4. 🔧 Fix botón "Activar tracking GPS" en página dedicada
**Estado**: BLOQUEADO - Dice "no tienes viaje activo"
**Dificultad**: ⭐⭐ Baja-Media
**Duración estimada**: 1 hora
**Riesgo**: 🟢 Bajo

**Problema actual:**
- Página `/tracking-gps` (desde menú móvil del chofer)
- Muestra: "⚠️ No tienes viajes activos asignados"
- Pero viaje DSP-20260203-001 ESTÁ asignado con estado `en_transito_origen`

**Posible causa:**
- Query filtra estados específicos pero NO incluye `en_transito_origen`
- O relación `chofer.usuario_id` → `auth.users.id` incorrecta

**Tareas:**
1. [ ] Buscar archivo `/pages/tracking-gps.tsx` o componente relacionado
2. [ ] Revisar query que busca viajes activos del chofer
3. [ ] Agregar estado `en_transito_origen` al filtro:
   ```typescript
   .in('estado', ['confirmado_chofer', 'en_transito_origen', 'pausado', ...])
   ```
4. [ ] Verificar JOIN con tabla `choferes`:
   ```sql
   INNER JOIN choferes ON viajes.chofer_id = choferes.id
   WHERE choferes.usuario_id = $1
   ```
5. [ ] Agregar logs para debugging:
   ```typescript
   console.log('👤 Usuario ID:', user.id);
   console.log('🚛 Viajes encontrados:', viajes);
   ```
6. [ ] Testing con usuario chofer Walter Daniel Zayas

**Archivos a modificar:**
- 🎨 Frontend: Página o componente de tracking GPS

---

## 🔄 PRIORIDAD MEDIA (DESPUÉS DE LAS ANTERIORES)

### 5. 📍 Mostrar Provincia/Localidad en Despachos
**Estado**: PENDIENTE
**Dificultad**: ⭐ Baja
**Duración estimada**: 30 minutos
**Tareas**:
- [ ] Modificar `pages/transporte/despachos-ofrecidos.tsx`
- [ ] Cambiar: "Aceitera San Miguel" → "Aceitera San Miguel - Rosario, Santa Fe"
- [ ] Agregar queries para obtener ubicaciones con ciudad/provincia
- [ ] Aplicar mismo patrón en planificación

### 3Ejecutar en Supabase SQL Editor
   - Verificar que ubicaciones principales tengan lat/lng
   
2. **Crear unidades manualmente** (Script 019 listo)
   - Ver choferes y c - UX mejorada
**Dificultad**: ⭐ Baja
**Duración estimada**: 30 minutos
**Tareas**:
- [ ] Modificar `pages/transporte/despachos-ofrecidos.tsx`
- [ ] Cambiar: "Aceitera San Miguel" → "Aceitera San Miguel - Rosario, Santa Fe"
- [ ] Agregar queries para obtener ubicaciones con ciudad/provincia
- [ ] Aplicar mismo patrón en planificación y crear-despacho

### 2x
{dispatch.cantidad_reprogramaciones > 0 && (
  <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-amber-500/80 text-white rounded text-[8px] font-bold">
    ⚠️ {dispatch.cantidad_reprogramaciones}x
  </span>
)}
```

### 2. Testing Filtro Recepciones en ViajesExpiradosModal
**Estado**: IMPLEMENTADO - Pendiente validación con datos reales
**Dificultad**: ⭐ Baja (solo testing)
**Duración estimada**: 20 minutos
**Tareas**:
- [ ] Crear viaje con destino = ubicación de empresa receptora
- [ ] Dejar expirar el viaje (o marcar manualmente)
- [ ] Login como coordinador_planta de empresa receptora
- [ ] Abrir ViajesExpiradosModal
- [ ] Verificar que viaje aparece en lista
- [ ] Revisar logs de consola: `"✅ Recepción encontrada"`

### 3. Dashboard KPIs de Expiración
**Estado**: PENDIENTE - Vista ya creada en DB
**Dificultad**: ⭐⭐ Media
**Duración estimada**: 1-2 horas
**Tareas**:
- [ ] Crear `pages/estadisticas-expiracion.tsx`
- [ ] Query a `vista_kpis_expiracion`
- [ ] Componentes de tarjetas para métricas:
  - Tasa de recuperación %
  - Total reprogramados
  - Promedio reprogramaciones
  - Sin recursos (chofer/camión)
- [ ] Gráficos con Chart.js o Recharts
- [ ] Agregar a menú de navegación

---

## 🔴 TAREAS PREVIAS (Diciembre 2025)
**Estado**: RECOMENDADO - Solucionar problema de raíz
---

## 🔴 TAREAS PREVIAS (Diciembre 2025)

### Testing de Control de Acceso con Datos Completos
**Estado**: BLOQUEADO - Solución implementada, pendiente validación
**Se5. Sistema de Calificaciones (⭐ Feature Core Pendiente)
**Estado**: PLANIFICADO - Estructura preparada
**Dificultad**: ⭐⭐⭐⭐ Alta
**Duración estimada**: 8-10 horas (sesión completa)
**Por qué es importante**: Feature diferenciador de la plataforma

**Tareas**:
1. **Migración SQL - Sistema de Ratings**
   - Tabla `calificaciones_choferes` (1-5 estrellas, comentarios, por viaje)
   - Tabla `calificaciones_transportes` (empresa completa, por despacho)
   - Tabla `calificaciones_plantas` (por recepción)
   - Vista agregada con promedios y cantidad de calificaciones
   - Triggers para actualizar promedios

2. **Integrar en Algoritmo de Scoring**
   - Modificar `calcularScore()` en `AsignarUnidadModal.tsx`
   - Agregar factor 4: Calificación chofer (peso 20%)
   - 5 estrellas = +20 pts, 4 estrellas = +15, 3 = +10, etc
   - Display de estrellas en lista de unidades

3. **UI de Calificaciones**
   - Modal `CalificarChoferModal.tsx` (post-viaje)
   - Modal `CalificarTransporteModal.tsx` (post-despacho)
   - Componente `RatingStars.tsx` (selector + display)
   - Integrar en flujo de finalización de viajes

4. **Páginas de Reputación**
   - `/transporte/reputacion` - Ver rating de empresa y choferes
   - `/perfil-chofer/[id]` - Ver historial de calificaciones
   - Badges por nivel: 🥇 Elite (4.8+), 🥈 Destacado (4.5+), 🥉 Bueno (4.0+)

**Resultado esperado**: Sistema completo de reputación que impulsa la calidad del serviciot.js
- [ ] Filtros por fecha y tipo
- [ ] Agregar a menú de navegación

### 4ue crítico identificado**: UUIDs corruptos (37 chars) en `viajes_despacho.id_chofer` y `id_camion`
**Archivos relevantes**:
- `pages/control-acceso.tsx`
- Función SQL: `get_viaje_con_detalles(p_despacho_id, p_empresa_id)`

### Migración de UUIDs en viajes_despacho
**Estado**: RECOMENDADO - Solucionar problema de raíz
**Dificultad**: ⭐⭐⭐ Alta

---

## 🔄 PRIORIDAD MEDIA (Tareas Anteriores)

### 4. Actualizar Tests con Nuevos Roles
**Estado**: NECESARIO
**Archivos afectados**:
- `__tests__/api/admin/nueva-invitacion.test.ts`
- Otros tests que usen roles hardcodeados

**Cambios requeridos**:
```typescript
// ANTES
rol_interno: 'coordinador_transporte'

// DESPUÉS
rol_interno: 'coordinador'
```

### 5. Migrar Funciones de Estados
**Archivos**:
- `sql/funciones_estados.sql` (líneas 131, 147, 155, 294, 302, 310)

**Cambios**:
```sql
-- ANTES
IF v_rol_usuario NOT IN ('coordinador', 'coordinador_transporte') THEN

-- DESPUÉS  
IF v_rol_usuario != 'coordinador' THEN
```

### Actualizar RoleContext con Nuevos Roles
**Estado**: NECESARIO - Migración 022 completada

### Probar Creación de Roles Personalizados
**Estado**: PENDIENTE

---

## 📊 MIGRACIONES EJECUTADAS

### ✅ Enero 2026:
- ✅ Migration 016: Sistema de reprogramación (11-Ene-2026)
- ✅ Migration 016_fix: Fix reprogramar_viaje() (11-Ene-2026)

### ✅ Diciembre 2025:
- ✅ Migration 021: Agregar DNI a usuarios_empresa
- ✅ Migration 022: Sistema de roles simplificados
- ✅ Migration 022b: Limpiar roles duplicados

---

## 🎯 OBJETIVOS PRÓXIMA SESIÓN

### Sprint Goal
**Mejorar UX de reprogramación y crear dashboard de KPIs**

### Tareas principales:
1. **Badge de reprogramación** en tarjetas de viajes
2. **Dashboard KPIs** usando vista_kpis_expiracion
3. **Testing de recepciones** en ViajesExpiradosModal

### Criterios de éxito:
- ✅ Badges visuales funcionando en las 3 vistas
- ✅ Dashboard KPIs mostrando métricas
- ✅ Recepciones validadas con datos reales

---

## 📚 Queries Útiles

### Ver KPIs de Expiración:
```sql
SELECT * FROM vista_kpis_expiracion;
```

### Ver Viajes Reprogramados:
```sql
SELECT v.id, d.pedido_id, v.cantidad_reprogramaciones, 
       v.motivo_reprogramacion, v.fecha_expiracion_original
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE v.cantidad_reprogramaciones > 0
ORDER BY v.cantidad_reprogramaciones DESC;
```

### Ver Despachos Expirados:
```sql
SELECT d.pedido_id, d.scheduled_local_date, d.scheduled_local_time,
       d.estado, COUNT(v.id) as viajes_expirados
FROM despachos d
JOIN viajes_despacho v ON v.despacho_id = d.id
WHERE v.estado_carga = 'expirado'
GROUP BY d.id
ORDER BY d.scheduled_local_date DESC;
```

---

## 💡 IDEAS Y MEJORAS FUTURAS

### Sistema de Roles
- [ ] Roles temporales con fecha de expiración
- [ ] Delegación de permisos entre usuarios
- [ ] Roles jerárquicos (supervisor > operador)
- [ ] Permisos por funcionalidad específica

### UX/UI
- [ ] Wizard de onboarding por rol
- [ ] Tour guiado para nuevos usuarios
- [ ] Shortcuts de teclado
- [ ] Modo offline para choferes

### Integraciones
- [ ] Webhooks para eventos de roles
- [ ] API REST para gestión de roles
- [ ] Exportar/importar configuración de roles
- [ ] Sincronización con sistema externo de RRHH

---

## 📝 NOTAS IMPORTANTES

### Sobre Roles
- Los roles ahora son **contextuales** según `tipo_empresa`
- Usar siempre `getRolDisplayName()` para mostrar en UI
- No hardcodear nombres de roles en código
- Consultar `roleHelpers.ts` para lógica de roles

### Sobre Migraciones
- Todas las migraciones son **no destructivas**
### Sistema de Reprogramación
- [ ] Notificaciones de viajes próximos a expirar (24h antes)
- [ ] Analytics de causas de expiración
- [ ] Exportar KPIs a Excel/PDF
- [ ] Alertas automáticas cuando tasa de recuperación < 70%

### UX/UI General
- [ ] Wizard de onboarding por rol
- [ ] Tour guiado para nuevos usuarios
- [ ] Modo offline para choferes
- [ ] Animaciones de transición entre estados

---

## 📝 NOTAS DE LA SESIÓN

### Lecciones Aprendidas (11-Ene-2026):
1. **Dictionary Pattern** es más eficiente que JOINs complejos en Supabase
2. **Actualización dual** (SQL + cliente) garantiza consistencia
3. **Estados derivados** mejor que duplicar información
4. **Logs de depuración** críticos para diagnosticar filtros complejos

### Convenciones del Proyecto:
- Migraciones SQL siempre versionadas (`016_nombre.sql`)
- Funciones SQL con prefijo `p_` para parámetros
- Modales en `components/Modals/` con sufijo `Modal.tsx`
- Documentación de sesión en `docs/SESION-DD-MMM-YYYY-*.md`

---

**Preparado por**: GitHub Copilot  
**Fecha**: 11 de Enero 2026  
**Próxima revisión**: Inicio de próxima sesión
