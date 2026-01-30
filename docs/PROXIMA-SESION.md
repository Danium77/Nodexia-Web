# PRÓXIMA SESIÓN - Pendientes y Tareas

**Última actualización**: 11 de Enero 2026  
**Última sesión**: Sistema de Reprogramación de Viajes Expirados (Ver [SESION-11-ENE-2026-SISTEMA-REPROGRAMACION.md](docs/SESION-11-ENE-2026-SISTEMA-REPROGRAMACION.md))

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

## 🔥 PRIORIDAD ALTA (PRÓXIMA SESIÓN)

### 1. 🆕 Testing de Control de Acceso con Datos Completos ⭐ URGENTE
**Estado**: BLOQUEADO - Solución implementada, pendiente validación
**Sesión anterior**: Implementada función SQL `get_viaje_con_detalles` para resolver problema de UUIDs
**Issue crítico identificado**: UUIDs corruptos (37 chars) en `viajes_despacho.id_chofer` y `id_camion`
**Tareas**:
- [ ] **Testing end-to-end** - Validar que la solución funciona
  - Escanear código: DSP-20251226-001
  - Verificar que aparezca: "Walter Zayas - DNI: 30123456"
  - Verificar que aparezca: "ABC123 - Mercedes Axor"
  - Verificar ruta: "Rosario → Santa Rosa"
- [ ] Si funciona: ✅ Feature Control de Acceso completa
- [ ] Si falla: Debug con logs de consola y `sql/debug-control-acceso.sql`

### 1. Badge "⚠️ Reprogramado" en Tarjetas de Viajes
**Estado**: PENDIENTE - Feature UX importante
**Dificultad**: ⭐ Baja
**Duración estimada**: 30 minutos
**Tareas**:
- [ ] Agregar badge en `components/Planning/PlanningGrid.tsx`
- [ ] Agregar badge en `components/Planning/DayView.tsx`
- [ ] Agregar badge en `components/Planning/MonthView.tsx`
- [ ] Estilo: `absolute top-1 right-1 bg-amber-500/80 text-white px-1.5 py-0.5 text-[8px] rounded`
- [ ] Condición: `{dispatch.cantidad_reprogramaciones > 0 && ...}`
- [ ] Testing visual en todas las vistas

**Código sugerido**:
```tsx
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
**Sesión anterior**: Implementada función SQL `get_viaje_con_detalles` para resolver problema de UUIDs
**Issue crítico identificado**: UUIDs corruptos (37 chars) en `viajes_despacho.id_chofer` y `id_camion`
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
