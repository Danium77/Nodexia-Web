# 🔒 GUÍA DE IMPLEMENTACIÓN - MEJORAS DE SEGURIDAD

**Fecha:** 22 de Enero 2026  
**Auditor:** NOD  
**Estado:** ⏳ Pendiente de ejecución

---

## 📋 RESUMEN DE CAMBIOS

### 1. Soft Delete Implementado
- ✅ Columna `deleted_at` agregada a `despachos` y `viajes_despacho`
- ✅ Índices optimizados para queries con registros activos
- ✅ Funciones SQL para eliminación y restauración segura

### 2. Integridad Referencial Mejorada
- ✅ Cambio de `ON DELETE CASCADE` → `ON DELETE RESTRICT`
- ✅ Previene eliminación accidental de despachos con viajes

### 3. Seguridad Cross-Tenant sin Service Role
- ✅ Políticas RLS que permiten lectura autorizada entre empresas
- ✅ Eliminación del bypass inseguro con `supabaseAdmin`

### 4. Políticas RLS Refactorizadas
- ✅ Todas las políticas incluyen filtro `deleted_at IS NULL`
- ✅ Queries automáticamente excluyen registros eliminados

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### PASO 1: Ejecutar Script SQL

```bash
# Desde Supabase Dashboard:
# 1. Ir a SQL Editor
# 2. Abrir archivo: sql/security-improvements-soft-delete-rls.sql
# 3. Ejecutar (presionar Run)
```

**Resultado esperado:**
```
✅ MIGRACIÓN COMPLETADA EXITOSAMENTE
📋 Columnas agregadas: despachos.deleted_at, viajes_despacho.deleted_at
🔒 Constraint actualizada: ON DELETE RESTRICT
🛡️ Políticas RLS creadas: 10+ políticas
⚙️ Funciones creadas: 3 funciones
📊 Vista de auditoría: v_registros_eliminados
```

---

### PASO 2: Eliminar Endpoint Inseguro

**Archivo a eliminar:** `pages/api/transporte/despachos-info.ts`

```bash
# Ejecutar en terminal:
rm pages/api/transporte/despachos-info.ts
```

**Razón:** Este endpoint usa `supabaseAdmin` (service_role) para bypass de RLS. Ya no es necesario gracias a las nuevas políticas.

---

### PASO 3: Actualizar Código Frontend

#### 3.1 Reemplazar llamadas a API eliminada

**Archivo:** `pages/transporte/despachos-ofrecidos.tsx`

```typescript
// ❌ ANTES (inseguro - usa service_role)
const response = await fetch('/api/transporte/despachos-info', {
  method: 'POST',
  body: JSON.stringify({ despacho_ids })
});

// ✅ DESPUÉS (seguro - usa RLS)
const { data: despachosData } = await supabase
  .from('despachos')
  .select('id, pedido_id, origen_id, destino_id, scheduled_local_date, scheduled_local_time, prioridad')
  .in('id', despacho_ids);
  // RLS automáticamente permite lectura porque el transportista está asignado
```

#### 3.2 Agregar filtro de soft delete en queries críticas

**Patrón a aplicar:**

```typescript
// En queries donde NO quieras ver registros eliminados
const { data } = await supabase
  .from('despachos')
  .select('*')
  .is('deleted_at', null)  // ← AGREGAR ESTO
  .eq('estado', 'pendiente');

// En queries donde SÍ quieras ver eliminados (auditoría)
const { data } = await supabase
  .from('despachos')
  .select('*')
  .not('deleted_at', 'is', null);  // Solo eliminados
```

**Archivos a actualizar:**
- `pages/crear-despacho.tsx` (línea ~1150)
- `pages/transporte/despachos-ofrecidos.tsx` (línea ~180)
- `pages/planificacion.tsx` (línea ~190)
- `components/Dashboard/KPIDashboard.tsx`

---

### PASO 4: Implementar UI para Soft Delete

#### 4.1 Crear función de eliminación

**Archivo:** `lib/api/despachos.ts` (crear si no existe)

```typescript
import { supabase } from '@/lib/supabase';

export async function softDeleteDespacho(despachoId: string) {
  const { data, error } = await supabase.rpc('soft_delete_despacho', {
    despacho_uuid: despachoId
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function restoreDespacho(despachoId: string) {
  const { data, error } = await supabase.rpc('restore_despacho', {
    despacho_uuid: despachoId
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function softDeleteViaje(viajeId: string) {
  const { data, error } = await supabase.rpc('soft_delete_viaje', {
    viaje_uuid: viajeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

#### 4.2 Agregar botón de eliminación en UI

**Archivo:** `pages/crear-despacho.tsx`

```typescript
// Agregar en la tabla de despachos (alrededor de línea 2400)
<button
  onClick={async () => {
    if (!confirm('¿Estás seguro de eliminar este despacho?')) return;
    
    try {
      await softDeleteDespacho(despacho.id);
      toast.success('Despacho eliminado correctamente');
      // Recargar datos
      fetchDespachos();
    } catch (error) {
      if (error.message.includes('viajes activos')) {
        toast.error('No se puede eliminar: tiene viajes asignados');
      } else {
        toast.error('Error al eliminar: ' + error.message);
      }
    }
  }}
  className="text-red-600 hover:text-red-800"
>
  <TrashIcon className="w-5 h-5" />
</button>
```

#### 4.3 Crear página de auditoría (opcional)

**Archivo:** `pages/auditoria/registros-eliminados.tsx` (crear)

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RegistrosEliminados() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    async function fetchEliminados() {
      const { data } = await supabase
        .from('v_registros_eliminados')
        .select('*')
        .limit(100);
      
      setRegistros(data || []);
    }
    fetchEliminados();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Registros Eliminados</h1>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Identificador</th>
            <th>Fecha Eliminación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {registros.map(reg => (
            <tr key={reg.id}>
              <td>{reg.tipo_registro}</td>
              <td>{reg.identificador}</td>
              <td>{new Date(reg.fecha_eliminacion).toLocaleString()}</td>
              <td>
                {reg.tipo_registro === 'despacho' && (
                  <button
                    onClick={async () => {
                      await restoreDespacho(reg.id);
                      toast.success('Despacho restaurado');
                      // Recargar
                    }}
                    className="text-green-600"
                  >
                    Restaurar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Pre-Implementación
- [ ] Backup completo de base de datos creado
- [ ] Revisión del script SQL por otro desarrollador
- [ ] Ambiente de staging disponible para testing

### Durante Implementación
- [ ] Script SQL ejecutado sin errores
- [ ] Verificar mensaje de éxito en consola
- [ ] Endpoint `/api/transporte/despachos-info.ts` eliminado
- [ ] Código frontend actualizado (3-5 archivos)

### Post-Implementación
- [ ] Testing manual: Crear y eliminar despacho
- [ ] Testing manual: Intentar eliminar despacho con viajes (debe fallar)
- [ ] Testing manual: Coordinador puede ver chofer de transportista
- [ ] Testing manual: Restaurar despacho eliminado
- [ ] Verificar que registros eliminados NO aparecen en UI
- [ ] Monitorear logs de Supabase por 24 horas

---

## 🧪 CASOS DE PRUEBA

### Test 1: Soft Delete de Despacho Vacío
```sql
-- Ejecutar en SQL Editor
SELECT soft_delete_despacho('<uuid_despacho_sin_viajes>');
-- Resultado esperado: TRUE
```

### Test 2: Soft Delete de Despacho con Viajes (debe fallar)
```sql
SELECT soft_delete_despacho('<uuid_despacho_con_viajes>');
-- Resultado esperado: ERROR "No se puede eliminar despacho con X viajes activos"
```

### Test 3: Restaurar Despacho
```sql
SELECT restore_despacho('<uuid_despacho_eliminado>');
-- Resultado esperado: TRUE
```

### Test 4: Coordinador ve chofer de transportista
```typescript
// Ejecutar en consola del navegador como coordinador
const { data, error } = await supabase
  .from('choferes')
  .select('*')
  .eq('id', '<uuid_chofer_de_transportista>');

console.log(data); // Debe devolver el chofer (RLS permite lectura cross-tenant)
```

### Test 5: Transportista NO ve chofer de otra empresa
```typescript
// Ejecutar en consola del navegador como transportista A
const { data, error } = await supabase
  .from('choferes')
  .select('*')
  .eq('empresa_id', '<uuid_empresa_transportista_B>');

console.log(data); // Debe devolver [] (RLS bloquea)
```

---

## 🚨 ROLLBACK (En caso de problemas)

Si algo sale mal, ejecutar este script:

```sql
BEGIN;

-- Revertir columnas deleted_at
ALTER TABLE public.despachos DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.viajes_despacho DROP COLUMN IF EXISTS deleted_at;

-- Restaurar ON DELETE CASCADE
ALTER TABLE public.viajes_despacho
DROP CONSTRAINT IF EXISTS fk_viajes_despacho_despacho_id;

ALTER TABLE public.viajes_despacho
ADD CONSTRAINT fk_viajes_despacho_despacho_id
FOREIGN KEY (despacho_id) 
REFERENCES public.despachos(id) 
ON DELETE CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.soft_delete_despacho;
DROP FUNCTION IF EXISTS public.soft_delete_viaje;
DROP FUNCTION IF EXISTS public.restore_despacho;

-- Eliminar vista
DROP VIEW IF EXISTS public.v_registros_eliminados;

-- Restaurar endpoint
-- (copiar de backup: pages/api/transporte/despachos-info.ts)

COMMIT;
```

---

## 📊 MÉTRICAS DE ÉXITO

**Indicadores post-implementación (medir después de 1 semana):**

1. **Seguridad:**
   - ❌ Uso de `service_role`: 0 llamadas (objetivo: 0)
   - ✅ Queries con RLS: 100% (objetivo: 100%)

2. **Performance:**
   - Tiempo promedio query choferes: <50ms (con índices)
   - Tiempo promedio query despachos: <30ms

3. **Funcionalidad:**
   - Coordinadores pueden ver recursos de transportistas: ✅
   - Registros eliminados NO aparecen en UI: ✅
   - Soft delete funciona correctamente: ✅

4. **Auditoría:**
   - Registros en `v_registros_eliminados`: monitoreado
   - Intentos de eliminación de despachos con viajes: registrados en logs

---

## 📚 RECURSOS ADICIONALES

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Soft Delete Pattern](https://stackoverflow.com/questions/2549839/soft-delete-best-practices)

---

**Preparado por:** Ingeniero de Software Senior  
**Revisado por:** NOD (Auditor)  
**Versión:** 1.0
