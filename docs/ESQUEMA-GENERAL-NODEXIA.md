# Esquema General Nodexia - Mapa Operativo Completo

> Última actualización: 10 de Febrero 2026

---

## Flujo Operativo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FASE 1: CREACIÓN Y ASIGNACIÓN                        │
│                                                                         │
│  🏭 Planta crea Despacho ──► Asignación ──┬── Directa → Transporte     │
│                                           └── Red → Transportista acepta│
│                               │                                         │
│                    👤 Coordinador asigna Chofer + Camión                 │
│                               │                                         │
│                    ✅ Chofer confirma viaje                              │
└─────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    FASE 2: TRÁNSITO A ORIGEN                            │
│                                                                         │
│  🚗 Chofer inicia viaje ──[GPS Tracking]──► 📍 Chofer arriba a origen   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    FASE 3: PLANTA ORIGEN                                │
│                                                                         │
│  🚧 CA ingreso → 🅿️ Playa → 📢 Llamado → ⬆️ Cargando → 📦 Cargado    │
│                                                   │                     │
│                              📸 Supervisor sube foto remito             │
│                              ✅ CA valida remito                        │
│                              🚪 CA registra egreso origen               │
└─────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    FASE 4: TRÁNSITO A DESTINO                           │
│                                                                         │
│  🚚 Chofer inicia viaje ──[GPS Tracking]──► 📍 Chofer arriba a destino  │
└─────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    FASE 5: PLANTA DESTINO                               │
│                                                                         │
│  ¿Destino usa Nodexia?                                                  │
│     SÍ → 🚧 CA ingreso → 📢 Llamado → ⬇️ Descargando → ✅ Descargado  │
│          → 🚪 CA egreso destino                                         │
│     NO → 🏁 Chofer finaliza directo                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    FASE 6: FINALIZACIÓN                                 │
│                                                                         │
│  🚛 Vacío → 📊 Viaje completado → 📈 Métricas y reportes               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cadena de Estados del Viaje

```
camion_asignado → confirmado_chofer → en_transito_origen → arribo_origen
→ ingresado_origen → en_playa_origen → llamado_carga → cargando → cargado
→ egreso_origen → en_transito_destino → arribado_destino
→ [CON NODEXIA] ingresado_destino → llamado_descarga → descargando → descargado → egreso_destino
→ [SIN NODEXIA] (directo)
→ vacio → viaje_completado
```

---

## Roles y Vistas del Sistema

### 🏭 PLANTA (Empresa productora/origen/destino)
| Vista | Función | Estado |
|---|---|---|
| Crear Despachos | Crear y gestionar despachos, ver estado | ✅ Funciona |
| Supervisor Carga | Llamar a carga, monitorear, subir remito | ✅ Funciona |
| Control Acceso | Escanear QR, ingreso/egreso, validar remito | ✅ Funciona |
| Estadísticas | Métricas operativas | ⚠️ Básico |

### 🚛 TRANSPORTE (Empresa transportista)
| Vista | Función | Estado |
|---|---|---|
| Dashboard Transporte | Resumen operativo | ✅ Funciona |
| Viajes Activos | Mapa tiempo real, estados, tracking | ✅ Funciona |
| Despachos Ofrecidos | Cargas publicadas en red | ⚠️ Parcial |
| Flota | Gestión camiones y choferes | ✅ Funciona |
| Tracking GPS | Visualización GPS de flota | ⚠️ Parcial |
| Configuración | Ajustes de empresa | ✅ Funciona |

### 👤 CHOFER (Web App Móvil)
| Vista | Función | Estado |
|---|---|---|
| Mis Viajes | Lista de viajes asignados, acciones | ✅ Funciona |
| GPS Tracking | Envío automático de posición | ⚠️ Parcial |
| Acciones de estado | Confirmar, iniciar, arribar, finalizar | ✅ Funciona |
| Incidencias | Reportar problemas en ruta | ❌ Sin implementar |

### 👑 SUPER ADMIN
| Vista | Función | Estado |
|---|---|---|
| Gestión Empresas | CRUD empresas, configuración | ✅ Funciona |
| Gestión Usuarios | CRUD usuarios, roles, permisos | ✅ Funciona |
| Config Global | Parámetros del sistema | ⚠️ Básico |

---

## Estado por Fase - Detalle de Implementación

### FASE 1: Creación y Asignación
| Funcionalidad | Estado | Notas |
|---|---|---|
| Planta crea despacho | ✅ Funciona | Formulario completo |
| Asignación directa a transporte | ✅ Funciona | Selección de transportista |
| Publicación en Red | ⚠️ Parcial | UI existe, flujo de aceptación básico |
| Coordinador asigna chofer+camión | ✅ Funciona | Desde viajes activos |
| Chofer confirma viaje | ✅ Funciona | Desde web app móvil |
| Despachos multi-viaje | ⚠️ Parcial | Funciona pero UI no refleja bien el progreso |
| Expiración de despachos | ✅ Funciona | Lógica de vencimiento implementada |

### FASE 2: Tránsito a Origen
| Funcionalidad | Estado | Notas |
|---|---|---|
| Chofer inicia viaje | ✅ Funciona | Botón en web app |
| GPS Tracking en ruta | ⚠️ Parcial | Hook existe, envío cada 30s, visualización inconsistente |
| Chofer reporta arribo | ✅ Funciona | Botón en web app |
| Estimación de llegada (ETA) | ❌ Sin implementar | |

### FASE 3: Planta Origen
| Funcionalidad | Estado | Notas |
|---|---|---|
| CA escanea QR + ingreso | ✅ Funciona | Scanner + registro |
| Playa de espera | ✅ Funciona | Estado registrado |
| Supervisor llama a carga | ✅ Funciona | Desde supervisor-carga |
| Carga en progreso | ✅ Funciona | Estado tracked |
| Finalizar carga + foto remito | ✅ Funciona | Upload via API route (bypass RLS) |
| CA valida remito + egreso | ✅ Funciona | Preview + validación + egreso |
| Pesaje de carga | ❌ Sin implementar | |
| Múltiples documentos (carta porte, seguro) | ❌ Sin implementar | Solo remito |

### FASE 4: Tránsito a Destino
| Funcionalidad | Estado | Notas |
|---|---|---|
| Chofer inicia viaje a destino | ✅ Funciona | Botón en web app |
| GPS Tracking | ⚠️ Parcial | Mismo estado que Fase 2 |
| Chofer reporta arribo destino | ✅ Funciona | |

### FASE 5a: Planta Destino (CON Nodexia)
| Funcionalidad | Estado | Notas |
|---|---|---|
| CA ingreso destino | ❌ Sin implementar | CA actualmente solo maneja origen |
| Supervisor descarga | ❌ Sin implementar | supervisor-carga solo maneja carga |
| Validación remito en destino | ❌ Sin implementar | |
| CA egreso destino | ❌ Sin implementar | |

### FASE 5b: Destino SIN Nodexia
| Funcionalidad | Estado | Notas |
|---|---|---|
| Chofer finaliza directo | ✅ Funciona | arribado_destino → vacio |

### FASE 6: Finalización
| Funcionalidad | Estado | Notas |
|---|---|---|
| Estado vacío registrado | ✅ Funciona | |
| Transición a viaje_completado | ❌ Falta | No se cierra automáticamente |
| Cierre de despacho al completar viajes | ❌ Falta | |
| Métricas/reportes | ❌ Sin implementar | Timestamps parciales, sin KPIs |

---

## Temas Transversales Pendientes

| Tema | Prioridad | Descripción |
|---|---|---|
| **RLS/Seguridad BD** | Alta (post-MVP) | API routes con service_role bypasean RLS. Doc: PENDIENTE-CRITICO-SEGURIDAD-API.md |
| **Notificaciones** | Media | Sin alertas push/email en cambios de estado |
| **Historial de viajes** | Media | Sin vista de viajes completados/históricos |
| **Multi-viaje por despacho** | Media | Funciona parcial, UI necesita mejora |
| **Incidencias/Reclamos** | Baja (demo) | Tab existe en chofer sin funcionalidad |
| **Documentación en viaje** | Media | Solo remito, faltan carta porte, seguro, etc. |
| **Tiempos y demoras** | Media | Timestamps parciales, sin cálculo de KPIs |
| **Offline support** | Baja | Chofer sin conexión no puede operar |
| **Auditoría/Logs** | Media (post-MVP) | Sin log de quién hizo qué y cuándo |

---

## Tablas Clave de la BD

| Tabla | Propósito |
|---|---|
| `despachos` | Pedidos de despacho creados por plantas |
| `viajes_despacho` | Viajes individuales de cada despacho |
| `choferes` | Registro de choferes con user_id vinculado |
| `camiones` | Flota de camiones por empresa |
| `empresas` | Empresas (plantas y transportistas) |
| `usuarios` | Usuarios del sistema |
| `usuarios_empresa` | Relación usuario-empresa-rol |
| `documentos_viaje_seguro` | Documentos (remitos, fotos) adjuntos a viajes |
| `ubicaciones_gps` | Registro de posiciones GPS |
| `estado_unidad_viaje` | Timestamps de cada transición de estado |

---

## API Routes Server-Side (bypass RLS)

| Ruta | Propósito |
|---|---|
| `/api/upload-remito` | Upload de foto remito (supervisor) |
| `/api/consultar-remito` | Consulta de remito por viaje_id (CA) |
| `/api/chofer/viajes` | Lista de viajes del chofer |
| `/api/viajes/[id]/estado-unidad` | Actualizar estado del viaje |

---

## Stack Tecnológico

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind v4
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Maps**: Leaflet + OpenStreetMap
- **Hosting**: Vercel (deploy)
- **BD Dev**: Supabase proyecto separado
- **BD Prod**: Supabase proyecto de producción
