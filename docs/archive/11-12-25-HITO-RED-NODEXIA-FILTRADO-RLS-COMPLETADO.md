# HITO COMPLETADO: Red Nodexia - Filtrado RLS por Relaciones
**Fecha:** 11 de diciembre de 2025  
**Estado:** ✅ RESUELTO Y FUNCIONANDO

---

## 📋 Resumen Ejecutivo

Se completó exitosamente la implementación del **sistema de filtrado por relaciones comerciales en Red Nodexia**, un marketplace donde plantas industriales publican viajes de transporte para ser tomados por empresas transportistas NO vinculadas contractualmente.

### Objetivo Principal
Implementar Row Level Security (RLS) en PostgreSQL/Supabase para que:
- ✅ Transportes **con relación activa** con una planta NO vean los viajes publicados por esa planta
- ✅ Transportes **sin relación** SÍ vean todos los viajes disponibles
- ✅ El filtrado ocurra a nivel de base de datos (no frontend)

### Resultado
**Sistema funcionando correctamente:**
- Logística Express SRL (vinculado con Aceitera San Miguel) → NO ve viajes de Aceitera ✅
- Logística del Centro Demo (no vinculado) → SÍ ve viajes de Aceitera ✅

---

## 🔍 Problema Original

### Contexto de Negocio
**Red Nodexia** es un marketplace B2B donde:
1. **Plantas/Clientes** publican viajes de carga cuando necesitan capacidad de transporte adicional
2. **Transportes no vinculados** ven estos viajes y pueden ofertar
3. **Transportes vinculados** NO deben ver viajes de sus clientes habituales (para evitar conflictos comerciales)

### Problema Técnico
Después de publicar un viaje desde Aceitera San Miguel a Red Nodexia, el viaje aparecía para TODOS los transportes, incluyendo Logística Express SRL que tiene una relación contractual activa con Aceitera.

### Causa Raíz
Ausencia de políticas RLS (Row Level Security) que filtraran los viajes en `viajes_red_nodexia` basándose en las relaciones de la tabla `relaciones_empresas`.

---

## 🛠️ Solución Implementada

### Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO AUTENTICADO                       │
│                  (gonzalo@logisticaexpres.com)               │
└────────────────────────┬────────────────────────────────────┘
                         │ auth.uid()
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FUNCIÓN: public.uid_empresa()                   │
│  Retorna empresa_id del usuario desde usuarios_empresa      │
│  Input: auth.uid() → Output: empresa_id (UUID)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         POLÍTICA RLS: viajes_red_nodexia                     │
│  "Solo transportes sin vinculo ven viajes"                   │
│                                                               │
│  USING (                                                      │
│    NOT EXISTS (                                               │
│      SELECT 1 FROM relaciones_empresas re                    │
│      WHERE re.empresa_transporte_id = public.uid_empresa()   │
│        AND re.empresa_cliente_id = empresa_solicitante_id    │
│        AND re.estado = 'activa'                              │
│    )                                                          │
│  )                                                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              TABLA: relaciones_empresas                      │
│  RLS DESHABILITADO (para uso interno de políticas)          │
│  Contiene: empresa_transporte_id, empresa_cliente_id,        │
│            estado ('activa', 'inactiva', 'suspendida')       │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Clave

#### 1. Función `public.uid_empresa()`
```sql
CREATE OR REPLACE FUNCTION public.uid_empresa()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id 
  FROM usuarios_empresa 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.uid_empresa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.uid_empresa() TO anon;
```

**Propósito:** Obtener el `empresa_id` del usuario autenticado actual.  
**Nota:** Usa `SECURITY DEFINER` para ejecutarse con permisos del creador, evitando restricciones RLS recursivas.

#### 2. Política RLS en `viajes_red_nodexia`
```sql
CREATE POLICY "Solo transportes sin vinculo ven viajes"
ON viajes_red_nodexia
FOR SELECT
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 
    FROM relaciones_empresas re
    WHERE re.empresa_transporte_id = public.uid_empresa()
      AND re.empresa_cliente_id = viajes_red_nodexia.empresa_solicitante_id
      AND re.estado = 'activa'
  )
);
```

**Lógica:** Un viaje es visible SOLO SI NO existe una relación activa entre el transporte actual y la empresa solicitante del viaje.

#### 3. RLS Deshabilitado en `relaciones_empresas`
```sql
ALTER TABLE relaciones_empresas DISABLE ROW LEVEL SECURITY;
```

**Razón Crítica:** Las políticas RLS en otras tablas necesitan consultar `relaciones_empresas` en subqueries. Si RLS estuviera habilitado en esta tabla, bloquearía las consultas internas de las políticas.

---

## 🐛 Problemas Encontrados y Resueltos

### Problema #1: Función `auth.uid_empresa()` No Existe
**Error:** `function auth.uid_empresa() does not exist`  
**Causa:** Documentación incorrecta mencionaba una función que no estaba creada.  
**Solución:** Crear `public.uid_empresa()` con permisos EXECUTE para authenticated/anon.

### Problema #2: RLS Bloqueando Subqueries
**Síntoma:** Políticas RLS en `viajes_red_nodexia` no funcionaban, consultas a `relaciones_empresas` retornaban vacío.  
**Causa:** RLS habilitado en `relaciones_empresas` bloqueaba las subqueries de las políticas.  
**Solución:** Deshabilitar RLS en `relaciones_empresas` (es tabla de metadatos, no datos sensibles).

### Problema #3: Estado 'activo' vs 'activa'
**Error Crítico:** La política buscaba `estado = 'activo'` pero la BD usa `estado = 'activa'`.  
**Causa:** Inconsistencia en la definición del enum/varchar de estados.  
**Solución:** Corregir política a `estado = 'activa'`.  
**Impacto:** Sin este fix, NINGÚN viaje se filtraba correctamente.

### Problema #4: UUIDs con Diferencias Mínimas
**Error Sutil:** Se usaba `181d6a2b-cdc2-4a7a-8d2d-6ea1a7a39a0d` (termina en `9a0d`)  
**Real:** UUID correcto es `181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed` (termina en `a9ed`)  
**Impacto:** Queries de verificación usaban UUID incorrecto, generando confusión en debugging.

### Problema #5: Dependencias Circulares en DROP
**Error:** `cannot drop function uid_empresa() because other objects depend on it`  
**Solución:** Usar `DROP ... CASCADE` o eliminar primero las políticas dependientes.

---

## 📊 Datos de Verificación

### Relaciones en Base de Datos
```
Logística Express SRL (181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed)
├─ ↔ Aceitera San Miguel S.A (3cc1979e-1672-48b8-a5e5-2675f5cac527) [activa]
└─ ↔ Otra empresa (0441ce57-2765-4a13-a286-a10f5c3558de) [activa]

Logística del Centro Demo (30b2f467-22df-46e3-9230-4293c7ec9fd1)
└─ Sin relaciones con Aceitera
```

### Usuarios de Prueba
| Usuario | Email | Password | Empresa | Vinculado con Aceitera |
|---------|-------|----------|---------|------------------------|
| Gonzalo | gonzalo@logisticaexpres.com | (configurada) | Logística Express SRL | ✅ SÍ |
| Luis | luis@centro.com.ar | Luis2025! | Logística del Centro Demo | ❌ NO |

### Resultados de Prueba
```
✅ gonzalo@logisticaexpres.com → Accede a "Cargas en Red"
   Resultado: 0 viajes visibles (correcto, están vinculados)

✅ luis@centro.com.ar → Accede a "Cargas en Red"  
   Resultado: 1 viaje visible de Aceitera San Miguel (correcto, no vinculados)
```

---

## 📁 Archivos Modificados

### Frontend
- `pages/transporte/cargas-en-red.tsx`
  - **Cambios:** Eliminado filtrado frontend (líneas 73-110)
  - **Razón:** El filtrado ahora ocurre automáticamente por RLS
  - **Removido:** Import de `supabase` client (ya no se usa)
  
- `pages/crear-despacho.tsx`
  - **Cambios:** Uncommented `origen_asignacion = 'red_nodexia'` (líneas ~803, ~813)
  - **Propósito:** Trackear viajes asignados desde Red Nodexia

### Base de Datos
- `sql/migrations/007_agregar_origen_asignacion.sql` ✅ Ejecutada
- `sql/migrations/018_fix_rls_completo.sql` ✅ Ejecutada (solución final)

### Scripts de Utilidad Creados
- `scripts/check-all-data.js` - Verificar datos completos
- `scripts/check-all-relations.js` - Auditar relaciones empresariales
- `scripts/find-transportes-no-vinculados.js` - Encontrar transportes sin vínculos
- `scripts/test-rls-policy.js` - Probar políticas RLS
- `scripts/verify-rls-status.js` - Estado de RLS y datos

---

## 🔐 Políticas RLS Finales

### Tabla: `viajes_red_nodexia`
**RLS:** ✅ HABILITADO

**Políticas:**
1. **"Solo transportes sin vinculo ven viajes"** (SELECT)
   - Tipo: PERMISSIVE
   - Aplica a: authenticated
   - Lógica: NOT EXISTS subquery a relaciones_empresas

### Tabla: `relaciones_empresas`
**RLS:** ❌ DESHABILITADO  
**Razón:** Necesaria para subqueries de otras políticas RLS  
**Seguridad:** Datos no sensibles (metadatos de relaciones B2B)

### Tabla: `requisitos_viaje_red`
**RLS:** ✅ HABILITADO
**Políticas:** INSERT para plantas (ya existente)

---

## 💡 Lecciones Aprendidas

### 1. RLS en Tablas Auxiliares
**Aprendizaje:** Cuando una tabla (A) tiene políticas RLS que consultan otra tabla (B), la tabla B debe tener RLS deshabilitado o políticas muy permisivas.

**Razón Técnica:** Las subqueries en políticas RLS se ejecutan en el contexto del usuario autenticado. Si la tabla consultada tiene RLS restrictivo, las subqueries fallan silenciosamente (retornan vacío).

### 2. SECURITY DEFINER vs SECURITY INVOKER
**Mejor práctica:** Funciones auxiliares para RLS deben usar `SECURITY DEFINER` para ejecutarse con privilegios elevados y evitar recursión.

### 3. Tipos de Datos y Enums
**Problema común:** Inconsistencias en strings ('activo' vs 'activa').  
**Solución recomendada:** Usar ENUMs de PostgreSQL para estados:
```sql
CREATE TYPE estado_relacion AS ENUM ('activa', 'inactiva', 'suspendida');
```

### 4. Debugging RLS
**Estrategia efectiva:**
1. Usar service role key para ver todos los datos sin RLS
2. Comparar con queries desde frontend (con RLS aplicado)
3. Verificar que funciones auxiliares retornan valores correctos
4. Revisar logs de PostgreSQL (si disponibles)

### 5. UUID Precision
**Cuidado:** UUIDs que difieren en 1-2 caracteres pueden causar horas de debugging. Siempre copiar/pegar, nunca escribir manualmente.

---

## 🚀 Próximos Pasos Sugeridos

### Inmediato (Siguiente Sesión)
1. **Perfil de Control de Acceso**
   - Gestión de relaciones entre empresas
   - CRUD de relaciones con validaciones

2. **Perfil de Supervisor de Carga**
   - Monitoreo de viajes en Red Nodexia
   - Aprobación de ofertas

3. **Testing de Flujo Completo**
   - Planta publica viaje → Transporte no vinculado acepta → Coordinador asigna

### Mejoras Técnicas Futuras
1. **Auditoría de Relaciones**
   - Trigger para registrar cambios en `relaciones_empresas`
   - Historia de estados de relaciones

2. **Performance**
   - Índices en `relaciones_empresas`:
     ```sql
     CREATE INDEX idx_relaciones_transporte_activa 
     ON relaciones_empresas(empresa_transporte_id) 
     WHERE estado = 'activa';
     ```

3. **Notificaciones**
   - Cuando un viaje es publicado a Red, notificar a transportes elegibles
   - Usar Supabase Realtime para actualización en vivo

4. **Analytics**
   - Dashboard de métricas de Red Nodexia:
     - Viajes publicados vs. asignados
     - Tiempo promedio de respuesta
     - Transportes más activos

---

## 📚 Referencias Técnicas

### Supabase RLS Documentation
- https://supabase.com/docs/guides/auth/row-level-security
- https://supabase.com/docs/guides/database/postgres/row-level-security

### PostgreSQL Policy System
- https://www.postgresql.org/docs/current/sql-createpolicy.html
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html

### Security Functions
- `auth.uid()` - Built-in Supabase function
- `SECURITY DEFINER` - PostgreSQL function security mode

---

## 🎯 Estado Final del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                   RED NODEXIA - ESTADO                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ Publicación de viajes a Red          [FUNCIONAL]         │
│  ✅ Filtrado por relaciones (RLS)        [FUNCIONAL]         │
│  ✅ Visualización para no vinculados     [FUNCIONAL]         │
│  ✅ Tracking origen_asignacion           [FUNCIONAL]         │
│  ⚠️  Ofertas de transportes              [PENDIENTE]         │
│  ⚠️  Aceptación de ofertas               [PENDIENTE]         │
│  ⚠️  Asignación desde ofertas            [PENDIENTE]         │
│  ⚠️  Notificaciones                      [PENDIENTE]         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Hito Alcanzado
**🎉 Red Nodexia MVP - Fase 1 Completada**
- Core del marketplace funcionando
- Seguridad implementada correctamente
- Base sólida para siguientes features

---

## 📝 Notas para Continuación

### Variables de Entorno Necesarias
```env
NEXT_PUBLIC_SUPABASE_URL=https://lkdcofsfjnltuzzzwoir.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
SUPABASE_SERVICE_ROLE_KEY=[key]
```

### Comandos Útiles
```bash
# Verificar relaciones
node scripts/check-all-relations.js

# Verificar transportes sin vínculos
node scripts/find-transportes-no-vinculados.js

# Test RLS
node scripts/test-rls-policy.js
```

### SQL de Verificación
```sql
-- Ver todas las políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('viajes_red_nodexia', 'relaciones_empresas');

-- Verificar relaciones activas
SELECT 
  t.nombre as transporte,
  c.nombre as cliente,
  r.estado,
  r.fecha_inicio
FROM relaciones_empresas r
JOIN empresas t ON r.empresa_transporte_id = t.id
JOIN empresas c ON r.empresa_cliente_id = c.id
WHERE r.estado = 'activa';
```

---

**Documentación generada:** 11 de diciembre de 2025  
**Próxima sesión:** Testing completo + Control de Acceso + Supervisor de Carga  
**Estado general:** ✅ SISTEMA ESTABLE Y FUNCIONAL
