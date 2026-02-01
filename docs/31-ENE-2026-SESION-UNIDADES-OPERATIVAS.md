# SESIÓN 31 ENERO 2026 - Sistema de Unidades Operativas

**Fecha**: 31 de Enero 2026  
**Tema**: Implementación de Sistema de Unidades Operativas para Coordinador de Transporte  
**Estado**: Base implementada, pendiente UI y algoritmo

---

## 📦 RESUMEN DE LA SESIÓN

### Objetivo Principal
Mejorar la experiencia del coordinador de transporte creando un sistema de **Unidades Operativas** (chofer + camión + acoplado) que permita asignar recursos más rápido con recomendaciones inteligentes basadas en disponibilidad, ubicación y normativas de descanso.

### Lo que se logró

#### ✅ 1. Migración 017 - Base de Datos Completa
**Archivo**: `sql/migrations/017_unidades_operativas_completo.sql` (434 líneas)

**Componentes creados**:
- **Tabla `unidades_operativas`**: 
  - Agrupa chofer + camión + acoplado
  - Trackea horas conducidas y necesidad de descanso
  - RLS completo por empresa_id
  - Constraints: unique index parcial (permite múltiples inactivos)

- **Vista `vista_disponibilidad_unidades`**:
  - Calcula disponibilidad en tiempo real
  - Determina próxima hora disponible
  - Une datos de chofer, camión, acoplado, ubicaciones

- **Función `calcular_disponibilidad_unidad()`**:
  - Verifica si unidad está disponible para fecha/hora específica
  - Calcula horas de descanso necesarias
  - Retorna ubicación actual y motivo de no disponibilidad

- **Normativas de descanso argentinas**:
  - 9 horas de conducción máxima = 12 horas de descanso obligatorio
  - Tracking automático de jornadas laborales

**Resultado**: Migración ejecutada exitosamente ✅

#### ✅ 2. Scripts de Soporte Creados

**Script 018**: `sql/migrations/018_agregar_coordenadas_ubicaciones.sql`
- Agrega coordenadas geográficas a 6 ubicaciones principales
- Necesario para algoritmo de distancia (Haversine)
- Ubicaciones incluidas:
  - Aceitera San Miguel (-34.5779, -58.7089)
  - Planta Rosario (-32.9442, -60.6505)
  - Terminal Zárate (-34.0970, -59.0261)
  - Puerto Buenos Aires (-34.6037, -58.3816)
  - Planta San Miguel (-34.5779, -58.7089)
  - Tecnopack Zayas (-32.9442, -60.6505)

**Script 019**: `sql/migrations/019_crear_unidades_ejemplo.sql`
- Queries para ver choferes y camiones disponibles
- Template para crear unidades manualmente
- Verificación de unidades creadas

#### ✅ 3. Mejoras UI en Despachos Ofrecidos
**Archivo**: `pages/transporte/despachos-ofrecidos.tsx`

**Cambios aplicados**:
1. **Fix bug crítico**: Viajes con chofer+camión ya no aparecen en tab "Pendientes"
   - Antes: filtraba por `estado === 'camion_asignado'`
   - Ahora: filtra por `tiene_chofer && tiene_camion`

2. **5 Badges de métricas**:
   - Total de Viajes
   - Sin Asignar
   - Urgentes (<4 horas)
   - En Tránsito
   - Alta Prioridad

3. **Tabs más grandes**: 
   - De `text-[10px] py-1` → `text-sm py-2.5`
   - Mejor legibilidad en móvil

4. **Botones de acción mejorados**:
   - Gradientes de color
   - Iconos (✅, ❌)
   - Sombras mejoradas

---

## 🔍 DIAGNÓSTICO - Estado Actual

### Verificación Ejecutada
**Archivo**: `sql/migrations/verificar-017.sql`

**Resultados**:
```
Total unidades: 0
Unidades activas: 0
Ubicaciones totales: 10
Ubicaciones con coordenadas: 0 (0%)
RLS Policies: 4 (✅ funcionando)
```

### Conclusiones
- ✅ Estructura de BD creada correctamente
- ❌ No hay unidades operativas (requiere creación manual)
- ❌ No hay coordenadas (requiere ejecutar script 018)
- ✅ Seguridad RLS funcionando

---

## 📋 TAREAS PENDIENTES (PRÓXIMA SESIÓN)

### 🔥 PRIORIDAD ALTA

#### 1. Ejecutar Script 018 - Agregar Coordenadas
**Duración**: 2 minutos  
**Archivo**: `sql/migrations/018_agregar_coordenadas_ubicaciones.sql`

**Pasos**:
1. Abrir Supabase SQL Editor
2. Copiar y ejecutar script completo
3. Verificar que 6 ubicaciones tengan coordenadas

**Bloqueador**: Sin coordenadas no funciona el algoritmo de distancia

---

#### 2. Crear Unidades Operativas de Ejemplo
**Duración**: 10 minutos  
**Archivo**: `sql/migrations/019_crear_unidades_ejemplo.sql`

**Pasos**:
1. Ejecutar queries de verificación (ver choferes y camiones disponibles)
2. Crear 2-3 unidades manualmente reemplazando UUIDs reales
3. Verificar con query final

**Ejemplo**:
```sql
INSERT INTO unidades_operativas (
  empresa_id,
  nombre,
  codigo,
  chofer_id,
  camion_id,
  activo
) VALUES (
  '[UUID-EMPRESA]',
  'Unidad 01',
  'U01',
  '[UUID-CHOFER]',
  '[UUID-CAMION]',
  true
);
```

---

#### 3. Implementar Página de Gestión de Unidades
**Duración**: 2-3 horas  
**Archivo nuevo**: `pages/transporte/unidades.tsx`

**Funcionalidades requeridas**:
- ✅ Lista de unidades operativas (tabla responsiva)
- ✅ Crear nueva unidad (modal con form)
- ✅ Editar unidad existente
- ✅ Activar/Desactivar unidad
- ✅ Ver disponibilidad en tiempo real
- ✅ Historial de viajes por unidad
- ✅ Filtros: activas, disponibles, en viaje, en descanso

**Componentes a crear**:
- `UnidadesTable` - Tabla principal
- `CrearUnidadModal` - Form de creación
- `EditarUnidadModal` - Form de edición
- `DisponibilidadBadge` - Indicador visual de estado

**Queries necesarias**:
```typescript
// Listar unidades con disponibilidad
const { data } = await supabase
  .from('vista_disponibilidad_unidades')
  .select('*')
  .eq('empresa_id', empresaId)
  .order('codigo');

// Crear unidad
const { data } = await supabase
  .from('unidades_operativas')
  .insert({
    empresa_id,
    nombre,
    codigo,
    chofer_id,
    camion_id,
    acoplado_id
  });
```

---

#### 4. Crear Nuevo Modal de Asignación con Algoritmo
**Duración**: 3-4 horas  
**Archivo nuevo**: `components/Transporte/AsignarUnidadModal.tsx`

**Reemplaza**: `components/Transporte/AceptarDespachoModal.tsx` (mantener por compatibilidad)

**Algoritmo de Scoring** (0-100 puntos):

```typescript
interface UnidadScore {
  unidad_id: string;
  nombre: string;
  score: number;
  distancia_km: number;
  tiempo_estimado_horas: number;
  disponible: boolean;
  motivo_no_disponible?: string;
  categoria: 'ÓPTIMA' | 'BUENA' | 'POSIBLE' | 'NO_VIABLE';
}

function calcularScore(unidad, despacho) {
  let score = 100;
  
  // 1. Disponibilidad (CRÍTICO)
  if (!unidad.disponible) return 0;
  
  // 2. Distancia (0-40 puntos de penalización)
  const distanciaKm = calcularDistanciaHaversine(
    unidad.latitud_actual,
    unidad.longitud_actual,
    despacho.latitud_origen,
    despacho.longitud_origen
  );
  score -= Math.min(40, distanciaKm / 10); // -1 punto cada 10km
  
  // 3. Margen de tiempo (0-30 puntos de penalización)
  const horasMargen = calcularMargen(
    despacho.fecha_retiro,
    unidad.proxima_hora_disponible
  );
  if (horasMargen < 0) return 0; // Llegará tarde
  if (horasMargen < 1) score -= 30; // Muy justo
  else if (horasMargen < 2) score -= 15; // Justo
  
  // 4. Provincia (bonus +10 si está en misma provincia)
  if (unidad.provincia_actual === despacho.provincia_origen) {
    score += 10;
  }
  
  // 5. Categorización
  if (score >= 80) categoria = 'ÓPTIMA';
  else if (score >= 60) categoria = 'BUENA';
  else if (score >= 40) categoria = 'POSIBLE';
  else categoria = 'NO_VIABLE';
  
  return { score, distancia_km, categoria };
}
```

**UI del Modal**:
```tsx
<Modal title="Asignar Unidad Operativa">
  {/* Header con info del despacho */}
  <DespachoResumen 
    codigo={despacho.numero_despacho}
    origen={despacho.ubicacion_retiro}
    destino={despacho.ubicacion_entrega}
    fechaRetiro={despacho.fecha_retiro}
  />
  
  {/* Filtros */}
  <Filtros>
    <Toggle label="Solo disponibles" />
    <Select label="Ordenar por" options={['Score', 'Distancia', 'Código']} />
  </Filtros>
  
  {/* Lista de unidades ordenadas por score */}
  {unidades.map(u => (
    <UnidadCard
      key={u.id}
      nombre={u.nombre}
      chofer={u.chofer_nombre}
      camion={u.camion_patente}
      score={u.score}
      categoria={u.categoria} // ⭐⭐⭐ ÓPTIMA, ⭐⭐ BUENA, ⭐ POSIBLE
      distancia={`${u.distancia_km} km`}
      tiempoEstimado={`${u.tiempo_estimado_horas}h`}
      ubicacion={`${u.ciudad_actual}, ${u.provincia_actual}`}
      disponible={u.disponible}
      onClick={() => asignarUnidad(u.id)}
    />
  ))}
</Modal>
```

**Queries necesarias**:
```typescript
// Obtener unidades con disponibilidad calculada
const { data } = await supabase
  .rpc('calcular_disponibilidad_unidad', {
    p_fecha_requerida: despacho.fecha_retiro
  });

// Asignar unidad al viaje
const { data } = await supabase
  .from('viajes_despacho')
  .update({
    unidad_operativa_id: unidadId,
    id_chofer: unidad.chofer_id,
    id_camion: unidad.camion_id,
    id_acoplado: unidad.acoplado_id,
    tiene_chofer: true,
    tiene_camion: true,
    estado: 'camion_asignado'
  })
  .eq('id', viajeId);

// Actualizar horas conducidas de la unidad
await supabase
  .from('unidades_operativas')
  .update({
    ultima_hora_inicio_jornada: NOW(),
    horas_conducidas_hoy: 0 // Reset al iniciar nuevo viaje
  })
  .eq('id', unidadId);
```

---

#### 5. Mostrar Provincia/Localidad en Despachos
**Duración**: 30 minutos  
**Archivo**: `pages/transporte/despachos-ofrecidos.tsx`

**Cambio**: 
- Antes: "Aceitera San Miguel"
- Después: "Aceitera San Miguel - Rosario, Santa Fe"

**Línea aproximada**: ~750 (donde se muestra origen/destino)

---

## 🧪 TESTING REQUERIDO

Después de implementar todo:

1. **Testing de creación de unidad**:
   - Crear unidad con chofer + camión
   - Verificar que aparezca en lista
   - Verificar que estado inicial sea "Disponible"

2. **Testing de asignación con algoritmo**:
   - Abrir modal de asignación
   - Verificar que unidades estén ordenadas por score
   - Asignar unidad óptima
   - Verificar que viaje pase a "Asignados"
   - Verificar que unidad pase a "En viaje"

3. **Testing de disponibilidad**:
   - Simular 9 horas de conducción
   - Verificar que unidad requiera descanso
   - Verificar que no aparezca como disponible
   - Esperar 12 horas (o ajustar manualmente)
   - Verificar que vuelva a disponible

4. **Testing de coordenadas**:
   - Verificar que ubicaciones muestren ciudad/provincia
   - Verificar que algoritmo calcule distancias correctamente
   - Verificar que tiempo estimado sea razonable (80-100 km/h promedio)

---

## 📚 ARCHIVOS RELACIONADOS

### Creados en esta sesión
- `sql/migrations/017_unidades_operativas_completo.sql`
- `sql/migrations/018_agregar_coordenadas_ubicaciones.sql`
- `sql/migrations/019_crear_unidades_ejemplo.sql`
- `sql/migrations/verificar-017.sql`

### Modificados
- `pages/transporte/despachos-ofrecidos.tsx`
- `PROXIMA-SESION.md`

### Por crear
- `pages/transporte/unidades.tsx`
- `components/Transporte/AsignarUnidadModal.tsx`
- `components/Transporte/UnidadesTable.tsx`
- `components/Transporte/CrearUnidadModal.tsx`
- `components/Transporte/DisponibilidadBadge.tsx`

---

## 🎯 RESULTADO ESPERADO

**Antes** (situación actual):
- Coordinador ve lista de despachos
- Click en "Aceptar" abre modal con 3 dropdowns
- Selecciona chofer, camión, acoplado manualmente
- No sabe si están disponibles o dónde están
- Proceso lento y propenso a errores

**Después** (con unidades operativas):
- Coordinador ve lista de despachos
- Click en "Asignar Unidad" abre modal inteligente
- Ve unidades ordenadas por idoneidad (⭐⭐⭐ ÓPTIMA)
- Ve distancia, tiempo estimado, ubicación actual
- Solo unidades disponibles (respeta descansos)
- Asignación en 1 click
- Sistema actualiza automáticamente jornadas laborales

**Beneficios**:
- ⚡ Asignación 5x más rápida
- 🎯 Decisiones basadas en datos
- ✅ Cumplimiento normativo automático
- 📍 Optimización de rutas
- 👥 Equipos estables (mejor rendimiento)

---

## 💡 NOTAS TÉCNICAS

### Fórmula de Haversine (Distancia)
```typescript
function calcularDistanciaHaversine(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
}
```

### Normativas de Descanso
Según legislación argentina de transporte:
- **Jornada máxima**: 9 horas de conducción continua
- **Descanso obligatorio**: 12 horas consecutivas
- **Cálculo automático**: trigger en `viajes_despacho` actualiza `horas_conducidas_hoy`

### RLS Policies
Todas las queries están protegidas por empresa_id:
```sql
CREATE POLICY "select_unidades_operativas" ON unidades_operativas
FOR SELECT USING (
  empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);
```

---

## 🚀 COMANDO PARA PRÓXIMA SESIÓN

Simplemente decir:

**"Continuamos con el sistema de unidades operativas"**

O más específico:

**"Ejecutamos el script 018 de coordenadas"**  
**"Creamos la página de gestión de unidades"**  
**"Implementamos el modal inteligente"**

---

**Fin del documento**
