# 📋 INSTRUCCIONES - Ejecutar Migración 011

## ✅ Pasos para Ejecutar la Migración en Supabase

### 1️⃣ Abrir Supabase Dashboard
1. Ve a https://supabase.com
2. Login con tu cuenta
3. Selecciona tu proyecto de Nodexia

### 2️⃣ Ir al SQL Editor
1. En el menú lateral izquierdo, busca **"SQL Editor"**
2. Click en **"SQL Editor"**
3. Click en **"New query"** (botón verde superior derecho)

### 3️⃣ Copiar el SQL
1. Abre el archivo: `sql/migrations/011_sistema_notificaciones.sql`
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)

### 4️⃣ Pegar y Ejecutar
1. Pega el SQL en el editor de Supabase (Ctrl+V)
2. Click en el botón **"Run"** (esquina inferior derecha)
3. Espera unos segundos...

### 5️⃣ Verificar Éxito ✅

Deberías ver un mensaje como:
```
Success. No rows returned
```

Si ves errores, revisa la sección de Troubleshooting más abajo.

---

## 🔍 Verificar que la Migración Funcionó

### Opción 1: Verificar Tabla
```sql
-- Ejecuta esto en SQL Editor
SELECT * FROM pg_tables WHERE tablename = 'notificaciones';
```

**Resultado esperado:** 1 fila que muestre la tabla `notificaciones`

### Opción 2: Verificar Funciones
```sql
-- Ejecuta esto en SQL Editor
SELECT proname FROM pg_proc 
WHERE proname IN (
  'crear_notificacion_cancelacion',
  'marcar_notificacion_leida',
  'marcar_todas_notificaciones_leidas'
);
```

**Resultado esperado:** 3 filas con los nombres de las funciones

### Opción 3: Verificar Trigger
```sql
-- Ejecuta esto en SQL Editor
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notificacion_cancelacion';
```

**Resultado esperado:** 1 fila con el nombre del trigger

### Opción 4: Verificar Políticas RLS
```sql
-- Ejecuta esto en SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'notificaciones';
```

**Resultado esperado:** 3 filas (select_own, update_own, insert_system)

---

## 🧪 Probar el Sistema

### Test 1: Crear Notificación Manual
```sql
-- En SQL Editor, ejecuta:
INSERT INTO notificaciones (
  usuario_id,
  tipo,
  titulo,
  mensaje,
  pedido_id
) VALUES (
  auth.uid(), -- Tu usuario actual
  'mensaje_sistema',
  '🧪 Prueba de Notificación',
  'Esta es una notificación de prueba del sistema',
  'TEST-001'
);

-- Verificar que se creó
SELECT * FROM notificaciones WHERE titulo LIKE '%Prueba%';
```

### Test 2: Marcar como Leída
```sql
-- Obtén el ID de la notificación de prueba
SELECT id FROM notificaciones WHERE titulo LIKE '%Prueba%' LIMIT 1;

-- Usa ese ID aquí (reemplaza 'TU-UUID-AQUI')
SELECT marcar_notificacion_leida('TU-UUID-AQUI');

-- Verificar que se marcó como leída
SELECT * FROM notificaciones WHERE titulo LIKE '%Prueba%';
-- La columna 'leida' debe ser TRUE
```

### Test 3: Marcar Todas como Leídas
```sql
-- Marcar todas
SELECT marcar_todas_notificaciones_leidas();

-- Verificar
SELECT COUNT(*) as no_leidas FROM notificaciones WHERE leida = FALSE;
-- Debe devolver 0
```

---

## ⚠️ Troubleshooting

### Error: "relation notificaciones already exists"
**Causa:** La tabla ya existe de una ejecución anterior.

**Solución:**
```sql
-- Opción 1: Eliminar y recrear (CUIDADO: borra datos)
DROP TABLE IF EXISTS notificaciones CASCADE;

-- Luego ejecuta la migración completa de nuevo
```

### Error: "function crear_notificacion_cancelacion already exists"
**Causa:** Las funciones ya existen.

**Solución:** Está bien, el script usa `CREATE OR REPLACE`, así que solo ejecútalo de nuevo.

### Error: "column company_id does not exist in table despachos"
**Causa:** El trigger intenta acceder a `company_id` pero la columna se llama diferente.

**Solución:** Necesitamos verificar el nombre correcto de la columna. Ejecuta:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'despachos' 
  AND column_name LIKE '%company%' OR column_name LIKE '%empresa%';
```

Luego actualiza la función en la migración con el nombre correcto.

### Error: "policy notificaciones_select_own already exists"
**Causa:** Las políticas RLS ya existen.

**Solución:**
```sql
-- Eliminar políticas existentes
DROP POLICY IF EXISTS notificaciones_select_own ON notificaciones;
DROP POLICY IF EXISTS notificaciones_update_own ON notificaciones;
DROP POLICY IF EXISTS notificaciones_insert_system ON notificaciones;

-- Luego ejecuta la migración de nuevo
```

---

## 🔧 Comandos Útiles

### Ver todas las notificaciones (como super admin)
```sql
SELECT 
  n.*,
  u.email as usuario_email
FROM notificaciones n
JOIN auth.users u ON u.id = n.usuario_id
ORDER BY n.created_at DESC
LIMIT 10;
```

### Limpiar notificaciones de prueba
```sql
DELETE FROM notificaciones WHERE titulo LIKE '%Prueba%';
```

### Ver estadísticas
```sql
SELECT 
  tipo,
  COUNT(*) as cantidad,
  SUM(CASE WHEN leida THEN 1 ELSE 0 END) as leidas,
  SUM(CASE WHEN NOT leida THEN 1 ELSE 0 END) as no_leidas
FROM notificaciones
GROUP BY tipo
ORDER BY cantidad DESC;
```

---

## 📱 Probar en la Aplicación

### Después de ejecutar la migración:

1. **Reiniciar el servidor:**
   ```bash
   # En terminal
   Ctrl+C  # Detener servidor
   pnpm run dev  # Iniciar de nuevo
   ```

2. **Login como Coordinador de Planta:**
   - Email: `coordinador@industriacentro.com`
   - Password: `Demo2025!`

3. **Verificar icono de campana:**
   - Debe aparecer en el header (esquina superior derecha)
   - Si no hay notificaciones, aparece gris
   - Si hay notificaciones, aparece cyan con badge rojo

4. **Crear una notificación de prueba:**
   - Login como coordinador transporte: `gonzalo@logisticaexpres.com`
   - Ir a "Despachos Ofrecidos"
   - Cancelar un viaje asignado
   - **IMPORTANTE:** Esto creará automáticamente una notificación

5. **Ver la notificación:**
   - Logout y login como coordinador planta
   - Click en la campana
   - Debe aparecer la notificación de cancelación

---

## ✅ Checklist de Verificación

- [ ] Migración ejecutada sin errores
- [ ] Tabla `notificaciones` existe
- [ ] 3 funciones creadas
- [ ] 1 trigger creado
- [ ] 3 políticas RLS activas
- [ ] Test manual exitoso (INSERT)
- [ ] Función marcar_leida funciona
- [ ] Función marcar_todas funciona
- [ ] Servidor reiniciado
- [ ] Icono de campana visible en app
- [ ] Trigger crea notificación al cancelar viaje

---

## 📞 Ayuda Adicional

Si encuentras algún error que no puedas resolver:

1. Copia el mensaje de error completo
2. Copia el query que estabas ejecutando
3. Avísame y te ayudo a solucionarlo

---

**¡Listo!** Una vez completado esto, el sistema de notificaciones estará 100% funcional.
