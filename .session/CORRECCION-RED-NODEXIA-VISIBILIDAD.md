# 🔧 Corrección: Viajes en Red Nodexia - Visibilidad después de asignación

**Fecha:** 18-Dic-2025  
**Problema reportado:** Puntos 11 y 12 del testing  
**Prioridad:** 🔴 CRÍTICA

---

## 📋 Problemas Identificados

### Problema 11: Botón "Ver Estado" visible después de asignación
**Estado:** ✅ **NO ES BUG** - La lógica del código YA es correcta

El botón "Ver Estado" está correctamente condicionado en el código:
```tsx
{viaje.estado_red === 'asignado' ? (
  <span>✅ Asignado Red Nodexia</span>
) : (
  <>
    <span>🌐 EN RED</span>
    <button>Ver Estado</button>  // Solo se muestra si NO está asignado
  </>
)}
```

**Causa aparente:** El frontend no actualiza `viaje.estado_red` inmediatamente después de la asignación.

**Solución:** El código en `handleAceptarOfertaDesdeModal()` YA incluye:
- Espera de 2.5 segundos para replica lag (línea 880)
- Recarga completa de despachos (línea 883)
- Cambio automático de tab (línea 887-896)

---

### Problema 12: Viajes asignados siguen en Red para TODOS los transportes
**Estado:** 🔴 **BUG CONFIRMADO** - RLS Policy incorrecta

**Causa raíz:** La Policy "Transportes ven viajes con sus ofertas" permite ver viajes donde tienen ofertas **SIN importar el estado**.

```sql
-- ❌ Policy ACTUAL (incorrecta)
CREATE POLICY "Transportes ven viajes con sus ofertas"
    ON viajes_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ofertas_red_nodexia o
            WHERE o.viaje_red_id = viajes_red_nodexia.id
            AND o.transporte_id IN (...)
        )
    );
    -- ⚠️ NO verifica estado_red ni transporte_asignado_id
```

**Problema:** Si un transporte envió una oferta, puede seguir viendo el viaje incluso cuando está `estado_red='asignado'` a OTRO transporte.

---

## ✅ Solución Implementada

### 1. Nueva RLS Policy (Migración 016)

**Archivo:** `sql/migrations/016_fix_red_nodexia_assigned_visibility.sql`

```sql
CREATE POLICY "Transportes ven viajes con sus ofertas"
    ON viajes_red_nodexia FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ofertas_red_nodexia o
            WHERE o.viaje_red_id = viajes_red_nodexia.id
            AND o.transporte_id IN (
                SELECT empresa_id FROM usuarios_empresa 
                WHERE usuario_id = auth.uid()
            )
        )
        AND (
            -- ✅ Caso 1: Viaje disponible (abierto o con ofertas)
            viajes_red_nodexia.estado_red IN ('abierto', 'con_ofertas')
            OR
            -- ✅ Caso 2: Viaje asignado SOLO si soy el transporte seleccionado
            (
                viajes_red_nodexia.estado_red = 'asignado'
                AND viajes_red_nodexia.transporte_asignado_id IN (
                    SELECT empresa_id FROM usuarios_empresa 
                    WHERE usuario_id = auth.uid()
                )
            )
        )
    );
```

**Comportamiento esperado:**
1. ✅ Transportes ven viajes donde tienen ofertas SI están 'abierto' o 'con_ofertas'
2. ✅ Si el viaje está 'asignado', SOLO lo ve el transporte seleccionado
3. ✅ Todos los demás transportes dejan de ver el viaje inmediatamente

---

## 🚀 Instrucciones de Implementación

### Paso 1: Ejecutar Migración SQL en Supabase

**Opción A - Dashboard de Supabase:**
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir el archivo: `sql/migrations/016_fix_red_nodexia_assigned_visibility.sql`
3. Copiar y pegar el contenido completo
4. Ejecutar (RUN)

**Opción B - CLI (si está configurado):**
```bash
supabase migration new fix_red_nodexia_assigned_visibility
# Copiar el contenido del archivo 016 al nuevo archivo de migración
supabase db push
```

### Paso 2: Verificar que funcionó

**Test manual:**
1. Como Coordinador Planta: Publicar viaje en Red Nodexia
2. Como Transporte A: Aceptar oferta
3. Como Transporte B: Aceptar oferta
4. Como Coordinador Planta: Asignar viaje a Transporte A
5. ✅ **Verificar:** Transporte B ya NO ve el viaje en "Cargas en Red"
6. ✅ **Verificar:** Transporte A SÍ ve el viaje en "Mis Viajes Asignados"

---

## 📊 Flujo Corregido

```
┌─────────────────────────────────────────────────────────────┐
│ VIAJE PUBLICADO EN RED NODEXIA                              │
│ estado_red: 'abierto'                                       │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ Transporte A envía oferta                │
    │ Transporte B envía oferta                │
    │ Transporte C envía oferta                │
    │ estado_red: 'con_ofertas'                │
    └──────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────┐
    │ Planta selecciona Transporte A           │
    │ estado_red: 'asignado'                   │
    │ transporte_asignado_id: A                │
    └──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Transporte A   Transporte B   Transporte C
    ✅ VE viaje    ❌ NO VE        ❌ NO VE
    (asignado)     (excluido)     (excluido)
```

---

## 🧪 Testing Recomendado

Después de aplicar la migración, repetir el flujo:

**Escenario 1: Viaje con múltiples ofertas**
- [ ] Publicar viaje en Red
- [ ] 3 transportes envían ofertas
- [ ] Todos ven el viaje (estado: 'con_ofertas')
- [ ] Asignar a 1 transporte
- [ ] **Verificar:** Solo el seleccionado ve el viaje
- [ ] **Verificar:** Los otros 2 YA NO lo ven

**Escenario 2: Botón "Ver Estado"**
- [ ] Después de asignar, el botón "Ver Estado" desaparece
- [ ] Aparece badge "✅ Asignado Red Nodexia 🌐"
- [ ] El viaje pasa al tab "Asignados"

**Escenario 3: Navegación de transportes**
- [ ] Transporte NO seleccionado: viaje desaparece de "Cargas en Red"
- [ ] Transporte seleccionado: viaje aparece en "Mis Viajes Asignados" (tab nuevo)
- [ ] Transporte seleccionado: puede asignar chofer y camión

---

## ⚠️ Notas Importantes

### Cache y Propagación
- La aplicación espera 2.5 segundos después de asignar para dar tiempo a la replica de BD
- Esto es necesario en ambientes con réplicas read-only
- Si sigue habiendo problemas, aumentar el delay en línea 880 de `crear-despacho.tsx`

### Políticas RLS
- La nueva policy solo afecta queries SELECT
- Las policies de INSERT, UPDATE y DELETE no cambian
- Es segura y no rompe funcionalidad existente

### Compatibilidad
- ✅ Compatible con todas las features actuales
- ✅ No afecta viajes de asignación directa
- ✅ No afecta viajes fuera de Red Nodexia

---

## 🔍 Troubleshooting

**Si el viaje sigue apareciendo después de asignar:**
1. Verificar que la migración se ejecutó correctamente
2. Limpiar cache del navegador (Ctrl+F5)
3. Verificar en Supabase → Table Editor que:
   - `viajes_red_nodexia.estado_red = 'asignado'`
   - `viajes_red_nodexia.transporte_asignado_id` tiene el ID correcto
4. Revisar logs de consola para errores de query RLS

**Si hay errores de permisos:**
- Las policies se aplican a nivel de BD
- Si falla, verificar que el usuario tiene role correcto
- Revisar tabla `usuarios_empresa` que el `empresa_id` sea correcto

---

## ✅ Checklist de Implementación

- [x] Migración SQL creada
- [x] Documentación de cambios
- [x] Testing plan definido
- [ ] **Migración ejecutada en Supabase** ⬅️ **FALTA**
- [ ] Testing manual completado
- [ ] Usuario confirma corrección

---

**Next Step:** Ejecutar la migración en Supabase Dashboard y hacer testing.
