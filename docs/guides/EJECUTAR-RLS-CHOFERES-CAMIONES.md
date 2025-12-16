# 🔐 Actualizar Políticas RLS para Choferes y Camiones

## 📋 Objetivo

Implementar políticas de seguridad a nivel de fila (RLS) correctas para que:

1. ✅ **Gonzalo** (coordinador de Logística Express) pueda crear y ver **TODOS** sus choferes y camiones
2. ✅ **Leandro** (coordinador de planta) pueda ver los choferes/camiones **SOLO cuando están asignados a viajes** de sus despachos
3. ✅ **Sin necesidad de usar `supabaseAdmin`** (cliente admin)

## 🎯 Problema Actual

Las políticas RLS actuales **SOLO permiten** ver los recursos si:
- Eres el usuario dueño del transporte (`auth.uid() = id_transporte`)

Esto causa que:
- ❌ Leandro NO puede ver los choferes/camiones asignados a sus viajes
- ❌ Se requiere usar `supabaseAdmin` (bypass de seguridad, NO recomendado para producción)

## 🔧 Solución

Nuevas políticas que permiten ver los recursos si:
- Eres el transporte dueño, **O**
- El recurso está asignado a un viaje de un despacho que puedes ver

## 📝 Pasos para Ejecutar

### 1. Abrir Supabase SQL Editor

1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto **Nodexia**
3. Click en **SQL Editor** en el menú izquierdo
4. Click en **+ New query**

### 2. Copiar y Ejecutar el SQL

1. Abrir el archivo: `sql/fix_choferes_camiones_rls_policies.sql`
2. **Copiar TODO el contenido**
3. **Pegar** en el editor SQL de Supabase
4. Click en **Run** (o presionar `Ctrl+Enter`)

### 3. Verificar Resultados

Al final del script se ejecuta una consulta de verificación. Deberías ver:

```
tablename | policyname                 | cmd    
----------|----------------------------|--------
choferes  | choferes_select_policy     | SELECT
choferes  | choferes_insert_policy     | INSERT
choferes  | choferes_update_policy     | UPDATE
choferes  | choferes_delete_policy     | DELETE
camiones  | camiones_select_policy     | SELECT
camiones  | camiones_insert_policy     | INSERT
camiones  | camiones_update_policy     | UPDATE
camiones  | camiones_delete_policy     | DELETE
acoplados | acoplados_select_policy    | SELECT
acoplados | acoplados_insert_policy    | INSERT
acoplados | acoplados_update_policy    | UPDATE
acoplados | acoplados_delete_policy    | DELETE
```

### 4. Probar en la Aplicación

1. **Refrescar** la página de Planificación (F5)
2. Verificar que ahora **SÍ aparecen** los datos de chofer y camión
3. Los logs deberían mostrar:
   ```
   Total choferes en mapa: 1 ✅
   Total camiones en mapa: 1 ✅
   ```

## 🧪 Casos de Prueba

### Como Gonzalo (Coordinador Logística Express)

✅ **Debe poder:**
- Ver TODOS los choferes y camiones de Logística Express
- Crear nuevos choferes y camiones
- Editar sus choferes y camiones
- Eliminar sus choferes y camiones

### Como Leandro (Coordinador Planta)

✅ **Debe poder:**
- Ver choferes/camiones **asignados a viajes** de despachos que creó
- Ver choferes/camiones en la **grilla de planificación**
- Ver choferes/camiones en el **detalle de despachos**

❌ **NO debe poder:**
- Ver choferes/camiones que NO están asignados a ningún viaje visible
- Crear, editar o eliminar choferes/camiones de Logística Express

## 🔍 Explicación Técnica

### Política de Lectura (SELECT)

```sql
-- Puedes ver un chofer/camión si:
id_transporte IN (
  SELECT empresa_id FROM usuarios WHERE user_id = auth.uid()
)
OR
-- O si está asignado a un viaje de un despacho visible
id IN (
  SELECT DISTINCT vd.id_chofer  -- o vd.id_camion
  FROM viajes_despacho vd
  INNER JOIN despachos d ON vd.id_despacho = d.id
  WHERE vd.id_chofer IS NOT NULL
    AND (
      -- Tu empresa creó el despacho
      d.empresa_origen IN (SELECT empresa_id FROM usuarios WHERE user_id = auth.uid())
      OR
      -- Tu empresa coordina el despacho
      d.coordinador_empresa IN (SELECT empresa_id FROM usuarios WHERE user_id = auth.uid())
      OR
      -- El viaje está asignado a tu empresa
      vd.id_transporte IN (SELECT empresa_id FROM usuarios WHERE user_id = auth.uid())
    )
)
```

### Políticas de Modificación (INSERT/UPDATE/DELETE)

```sql
-- Solo puedes modificar si eres coordinador de la empresa dueña
id_transporte IN (
  SELECT u.empresa_id 
  FROM usuarios u
  WHERE u.user_id = auth.uid()
    AND u.rol IN ('coordinador_transporte', 'admin_transporte')
)
```

## 📊 Impacto

### Antes (con supabaseAdmin)
- ⚠️ Bypass completo de seguridad
- ⚠️ Cualquier bug podría exponer datos sensibles
- ⚠️ No escalable ni mantenible

### Después (con RLS correctas)
- ✅ Seguridad a nivel de base de datos
- ✅ Permisos granulares por usuario
- ✅ Auditable y escalable
- ✅ Código más simple (usa cliente regular)

## 🚀 Siguientes Pasos

Una vez ejecutado el SQL:

1. ✅ Verificar que compile sin errores: `pnpm run dev`
2. ✅ Refrescar la aplicación y probar los 3 escenarios:
   - Grilla de planificación
   - Detalle de tarjeta en grilla
   - Lista de viajes en Crear Despachos
3. ✅ Verificar logs en consola (deben mostrar datos)
4. ✅ Probar drag & drop en planificación

## 📝 Notas

- Las políticas aplican **automáticamente** a todas las consultas
- No es necesario modificar más código
- El cliente `supabaseAdmin` ya no se usa (puede eliminarse)
- Las políticas son **acumulativas**: si cumples CUALQUIERA de las condiciones, tienes acceso

---

**Fecha:** 2025-11-17  
**Autor:** GitHub Copilot  
**Archivo SQL:** `sql/fix_choferes_camiones_rls_policies.sql`
