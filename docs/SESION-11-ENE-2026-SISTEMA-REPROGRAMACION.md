# Sesión de Trabajo - 11 de Enero 2026
## Sistema de Reprogramación de Viajes Expirados - Completado

---

## 📋 Resumen de la Sesión

**Fecha**: 11 de enero de 2026  
**Duración**: Sesión completa  
**Objetivo Principal**: Implementar sistema completo de reprogramación para despachos/viajes expirados

---

## ✅ Trabajo Completado

### 1. Sistema de Reprogramación (Migración 016)

#### Archivos Creados:
- **`sql/migrations/016_sistema_reprogramacion.sql`** (229 líneas)
  - 4 nuevos campos en tabla `viajes_despacho`
  - Función `reprogramar_viaje()` completa
  - Vista `vista_kpis_expiracion` para métricas gerenciales
  - Actualización de `marcar_viajes_expirados()`

- **`sql/migrations/016_fix_reprogramar_viaje.sql`** (78 líneas)
  - Fix crítico para limpiar transporte asignado
  - Actualización de fecha/hora local correcta
  - Reseteo de estado del despacho

- **`components/Modals/ReprogramarModal.tsx`** (229 líneas)
  - Modal completo para reprogramar despachos
  - Validación de fecha futura
  - Actualización directa del despacho
  - Feedback visual de errores/éxito

#### Campos Nuevos en `viajes_despacho`:
```sql
fue_expirado BOOLEAN DEFAULT false
fecha_expiracion_original TIMESTAMPTZ
cantidad_reprogramaciones INTEGER DEFAULT 0
motivo_reprogramacion TEXT
```

#### Función `reprogramar_viaje()`:
```sql
CREATE OR REPLACE FUNCTION reprogramar_viaje(
  p_viaje_id UUID,
  p_nueva_fecha_hora TIMESTAMPTZ,
  p_motivo TEXT DEFAULT NULL
)
```

**Comportamiento:**
- Cambia `estado_carga` de 'expirado' a 'pendiente_asignacion'
- Limpia `transport_id` (NULL) para permitir reasignación
- Incrementa `cantidad_reprogramaciones`
- Actualiza `scheduled_at`, `scheduled_local_date`, `scheduled_local_time`
- Cambia estado del despacho a 'pendiente_transporte'
- Registra `motivo_reprogramacion`

---

### 2. Tab "Expirados" en Despachos

#### Modificaciones en `pages/crear-despacho.tsx`:

**Estados agregados:**
```typescript
const [isReprogramarModalOpen, setIsReprogramarModalOpen] = useState(false);
const [selectedDispatchForReprogram, setSelectedDispatchForReprogram] = useState<GeneratedDispatch | null>(null);
```

**Nuevo Tab:**
```jsx
<button onClick={() => setActiveTab('expirados')}>
  ⚠️ Expirados
  <span>{generatedDispatches.filter(d => d.estado === 'expirado').length}</span>
</button>
```

**Botón Reprogramar:**
```jsx
{activeTab === 'expirados' && (
  <button onClick={() => {
    setSelectedDispatchForReprogram(dispatch);
    setIsReprogramarModalOpen(true);
  }}>
    🔄 Reprogramar
  </button>
)}
```

**Exclusión de expirados en otros tabs:**
- Tab Pendientes: `&& d.estado !== 'expirado'`
- Tab En Proceso: `&& d.estado !== 'expirado'`
- Tab Asignados: `&& d.estado !== 'expirado'`

---

### 3. Modal de Viajes Expirados - Mejoras

#### Archivo: `components/Modals/ViajesExpiradosModal.tsx`

**Filtrado Corregido:**
- ✅ Despachos creados por usuarios de la misma empresa
- ✅ Recepciones (viajes donde destino = ubicación de empresa)
- ✅ Viajes asignados a transporte de la empresa
- ✅ Manejo de usuarios sin empresa asignada

**Dictionary Pattern Implementado:**
```typescript
// Queries separadas para eficiencia
const despachosData = await supabase.from('despachos').select()...
const choferesData = await supabase.from('choferes').select()...
const camionesData = await supabase.from('camiones').select()...

// Diccionarios para lookups O(1)
const despachosDict: Record<string, any> = {};
const choferesDict: Record<string, any> = {};
const camionesDict: Record<string, any> = {};
```

**Logs de Depuración:**
```typescript
console.log('📍 Ubicaciones de la empresa (para recepciones):', nombresUbicaciones);
console.log('✅ Recepción encontrada:', { pedido_id, destino, matched });
console.log('✅ Viajes filtrados por empresa (incluye recepciones):', viajesFiltrados.length);
```

---

### 4. Visual Dimming de Viajes Expirados

#### Archivos Modificados:
- `components/Planning/PlanningGrid.tsx`
- `components/Planning/DayView.tsx`
- `components/Planning/MonthView.tsx`

**Estilo Aplicado:**
```typescript
const cardClasses = dispatch.estado === 'expirado' 
  ? 'from-gray-800/50 to-gray-700/50 border-gray-600 opacity-60'
  : 'normal-colors';

const textColor = dispatch.estado === 'expirado' 
  ? 'text-gray-400' 
  : 'normal-color';
```

---

### 5. TypeScript Types Actualizados

#### Archivo: `lib/types.ts`

```typescript
export interface ViajeDespacho {
  // ... campos existentes ...
  
  // CAMPOS DE REPROGRAMACIÓN (Migración 016 - 10 Ene 2026)
  fue_expirado?: boolean;
  fecha_expiracion_original?: Timestamp;
  cantidad_reprogramaciones?: number;
  motivo_reprogramacion?: string;
}
```

---

### 6. Detección Automática de Despachos Expirados

#### Modificaciones en `pages/crear-despacho.tsx` (líneas 247-282):

```typescript
// Consultar estado_carga de viajes
const { data: viajesData } = await supabase
  .from('viajes_despacho')
  .select('id, estado, estado_carga, id_transporte')
  .eq('despacho_id', d.id);

// Detectar si hay viajes expirados
hasViajesExpirados = viajesData.some(v => v.estado_carga === 'expirado');

// Sobrescribir estado del despacho si tiene viajes expirados
return {
  ...despacho,
  estado: hasViajesExpirados ? 'expirado' : d.estado,
  // ... otros campos
};
```

---

## 🗄️ Migraciones SQL Ejecutadas

### Migración 016 - Sistema Reprogramación (10-Ene-2026)
```sql
ALTER TABLE viajes_despacho 
  ADD COLUMN fue_expirado BOOLEAN DEFAULT false,
  ADD COLUMN fecha_expiracion_original TIMESTAMPTZ,
  ADD COLUMN cantidad_reprogramaciones INTEGER DEFAULT 0,
  ADD COLUMN motivo_reprogramacion TEXT;

CREATE INDEX idx_viajes_fue_expirado ON viajes_despacho(fue_expirado) 
  WHERE fue_expirado = true;

CREATE INDEX idx_viajes_reprogramaciones ON viajes_despacho(cantidad_reprogramaciones) 
  WHERE cantidad_reprogramaciones > 0;
```

### Fix Reprogramar (11-Ene-2026)
```sql
-- Actualización de función reprogramar_viaje() para:
-- 1. Limpiar transport_id en viajes y despachos
-- 2. Actualizar scheduled_local_date y scheduled_local_time
-- 3. Cambiar estado a 'pendiente_transporte'
```

**Resultado:** ✅ Ejecutado exitosamente en Supabase

---

## 🐛 Problemas Resueltos

### Problema 1: Modal Viajes Expirados mostraba 0 viajes
**Causa:** Query SQL con sintaxis incorrecta de alias  
**Solución:** Usar sintaxis estándar sin alias personalizados
```sql
-- Antes (ERROR):
choferes:chofer_id(nombre, apellido)

-- Después (OK):
choferes(nombre, apellido)
```

### Problema 2: Código duplicado en ViajesExpiradosModal
**Causa:** Edición incorrecta dejó código duplicado  
**Solución:** Eliminación manual del código duplicado en líneas 170-180

### Problema 3: Despachos expirados aparecían en tab Pendientes
**Causa:** Filtros no excluían `estado === 'expirado'`  
**Solución:** Agregar condición `&& d.estado !== 'expirado'` en todos los tabs

### Problema 4: Contador de tab Pendientes incorrecto
**Causa:** Incluía despachos expirados en el conteo  
**Solución:** Mismo fix que problema 3

### Problema 5: Recepciones no aparecían en modal
**Causa:** Faltaba lógica de filtrado por ubicaciones  
**Solución:** Agregar filtrado por CUIT y nombres de ubicaciones
```typescript
if (despacho.destino && nombresUbicaciones.some(nombre => 
  despacho.destino?.toLowerCase().includes(nombre.toLowerCase())
)) return true;
```

### Problema 6: Despacho reprogramado mantenía transporte y fecha viejos
**Causa:** Función SQL no limpiaba transport_id ni actualizaba fecha local  
**Solución:** 
1. Fix en función SQL para limpiar transport_id
2. Actualización manual en modal para asegurar cambios:
```typescript
await supabase.from('despachos').update({
  scheduled_local_date: nuevaFecha,
  scheduled_local_time: nuevaHora,
  transport_id: null,
  estado: 'pendiente_transporte'
}).eq('id', despacho.id);
```

---

## 📊 Vista KPIs Creada

### `vista_kpis_expiracion`

**Métricas disponibles:**
- `total_expirados_historico`: Total de viajes que alguna vez expiraron
- `expirados_actuales`: Viajes actualmente en estado expirado
- `recuperados`: Viajes que fueron expirados y luego completados
- `tasa_recuperacion_pct`: % de viajes recuperados del total expirado
- `total_reprogramados`: Viajes que han sido reprogramados
- `con_multiples_reprogramaciones`: Viajes reprogramados más de 1 vez
- `promedio_reprogramaciones`: Promedio de veces que se reprograma
- `sin_recursos`: Expirados por falta de chofer y camión
- `sin_chofer`: Expirados solo por falta de chofer
- `sin_camion`: Expirados solo por falta de camión

**Query de ejemplo:**
```sql
SELECT * FROM vista_kpis_expiracion;
```

---

## 🎯 Flujo Completo de Reprogramación

### Paso a Paso:

1. **Viaje expira** (función automática `marcar_viajes_expirados()`)
   ```sql
   estado_carga = 'expirado'
   fue_expirado = true
   fecha_expiracion_original = NOW()
   ```

2. **Usuario ve despacho en tab "⚠️ Expirados"**
   - Filtrado por `estado === 'expirado'`
   - Botón "🔄 Reprogramar" visible

3. **Usuario hace click en Reprogramar**
   - Modal `ReprogramarModal.tsx` se abre
   - Muestra info del despacho
   - Inputs: nueva fecha, hora, motivo

4. **Usuario confirma reprogramación**
   - Valida fecha futura
   - Llama `reprogramar_viaje()` para cada viaje expirado
   - Actualiza despacho directamente:
     ```typescript
     {
       scheduled_local_date: nuevaFecha,
       scheduled_local_time: nuevaHora,
       transport_id: null,
       estado: 'pendiente_transporte'
     }
     ```

5. **Resultado**
   - Viajes cambian a `estado_carga = 'pendiente_asignacion'`
   - Despacho aparece en tab **Pendientes**
   - Nueva fecha/hora visible
   - Transporte: "Sin asignar"
   - Badge: "🔵 1 sin asignar"
   - `cantidad_reprogramaciones` incrementado

---

## 📁 Archivos Modificados/Creados

### SQL Migrations:
- ✅ `sql/migrations/016_sistema_reprogramacion.sql` (NUEVO)
- ✅ `sql/migrations/016_fix_reprogramar_viaje.sql` (NUEVO)

### Components:
- ✅ `components/Modals/ReprogramarModal.tsx` (NUEVO)
- ✅ `components/Modals/ViajesExpiradosModal.tsx` (MODIFICADO)
- ✅ `components/Planning/PlanningGrid.tsx` (MODIFICADO)
- ✅ `components/Planning/DayView.tsx` (MODIFICADO)
- ✅ `components/Planning/MonthView.tsx` (MODIFICADO)

### Pages:
- ✅ `pages/crear-despacho.tsx` (MODIFICADO)

### Types:
- ✅ `lib/types.ts` (MODIFICADO)

### Documentation:
- ✅ `docs/ONBOARDING-DESARROLLADOR.md` (NUEVO)
- ✅ `docs/SESION-11-ENE-2026-SISTEMA-REPROGRAMACION.md` (ESTE ARCHIVO)

---

## 🚀 Estado Actual del Proyecto

### ✅ Funcionalidades Completadas:

1. **Sistema de Estados Duales** (Migración 015 - 10 Ene)
   - `estado_carga` y `estado_unidad` funcionando
   - 17 estados para cada dimensión
   - Triggers y funciones helper

2. **Sistema de Reprogramación** (Migración 016 - 10-11 Ene)
   - Detección automática de expiración
   - Tracking histórico completo
   - Reprogramación manual con limpieza
   - KPIs gerenciales

3. **Visual Dimming**
   - Viajes expirados se muestran apagados en planificación
   - Aplicado en vistas Semanal, Diaria y Mensual

4. **Tab Expirados**
   - Separación clara de despachos expirados
   - No duplicación en otros tabs
   - Contadores precisos

5. **Modal de Reprogramación**
   - Interfaz completa y validaciones
   - Actualización atómica de datos
   - Feedback claro al usuario

---

## ⏸️ Funcionalidades Pendientes

### 1. Badge "⚠️ Reprogramado" en Tarjetas
**Descripción:** Mostrar badge visual en tarjetas de viajes que han sido reprogramados

**Ubicación:** `components/Planning/PlanningGrid.tsx`, `DayView.tsx`, `MonthView.tsx`

**Implementación sugerida:**
```tsx
{dispatch.cantidad_reprogramaciones > 0 && (
  <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-amber-500/80 text-white rounded text-[8px] font-bold">
    ⚠️ {dispatch.cantidad_reprogramaciones}x
  </span>
)}
```

### 2. Dashboard KPIs de Expiración
**Descripción:** Página/componente que use `vista_kpis_expiracion` para métricas gerenciales

**Métricas a mostrar:**
- Tasa de recuperación %
- Total de viajes reprogramados
- Promedio de reprogramaciones
- Top 3 razones de expiración

**Archivo sugerido:** `pages/estadisticas-expiracion.tsx`

### 3. Filtro por Recepciones en ViajesExpiradosModal
**Estado:** ⚠️ Implementado pero sin datos de prueba

**Testing necesario:**
- Crear viaje expirado con destino = ubicación de otra empresa
- Verificar que aparezca en modal de esa empresa

---

## 🔍 Información para Próxima Sesión

### Credenciales de Testing:
```
Usuario: leandro@aceitera.com
Empresa: Aceitera San Miguel S.A (Planta)
CUIT: 30-56489154-1
Ubicaciones: Aceitera San Miguel S.A
```

### Despachos de Prueba:
- **DSP-20260109-001**: Expirado, reprogramado exitosamente
- Fecha original: 09/01/2026 20:00
- Fecha nueva después de reprogram: según input usuario

### Queries Útiles:

**Ver viajes expirados:**
```sql
SELECT v.id, d.pedido_id, v.estado_carga, v.fue_expirado, 
       v.cantidad_reprogramaciones, v.motivo_reprogramacion
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE v.fue_expirado = true
ORDER BY v.fecha_expiracion_original DESC;
```

**Ver KPIs:**
```sql
SELECT * FROM vista_kpis_expiracion;
```

**Ver despachos con nueva fecha:**
```sql
SELECT pedido_id, scheduled_local_date, scheduled_local_time, 
       transport_id, estado
FROM despachos
WHERE pedido_id = 'DSP-20260109-001';
```

---

## 📝 Notas Técnicas Importantes

### Pattern Dictionary en Supabase:
```typescript
// ✅ CORRECTO: Queries separadas + diccionarios
const data1 = await supabase.from('table1').select();
const data2 = await supabase.from('table2').select();
const dict = {};
data2.forEach(item => dict[item.id] = item);

// ❌ INCORRECTO: JOINs complejos con alias
.select('tabla1(), tabla2:foreign_key()')
```

### Actualización de Despachos Post-Reprogramación:
Siempre actualizar **tanto en función SQL como en cliente** para garantizar consistencia:
1. Función SQL: Actualiza viajes individuales
2. Cliente (modal): Actualiza despacho general

### Estados del Despacho:
```typescript
'pendiente_transporte' // Inicial, sin transporte
'transporte_asignado'  // Con transporte pero viajes pendientes
'expirado'             // Detectado automáticamente si tiene viajes expirados
```

---

## 🎓 Aprendizajes de la Sesión

1. **Dictionary Pattern**: Más eficiente que JOINs complejos en Supabase
2. **Actualización Dual**: Cliente + SQL para garantizar consistencia
3. **Estados Derivados**: `estado: 'expirado'` se deriva de `viajes.estado_carga`
4. **Filtros Consistentes**: Aplicar mismo filtro en queries y contadores
5. **Logs de Depuración**: Cruciales para diagnosticar filtros de recepciones

---

## ✅ Checklist de Cierre

- [x] Todas las migraciones SQL ejecutadas en Supabase
- [x] Función `reprogramar_viaje()` actualizada y testeada
- [x] Modal de reprogramación funcional
- [x] Tab Expirados implementado
- [x] Contadores de tabs corregidos
- [x] Visual dimming aplicado en todas las vistas
- [x] TypeScript types actualizados
- [x] Filtros de recepciones implementados (pending testing)
- [x] Documentación de onboarding creada
- [x] Sesión documentada completamente
- [x] Todo el código commiteable (sin errores de compilación)

---

## 🚦 Próxima Sesión - Plan Sugerido

### Prioridad Alta:
1. ✅ Testing completo de reprogramación con datos reales
2. ✅ Verificar filtro de recepciones en modal
3. 🔨 Implementar badges de reprogramación en tarjetas

### Prioridad Media:
4. 📊 Crear dashboard de KPIs de expiración
5. 🎨 Mejorar UX del modal (animaciones, confirmaciones)

### Prioridad Baja:
6. 📈 Analytics de causas de expiración
7. 🔔 Notificaciones de viajes próximos a expirar

---

**Fin de Sesión - 11 de Enero 2026**  
**Estado del Proyecto:** ✅ Sistema de Reprogramación Completado  
**Siguiente Hito:** Dashboard KPIs y Badges Visuales
