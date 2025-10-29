# 📝 TAREAS PENDIENTES - PRÓXIMA SESIÓN

## 🔴 ALTA PRIORIDAD

### 1. Eliminar "Medios de comunicación" de Prioridad
**Estado**: SQL creado, pendiente ejecución

**Acción inmediata**:
```sql
-- Ejecutar en Supabase SQL Editor
UPDATE despachos 
SET prioridad = 'Media' 
WHERE prioridad = 'Medios de comunicación';

-- Agregar constraint para prevenir valores futuros
ALTER TABLE despachos 
ADD CONSTRAINT check_prioridad 
CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente'));
```

**Archivos relacionados**: 
- `sql/fix-medios-comunicacion.sql`
- `pages/crear-despacho.tsx` (línea 533-541)

---

### 2. Buscador en Modal de Asignar Transporte
**Estado**: ✅ COMPLETADO

**Implementación**:
- ✅ Input de búsqueda agregado con placeholder "🔍 Buscar por nombre o tipo..."
- ✅ useEffect para filtrar transportes en tiempo real
- ✅ Contador de resultados cuando hay búsqueda activa
- ✅ Mensaje cuando no hay resultados con botón "Limpiar búsqueda"
- ✅ filteredTransports usado en renderizado

**Archivos modificados**: `components/Modals/AssignTransportModal.tsx`

**Funcionalidades**:
- Búsqueda case-insensitive
- Filtra por nombre y tipo de transporte
- Actualización automática mientras escribes
- Se limpia automáticamente al cerrar modal

**Testing recomendado**:
- Buscar "nodexia" → debe mostrar "Transportes Nodexia Demo"
- Buscar "30-98" → debe filtrar por CUIT (si se agrega al nombre o tipo)
- Buscar texto inexistente → muestra mensaje y botón limpiar
- Limpiar campo → muestra todos los transportes

---

### 3. Sistema de Múltiples Camiones
**Estado**: Pendiente decisión de arquitectura

**DECISIÓN REQUERIDA - Elegir una opción:**

#### **Opción A: Simple (Cantidad de Unidades)**
✅ Pros:
- Implementación rápida (1-2 horas)
- UX sencillo
- Sin cambios en BD

❌ Contras:
- No permite asignar diferentes transportes al mismo despacho
- No rastrea asignaciones parciales

**Implementación**:
```tsx
// Campo extra en formulario crear-despacho:
<input 
  type="number" 
  min="1" 
  placeholder="Cantidad de unidades"
  className="..."
/>
```

---

#### **Opción B: Intermedia (Despacho Parcial)**
✅ Pros:
- Permite asignaciones parciales
- Rastrea cuántas unidades están asignadas vs pendientes
- No complica mucho la BD

❌ Contras:
- Más complejo de implementar (2-3 días)
- Requiere nueva tabla `despacho_asignaciones`

**Nueva tabla**:
```sql
CREATE TABLE despacho_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  despacho_id UUID REFERENCES despachos(id),
  transport_id UUID REFERENCES empresas(id),
  cantidad_asignada INTEGER NOT NULL,
  fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT DEFAULT 'pendiente'
);

ALTER TABLE despachos ADD COLUMN cantidad_solicitada INTEGER DEFAULT 1;
ALTER TABLE despachos ADD COLUMN cantidad_asignada INTEGER DEFAULT 0;
```

---

#### **Opción C: Completa (Sistema de Viajes)**
✅ Pros:
- Control total sobre cada unidad
- Permite rastrear cada camión individualmente
- Escalable para futuro (tracking GPS, etc.)

❌ Contras:
- Implementación compleja (1-2 semanas)
- Cambios significativos en UI y lógica de negocio

**Nueva tabla**:
```sql
CREATE TABLE viajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  despacho_id UUID REFERENCES despachos(id),
  transport_id UUID REFERENCES empresas(id),
  camion_id UUID REFERENCES camiones(id), -- Si existe tabla camiones
  numero_viaje INTEGER,
  estado TEXT DEFAULT 'pendiente',
  fecha_asignacion TIMESTAMPTZ,
  fecha_carga TIMESTAMPTZ,
  fecha_entrega TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

**RECOMENDACIÓN**: Empezar con **Opción A** para validar UX, luego evolucionar a B si es necesario.

---

## 🟡 MEDIA PRIORIDAD

### 4. Mejorar Tooltips del Sidebar
**Problema**: Tooltips actuales básicos, poco alineados con diseño

**Mejoras**:
- Fondo con color Nodexia (#1b273b)
- Borde cian (#06b6d4)
- Sombra más pronunciada
- Animación de fade suave
- Posicionamiento optimizado (evitar overflow)

**Código sugerido**:
```tsx
<div className="absolute left-full ml-2 px-3 py-2 bg-[#1b273b] border border-cyan-500 rounded-lg shadow-2xl text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
  {item.label}
  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#1b273b] border-l border-t border-cyan-500 rotate-45"></div>
</div>
```

---

### 5. Actualizar Índice de Documentación
**Archivo**: `INDICE-DOCUMENTACION.md`

**Agregar**:
- Link a `docs/SESION-2025-10-26.md`
- Link a `docs/TAREAS-PENDIENTES.md`
- Marcar onboarding como ✅ completado

---

## 🟢 BAJA PRIORIDAD

### 6. Testing Completo del Flujo
**Objetivo**: Validar que funciona con usuarios nuevos

**Pasos**:
1. Crear nueva empresa desde cero
2. Crear nuevo usuario coordinador
3. Vincular ubicaciones
4. Vincular transporte
5. Crear despacho
6. Asignar transporte
7. Verificar RLS en cada paso

**Documentar resultados** en `docs/TESTING-ONBOARDING.md`

---

### 7. Optimizar Permisos RLS
**Problema potencial**: Algunas policies pueden ser demasiado permisivas

**Revisar**:
- `ubicaciones` - ¿Todos los autenticados pueden ver todas?
- `empresa_ubicaciones` - ¿Solo ver las de su empresa?
- `relaciones_empresa` - ¿Filtrar por rol?

**Archivo**: Crear `sql/review-rls-policies.sql`

---

### 8. Agregar Validaciones Backend
**Problema**: Autocomplete puede enviar valores inválidos

**Solución**:
```typescript
// En API routes, agregar validaciones:
if (!['Baja', 'Media', 'Alta', 'Urgente'].includes(prioridad)) {
  return res.status(400).json({ error: 'Prioridad inválida' });
}
```

**Archivos**:
- `pages/api/despachos/crear.ts`
- `pages/api/despachos/[id].ts`

---

## 📊 RESUMEN DE PRIORIDADES

| Tarea | Prioridad | Tiempo Estimado | Dependencias |
|-------|-----------|-----------------|--------------|
| Eliminar "Medios de comunicación" | 🔴 Alta | 5 min | SQL en Supabase |
| Buscador en modal transporte | 🔴 Alta | 30 min | Ninguna |
| **DECISIÓN múltiples camiones** | 🔴 Alta | Variable | Decisión de arquitectura |
| Mejorar tooltips sidebar | 🟡 Media | 1 hora | Ninguna |
| Actualizar índice docs | 🟡 Media | 15 min | Ninguna |
| Testing completo | 🟢 Baja | 2 horas | Todas las anteriores |
| Optimizar RLS | 🟢 Baja | 1 hora | Ninguna |
| Validaciones backend | 🟢 Baja | 1.5 horas | Ninguna |

---

## 🎯 PLAN DE ACCIÓN PRÓXIMA SESIÓN

### **Sesión Corta (1-2 horas)**
1. Ejecutar SQL limpieza prioridad
2. Implementar buscador en modal
3. Decidir opción múltiples camiones
4. Testing básico

### **Sesión Media (3-4 horas)**
- Todo lo anterior +
- Implementar Opción A de múltiples camiones
- Mejorar tooltips
- Testing completo

### **Sesión Larga (Full day)**
- Todo lo anterior +
- Implementar Opción B de múltiples camiones
- Optimizar RLS
- Agregar validaciones backend
- Documentación completa

---

**Documentado por**: GitHub Copilot  
**Fecha**: 26 de Octubre 2025  
**Próxima revisión**: Inicio de próxima sesión
