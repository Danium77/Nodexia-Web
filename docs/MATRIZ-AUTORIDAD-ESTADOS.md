# Matriz de Autoridad sobre Estados

## 🔐 Concepto Clave: Estados Cruzados

**Los estados NO son individuales por usuario, sino que se actualizan mediante la interacción de DIFERENTES actores.**

Cada actor tiene **autoridad** sobre ciertos estados y **visibilidad** sobre otros.

---

## 📊 MATRIZ DE AUTORIDAD - ESTADO UNIDAD (20 Estados)

| Estado Unidad | Quién lo ACTUALIZA | Quién lo VE | Trigger/Nota |
|---------------|-------------------|------------|--------------|
| `pendiente` | 🤖 Sistema automático | Todos | Al crear viaje |
| `asignado` | **Coordinador Transporte** | Todos | Asigna camión + chofer |
| `confirmado_chofer` | **Chofer** | Todos | Chofer acepta viaje desde app |
| `en_transito_origen` | **Chofer** | Todos | Chofer presiona "Salir hacia origen" |
| `arribo_origen` | **Chofer** | Todos | Chofer presiona "Arribé a origen" |
| `ingreso_planta` | **Control Acceso** | Todos | Control escanea QR en entrada |
| `en_playa_espera` | **Control Acceso** | Todos | Control asigna a playa de espera |
| `en_proceso_carga` | 🤖 Sistema (trigger) | Todos | Cuando Supervisor inicia carga |
| `cargado` | 🤖 Sistema (trigger) | Todos | Cuando Supervisor finaliza carga |
| `egreso_planta` | 🤖 Sistema (trigger) | Todos | Cuando Control valida documentación |
| `en_transito_destino` | 🤖 Sistema (trigger) | Todos | Cuando Control Acceso registra egreso |
| `arribo_destino` | **Chofer** | Todos | Chofer presiona "Arribé a destino" |
| `ingreso_destino` | **Control Acceso Destino** | Todos | Control destino registra ingreso |
| `llamado_descarga` | **Operador Descarga** | Todos | Operador llama al camión |
| `en_descarga` | 🤖 Sistema (trigger) | Todos | Cuando operador inicia descarga |
| `vacio` | **Operador Descarga** | Todos | Operador confirma camión vacío |
| `egreso_destino` | **Control Acceso Destino** | Todos | Control destino registra egreso |
| `disponible_carga` | 🤖 Sistema (trigger) | Todos | Cuando egresa de destino |
| `viaje_completado` | **Chofer** | Todos | Chofer presiona "Finalizar viaje" |
| `cancelado` | **Coordinadores** | Todos | Decisión de cancelar viaje |

**🤖 Trigger**: Estados actualizados automáticamente por el sistema cuando otro actor realiza una acción.

---

## 📦 MATRIZ DE AUTORIDAD - ESTADO CARGA (17 Estados)

| Estado Carga | Quién lo ACTUALIZA | Quién lo VE | Trigger/Nota |
|--------------|-------------------|------------|--------------|
| `pendiente` | 🤖 Sistema automático | Todos | Al crear viaje |
| `planificado` | **Coordinador Planta** | Todos | Asigna producto y cantidades |
| `documentacion_preparada` | 🤖 Sistema (trigger) | Todos | Cuando Coord. Transporte asigna chofer+camión |
| `llamado_carga` | **Supervisor Carga** | Todos | Supervisor llama al camión |
| `posicionado_carga` | **Supervisor Carga** | Todos | Supervisor confirma posición |
| `iniciando_carga` | **Supervisor Carga** | Todos | Supervisor inicia proceso |
| `cargando` | **Supervisor Carga** | Todos | Carga en curso |
| `carga_completada` | **Supervisor Carga** | Todos | Supervisor finaliza carga + registra peso |
| `documentacion_validada` | **Control Acceso** | Todos | Control valida remito + docs |
| `en_transito` | 🤖 Sistema (trigger) | Todos | Cuando Control registra egreso |
| `arribado_destino` | 🤖 Sistema (trigger) | Todos | Cuando Chofer arriba a destino |
| `iniciando_descarga` | **Operador Descarga** | Todos | Inicia descarga |
| `descargando` | **Operador Descarga** | Todos | Descarga en curso |
| `descargado` | **Operador Descarga** | Todos | Confirma descarga completa |
| `entregado` | **Operador Descarga** | Todos | Docs firmados - Entrega completa |
| `con_faltante` | **Operador Descarga** | Todos | Detecta faltante en descarga |
| `con_rechazo` | **Operador Descarga** | Todos | Producto rechazado |
| `cancelado` | **Coordinadores** | Todos | Decisión de cancelar |

---

## 🔒 Validaciones en Código

### Ejemplo 1: Chofer NO puede poner "cargando"

```typescript
// pages/chofer/viajes.tsx

const actualizarEstado = async (nuevoEstado: string) => {
  const { data, error } = await supabase
    .rpc('actualizar_estado_unidad', {
      p_viaje_id: viajeId,
      p_nuevo_estado: nuevoEstado,
      p_user_id: user.id
    });
  
  if (error) {
    // La función SQL valida automáticamente el rol
    if (error.message.includes('Solo supervisor')) {
      alert('❌ No tienes permiso para esta acción');
    }
  }
};

// El chofer solo ve estos botones:
const accionesChofer = {
  'confirmado_chofer': [
    { label: '🚗 Salir hacia origen', valor: 'en_transito_origen' }
  ],
  'en_transito_origen': [
    // NO aparece "cargando" - solo estados que el chofer puede activar
    { label: '📍 Llegué', valor: 'arribado_origen' } // ❌ Esto falla
  ],
  'en_transito_destino': [
    { label: '🏁 Llegué a destino', valor: 'arribado_destino' }
  ]
};
```

**NOTA:** El chofer NO puede poner `arribado_origen` porque **solo Control Acceso** lo puede hacer al escanear el QR.

---

### Ejemplo 2: Control Acceso NO puede poner "cargado"

```typescript
// pages/control-acceso.tsx

const registrarIngreso = async (viajeId: string) => {
  // Control Acceso actualiza estado_unidad
  await supabase.rpc('actualizar_estado_unidad', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'arribado_origen', // ✅ PUEDE
    p_user_id: user.id
  });
  
  // Control Acceso actualiza estado_carga (solo docs)
  await supabase.rpc('actualizar_estado_carga', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'documentacion_validada', // ✅ PUEDE
    p_user_id: user.id
  });
  
  // ❌ NO PUEDE hacer esto:
  await supabase.rpc('actualizar_estado_carga', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'cargado', // ❌ ERROR: Solo supervisor_carga
    p_user_id: user.id
  });
};
```

---

### Ejemplo 3: Supervisor Carga controla proceso de carga

```typescript
// pages/supervisor-carga.tsx

const llamarACarga = async (viajeId: string) => {
  // ✅ Supervisor actualiza estado_unidad
  await supabase.rpc('actualizar_estado_unidad', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'llamado_carga', // ✅ PUEDE
    p_user_id: user.id
  });
};

const iniciarCarga = async (viajeId: string) => {
  // ✅ Supervisor actualiza AMBOS estados
  await supabase.rpc('actualizar_estado_unidad', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'posicionado_carga', // ✅ PUEDE
    p_user_id: user.id
  });
  
  await supabase.rpc('actualizar_estado_carga', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'en_proceso_carga', // ✅ PUEDE
    p_user_id: user.id
  });
};

const finalizarCarga = async (viajeId: string, pesoReal: number) => {
  // ✅ Supervisor actualiza AMBOS estados
  await supabase.rpc('actualizar_estado_unidad', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'carga_completada', // ✅ PUEDE
    p_user_id: user.id
  });
  
  await supabase.rpc('actualizar_estado_carga', {
    p_viaje_id: viajeId,
    p_nuevo_estado: 'cargado', // ✅ PUEDE
    p_user_id: user.id,
    p_peso_real: pesoReal
  });
};
```

---

## 🔄 Flujo Real con Interacción Cruzada

### Caso: Viaje de Carga Completo

```
HORA  | ACTOR                    | ACCIÓN                           | ESTADO UNIDAD        | ESTADO CARGA
------|--------------------------|----------------------------------|---------------------|--------------------
08:00 | Coord. Planta           | Crea viaje DSP-2025-001          | 🤖 pendiente        | 🤖 planificada
08:05 | Coord. Planta           | Asigna "Logística Express"       | 🤖 pendiente unidad | transporte asignado
08:30 | Coord. Transporte       | Asigna ABC123 + Walter           | asignado            | 🤖 camion asignado
09:00 | Chofer Walter           | Confirma viaje en app            | confirmado_chofer   | Confirmada 
09:30 | Chofer Walter           | Presiona "Salir a origen"        | en_transito_origen  | Confirmada 
11:00 | Chofer Walter           | Presiona "Arribé a origen"       | arribo_origen       | Confirmada 
11:15 | Control Acceso          | Escanea QR de ingreso            | ingreso_planta      | proxima a cargar 
11:20 | Control Acceso          | Asigna a playa 3                 | en_playa_espera     | proxima a cargar 
11:45 | Supervisor Carga        | Llama a carga                    | 🤖 en_proceso_carga | en proceso 
12:00 | Supervisor Carga        | Confirma posicionamiento         | en_proceso_carga    | en proceso
12:05 | Supervisor Carga        | Inicia carga                     | en_proceso_carga    | cargando
13:30 | Supervisor Carga        | Finaliza carga (34.8 TN)         | 🤖 egreso_planta   | carga_completada
13:45 | Control Acceso          | Valida remito                    | egreso_planta       | documentacion_validada **este paso no es necesario, se realiza todo en paso de egreso por control egreso**
14:00 | Control Acceso          | Registra egreso                  | 🤖 en_transito_destino |en transito
17:00 | Chofer Walter           | Presiona "Arribé a destino"      | arribo_destino      | 🤖 arribado_destino
17:15 | Control Acceso Destino  | Registra ingreso                 | ingreso_destino     | arribado_destino
17:30 | Operador Descarga       | Inicia descarga                  | 🤖 en_descarga      | iniciando_descarga
18:30 | Operador Descarga       | Confirma descarga                | en_descarga         | descargado
18:45 | Control Acceso Destino  | Registra egreso                  | egreso_destino      | 🤖 completado
19:00 | Chofer Walter           | Presiona "Finalizar viaje"       | viaje_completado    | completado
```

**Leyenda:**
- 🤖 = Estado actualizado AUTOMÁTICAMENTE por trigger del sistema
- Sin emoji = Estado actualizado MANUALMENTE por el actor

**Observaciones:**
- ✅ **Coordinador Planta** solo asigna transporte, NO asigna chofer ni camión
- ✅ **Coordinador Transporte** asigna chofer + camión específico
- ✅ **Chofer** actualiza solo sus movimientos (confirmar, salir, llegar)
- ✅ **Control Acceso** actualiza ingresos/egresos y validación de docs
- ✅ **Supervisor** controla TODO el proceso de carga (sin intervención del chofer)
- ✅ **Sistema** actualiza automáticamente muchos estados mediante triggers
- ✅ Notificaciones se envían del Coord. Transporte al chofer, NO del Coord. Planta

---

## 🛡️ Seguridad: Validaciones en SQL

La función `actualizar_estado_unidad()` valida permisos:

```sql
CREATE OR REPLACE FUNCTION actualizar_estado_unidad(
  p_viaje_id UUID,
  p_nuevo_estado TEXT,
  p_user_id UUID,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS TABLE(exitoso BOOLEAN, mensaje TEXT) AS $$
DECLARE
  v_rol_usuario TEXT;
  v_estado_actual TEXT;
BEGIN
  -- Obtener rol del usuario
  SELECT ue.rol_interno INTO v_rol_usuario
  FROM usuarios_empresa ue
  WHERE ue.user_id = p_user_id
  LIMIT 1;
  
  -- Validar permisos por estado
  CASE p_nuevo_estado
    WHEN 'confirmado_chofer', 'en_transito_origen', 'arribo_origen', 'arribo_destino', 'viaje_completado' THEN
      -- Solo choferes
      IF v_rol_usuario != 'chofer' THEN
        RETURN QUERY SELECT FALSE, 'Solo choferes pueden actualizar este estado'::TEXT;
        RETURN;
      END IF;
    
    WHEN 'ingreso_planta', 'en_playa_espera', 'ingreso_destino', 'egreso_destino' THEN
      -- Solo control de acceso
      IF v_rol_usuario != 'control_acceso' THEN
        RETURN QUERY SELECT FALSE, 'Solo control de acceso puede actualizar este estado'::TEXT;
        RETURN;
      END IF;
    
    WHEN 'llamado_carga', 'posicionado_carga', 'iniciando_carga', 'cargando', 'carga_completada' THEN
      -- Solo supervisor de carga (UNIDAD) o estados de CARGA
      IF v_rol_usuario != 'supervisor_carga' THEN
        RETURN QUERY SELECT FALSE, 'Solo supervisor de carga puede actualizar este estado'::TEXT;
        RETURN;
      END IF;
    
    WHEN 'asignado', 'cancelado' THEN
      -- Solo coordinadores (Planta o Transporte)
      IF v_rol_usuario NOT IN ('coordinador', 'coordinador_transporte') THEN
        RETURN QUERY SELECT FALSE, 'Solo coordinadores pueden actualizar este estado'::TEXT;
        RETURN;
      END IF;
    
    -- Estados automáticos NO se actualizan manualmente
    WHEN 'pendiente', 'en_proceso_carga', 'egreso_planta', 'en_transito_destino', 'en_descarga', 'documentacion_preparada', 'arribado_destino', 'completado' THEN
      RETURN QUERY SELECT FALSE, 'Este estado se actualiza automáticamente por el sistema'::TEXT;
      RETURN;
    
    ELSE
      NULL;
  END CASE;
  
  -- Si pasa validación, actualizar
  UPDATE estado_unidad_viaje
  SET 
    estado_unidad = p_nuevo_estado,
    observaciones_unidad = COALESCE(p_observaciones, observaciones_unidad)
  WHERE viaje_id = p_viaje_id;
  
  RETURN QUERY SELECT TRUE, 'Estado actualizado correctamente'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎯 UI: Botones Contextuales por Rol

### Chofer ve SOLO sus acciones:

```tsx
// pages/chofer/viajes.tsx
function getBotonesChofer(estadoUnidad: string) {
  switch (estadoUnidad) {
    case 'confirmado_chofer':
      return [{ label: '🚗 Salir hacia Origen', accion: 'en_transito_origen' }];
    
    case 'en_transito_origen':
      return [
        { label: '⚠️ Reportar Incidencia', accion: 'en_incidencia' }
        // NO aparece "Llegué" porque lo hace Control Acceso
      ];
    
    case 'carga_completada':
      return []; // Espera a que Control valide y lo deje salir
    
    case 'saliendo_origen':
      return [{ label: '🚚 Salir a Destino', accion: 'en_transito_destino' }];
    
    case 'en_transito_destino':
      return [{ label: '🏁 Llegué a Destino', accion: 'arribado_destino' }];
    
    default:
      return [];
  }
}
```

### Control Acceso ve SOLO sus acciones:

```tsx
// pages/control-acceso.tsx
function getBotonesControlAcceso(estadoUnidad: string) {
  switch (estadoUnidad) {
    case 'en_transito_origen':
      return [{ label: '📍 Registrar Ingreso', accion: 'arribado_origen' }];
    
    case 'arribado_origen':
      return [{ label: '🅿️ Asignar a Playa', accion: 'en_playa_espera' }];
    
    case 'carga_completada':
      return [
        { label: '✅ Validar Docs y Egresar', accion: 'saliendo_origen' },
        { label: '❌ Rechazar Documentación', accion: 'en_playa_espera' }
      ];
    
    default:
      return [];
  }
}
```

### Supervisor Carga ve SOLO sus acciones:

```tsx
// pages/supervisor-carga.tsx
function getBotonesSupervisor(estadoUnidad: string) {
  switch (estadoUnidad) {
    case 'en_playa_espera':
      return [{ label: '📢 Llamar a Carga', accion: 'llamado_carga' }];
    
    case 'llamado_carga':
      return [{ label: '✅ Confirmar Posicionamiento', accion: 'posicionado_carga' }];
    
    case 'posicionado_carga':
      return [{ label: '📦 Iniciar Carga', accion: 'en_proceso_carga' }];
    
    // En "en_proceso_carga" no hay botón - está cargando físicamente
    
    default:
      return [{ label: '✅ Finalizar Carga', accion: 'carga_completada' }];
  }
}
```

---

## 🔔 Notificaciones Cruzadas

Cuando un actor actualiza un estado, **otros actores reciben notificaciones**:

```typescript
// Trigger SQL automático
CREATE OR REPLACE FUNCTION notificar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  -- Si supervisor llama a carga, notificar al chofer
  IF NEW.estado_unidad = 'llamado_carga' THEN
    PERFORM enviar_notificacion(
      (SELECT ch.user_id FROM choferes ch 
       INNER JOIN viajes_despacho vd ON vd.chofer_id = ch.id 
       WHERE vd.id = NEW.viaje_id),
      'llamado_carga',
      '🚨 Te llamaron a carga',
      'Dirígete a la posición de carga',
      NEW.viaje_id
    );
  END IF;
  
  -- Si control registra egreso, notificar al chofer
  IF NEW.estado_unidad = 'saliendo_origen' THEN
    PERFORM enviar_notificacion(
      (SELECT ch.user_id FROM choferes ch 
       INNER JOIN viajes_despacho vd ON vd.chofer_id = ch.id 
       WHERE vd.id = NEW.viaje_id),
      'viaje_listo',
      '✅ Listo para salir',
      'Documentación validada, puedes salir a destino',
      NEW.viaje_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_cambio_estado
AFTER UPDATE ON estado_unidad_viaje
FOR EACH ROW
EXECUTE FUNCTION notificar_cambio_estado();
```

---

## 📊 Vista Consolidada para Coordinadores

Los coordinadores ven **TODO** pero solo pueden modificar ciertos estados:

```tsx
// pages/coordinator-dashboard.tsx
function VistaCompletaViaje({ viaje }) {
  return (
    <Card>
      <Timeline>
        {/* Estado UNIDAD - Solo vista */}
        <TimelineItem 
          icon="🚛" 
          label="Estado Unidad" 
          value={viaje.estado_unidad}
          editable={puedeEditarEstadoUnidad(user.rol, viaje.estado_unidad)}
        />
        
        {/* Estado CARGA - Solo vista */}
        <TimelineItem 
          icon="📦" 
          label="Estado Carga" 
          value={viaje.estado_carga}
          editable={puedeEditarEstadoCarga(user.rol, viaje.estado_carga)}
        />
        
        {/* Historial de cambios */}
        <HistorialCambios>
          <Cambio 
            timestamp="10:30" 
            actor="Control Acceso - Juan Pérez"
            accion="arribado_origen"
          />
          <Cambio 
            timestamp="11:00" 
            actor="Supervisor Carga - María González"
            accion="llamado_carga"
          />
          <Cambio 
            timestamp="11:45" 
            actor="Supervisor Carga - María González"
            accion="carga_completada"
          />
        </HistorialCambios>
      </Timeline>
      
      {/* Acciones disponibles para coordinador */}
      {puedeModificar && (
        <Button onClick={cancelarViaje}>
          ❌ Cancelar Viaje
        </Button>
      )}
    </Card>
  );
}
```

---

## ✅ Resumen del Concepto

### Estados Cruzados = Colaboración entre Actores

1. **Cada actor tiene AUTORIDAD sobre ciertos estados**
   - Chofer → Movimientos (salir, llegar)
   - Control Acceso → Ingresos/Egresos
   - Supervisor → Proceso de carga
   - Coordinadores → Asignación y cierre

2. **Los estados avanzan mediante la INTERACCIÓN de múltiples actores**
   - No es lineal por actor
   - Es un flujo colaborativo

3. **Validaciones en SQL garantizan permisos**
   - Backend rechaza acciones no autorizadas
   - Frontend solo muestra botones válidos

4. **Notificaciones conectan a los actores**
   - Cuando uno actualiza, otros son notificados
   - Todos ven el estado actualizado en tiempo real

### Analogía: Cadena de Producción

```
🏭 FÁBRICA = SISTEMA NODEXIA

Operario A (Chofer)       → Lleva materia prima
Supervisor B (Control)    → Registra ingreso
Operario C (Supervisor)   → Procesa material
Supervisor D (Control)    → Valida y despacha
Operario A (Chofer)       → Entrega producto

Ninguno puede hacer el trabajo del otro.
El producto avanza porque TODOS colaboran.
```

**Esto es exactamente lo que implementamos con los estados duales.**
