# PROMPT DE CONTINUACIÓN - Sesión Nodexia 
**Fecha de creación:** 9 de Diciembre 2025  
**Para usar en:** Próxima sesión de GitHub Copilot

---

## 📋 INSTRUCCIONES PARA EL AGENTE

Eres un experto desarrollador trabajando en **Nodexia**, una plataforma de gestión de transporte de cargas construida con **Next.js 15.5.6, React 19, TypeScript y Supabase**.

### CONTEXTO INMEDIATO

Estamos en medio de la implementación del sistema **Red Nodexia**, un marketplace que permite a coordinadores de planta publicar viajes para que transportes NO vinculados puedan ofertar y ser contratados.

**Última tarea completada:** Integración de Red Nodexia con el flujo operativo directo  
**Estado actual:** 95% funcional - Falta ejecutar migración de BD y testing  
**Archivo de estado:** `ESTADO-ACTUAL-09-DIC-2025.md`

---

## 🎯 CONTEXTO DE LA APLICACIÓN

### Propósito del Sistema
Nodexia es una plataforma B2B que conecta:
- **Plantas/Clientes**: Empresas que necesitan transportar cargas (ej: Aceitera San Miguel)
- **Transportes**: Empresas de logística que mueven las cargas
- **Red Nodexia**: Marketplace para conectar plantas con transportes NO vinculados

### Arquitectura Multi-Tenant
- Cada usuario pertenece a una o más empresas
- Las empresas tienen tipos: `'planta'`, `'cliente'`, `'transporte'`
- Relaciones empresa-empresa gestionadas por `relaciones_empresas`
- RLS (Row Level Security) garantiza aislamiento de datos

### Stack Tecnológico
```
Frontend: Next.js 15 (Pages Router), React 19, TypeScript
Backend: Supabase (PostgreSQL + Auth + RLS + Realtime)
Styling: TailwindCSS
Maps: Google Maps API
Hosting: Vercel (frontend) + Supabase (backend)
```

---

## 🏗️ ESTRUCTURA DE DATOS CLAVE

### 1. Sistema de Despachos (Flujo Directo Tradicional)

```typescript
// Pedido de transporte de la planta
despachos {
  id: UUID
  pedido_id: string              // DSP-20251205-002
  origen: string                 // "Rosario, Santa Fe"
  destino: string                // "Molino Santa Rosa"
  estado: string                 // pendiente|asignado|completado
  transport_id: integer          // FK a transportes (legacy)
  cantidad_viajes_solicitados: int // Puede requerir múltiples camiones
  created_by: UUID               // Coordinador que lo creó
}

// Viajes individuales del despacho (1 despacho → N viajes)
viajes_despacho {
  id: UUID
  despacho_id: UUID              // FK a despachos
  numero_viaje: integer          // 1, 2, 3... (dentro del despacho)
  id_transporte: UUID            // FK a empresas (UUID)
  id_chofer: UUID                // Asignado por transporte
  id_camion: UUID                // Asignado por transporte
  estado: string                 // pendiente → transporte_asignado → 
                                 // camion_asignado → confirmado → 
                                 // en_transito → completado
  fecha_creacion: timestamp
  fecha_asignacion_transporte: timestamp
}
```

### 2. Red Nodexia (Marketplace de Cargas)

```typescript
// Publicación de viaje en la red
viajes_red_nodexia {
  id: UUID
  viaje_id: UUID                      // FK a viajes_despacho.id
  empresa_solicitante_id: UUID        // Planta que publica
  tarifa_ofrecida: decimal            // Precio ofrecido
  estado_red: string                  // abierto|con_ofertas|asignado|cerrado
  transporte_asignado_id: UUID        // Ganador (cuando se acepta)
  oferta_aceptada_id: UUID            // FK a ofertas_red_nodexia
  fecha_publicacion: timestamp
  fecha_asignacion: timestamp
}

// Ofertas de transportes para un viaje
ofertas_red_nodexia {
  id: UUID
  viaje_red_id: UUID                  // FK a viajes_red_nodexia
  transporte_id: UUID                 // Empresa transporte que oferta
  estado_oferta: string               // pendiente|aceptada|rechazada
  fecha_oferta: timestamp
  fecha_respuesta: timestamp
}

// Requisitos técnicos del viaje
requisitos_viaje_red {
  viaje_red_id: UUID
  tipo_camion: string                 // 'Semirremolque', 'Chasis'...
  requiere_gps: boolean
  requiere_carga_peligrosa: boolean
  peso_maximo_kg: decimal
}
```

### 3. RLS Policy Crítica

```sql
-- Solo transportes SIN vínculo directo pueden ver viajes en Red
CREATE POLICY "Solo transportes sin vinculo ven viajes"
ON viajes_red_nodexia FOR SELECT
USING (
  NOT EXISTS (
    SELECT 1 FROM relaciones_empresas re
    WHERE re.empresa_transporte_id = (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE usuario_id = auth.uid()
    )
    AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
  )
);
```

---

## 🔄 FLUJOS IMPLEMENTADOS

### Flujo A: Asignación Directa (Tradicional)
```
1. Coordinador crea despacho
   ↓ (crear-despacho.tsx)
2. Selecciona transporte vinculado de lista
   ↓ (AssignTransportModal)
3. Sistema crea viajes_despacho con id_transporte
   ↓
4. Transporte ve viaje en su panel
   ↓ (despachos-ofrecidos.tsx)
5. Asigna chofer y camión
   ↓
6. Flujo operativo: confirmación → tránsito → entrega
```

### Flujo B: Red Nodexia (Marketplace) ⭐ IMPLEMENTADO

```
1. Coordinador crea despacho
   ↓ (crear-despacho.tsx)
2. Click "Abrir en Red Nodexia"
   ↓ (AbrirRedNodexiaModal)
3. Sistema crea viajes_red_nodexia (estado='abierto')
   ↓
4. Transportes NO vinculados ven oferta
   ↓ (cargas-en-red.tsx)
5. Transporte click "Aceptar Viaje"
   ↓ useRedNodexia.crearOferta()
6. Sistema crea ofertas_red_nodexia (estado='pendiente')
   ↓
7. Coordinador click "Ver Estado"
   ↓ (VerEstadoRedNodexiaModal)
8. Ve lista de transportes interesados
   ↓
9. Click "Seleccionar este transporte"
   ↓ Modal de confirmación
10. Click "Confirmar Asignación"
    ↓ handleAceptarOfertaDesdeModal() 🔥 CLAVE
11. Sistema ejecuta transacción completa:
    ┌─────────────────────────────────────────┐
    │ a) ofertas_red_nodexia                  │
    │    → Marca oferta como 'aceptada'       │
    │    → Otras ofertas como 'rechazada'     │
    ├─────────────────────────────────────────┤
    │ b) viajes_red_nodexia                   │
    │    → estado_red = 'asignado'            │
    │    → transporte_asignado_id = UUID      │
    ├─────────────────────────────────────────┤
    │ c) viajes_despacho 🔥 INTEGRACIÓN       │
    │    → id_transporte = UUID               │
    │    → estado = 'transporte_asignado'     │
    │    → origen_asignacion = 'red_nodexia'  │
    ├─────────────────────────────────────────┤
    │ d) despachos                            │
    │    → transport_id = integer             │
    │    → estado = 'asignado'                │
    │    → origen_asignacion = 'red_nodexia'  │
    └─────────────────────────────────────────┘
    ↓
12. Despacho aparece en tab "Asignados" del coordinador
    ↓
13. Viaje aparece en "Despachos Ofrecidos" del transporte
    ↓
14. ⭐ DESDE AQUÍ: FLUJO IDÉNTICO A ASIGNACIÓN DIRECTA
    ↓
15. Transporte asigna chofer/camión
16. Operación normal hasta completado
```

---

## 📂 ARCHIVOS CRÍTICOS

### Frontend - Coordinador
```typescript
// pages/crear-despacho.tsx
// Líneas clave:
// - 176-300: fetchGeneratedDispatches() - Carga despachos con conteos
// - 626-680: handleOpenRedNodexia() - Publica en Red
// - 683-710: handleVerEstado() - Abre modal de ofertas
// - 717-840: handleAceptarOfertaDesdeModal() 🔥 FUNCIÓN PRINCIPAL
//            → Acepta oferta y actualiza TODO el sistema

interface GeneratedDispatch {
  id: string;
  pedido_id: string;
  estado: string;
  viajes_generados?: number;
  viajes_asignados?: number;     // Solo viajes realmente asignados
  transporte_data?: {            // Datos del transporte asignado
    nombre: string;
    esMultiple?: boolean;        // Si hay múltiples transportes
  };
}
```

### Frontend - Transporte
```typescript
// pages/transporte/cargas-en-red.tsx
// Transportes ven viajes abiertos en Red Nodexia
// - Filtrados por RLS (sin vínculo directo)
// - Botón dinámico según estado de oferta
// - Estados: "Aceptar Viaje" | "Oferta Enviada" | "Asignado" | "Rechazada"

// pages/transporte/despachos-ofrecidos.tsx  
// Transportes ven viajes YA ASIGNADOS
// - Incluye estado 'transporte_asignado' (de Red)
// - Badge 🌐 indica origen Red Nodexia (pendiente migración)
// - Query: .eq('id_transporte', empresaId)
```

### Components
```typescript
// components/Transporte/VerEstadoRedNodexiaModal.tsx
// Modal que muestra ofertas recibidas
// ⭐ MODIFICACIONES RECIENTES:
// - Agregado modal de confirmación (no usa window.confirm)
// - Loading state durante procesamiento
// - Promise async/await para garantizar orden
// - Estados: ofertas[], showConfirmacion, procesandoAsignacion

// Props:
interface VerEstadoRedNodexiaModalProps {
  viajeRedId: string;
  viajeNumero: string;
  onClose: () => void;
  onAceptarOferta?: (ofertaId: string, transporteId: string) => Promise<void>;
  //                                                             ^^^^^^^^^^^^
  //                                                             Debe ser Promise
}
```

### Hooks
```typescript
// lib/hooks/useRedNodexia.tsx
// Lógica de negocio de Red Nodexia
export function useRedNodexia() {
  // Obtener viajes abiertos (con ofertas completas)
  obtenerViajesAbiertos()
  
  // Crear oferta de transporte
  crearOferta(viajeRedId, transporteId)
  
  // Obtener ofertas de un viaje
  obtenerOfertasViaje(viajeRedId)
  
  // Aceptar oferta (usado en admin, no en modal)
  aceptarOferta(ofertaId)
}
```

---

## ⚠️ ESTADO ACTUAL Y PENDIENTES

### ✅ Completado en Última Sesión

1. **Función handleAceptarOfertaDesdeModal** - COMPLETA
   - Obtiene viaje_id desde viajes_red_nodexia
   - Obtiene despacho_id desde viajes_despacho  
   - Actualiza ofertas (aceptada/rechazadas)
   - Actualiza viajes_red_nodexia
   - ⭐ Actualiza viajes_despacho (id_transporte, estado)
   - ⭐ Actualiza despachos (transport_id, estado)
   - Cierra modal correctamente
   - Recarga despachos
   - Muestra mensaje de éxito

2. **Modal de Confirmación** - COMPLETO
   - Reemplazó window.confirm/alert
   - Diseño elegante con preview del transporte
   - Loading state "Procesando..."
   - Botones deshabilitados durante ejecución
   - Promise async/await garantiza orden

3. **Vista del Transporte** - PREPARADA
   - Query incluye estado 'transporte_asignado'
   - Badge 🌐 listo (pendiente campo origen_asignacion)
   - Interfaz completa en despachos-ofrecidos.tsx

### 🔴 PENDIENTE CRÍTICO

**1. Ejecutar Migración de Base de Datos**

Archivo: `sql/migrations/007_agregar_origen_asignacion.sql`

```sql
-- Agregar columnas para diferenciar Red vs Directo
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS origen_asignacion VARCHAR(20) DEFAULT 'directo' 
CHECK (origen_asignacion IN ('directo', 'red_nodexia'));

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS origen_asignacion VARCHAR(20) DEFAULT 'directo'
CHECK (origen_asignacion IN ('directo', 'red_nodexia'));

-- Índices para reportes
CREATE INDEX IF NOT EXISTS idx_despachos_origen_asignacion 
ON despachos(origen_asignacion);

CREATE INDEX IF NOT EXISTS idx_viajes_despacho_origen_asignacion 
ON viajes_despacho(origen_asignacion);
```

**Cómo ejecutar:**
- Opción A: POST a `/api/migrations/agregar-origen-asignacion`
- Opción B: Supabase SQL Editor
- Opción C: psql (si disponible)

**Después de migración, DESCOMENTAR en código:**
```typescript
// pages/crear-despacho.tsx línea ~803
origen_asignacion: 'red_nodexia'

// pages/crear-despacho.tsx línea ~813  
origen_asignacion: 'red_nodexia'

// pages/transporte/despachos-ofrecidos.tsx línea ~228
origen_asignacion: viaje.origen_asignacion
```

### 🟡 Testing Pendiente

**Escenario completo a validar:**

```
Usuario: martin@regional.com (Coordinador Aceitera San Miguel)

PASO 1: Crear Despacho
  - Origen: Centro de Distribución Rosario
  - Destino: Molino Santa Rosa
  - 1 viaje
  
PASO 2: Abrir en Red Nodexia
  - Click "Abrir en Red Nodexia"
  - Tarifa: $50,000
  - Requisitos: GPS requerido
  - ✓ Publicado exitosamente

PASO 3: Cambiar a Transporte
  - Login como Transportes Regional Demo
  - Ir a "Cargas en Red Nodexia"
  - Verificar: Viaje aparece
  - Click "Aceptar Viaje"
  - ✓ Oferta enviada

PASO 4: Volver a Coordinador
  - Login como martin@regional.com
  - Click "Ver Estado" en el viaje
  - Verificar: Aparece "Transportes Regional Demo"
  - Click "Seleccionar este transporte"
  - Modal de confirmación aparece
  - Click "Confirmar Asignación"
  - ✓ Botón muestra "Procesando..."
  - ✓ Modal se cierra
  - ✓ Despacho aparece en tab "Asignados"

PASO 5: Volver a Transporte  
  - Login como Transportes Regional Demo
  - Ir a "Despachos Ofrecidos"
  - Verificar: Viaje aparece con badge 🌐 Red
  - Asignar chofer
  - Asignar camión
  - ✓ Estados cambian correctamente

PASO 6: Flujo Operativo
  - Chofer confirma viaje
  - GPS tracking funciona
  - Control acceso planta
  - Proceso de carga
  - Finalización
  - ✓ TODO funciona igual que viaje directo
```

---

## 🐛 PROBLEMAS CONOCIDOS

### 1. Modal se reabre después de confirmar ✅ RESUELTO
**Causa:** onAceptarOferta no era async  
**Fix:** Cambió a Promise<void>, agregado loading state

### 2. Error "origen_asignacion does not exist" ⚠️ ACTIVO
**Causa:** Migración no ejecutada  
**Workaround:** Campo comentado temporalmente  
**Fix:** Ejecutar migración + descomentar código

### 3. transport_id vs id_transporte 🟢 MANEJADO
**Contexto:** Inconsistencia legacy  
- `despachos.transport_id` = integer (tabla transportes)
- `viajes_despacho.id_transporte` = UUID (tabla empresas)
**Estado:** Código maneja ambos casos correctamente

---

## 📊 QUERIES ÚTILES PARA DEBUGGING

```sql
-- Ver estado completo de un viaje en Red
SELECT 
  vrn.id as viaje_red_id,
  vrn.estado_red,
  vrn.transporte_asignado_id,
  vd.id as viaje_despacho_id,
  vd.estado as estado_viaje,
  vd.id_transporte,
  d.id as despacho_id,
  d.pedido_id,
  d.estado as estado_despacho,
  e.nombre as transporte_nombre,
  COUNT(o.id) as total_ofertas,
  COUNT(CASE WHEN o.estado_oferta = 'aceptada' THEN 1 END) as ofertas_aceptadas
FROM viajes_red_nodexia vrn
JOIN viajes_despacho vd ON vd.id = vrn.viaje_id
JOIN despachos d ON d.id = vd.despacho_id
LEFT JOIN empresas e ON e.id = vrn.transporte_asignado_id
LEFT JOIN ofertas_red_nodexia o ON o.viaje_red_id = vrn.id
WHERE vrn.id = 'UUID_AQUI'
GROUP BY vrn.id, vd.id, d.id, e.nombre;

-- Ver ofertas de un viaje
SELECT 
  o.id,
  o.estado_oferta,
  o.fecha_oferta,
  o.fecha_respuesta,
  e.nombre as transporte,
  e.cuit
FROM ofertas_red_nodexia o
JOIN empresas e ON e.id = o.transporte_id
WHERE o.viaje_red_id = 'UUID_AQUI'
ORDER BY o.fecha_oferta DESC;

-- Ver viajes asignados de un transporte
SELECT 
  vd.id,
  d.pedido_id,
  vd.numero_viaje,
  vd.estado,
  d.origen,
  d.destino,
  vd.fecha_asignacion_transporte
FROM viajes_despacho vd
JOIN despachos d ON d.id = vd.despacho_id
WHERE vd.id_transporte = 'UUID_EMPRESA_TRANSPORTE'
AND vd.estado IN ('transporte_asignado', 'camion_asignado', 'confirmado')
ORDER BY vd.fecha_asignacion_transporte DESC;
```

---

## 🎯 PRÓXIMAS ACCIONES RECOMENDADAS

### Al Iniciar Próxima Sesión:

1. **Verificar servidor corriendo**
   ```bash
   cd C:\Users\nodex\Nodexia-Web
   pnpm run dev
   # Nota: Puerto 3001 si 3000 está ocupado
   ```

2. **Ejecutar migración** 🔴 PRIORIDAD
   - Revisar archivo `sql/migrations/007_agregar_origen_asignacion.sql`
   - Ejecutar en Supabase o vía API endpoint
   - Verificar columnas creadas

3. **Descomentar código**
   - `pages/crear-despacho.tsx` líneas ~803, ~813
   - `pages/transporte/despachos-ofrecidos.tsx` línea ~228

4. **Testing completo**
   - Seguir escenario descrito arriba
   - Validar cada paso
   - Documentar cualquier issue

5. **Optimizaciones (si tiempo permite)**
   - Notificaciones al transporte
   - Dashboard de métricas
   - Mejoras de UX

---

## 💡 CONSEJOS PARA EL AGENTE

### Cuando trabajes en este proyecto:

1. **Siempre lee primero** `ESTADO-ACTUAL-09-DIC-2025.md`
2. **Usa console.log estratégicos** con emojis para tracking
3. **Verifica RLS policies** antes de queries complejos
4. **Tabs en lugar de espacios** para indentación
5. **Async/await en lugar de .then()** para promesas
6. **TypeScript strict** - todas las interfaces deben estar tipadas
7. **Supabase realtime** - considerar suscripciones para datos en vivo

### Patrones del Proyecto:

```typescript
// ✅ Bueno: Async/await con try-catch
const handleAction = async () => {
  try {
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
    console.log('✅ Success:', data);
  } catch (err: any) {
    console.error('❌ Error:', err);
    setErrorMsg(err.message);
  }
};

// ❌ Evitar: .then() chains
supabase.from('table').select().then(...).catch(...);

// ✅ Bueno: Interfaces explícitas
interface Despacho {
  id: string;
  pedido_id: string;
  // ...
}

// ❌ Evitar: any sin necesidad
const data: any = ...;
```

### Debugging:

```typescript
// Logs con contexto visual
console.log('🎯 Iniciando proceso:', { userId, despachoId });
console.log('📦 Datos recibidos:', data);
console.log('✅ Proceso completado exitosamente');
console.log('❌ Error encontrado:', error);
console.log('⚠️ Warning:', warning);
console.log('🔍 Debug info:', debugData);
```

---

## 🔐 CREDENCIALES (Solo para desarrollo)

**Supabase:**
- URL: https://lkdcodfzfnltuzrewolr.supabase.co
- Project ID: krzf-dealazatwhej
- Service Role Key: (en .env.local)

**Test Users:**
- Coordinador: martin@regional.com
- Transporte Red: Transportes Regional Demo (CUIT: 20-30000010-0)

---

## 📝 COMANDOS FRECUENTES

```bash
# Iniciar servidor
pnpm run dev

# Ver logs de build
pnpm run build

# Linter
pnpm run lint

# Conectar a Supabase (si psql disponible)
PGPASSWORD='Leandro05*' psql -h aws-0-us-west-1.pooler.supabase.com -p 6543 -U postgres.krzf-dealazatwhej -d postgres
```

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de considerar tarea completada:

- [ ] Migración ejecutada sin errores
- [ ] Código descomentado funciona
- [ ] Despachos aparecen en tabs correctos
- [ ] Badge 🌐 visible en viajes de Red
- [ ] Transporte ve viaje inmediatamente
- [ ] Puede asignar chofer y camión
- [ ] Flujo operativo funciona completo
- [ ] Sin errores en consola browser
- [ ] Sin errores en consola servidor
- [ ] Documentación actualizada

---

## 🎓 CONOCIMIENTO DEL DOMINIO

### Términos Clave:
- **Despacho**: Pedido de transporte (puede tener múltiples viajes)
- **Viaje**: Movimiento individual de un camión
- **Planta**: Empresa que produce/procesa (ej: Aceitera)
- **Cliente**: Empresa que recibe (ej: Molino)
- **Transporte**: Empresa de logística con flota
- **Chofer**: Conductor del camión
- **Camión/Acoplado**: Vehículos del transporte
- **Red Nodexia**: Marketplace para transportes no vinculados
- **Vínculo Directo**: Relación establecida empresa-transporte
- **RLS**: Row Level Security de PostgreSQL

### Flujo de Negocio:
1. Planta necesita mover carga → Crea despacho
2. Opciones:
   - **A)** Asignar transporte vinculado (directo)
   - **B)** Publicar en Red Nodexia (marketplace)
3. Transporte asigna recursos (chofer + camión)
4. Chofer confirma → GPS tracking → Operación
5. Carga → Tránsito → Entrega → Finalizado

---

**FIN DEL PROMPT DE CONTINUACIÓN**

Para usar este prompt: Copia y pega este archivo completo al iniciar una nueva conversación con GitHub Copilot. El agente tendrá todo el contexto necesario para continuar el trabajo sin necesidad de explicaciones adicionales.
