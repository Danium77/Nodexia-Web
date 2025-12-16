# 📋 INSTRUCCIONES: Ejecutar SQL Sistema de Viajes

**Fecha:** 27 Octubre 2025  
**Archivo SQL:** `sql/create-viajes-despacho-system.sql`  
**Tiempo estimado:** 5 minutos  
**Impacto:** Nuevas tablas - NO afecta datos existentes

---

## ⚠️ IMPORTANTE - LEER ANTES DE EJECUTAR

### ✅ Este SQL es SEGURO porque:
1. Solo crea tablas NUEVAS (no modifica existentes)
2. Agrega campos OPCIONALES a `despachos` (compatibles con registros actuales)
3. Usa `IF NOT EXISTS` en todas las creaciones
4. No elimina ni modifica datos existentes

### 🔍 Qué se va a crear:
- ✅ 3 nuevas tablas: `viajes_despacho`, `registro_control_acceso`, `incidencias_viaje`
- ✅ 3 campos opcionales en tabla `despachos`
- ✅ 3 funciones SQL automáticas
- ✅ 2 triggers para automatización
- ✅ Políticas RLS por roles
- ✅ 1 vista para reportes
- ✅ Índices para performance

---

## 📝 PASOS PARA EJECUTAR

### **Paso 1: Abrir Supabase SQL Editor**
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: **Nodexia**
3. En el menú lateral → **SQL Editor**
4. Clic en **New Query**

### **Paso 2: Copiar el SQL**
1. Abre el archivo: `sql/create-viajes-despacho-system.sql`
2. Selecciona TODO el contenido (Ctrl+A)
3. Copia (Ctrl+C)

### **Paso 3: Pegar y Ejecutar**
1. Pega en el SQL Editor de Supabase (Ctrl+V)
2. **IMPORTANTE:** Revisa que todo se haya pegado (debe terminar en "END $$;")
3. Clic en **Run** (botón verde) o presiona **Ctrl + Enter**

### **Paso 4: Verificar Ejecución**
Deberías ver mensajes como:
```
✅ ALTER TABLE
✅ CREATE TABLE
✅ CREATE INDEX
✅ CREATE FUNCTION
✅ CREATE TRIGGER
✅ CREATE POLICY
✅ CREATE VIEW

NOTICE: ✅ Sistema de viajes creado exitosamente
NOTICE: 📊 Tablas creadas: viajes_despacho, registro_control_acceso, incidencias_viaje
...
```

### **Paso 5: Verificar que funcionó**
Ejecuta esta consulta de verificación:
```sql
-- Verificar que las tablas se crearon
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('viajes_despacho', 'registro_control_acceso', 'incidencias_viaje');

-- Debe retornar 3 filas
```

---

## 🔍 VERIFICACIONES ADICIONALES

### Verificar campos en despachos:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'despachos'
  AND column_name IN ('cantidad_viajes_solicitados', 'cantidad_viajes_asignados', 'cantidad_viajes_completados');

-- Debe retornar 3 filas con los nuevos campos
```

### Verificar funciones creadas:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('crear_viajes_automaticos', 'actualizar_contadores_despacho', 'ajustar_viajes_despacho');

-- Debe retornar 3 filas
```

### Verificar vista creada:
```sql
SELECT * FROM vista_viajes_despacho LIMIT 1;

-- Si no hay viajes aún, retorna 0 filas (es normal)
```

---

## 🧪 PRUEBA RÁPIDA (Opcional)

Puedes probar que el sistema funciona creando un despacho de prueba:

```sql
-- 1. Crear un despacho de prueba con 3 viajes
INSERT INTO despachos (
  id_pedido,
  origen,
  destino,
  estado,
  prioridad,
  tipo,
  cantidad_viajes_solicitados,
  created_at
) VALUES (
  'DSP-TEST-001',
  'Centro Distribución Rosario',
  'Molino Santa Rosa',
  'pendiente',
  'Media',
  'transporte',
  3,  -- <-- 3 viajes solicitados
  NOW()
) RETURNING id;

-- Copia el ID que retorna (ejemplo: 123e4567-e89b-12d3-a456-426614174000)

-- 2. Verificar que se crearon 3 viajes automáticamente
SELECT 
  id,
  numero_viaje,
  estado,
  fecha_creacion
FROM viajes_despacho
WHERE despacho_id = '123e4567-e89b-12d3-a456-426614174000'  -- <-- Usa el ID que copiaste
ORDER BY numero_viaje;

-- Debe retornar 3 filas (viajes 1, 2, 3)

-- 3. Probar la función de ajuste dinámico
SELECT * FROM ajustar_viajes_despacho(
  '123e4567-e89b-12d3-a456-426614174000',  -- <-- Usa el ID que copiaste
  5  -- Aumentar a 5 viajes
);

-- Debe retornar: viajes_agregados: 2, mensaje: "Se agregaron 2 viaje(s)"

-- 4. Verificar que ahora hay 5 viajes
SELECT COUNT(*) as total_viajes
FROM viajes_despacho
WHERE despacho_id = '123e4567-e89b-12d3-a456-426614174000';

-- Debe retornar: 5

-- 5. LIMPIAR (eliminar el despacho de prueba)
DELETE FROM despachos WHERE id_pedido = 'DSP-TEST-001';
-- Los viajes se eliminan automáticamente por CASCADE
```

---

## 🚨 SI ALGO SALE MAL

### Error: "constraint already exists"
**Solución:** Es normal si ejecutas el script 2 veces. Ignóralo.

### Error: "column already exists"
**Solución:** Es normal si ejecutas el script 2 veces. Ignóralo.

### Error: "permission denied"
**Solución:** Asegúrate de estar conectado como admin en Supabase.

### Error: "syntax error"
**Solución:** 
1. Verifica que copiaste TODO el archivo SQL
2. Asegúrate de que no se cortó al pegar
3. Busca que termine en `END $$;`

### Para revertir TODO (solo si es necesario):
```sql
-- ⚠️ CUIDADO: Esto elimina TODO el sistema de viajes
DROP VIEW IF EXISTS vista_viajes_despacho CASCADE;
DROP TABLE IF EXISTS incidencias_viaje CASCADE;
DROP TABLE IF EXISTS registro_control_acceso CASCADE;
DROP TABLE IF EXISTS viajes_despacho CASCADE;
DROP FUNCTION IF EXISTS crear_viajes_automaticos() CASCADE;
DROP FUNCTION IF EXISTS actualizar_contadores_despacho() CASCADE;
DROP FUNCTION IF EXISTS ajustar_viajes_despacho(UUID, INTEGER) CASCADE;

ALTER TABLE despachos 
DROP COLUMN IF EXISTS cantidad_viajes_solicitados,
DROP COLUMN IF EXISTS cantidad_viajes_asignados,
DROP COLUMN IF EXISTS cantidad_viajes_completados;
```

---

## ✅ CHECKLIST FINAL

Marca cuando completes cada paso:

- [ ] Abrí Supabase SQL Editor
- [ ] Copié el contenido de `sql/create-viajes-despacho-system.sql`
- [ ] Pegué en SQL Editor
- [ ] Ejecuté con Run (Ctrl+Enter)
- [ ] Vi mensajes de éxito (✅)
- [ ] Verifiqué que las 3 tablas existen
- [ ] Verifiqué que los 3 campos se agregaron a `despachos`
- [ ] (Opcional) Hice la prueba rápida
- [ ] (Opcional) Limpié el despacho de prueba
- [ ] ✅ **LISTO - SQL ejecutado exitosamente**

---

## 📞 SIGUIENTE PASO

Una vez que ejecutes el SQL exitosamente, avísame con:
- ✅ "SQL ejecutado correctamente"
- ⚠️ O el error que te haya dado

Y continuaré con:
1. Modificar `crear-despacho.tsx` para agregar el campo de cantidad de viajes
2. Crear la interfaz para que Transporte asigne camiones
3. Crear la interfaz para Control de Acceso

---

**¡Éxito!** 🚀

*Creado: 27 Oct 2025*
