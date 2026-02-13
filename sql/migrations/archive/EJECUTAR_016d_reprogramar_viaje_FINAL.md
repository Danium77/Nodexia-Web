# 🔧 EJECUTAR MIGRACIÓN: reprogramar_viaje() FINAL

**Fecha:** 12 de Enero 2026  
**Problema:** Modal de reprogramación falla porque la función SQL no está actualizada  
**Solución:** Ejecutar migración 016d con función completa

---

## 📋 PASOS PARA EJECUTAR

### 1. Abrir Supabase SQL Editor

1. Ir a https://supabase.com
2. Seleccionar proyecto Nodexia
3. Click en "SQL Editor" en el menú lateral

---

### 2. Ejecutar este SQL

```sql
-- =====================================================
-- MIGRACIÓN FINAL: reprogramar_viaje() COMPLETA
-- =====================================================
-- Esta función hace TODO lo necesario al reprogramar:
-- 1. Limpia transport_id del DESPACHO
-- 2. Limpia transport_id, chofer_id, camion_id, acoplado_id del VIAJE
-- 3. Actualiza scheduled_at del DESPACHO con la nueva fecha

CREATE OR REPLACE FUNCTION reprogramar_viaje(
  p_viaje_id UUID,
  p_nueva_fecha_hora TIMESTAMPTZ,
  p_motivo TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  viaje_id UUID
) AS $$
DECLARE
  v_estado_actual TEXT;
  v_despacho_id UUID;
BEGIN
  -- Verificar que el viaje existe y está expirado
  SELECT estado_carga, despacho_id
  INTO v_estado_actual, v_despacho_id
  FROM viajes_despacho
  WHERE id = p_viaje_id;

  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT false, 'Viaje no encontrado'::TEXT, p_viaje_id;
    RETURN;
  END IF;

  IF v_estado_actual != 'expirado' THEN
    RETURN QUERY SELECT false, 'El viaje no está en estado expirado'::TEXT, p_viaje_id;
    RETURN;
  END IF;

  -- 1️⃣ Actualizar el VIAJE (limpiar TODOS los recursos)
  UPDATE viajes_despacho
  SET 
    estado_carga = 'pendiente_asignacion',
    estado_unidad = NULL,
    estado = 'pendiente', -- Legacy
    fue_expirado = true,
    fecha_expiracion_original = COALESCE(fecha_expiracion_original, NOW()),
    cantidad_reprogramaciones = COALESCE(cantidad_reprogramaciones, 0) + 1,
    motivo_reprogramacion = COALESCE(p_motivo, motivo_reprogramacion),
    -- 🔥 LIMPIAR RECURSOS ASIGNADOS
    chofer_id = NULL,
    camion_id = NULL,
    acoplado_id = NULL,
    transport_id = NULL
  WHERE id = p_viaje_id;

  -- 2️⃣ Actualizar el DESPACHO (nueva fecha + limpiar transport_id)
  UPDATE despachos
  SET 
    scheduled_at = p_nueva_fecha_hora,
    transport_id = NULL  -- 🔥 Limpiar transporte del despacho también
  WHERE id = v_despacho_id;

  RETURN QUERY SELECT true, 'Viaje reprogramado exitosamente'::TEXT, p_viaje_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reprogramar_viaje IS 
  'Reprograma un viaje expirado: limpia TODOS los recursos (chofer, camión, acoplado, transporte) y actualiza la fecha programada del despacho.';
```

---

### 3. Verificar la función

```sql
-- Ver la definición de la función
SELECT 
  proname as nombre_funcion,
  pg_get_functiondef(oid) as definicion
FROM pg_proc 
WHERE proname = 'reprogramar_viaje';
```

---

### 4. Probar la función (OPCIONAL)

```sql
-- Probar con un viaje expirado real
SELECT * FROM reprogramar_viaje(
  '[ID_DEL_VIAJE_EXPIRADO]'::UUID,
  '2026-01-15 10:00:00'::TIMESTAMPTZ,
  'Prueba de función'
);
```

---

## ✅ Resultado Esperado

Deberías ver:
```
success | mensaje                            | viaje_id
--------|------------------------------------|---------
true    | Viaje reprogramado exitosamente   | [uuid]
```

---

## 🎯 Próximo Paso

Una vez ejecutada la migración:
1. Recargar la página de despachos
2. Ir al tab "Expirados"
3. Hacer click en "🔄 Reprogramar"
4. Ingresar nueva fecha/hora
5. Confirmar

**El error debería desaparecer** ✅

---

## 🐛 Si Sigue Fallando

Revisar logs en consola del navegador (F12) para ver error específico.
