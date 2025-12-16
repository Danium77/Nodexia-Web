# ✅ CHECKLIST PRÓXIMA SESIÓN

**Fecha planificada**: [Por definir]  
**Duración estimada**: 2-4 horas  
**Estado documentación**: ✅ Completa (26 Oct 2025)

---

## 📋 ANTES DE EMPEZAR

### ⚠️ CRÍTICO - Ejecutar SQL
- [ ] Abrir Supabase Dashboard
- [ ] Ir a SQL Editor
- [ ] Copiar contenido de `sql/fix-medios-comunicacion.sql`
- [ ] Ejecutar query completo
- [ ] Verificar que no quedan valores "Medios de comunicación"
- [ ] Confirmar constraint agregado

**Tiempo**: 2 minutos  
**Archivo**: `sql/fix-medios-comunicacion.sql`

### 📖 Lectura Recomendada
- [ ] Leer `docs/SESION-2025-10-26.md` (10 min)
- [ ] Leer `docs/TAREAS-PENDIENTES.md` (15 min)
- [ ] Revisar `SESION-COMPLETADA-2025-10-26.md` (5 min)

### 💭 Decisión Requerida
- [ ] **Elegir opción de múltiples camiones**:
  - [ ] Opción A: Simple (campo cantidad) - 1-2 horas
  - [ ] Opción B: Intermedia (tabla asignaciones) - 2-3 días
  - [ ] Opción C: Completa (tabla viajes) - 1-2 semanas

**Ver detalles**: `docs/TAREAS-PENDIENTES.md` (sección "Sistema de Múltiples Camiones")

---

## 🎯 OBJETIVOS DE LA SESIÓN

### 🔴 Alta Prioridad (DEBE completarse)
1. [✅] **Buscador en Modal Asignar Transporte** - ✅ COMPLETADO
   - [✅] Agregar input de búsqueda
   - [✅] Implementar filtrado por nombre/tipo
   - [✅] Aplicar filteredTransports en renderizado
   - [✅] Testing básico
   - **Tiempo estimado**: 30 minutos
   - **Archivo**: `components/Modals/AssignTransportModal.tsx`
   - **Estado**: ✅ Implementado y funcionando

2. [ ] **Sistema Múltiples Camiones** (según opción elegida)
   - [ ] Implementar código según opción A/B/C
   - [ ] Actualizar formulario crear despacho
   - [ ] Modificar modal asignación si necesario
   - [ ] Crear/modificar tablas BD si necesario
   - [ ] Testing end-to-end
   - **Tiempo estimado**: 1-2 horas (Opción A) / 2-3 días (Opción B) / 1-2 semanas (Opción C)

### 🟡 Media Prioridad (Si hay tiempo)
3. [ ] **Mejorar Tooltips Sidebar**
   - [ ] Cambiar estilos a colores Nodexia
   - [ ] Optimizar posicionamiento
   - [ ] Agregar animación fade suave
   - **Tiempo estimado**: 1 hora
   - **Archivo**: `components/layout/Sidebar.tsx`

4. [ ] **Testing Completo End-to-End**
   - [ ] Crear nueva empresa desde cero
   - [ ] Crear nuevo usuario coordinador
   - [ ] Vincular ubicaciones
   - [ ] Vincular transporte
   - [ ] Crear despacho con múltiples camiones
   - [ ] Asignar transporte parcialmente (si Opción B/C)
   - [ ] Documentar resultados
   - **Tiempo estimado**: 2 horas
   - **Archivo**: Crear `docs/TESTING-ONBOARDING-COMPLETO.md`

### 🟢 Baja Prioridad (Opcional)
5. [ ] **Optimizar RLS Policies**
   - [ ] Revisar ubicaciones policy
   - [ ] Verificar empresa_ubicaciones policy
   - [ ] Ajustar relaciones_empresa si necesario
   - **Tiempo estimado**: 1 hora
   - **Archivo**: Crear `sql/optimize-rls-policies.sql`

6. [ ] **Validaciones Backend**
   - [ ] Agregar validación prioridad en API
   - [ ] Agregar validación CUIT format
   - [ ] Agregar validación cantidad camiones
   - **Tiempo estimado**: 1.5 horas
   - **Archivos**: `pages/api/despachos/*.ts`

---
## 📝 IMPLEMENTACIÓN PASO A PASO

### ~~Tarea 1: Buscador en Modal Transporte~~ ✅ COMPLETADO

**Implementación finalizada:**
- ✅ Input de búsqueda agregado antes de lista de transportes
- ✅ useEffect que filtra en tiempo real por nombre/tipo
- ✅ Contador de resultados cuando hay búsqueda
- ✅ Mensaje "No se encontraron" con botón limpiar
- ✅ Usar `filteredTransports` en lugar de `availableTransports`

**Testing:**
- Buscar "nodexia" → filtra correctamente
- Buscar texto inexistente → muestra mensaje
- Limpiar búsqueda → restaura lista completa

---

### Tarea 2A: Múltiples Camiones - Opción Simple
### Tarea 2A: Múltiples Camiones - Opción Simple

```typescript
// 1. Agregar campo en crear-despacho.tsx formulario:
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Cantidad de Unidades
  </label>
  <input
    type="number"
    min="1"
    value={cantidadUnidades}
    onChange={(e) => setCantidadUnidades(parseInt(e.target.value) || 1)}
    className="w-full bg-[#1b273b] border border-gray-600 rounded-md px-3 py-2"
  />
</div>

// 2. Al generar despachos, crear N filas con cantidadUnidades
for (let i = 0; i < cantidadUnidades; i++) {
  newRows.push({
    tempId: `${Date.now()}-${i}`,
    // ... resto de datos
  });
}
```

**Archivos a modificar**:
- `pages/crear-despacho.tsx` (línea ~200-250 formulario, línea ~400-450 generación)

---

### Tarea 2B: Múltiples Camiones - Opción Intermedia

```sql
-- 1. Crear tabla en Supabase:
CREATE TABLE despacho_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  despacho_id UUID REFERENCES despachos(id) ON DELETE CASCADE,
  transport_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  cantidad_asignada INTEGER NOT NULL CHECK (cantidad_asignada > 0),
  fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'en_transito', 'entregado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agregar campos a despachos:
ALTER TABLE despachos 
ADD COLUMN cantidad_solicitada INTEGER DEFAULT 1 CHECK (cantidad_solicitada > 0),
ADD COLUMN cantidad_asignada INTEGER DEFAULT 0 CHECK (cantidad_asignada >= 0);

-- 3. Crear índices:
CREATE INDEX idx_despacho_asignaciones_despacho ON despacho_asignaciones(despacho_id);
CREATE INDEX idx_despacho_asignaciones_transport ON despacho_asignaciones(transport_id);
```

**Archivos a crear**:
- `sql/create-despacho-asignaciones.sql`
- `components/Modals/AssignMultipleTransportsModal.tsx` (nuevo)

---

## 🧪 TESTING CHECKLIST

### Testing Buscador
- [ ] Búsqueda por CUIT completo (30-98765432-1)
- [ ] Búsqueda por CUIT parcial (30-98)
- [ ] Búsqueda por nombre completo
- [ ] Búsqueda por nombre parcial
- [ ] Búsqueda case-insensitive
- [ ] Sin resultados (muestra mensaje)
- [ ] Limpiar búsqueda (muestra todos)

## 🧪 TESTING CHECKLIST

### Testing Buscador ✅ COMPLETADO
- [✅] Búsqueda por nombre completo
- [✅] Búsqueda por nombre parcial
- [✅] Búsqueda case-insensitive
- [✅] Sin resultados (muestra mensaje)
- [✅] Limpiar búsqueda (muestra todos)
- [✅] Se limpia al cerrar modal

### Testing Múltiples Camiones (Opción A)
- [ ] Estado cambia a 'transporte_asignado' cuando cantidad_asignada >= cantidad_solicitada
- [ ] No permite asignar más de cantidad_solicitada

### Testing End-to-End Completo
- [ ] Crear empresa nueva
- [ ] Crear usuario coordinador
- [ ] Login con nuevo usuario
- [ ] Vincular 2 ubicaciones
- [ ] Buscar y vincular 2 transportes
- [ ] Crear despacho con múltiples unidades
- [ ] Asignar transportes con búsqueda
- [ ] Verificar en BD que todo se guardó correctamente
- [ ] Verificar RLS (no ver datos de otras empresas)

---

## 📊 MÉTRICAS DE ÉXITO

Al final de la sesión, deberías tener:

| Métrica | Objetivo | Verificación |
|---------|----------|--------------|
| SQL limpieza ejecutado | ✅ | Ver `SELECT * FROM despachos WHERE prioridad = 'Medios de comunicación'` retorna 0 |
| Buscador implementado | ✅ | Buscar "30-98" en modal devuelve resultados filtrados |
| Múltiples camiones | ✅ (según opción) | Crear despacho con 3 unidades funciona |
| Testing end-to-end | ✅ | Flujo completo sin errores |
| Documentación | ✅ | Crear `docs/SESION-[FECHA].md` con resultados |

---

## 🐛 TROUBLESHOOTING

| Métrica | Objetivo | Verificación |
|---------|----------|--------------|
| SQL limpieza ejecutado | ✅ | Ver `SELECT * FROM despachos WHERE prioridad = 'Medios de comunicación'` retorna 0 |
| Buscador implementado | ✅ COMPLETADO | Buscar "nodexia" en modal devuelve resultados filtrados |
| Múltiples camiones | ⏳ Pendiente | Crear despacho con 3 unidades funciona |
| Testing end-to-end | ⏳ Pendiente | Flujo completo sin errores |
| Documentación | ✅ COMPLETADO | Archivos actualizados con progreso |
1. Verificar estructura del objeto `despachoData`
2. Verificar campo `cantidad_solicitada` existe en tabla
3. Ver Network tab para errores 500
4. Verificar RLS policies permiten INSERT

### Si testing falla:
1. Limpiar localStorage: `localStorage.clear()`
2. Cerrar sesión y volver a entrar
3. Verificar que empresaId está en UserRoleContext
4. Ver Supabase logs para errores RLS

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

### A Modificar:
### A Modificar:
```
✅ components/Modals/AssignTransportModal.tsx (COMPLETADO - Buscador)
⏳ pages/crear-despacho.tsx (Pendiente - Múltiples camiones)
```

### A Crear (según opción):
```
⏳ sql/create-despacho-asignaciones.sql (Opción B/C)
⏳ components/Modals/AssignMultipleTransportsModal.tsx (Opción B/C)
⏳ docs/SESION-[FECHA].md (al finalizar)
⏳ docs/TESTING-ONBOARDING-COMPLETO.md (si se hace testing)
```
---

## 🎯 RESULTADO ESPERADO

Al final de la sesión:
Al final de la sesión:

```
✅ Bug "Medios de comunicación" eliminado PERMANENTEMENTE (pendiente ejecutar SQL)
✅ Buscador de transportes funcionando (COMPLETADO)
⏳ Sistema de múltiples camiones implementado y testeado (PENDIENTE - Decisión requerida)
✅ Documentación actualizada (COMPLETADO)
⏳ Testing end-to-end pasando (PENDIENTE)
✅ Zero bugs nuevos
```
---

## 📞 RECURSOS

| Necesitas | Archivo |
|-----------|---------|
| Detalles de tareas | `docs/TAREAS-PENDIENTES.md` |
| Resumen sesión anterior | `docs/SESION-2025-10-26.md` |
| Quick reference | `SESION-COMPLETADA-2025-10-26.md` |
| SQL pendiente | `sql/fix-medios-comunicacion.sql` |
| Índice completo | `INDICE-DOCUMENTACION.md` |

---

## ✨ TIPS PARA LA SESIÓN

1. **Empezar por SQL**: 2 minutos que solucionan bug crítico
2. **Decisión primero**: Elegir opción múltiples camiones antes de codear
3. **Testing frecuente**: No esperar al final, probar cada cambio
4. **Commits pequeños**: Git commit después de cada tarea completada
5. **Documentar mientras trabajas**: Más fácil que al final

---

**¡Éxito en la próxima sesión!** 🚀

---

*Checklist creado: 26 Oct 2025*  
*Basado en: docs/TAREAS-PENDIENTES.md*
