# 📚 ESTRUCTURA DE BASE DE DATOS - RECURSOS DE TRANSPORTE

> **⚠️ DOCUMENTO CRÍTICO - LECTURA OBLIGATORIA**  
> Leer este documento ANTES de modificar queries que involucren choferes, camiones, acoplados o viajes.
>
> **📖 Incluido en:** [PROTOCOLO-INICIO-SESION-COPILOT.md](./GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md)  
> **📝 Actualizar según:** [PROTOCOLO-CIERRE-SESION-COPILOT.md](./GUIAS/PROTOCOLO-CIERRE-SESION-COPILOT.md)

**Fecha:** 18 de Enero 2026  
**Última actualización:** Unificación de columnas de recursos  
**Propósito:** Consolidar la estructura oficial de tablas de recursos de transporte y evitar inconsistencias.

---

## ⚠️ IMPORTANTE: CONVENCIÓN UNIFICADA DE COLUMNAS

### Columnas OFICIALES en `viajes_despacho`:

| ✅ USAR SIEMPRE | ❌ DEPRECADO (no usar) |
|-----------------|------------------------|
| `transport_id` | ~~id_transporte~~ |
| `camion_id` | ~~id_camion~~ |
| `acoplado_id` | ~~id_acoplado~~ |
| `chofer_id` | ~~id_chofer~~ |

**EXCEPCIÓN:** `id_transporte_cancelado` es un campo DIFERENTE (guarda el histórico del transporte que canceló) y NO debe cambiarse.

### Convención de nombres:
- **Sufijo `_id`** para FKs: `transport_id`, `camion_id`, `chofer_id`, `acoplado_id`, `despacho_id`
- **Prefijo `id_`** solo en tablas de recursos propios: `choferes.id_transporte` (el transporte dueño del chofer)

---

## 🎯 PROBLEMA IDENTIFICADO Y RESUELTO

### Contexto del Error
Durante el desarrollo se mezclaron diferentes nombres de columnas en queries, causando que múltiples pantallas NO mostraran datos de choferes, camiones y acoplados, mostrando "Sin asignar" en lugar de los datos reales.

### Síntomas del Problema
- ✅ Control de Acceso mostraba datos correctamente
- ❌ Coordinador de Planta (crear-despacho) NO mostraba datos
- ❌ Planificación NO mostraba datos
- ❌ Viajes Activos NO muestra datos (pendiente corrección)
- ❌ Otras pantallas de transporte afectadas

### Causa Raíz
**Inconsistencia en nombres de columnas** entre lo que existe en la base de datos y lo que se usaba en el código:

```typescript
// ❌ INCORRECTO (usado en código viejo)
viaje.id_chofer, viaje.id_camion, viaje.id_acoplado
chofer.documento
camion.tipo

// ✅ CORRECTO (estructura real de BD)
viaje.chofer_id, viaje.camion_id, viaje.acoplado_id
chofer.dni
camion.anio
```

---

## 📋 ESTRUCTURA OFICIAL DE TABLAS

### Tabla: `choferes`
```sql
CREATE TABLE choferes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR NOT NULL,
  apellido VARCHAR NOT NULL,
  dni VARCHAR NOT NULL,              -- ⚠️ NO "documento"
  telefono VARCHAR,
  usuario_id UUID REFERENCES auth.users,
  empresa_id UUID REFERENCES empresas,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos para SELECT:**
```typescript
.select('id, nombre, apellido, dni, telefono')
```

---

### Tabla: `camiones`
```sql
CREATE TABLE camiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patente VARCHAR NOT NULL,
  marca VARCHAR,
  modelo VARCHAR,
  anio INTEGER,                      -- ⚠️ NO "tipo"
  empresa_id UUID REFERENCES empresas,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos para SELECT:**
```typescript
.select('id, patente, marca, modelo, anio')
```

---

### Tabla: `acoplados`
```sql
CREATE TABLE acoplados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patente VARCHAR NOT NULL,
  marca VARCHAR,
  modelo VARCHAR,
  anio INTEGER,
  empresa_id UUID REFERENCES empresas,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos para SELECT:**
```typescript
.select('id, patente, marca, modelo, anio')
```

---

### Tabla: `viajes_despacho`
```sql
CREATE TABLE viajes_despacho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID REFERENCES despachos,
  numero_viaje INTEGER NOT NULL,
  chofer_id UUID REFERENCES choferes,    -- ⚠️ NO "id_chofer"
  camion_id UUID REFERENCES camiones,    -- ⚠️ NO "id_camion"
  acoplado_id UUID REFERENCES acoplados, -- ⚠️ NO "id_acoplado"
  estado VARCHAR DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos para SELECT:**
```typescript
.select('id, despacho_id, numero_viaje, chofer_id, camion_id, acoplado_id, estado')
```

---

## ✅ PATRÓN DE ACCESO CORRECTO

### Método: Dictionary Pattern (más eficiente)

Este es el patrón que **FUNCIONA CORRECTAMENTE** y debe replicarse en todas las pantallas:

```typescript
// 1️⃣ SELECT con nombres correctos de columnas
const { data: viajes } = await supabase
  .from('viajes_despacho')
  .select('id, chofer_id, camion_id, acoplado_id, estado')  // ✅ Usar chofer_id, NO id_chofer
  .eq('empresa_id', empresaId);

// 2️⃣ Extraer IDs únicos
const choferIds = [...new Set(
  viajes.filter(v => v.chofer_id).map(v => v.chofer_id)
)];

const camionIds = [...new Set(
  viajes.filter(v => v.camion_id).map(v => v.camion_id)
)];

const acopladoIds = [...new Set(
  viajes.filter(v => v.acoplado_id).map(v => v.acoplado_id)
)];

// 3️⃣ Queries en paralelo con Promise.all
const [choferesResult, camionesResult, acopladosResult] = await Promise.all([
  supabase
    .from('choferes')
    .select('id, nombre, apellido, dni, telefono')  // ✅ dni, NO documento
    .in('id', choferIds),
  
  supabase
    .from('camiones')
    .select('id, patente, marca, modelo, anio')     // ✅ anio, NO tipo
    .in('id', camionIds),
  
  supabase
    .from('acoplados')
    .select('id, patente, marca, modelo, anio')
    .in('id', acopladoIds)
]);

// 4️⃣ Crear diccionarios para acceso rápido
const choferesData: Record<string, any> = {};
choferesResult.data?.forEach(c => { choferesData[c.id] = c; });

const camionesData: Record<string, any> = {};
camionesResult.data?.forEach(c => { camionesData[c.id] = c; });

const acopladosData: Record<string, any> = {};
acopladosResult.data?.forEach(a => { acopladosData[a.id] = a; });

// 5️⃣ Mapear a objetos finales
const viajesMapeados = viajes.map(viaje => ({
  ...viaje,
  chofer: viaje.chofer_id ? choferesData[viaje.chofer_id] : null,
  camion: viaje.camion_id ? camionesData[viaje.camion_id] : null,
  acoplado: viaje.acoplado_id ? acopladosData[viaje.acoplado_id] : null
}));
```

### Ventajas del Dictionary Pattern
✅ Una sola query por tabla (eficiente)  
✅ Acceso O(1) por ID usando diccionarios  
✅ Fácil de debuggear con console.log  
✅ Escalable para muchos viajes  

---

## 🚫 ERRORES COMUNES A EVITAR

### ❌ Error 1: Usar columnas deprecadas en viajes_despacho
```typescript
// ❌ INCORRECTO (columnas deprecadas - NO USAR)
viaje.id_transporte    // ❌
viaje.id_camion        // ❌
viaje.id_acoplado      // ❌
viaje.id_chofer        // ❌

// ✅ CORRECTO (columnas oficiales)
viaje.transport_id     // ✅ UUID de empresa de transporte
viaje.camion_id        // ✅ UUID de camión
viaje.acoplado_id      // ✅ UUID de acoplado
viaje.chofer_id        // ✅ UUID de chofer
```

### ❌ Error 2: Confundir columnas entre tablas
```typescript
// En CHOFERES, CAMIONES, ACOPLADOS: usar id_transporte (dueño)
// Esto está BIEN porque refiere al transporte propietario:
chofer.id_transporte    // ✅ El transporte dueño del chofer
camion.id_transporte    // ✅ El transporte dueño del camión

// En VIAJES_DESPACHO: usar transport_id (asignación)
// Porque refiere al transporte asignado al viaje:
viaje.transport_id      // ✅ El transporte asignado al viaje
```

### ❌ Error 3: Usar campos inexistentes en choferes
```typescript
// ❌ INCORRECTO
.select('id, nombre, apellido, documento, telefono')

// ✅ CORRECTO
.select('id, nombre, apellido, dni, telefono')
```

### ❌ Error 4: Usar campos inexistentes en camiones
```typescript
// ❌ INCORRECTO
.select('id, patente, marca, modelo, tipo')

// ✅ CORRECTO
.select('id, patente, marca, modelo, anio')
```

### ❌ Error 5: JOINs en SELECT (causa HTTP 400)
```typescript
// ❌ INCORRECTO (evitar JOINs directos)
.select(`
  *,
  choferes(*),
  camiones(*)
`)

// ✅ CORRECTO (queries separadas con diccionarios)
// Ver "Patrón de Acceso Correcto" arriba
```

### ❌ Error 5: No mapear diccionarios a objetos
```typescript
// ❌ INCORRECTO (crea diccionarios pero no los usa)
const choferesData = {};
choferesResult.data?.forEach(c => { choferesData[c.id] = c; });
// ... pero nunca hace: viaje.chofer = choferesData[viaje.chofer_id]

// ✅ CORRECTO
const viajesMapeados = viajes.map(viaje => ({
  ...viaje,
  chofer: viaje.chofer_id ? choferesData[viaje.chofer_id] : null
}));
```

---

## 📁 ARCHIVOS CORREGIDOS Y FUNCIONANDO

Estos archivos YA implementan correctamente el patrón:

### ✅ Pantallas Principales
1. **[pages/crear-despacho.tsx](../pages/crear-despacho.tsx)** - Líneas 1210-1252
   - Coordinador de Planta
   - Muestra chofer, camión y acoplado correctamente
   - Implementa Dictionary Pattern completo
   
2. **[pages/planificacion.tsx](../pages/planificacion.tsx)** - Líneas 220-340
   - Pantalla de Planificación
   - Corregido: `id_chofer` → `chofer_id`, `id_camion` → `camion_id`
   - Mapeo de diccionarios agregado
   
3. **[pages/control-acceso.tsx](../pages/control-acceso.tsx)** - Líneas 242-271
   - Control de Acceso (siempre funcionó)
   - Usa queries individuales `.eq('id', viajeData.chofer_id)`
   - Referencia válida del patrón alternativo

### ✅ Hooks y Servicios
4. **[lib/hooks/useRedNodexia.jsx](../lib/hooks/useRedNodexia.jsx)** - Línea 177-182
   - Corregido: `documento` → `dni`, `id_chofer` → `chofer_id`
   
5. **[lib/hooks/useRedNodexia.tsx](../lib/hooks/useRedNodexia.tsx)** - Línea 207-212
   - Corregido: `documento` → `dni`, `id_chofer` → `chofer_id`

---

## ⚠️ ARCHIVOS PENDIENTES DE CORRECCIÓN

Estos archivos aún usan la notación antigua y pueden fallar:

### 🔴 Módulo Transporte
1. **[pages/transporte/viajes-activos.tsx](../pages/transporte/viajes-activos.tsx)**
   - Línea 93: Usa `id_camion`, `id_chofer`
   - Línea 135-176: Mapeo con nombres antiguos
   - **Necesita:** Aplicar mismo patrón que crear-despacho.tsx

2. **[components/Transporte/ViajeDetalleModal.tsx](../components/Transporte/ViajeDetalleModal.tsx)**
   - Línea 110, 139-140: Usa `id_camion`
   - **Necesita:** Cambiar a `camion_id`

3. **[components/Transporte/AceptarDespachoModal.tsx](../components/Transporte/AceptarDespachoModal.tsx)**
   - Línea 179: `.eq('id_camion', camionId)`
   - **Necesita:** Cambiar a `camion_id`

4. **[components/Transporte/MapaFlota.tsx](../components/Transporte/MapaFlota.tsx)**
   - Línea 90: `.eq('id_camion', camion.id)`
   - **Necesita:** Cambiar a `camion_id`

### 🔴 Módulo Planning
5. **[components/Planning/TrackingView.tsx](../components/Planning/TrackingView.tsx)**
   - Línea 25, 126, 167, 203: Usa `id_camion`
   - **Necesita:** Aplicar patrón Dictionary completo

### 🔴 Otros Módulos
6. **[pages/supervisor-carga.tsx](../pages/supervisor-carga.tsx)**
   - Línea 69, 177: Usa `id_camion`
   
7. **[pages/transporte/dashboard.tsx](../pages/transporte/dashboard.tsx)**
   - Línea 116: `camiones:id_camion(patente)` - JOIN incorrecto

8. **[pages/chofer-mobile.tsx](../pages/chofer-mobile.tsx)**
   - Línea 207: `camiones:id_camion` - JOIN incorrecto

9. **[pages/chofer/viajes.tsx](../pages/chofer/viajes.tsx)**
   - Línea 115: `camiones:id_camion` - JOIN incorrecto

---

## 🔧 PROTOCOLO DE VERIFICACIÓN ANTES DE MODIFICAR QUERIES

Antes de escribir o modificar cualquier query que involucre recursos de transporte, seguir este checklist:

### ✅ Checklist Pre-Modificación

1. **Leer este documento completo** ← Estás aquí
2. **Verificar estructura de tabla** usando:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'nombre_tabla'
   ORDER BY ordinal_position;
   ```
3. **Buscar archivo de referencia funcionando:**
   - Para Dictionary Pattern: Ver [pages/crear-despacho.tsx](../pages/crear-despacho.tsx) líneas 1210-1252
   - Para queries simples: Ver [pages/control-acceso.tsx](../pages/control-acceso.tsx) líneas 242-271
4. **Copiar patrón exitoso** en lugar de inventar nuevo código
5. **Agregar logs de debug** para verificar:
   ```typescript
   console.log('📦 Diccionarios creados:', { choferesData, camionesData });
   console.log('🔍 Mapeo:', { chofer_id: viaje.chofer_id, chofer: choferesData[viaje.chofer_id] });
   ```
6. **Testing en pantalla** antes de commitear

---

## 🎓 MÉTODO PARA EVITAR ERRORES FUTUROS

### Regla de Oro
> **"Copiar código que funciona, no inventar variaciones"**

### Proceso de 3 Pasos
1. **Identificar** qué pantalla similar ya funciona
2. **Copiar** el patrón completo (no adaptar, copiar exacto)
3. **Verificar** con console.log que los datos fluyen

### Referencias Rápidas

**¿Necesitas mostrar chofer/camión/acoplado en una lista?**
→ Copiar patrón de [pages/crear-despacho.tsx](../pages/crear-despacho.tsx#L1210-L1252)

**¿Necesitas mostrar datos de UN solo viaje?**
→ Copiar patrón de [pages/control-acceso.tsx](../pages/control-acceso.tsx#L242-L271)

**¿Necesitas saber los nombres EXACTOS de columnas?**
→ Volver a "Estructura Oficial de Tablas" en este documento

**¿Aparece HTTP 400 en la query?**
→ Eliminar JOINs, usar Dictionary Pattern

**¿Muestra "Sin asignar" o null?**
→ Verificar que uses `chofer_id` NO `id_chofer`
→ Verificar que uses `dni` NO `documento`
→ Verificar que uses `anio` NO `tipo`
→ Verificar que hagas el mapeo: `viaje.chofer = choferesData[viaje.chofer_id]`

---

## 📊 RESUMEN DE CAMBIOS REALIZADOS (01-Ene-2026)

### Correcciones Implementadas

| Archivo | Líneas | Cambio Realizado | Estado |
|---------|--------|------------------|--------|
| `pages/crear-despacho.tsx` | 1217 | `documento` → `dni` | ✅ |
| `pages/crear-despacho.tsx` | 1219 | `tipo` → `anio` | ✅ |
| `pages/crear-despacho.tsx` | 1210-1225 | Agregado query acoplados completo | ✅ |
| `pages/crear-despacho.tsx` | 1246-1252 | Agregado mapeo diccionarios (chofer, camion, acoplado) | ✅ |
| `pages/planificacion.tsx` | 189-190 | `id_chofer` → `chofer_id`, `id_camion` → `camion_id` | ✅ |
| `pages/planificacion.tsx` | 223-227 | Corregido mapeo de IDs en extracción | ✅ |
| `pages/planificacion.tsx` | 301-302 | Corregido uso de IDs en mapeo de viajes | ✅ |
| `pages/planificacion.tsx` | 288, 336 | Agregado `chofer_data` en objetos mapeados | ✅ |
| `lib/hooks/useRedNodexia.jsx` | 177-182 | `documento` → `dni`, `id_chofer` → `chofer_id` | ✅ |
| `lib/hooks/useRedNodexia.tsx` | 207-212 | `documento` → `dni`, `id_chofer` → `chofer_id` | ✅ |

### Testing Realizado
- ✅ Control de Acceso: Muestra Walter Daniel Zayas + ABC123
- ✅ Crear Despacho: Muestra Walter + ABC123 + AF356JG (acoplado)
- ✅ Planificación: Muestra Walter + ABC123
- ❌ Viajes Activos: Pendiente corrección (mismo patrón)

---

## 🚀 PRÓXIMOS PASOS

Para completar la consolidación:

1. **Aplicar correcciones a archivos pendientes** (lista arriba)
   - Prioridad ALTA: viajes-activos.tsx
   - Prioridad MEDIA: ViajeDetalleModal, TrackingView
   - Prioridad BAJA: Dashboards, vistas de chofer

2. **Actualizar tipos TypeScript** en:
   - `types/red-nodexia.ts` línea 248
   - `types/missing-types.ts` línea 99
   - Cambiar `id_camion` → `camion_id`, `id_chofer` → `chofer_id`

3. **Documentar en README principal** la existencia de este documento

4. **Crear test automatizado** que verifique:
   - Que todas las queries usen nombres correctos
   - Que no haya referencias a `documento`, `tipo`, `id_chofer`, etc.

---

## 📖 CONCLUSIÓN

Este documento es la **fuente única de verdad** para la estructura de recursos de transporte. 

**Antes de tocar queries de choferes/camiones/acoplados:**
1. Leer este documento
2. Copiar patrón de archivo que funciona
3. No improvisar variaciones

**Si algo no funciona:**
1. Verificar nombres de columnas en este documento
2. Comparar con [pages/crear-despacho.tsx](../pages/crear-despacho.tsx) (referencia dorada)
3. Agregar logs para debuggear

---

**Última actualización:** 01 de Enero 2026  
**Mantenido por:** Equipo de Desarrollo Nodexia  
**Próxima revisión:** Después de corregir archivos pendientes
