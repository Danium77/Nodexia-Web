# Diagrama de Flujo - Estados Cruzados

## 🎭 Concepto: Múltiples Actores, Un Solo Viaje

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIAJE #DSP-2025-001                                  │
│                  (35 TN Soja - ABC123 - Walter Zayas)                        │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ├─────────────────────────────────────────────────────────────────┐
          │                                                                 │
          ▼                                                                 ▼
┌─────────────────────┐                                      ┌──────────────────────┐
│  ESTADO UNIDAD      │                                      │  ESTADO CARGA        │
│  (Chofer + Camión)  │                                      │  (Producto + Docs)   │
└─────────────────────┘                                      └──────────────────────┘
          │                                                                 │
          │                                                                 │
          ▼                                                                 ▼


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                           TIMELINE DEL VIAJE                                ┃
┃               (Cada actor actualiza SOLO sus estados)                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


08:00  🏢 COORDINADOR PLANTA (Leandro)
       ├─ Acción: Crea despacho DSP-2025-001 (35 TN Soja)
       └─ 🤖 Sistema: Crea automáticamente estado_unidad="pendiente" + estado_carga="pendiente"


08:05  🏢 COORDINADOR PLANTA (Leandro)
       ├─ Acción: Asigna "Logística Express" al despacho
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "asignado"
       └─ 📬 Notifica: Logística Express (nuevo despacho asignado)


08:30  🚛 COORDINADOR TRANSPORTE (Logística Express)
       ├─ Acción: Asigna Camión ABC123 + Chofer Walter Zayas
       ├─ 🤖 Sistema: Actualiza automáticamente estado_carga = "documentacion_preparada"
       └─ 📬 Notifica: Walter (viaje asignado, revisa app)


09:00  🚗 CHOFER (Walter)
       ├─ Acción: Confirma viaje desde app móvil
       ├─ Actualiza: estado_unidad = "confirmado_chofer"
       └─ ❌ NO puede actualizar estado_carga (sin permiso)


09:00  🚗 CHOFER (Walter)
       ├─ Acción: Confirma viaje desde app móvil
       ├─ Actualiza: estado_unidad = "confirmado_chofer"
       └─ ❌ NO puede actualizar estado_carga (sin permiso)


09:30  🚗 CHOFER (Walter)
       ├─ Acción: Presiona "Salir hacia Origen"
       ├─ Actualiza: estado_unidad = "en_transito_origen"
       ├─ 🛰️ Sistema: Inicia GPS tracking automático (envío cada 30 seg)
       └─ ❌ NO puede marcar "arribo_origen" (debe hacerlo físicamente)


11:00  🚗 CHOFER (Walter)
       ├─ Acción: Presiona "Arribé a Origen"
       ├─ Actualiza: estado_unidad = "arribo_origen"
       └─ Espera: Que Control Acceso lo registre en portería


11:15  🔐 CONTROL ACCESO (Juan - Portero)
       ├─ Acción: Escanea QR de ABC123 en entrada
       ├─ Actualiza: estado_unidad = "ingreso_planta"
       └─ ❌ NO puede poner "cargando" (solo supervisor puede)


11:20  🔐 CONTROL ACCESO (Juan)
       ├─ Acción: Asigna camión a playa de espera #3
       ├─ Actualiza: estado_unidad = "en_playa_espera"
       └─ 📬 Notifica: Supervisor (nuevo camión ABC123 en playa #3)


11:45  📦 SUPERVISOR CARGA (María)
       ├─ Acción: Llama a carga a ABC123
       ├─ Actualiza: estado_carga = "llamado_carga"
       └─ 📬 Notifica: Walter (posicionate en bay de carga #2)


11:50  📦 SUPERVISOR CARGA (María)
       ├─ Acción: Confirma posicionamiento del camión
       ├─ Actualiza: estado_carga = "posicionado_carga"
       └─ Espera: Iniciar carga física


11:55  📦 SUPERVISOR CARGA (María)
       ├─ Acción: Inicia proceso de carga
       ├─ Actualiza: estado_carga = "iniciando_carga"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "en_proceso_carga"
       └─ 📬 Notifica: Control Acceso (carga iniciada)


12:00  📦 SUPERVISOR CARGA (María)
       ├─ Acción: Cambia a estado cargando (carga en progreso)
       ├─ Actualiza: estado_carga = "cargando"
       └─ ❌ Chofer NO puede hacer esto (solo supervisor tiene autoridad)


13:30  📦 SUPERVISOR CARGA (María)
       ├─ Acción: Finaliza carga (34.8 TN reales, Remito #12345)
       ├─ Actualiza: estado_carga = "carga_completada"
       ├─ Registra: peso_real_kg = 34800, remito_numero = "REM-12345"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "cargado"
       └─ 📬 Notifica: Control Acceso (ABC123 listo para validar docs)


13:40  🔐 CONTROL ACCESO (Juan)
       ├─ Acción: Valida remito REM-12345 y documentación
       ├─ Actualiza: estado_carga = "documentacion_validada"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "egreso_planta"
       └─ 📬 Notifica: Walter (listo para egresar)


14:00  🔐 CONTROL ACCESO (Juan)
       ├─ Acción: Registra egreso de ABC123 por portería
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "en_transito_destino"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_carga = "en_transito"
       └─ 📬 Notifica: Walter (egreso autorizado, puedes salir)


14:05  🚗 CHOFER (Walter)
       ├─ Acción: Sale físicamente de la planta
       ├─ 🛰️ Sistema: Reactiva GPS tracking automático
       └─ ❌ NO puede actualizar estado_carga (ya está en tránsito)


14:05  🚗 CHOFER (Walter)
       ├─ Acción: Sale físicamente de la planta
       ├─ 🛰️ Sistema: Reactiva GPS tracking automático
       └─ ❌ NO puede actualizar estado_carga (ya está en tránsito)


17:00  🚗 CHOFER (Walter)
       ├─ Acción: Presiona "Arribé a Destino"
       ├─ Actualiza: estado_unidad = "arribo_destino"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_carga = "arribado_destino"
       ├─ 🛰️ Sistema: Detiene GPS tracking
       └─ 📬 Notifica: Cliente (camión ABC123 arribó)


17:15  🔐 CONTROL ACCESO DESTINO (Portero cliente)
       ├─ Acción: Registra ingreso a planta destino
       ├─ Actualiza: estado_unidad = "ingreso_destino"
       └─ 📬 Notifica: Operador descarga (ABC123 en planta)


17:25  👤 OPERADOR DESCARGA (Cliente)
       ├─ Acción: Llama al camión para descargar
       ├─ Actualiza: estado_unidad = "llamado_descarga"
       └─ 📬 Notifica: Walter (dirígete a bay de descarga)


17:30  👤 OPERADOR DESCARGA (Cliente)
       ├─ Acción: Inicia descarga
       ├─ Actualiza: estado_carga = "iniciando_descarga"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "en_descarga"
       └─ ❌ Chofer NO puede hacer esto (solo operador del cliente)


17:35  👤 OPERADOR DESCARGA (Cliente)
       ├─ Acción: Marca descarga en progreso
       ├─ Actualiza: estado_carga = "descargando"
       └─ Espera: Finalizar descarga física


18:30  👤 OPERADOR DESCARGA (Cliente)
       ├─ Acción: Confirma descarga completa (sin faltantes)
       ├─ Actualiza: estado_carga = "descargado"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "vacio"
       └─ 📬 Notifica: Control Acceso (ABC123 vacío, puede egresar)


18:40  👤 OPERADOR DESCARGA (Cliente)
       ├─ Acción: Valida documentación y firma remito
       ├─ Actualiza: estado_carga = "entregado"
       └─ 📬 Notifica: Coordinador Planta (entrega exitosa)


18:45  🔐 CONTROL ACCESO DESTINO
       ├─ Acción: Registra egreso de planta destino
       ├─ Actualiza: estado_unidad = "egreso_destino"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_unidad = "disponible_carga"
       ├─ 🤖 Sistema: Actualiza automáticamente estado_carga = "completado"
       └─ 📬 Notifica: Todos (viaje finalizado exitosamente)


19:00  🚗 CHOFER (Walter)
       ├─ Acción: Presiona "Finalizar Viaje"
       ├─ Actualiza: estado_unidad = "viaje_completado"
       └─ 🎉 Sistema: Registra cierre de viaje DSP-2025-001


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                          MATRIZ DE AUTORIDAD                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┌─────────────────────┬───────────────────────────┬─────────────────────────────────┐
│ ACTOR               │ PUEDE ACTUALIZAR          │ NO PUEDE ACTUALIZAR             │
├─────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ Coordinador Planta  │ planificado               │ estados de unidad               │
│ (Leandro)           │ cancelado (decisión)      │ estados operativos              │
│                     │ Trigger: asignado         │                                 │
├─────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ Coordinador         │ asignado (chofer+camión)  │ ingreso_planta, cargando        │
│ Transporte          │ cancelado (decisión)      │ llamado_carga                   │
│ (Logística Express) │ Trigger: doc_preparada    │ estados de destino              │
├─────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ Chofer              │ confirmado_chofer         │ asignado, ingreso_planta        │
│ (Walter)            │ en_transito_origen        │ llamado_carga, cargando         │
│                     │ arribo_origen             │ en_playa_espera                 │
│                     │ arribo_destino            │ cargado, egreso_planta          │
│                     │ viaje_completado          │ estados de carga                │
│                     │                           │ llamado_descarga, vacio         │
├─────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ Control Acceso      │ ingreso_planta            │ confirmado_chofer               │
│ (Juan)              │ en_playa_espera           │ en_transito_origen/destino      │
│                     │ documentacion_validada    │ llamado_carga, cargando         │
│                     │ ingreso_destino           │ llamado_descarga                │
│                     │ egreso_destino            │                                 │
│                     │ Trigger: egreso_planta    │                                 │
│                     │ Trigger: en_transito      │                                 │
├─────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ Supervisor Carga    │ llamado_carga             │ confirmado_chofer               │
│ (María)             │ posicionado_carga         │ en_transito_*                   │
│                     │ iniciando_carga           │ ingreso_planta                  │
│                     │ cargando                  │ arribo_destino                  │
│                     │ carga_completada          │ estados de descarga             │
│                     │ Trigger: en_proceso_carga │                                 │
│                     │ Trigger: cargado          │                                 │
├─────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ Operador Descarga   │ llamado_descarga          │ estados de origen               │
│ (Cliente)           │ iniciando_descarga        │ cargando, en_transito           │
│                     │ descargando               │ confirmado_chofer               │
│                     │ descargado                │ ingreso_planta                  │
│                     │ entregado                 │ viaje_completado                │
│                     │ Trigger: en_descarga      │                                 │
│                     │ Trigger: vacio            │                                 │
└─────────────────────┴───────────────────────────┴─────────────────────────────────┘

**Nota**: Los estados con "Trigger:" son actualizados automáticamente por el sistema cuando
otro actor realiza una acción. Ejemplo: Cuando Supervisor marca "carga_completada", el
sistema automáticamente actualiza estado_unidad a "egreso_planta".
│                     │ en_playa_espera   │ en_transito_*                   │
│                     │ saliendo_origen   │ cargando, llamado_carga         │
│                     │ doc_validada      │ viaje_completado                │
├─────────────────────┼───────────────────┼─────────────────────────────────┤
│ Supervisor Carga    │ llamado_carga     │ asignado, confirmado_chofer     │
│                     │ posicionado_carga │ en_transito_*, arribado_*       │
│                     │ carga_completada  │ saliendo_origen                 │
│                     │ en_proceso_carga  │ cancelado                       │
│                     │ cargado           │                                 │
└─────────────────────┴───────────────────┴─────────────────────────────────┘


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                     EJEMPLO: INTENTO NO AUTORIZADO                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


❌ Caso 1: Chofer intenta poner "arribado_origen"

   Request:
   POST /api/viajes/123/estado-unidad
   {
     "nuevo_estado": "arribado_origen",
     "user_id": "walter-uuid"
   }

   Response (400 Bad Request):
   {
     "exitoso": false,
     "mensaje": "Solo control de acceso puede actualizar este estado",
     "rol_requerido": "control_acceso",
     "rol_actual": "chofer"
   }

   UI: 
   🚨 No tienes permiso para esta acción
   Solo Control de Acceso puede registrar tu llegada.


❌ Caso 2: Control Acceso intenta poner "cargado"

   Request:
   POST /api/viajes/123/estado-carga
   {
     "nuevo_estado": "cargado",
     "user_id": "juan-portero-uuid"
   }

   Response (400 Bad Request):
   {
     "exitoso": false,
     "mensaje": "Solo supervisor de carga puede actualizar este estado",
     "rol_requerido": "supervisor_carga",
     "rol_actual": "control_acceso"
   }

   UI:
   🚨 No tienes permiso para esta acción
   Solo Supervisor de Carga puede marcar como cargado.


✅ Caso 3: Supervisor actualiza correctamente

   Request:
   POST /api/viajes/123/estado-carga
   {
     "nuevo_estado": "cargado",
     "peso_real": 34800,
     "user_id": "maria-supervisor-uuid"
   }

   Response (200 OK):
   {
     "exitoso": true,
     "mensaje": "Estado carga actualizado: en_proceso_carga → cargado",
     "estado_anterior": "en_proceso_carga",
     "estado_nuevo": "cargado"
   }

   UI:
   ✅ Carga finalizada exitosamente
   Peso real: 34.8 TN


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                            UI POR ROL                                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┌──────────────────────────────────────────────────────────────────────────┐
│ 📱 APP MÓVIL CHOFER - Walter                                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Viaje a Planta San Miguel                                               │
│  Estado: Viaje Confirmado ✅                                             │
│  Producto: 35 TN Soja                                                    │
│                                                                           │
│  ┌────────────────────────────────────────────────┐                     │
│  │      🚗 Salir hacia Origen                     │  ← PUEDE            │
│  └────────────────────────────────────────────────┘                     │
│                                                                           │
│  ┌────────────────────────────────────────────────┐                     │
│  │      📞 Contactar Coordinador                  │                     │
│  └────────────────────────────────────────────────┘                     │
│                                                                           │
│  ❌ NO aparecen botones como:                                            │
│     - "Marcar Arribado" (lo hace Control Acceso)                         │
│     - "Iniciar Carga" (lo hace Supervisor)                               │
│     - "Finalizar Carga" (lo hace Supervisor)                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│ 🖥️  PANEL CONTROL ACCESO - Juan                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Escanear QR:  [____________]  🔍                                        │
│                                                                           │
│  Viaje Encontrado:                                                       │
│  ABC123 - Walter Zayas                                                   │
│  Producto: 35 TN Soja                                                    │
│  Estado: En Camino a Planta 🚗                                           │
│                                                                           │
│  ┌────────────────────────────────────────────────┐                     │
│  │      ✅ Registrar Ingreso                      │  ← PUEDE            │
│  └────────────────────────────────────────────────┘                     │
│                                                                           │
│  ┌────────────────────────────────────────────────┐                     │
│  │      🅿️  Asignar a Playa de Espera           │  ← PUEDE            │
│  └────────────────────────────────────────────────┘                     │
│                                                                           │
│  ❌ NO aparecen botones como:                                            │
│     - "Llamar a Carga" (lo hace Supervisor)                              │
│     - "Iniciar Carga" (lo hace Supervisor)                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│ 🖥️  PANEL SUPERVISOR CARGA - María                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  📋 Camiones en Playa (ordenados por tiempo de espera)                   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ABC123 - Walter Zayas                     ⏱️ 45 min esperando    │  │
│  │ Producto: 35 TN Soja                                             │  │
│  │ Estado: En Playa de Espera                                       │  │
│  │ Documentación: ✅ Lista                                          │  │
│  │                                                                   │  │
│  │ [🚨 Llamar a Carga]  ← PUEDE                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ XYZ789 - Carlos Gómez                     ⏱️ 2h 30min esperando  │  │
│  │ Producto: 28 TN Trigo                                            │  │
│  │ Estado: Cargando 📦                                              │  │
│  │ Progreso: 75% (21 TN cargadas)                                   │  │
│  │                                                                   │  │
│  │ [✅ Finalizar Carga]  ← PUEDE                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ❌ NO puede hacer:                                                       │
│     - Registrar Ingreso (lo hace Control Acceso)                         │
│     - Registrar Egreso (lo hace Control Acceso)                          │
│     - Confirmar que el chofer salió (lo hace Chofer)                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                          BENEFICIOS DEL SISTEMA                             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Seguridad: Cada actor solo modifica lo que le corresponde
✅ Trazabilidad: Se registra quién hizo qué y cuándo
✅ Auditoría: Historial completo de cambios de estado
✅ Colaboración: Múltiples actores trabajan en el mismo viaje
✅ Validación: Backend valida permisos automáticamente
✅ Notificaciones: Actores son notificados cuando les toca actuar
✅ Responsabilidad: Cada actor es responsable de su parte del proceso


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                           ANALOGÍA FINAL                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🏥 SISTEMA HOSPITALARIO

Paciente ingresa al hospital (= Viaje entra al sistema)

├─ Admisión (Control Acceso)    → Registra ingreso, asigna sala de espera
├─ Enfermero (Control Acceso)   → Toma signos vitales, prepara documentación
├─ Médico (Supervisor Carga)    → Examina, diagnostica, indica tratamiento
├─ Enfermero (Supervisor Carga) → Aplica tratamiento
├─ Médico (Supervisor Carga)    → Confirma alta médica
├─ Admisión (Control Acceso)    → Valida documentación, registra egreso
└─ Administración (Coordinador)  → Cierre administrativo

Ningún rol puede hacer el trabajo del otro.
El paciente avanza porque TODOS colaboran.
Cada uno actualiza SU PARTE del expediente médico.

= ESTADOS CRUZADOS
