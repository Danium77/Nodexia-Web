# RESUMEN TÉCNICO DE NODEXIA

**Documento comercial-técnico para potenciales clientes, inversores y partners**  
**Fecha:** 29 de Marzo 2026  
**Versión:** 2.0  
**Web:** www.nodexiaweb.com

---

## 1. ¿QUÉ ES NODEXIA?

**Nodexia** es una **plataforma digital de gestión logística integral** diseñada para coordinar el flujo completo de mercadería entre **Plantas** (fábricas, distribuidoras), **Empresas de Transporte** y **Clientes** (receptores finales).

La plataforma digitaliza y automatiza todo el ciclo operativo: desde la creación de un despacho de mercadería hasta la entrega final, incluyendo control de acceso en plantas, seguimiento GPS en tiempo real, gestión documental, turnos de recepción y un marketplace de transporte.

### Propuesta de valor

| Para... | Nodexia ofrece... |
|---------|-------------------|
| **Plantas / Fábricas** | Gestión centralizada de despachos, control de ingreso/egreso de camiones por QR, supervisión de carga, documentación digital (remitos, carta porte), trazabilidad completa, gestión de turnos de recepción |
| **Empresas de Transporte** | Gestión de flota (camiones, acoplados, choferes), asignación de viajes, tracking GPS en tiempo real, acceso a cargas disponibles en la Red Nodexia, creación de despachos propios |
| **Clientes / Receptores** | Visibilidad en tiempo real del estado de sus cargas, confirmación de entregas |
| **El ecosistema logístico** | Un marketplace ("Red Nodexia") donde plantas publican cargas que no cubren con su red de transportes, y cualquier transportista registrado puede tomarlas |

---

## 2. FUNCIONALIDADES PRINCIPALES

### 2.1 Gestión de Despachos
- Creación de despachos con origen, destino, producto, cantidad y fecha programada
- Asignación directa a un transporte de la red privada, o publicación en la Red Nodexia
- **Despachos desde Transporte**: Coordinadores de transporte pueden crear sus propios despachos (feature flag activado en producción)
- Despachos multi-viaje (un despacho puede requerir N viajes)
- Expiración automática de despachos no asignados

### 2.2 Máquina de Estados del Viaje (19 estados)
Cada viaje pasa por un ciclo completo de 19 estados que refleja la operación real:

```
F0 Creación:         pendiente
F1 Asignación:       transporte_asignado → camion_asignado → confirmado_chofer
F2 Tránsito Origen:  en_transito_origen
F3 Planta Origen:    ingresado_origen → llamado_carga → cargando → cargado
F4 Egreso:           egreso_origen
F5 Tránsito Destino: en_transito_destino
F6 Planta Destino:   ingresado_destino → llamado_descarga → descargando → descargado → egreso_destino
                     (Sin Nodexia: ingresado_destino → descargado)
F7 Cierre:           completado
X  Cancelado:        cancelado
```

Cada transición de estado es registrada con timestamp, usuario responsable, auditoría completa y la posibilidad de adjuntar documentación. La máquina de estados se define en un único archivo fuente de verdad (`lib/estados/config.ts`) compartido entre frontend y backend.

### 2.3 Control de Acceso en Planta
- Escaneo de **código QR** único por viaje
- Registro automático de ingreso/egreso con patente, chofer y horario
- Validación de documentación (licencia de conducir, seguro, VTV, habilitación)
- Registro de incidencias (documentación vencida, problemas operativos)
- Geofencing automático: detección de arribo a planta a 500m de distancia

### 2.4 Seguimiento GPS en Tiempo Real
- La app móvil del chofer envía posiciones GPS con coordenadas reales
- Visualización de flota completa en mapa interactivo (Google Maps + Leaflet)
- Historial de posiciones por viaje con timestamps
- Validación de coordenadas server-side (rango Argentina)
- Rate limiting: 4 requests / 10 segundos por chofer
- Detección automática de arribo a origen/destino vía Haversine (radio 500m)

### 2.5 Gestión de Flota
- Registro de camiones, acoplados y choferes con toda su documentación
- Control de vencimientos de documentación por recurso
- Unidades operativas: combinación camión + acoplado + chofer
- Asignación inteligente de unidades a viajes

### 2.6 Gestión Documental
- Upload y validación de documentos por entidad (camión, chofer, acoplado)
- Tipos de documento: licencia de conducir, VTV, seguro, habilitación CNRT, carta porte, remito
- Control de vencimientos con alertas
- Almacenamiento seguro en Supabase Storage (bucket `remitos`, max 10MB)
- Auditoría de cambios en documentos

### 2.7 Red Nodexia (Marketplace de Transporte)
- Las plantas publican cargas disponibles con tarifa, urgencia y fecha límite
- Todos los transportes registrados pueden ver y ofertar
- Sistema de aceptación/rechazo de ofertas
- Niveles de urgencia: baja, media, alta, urgente

### 2.8 Gestión de Incidencias
- Registro de problemas en cualquier punto del viaje
- Clasificación por tipo: demora, problema mecánico, problema con carga, ruta bloqueada, otro
- Problema mecánico pausa automáticamente el viaje
- Flujo de resolución con estados

### 2.9 Turnos de Recepción (NUEVO — Marzo 2026)
- Plantas definen ventanas de recepción por día de la semana
- Reserva de turnos integrada en el flujo de despacho
- Validación automática de disponibilidad al crear despacho
- Configuración flexible: tolerancia de ingreso, capacidad por ventana

### 2.10 Reportes y KPIs (NUEVO — Marzo 2026)
- Dashboard operativo por empresa con 7 tarjetas KPI
- Métricas: tiempos promedio de espera, carga, tránsito; viajes por día; cumplimiento de horarios
- Exportación en múltiples formatos: CSV, PDF, XLSX
- Vistas SQL materializadas para rendimiento óptimo

### 2.11 Sistema de Feature Flags (NUEVO — Marzo 2026)
- Control granular de funcionalidades a 3 niveles: Global → Empresa → Rol
- 14 funcionalidades configuradas
- Activación progresiva de features por empresa
- Componente `<FeatureGate>` para control en UI

### 2.12 App Nativa para Choferes (EN DESARROLLO — Marzo 2026)
- Aplicación Android nativa con Expo SDK 55 + React Native 0.83
- Reemplaza la PWA existente
- GPS tracking nativo en foreground
- QR para control de acceso
- Distribución por APK (WhatsApp/email) a choferes piloto

---

## 3. ARQUITECTURA TÉCNICA

### 3.1 Stack Tecnológico

| Capa | Tecnología | Versión | Descripción |
|------|-----------|---------|-------------|
| **Frontend** | Next.js + React | 16.1.2 + 19.2.0 | Framework web con SSR/CSR |
| **Lenguaje** | TypeScript (strict) | 5.x | Tipado estático |
| **Estilos** | Tailwind CSS | v4 | Diseño utility-first responsive |
| **Base de Datos** | PostgreSQL (Supabase) | — | BD relacional con RLS |
| **Autenticación** | Supabase Auth (JWT) | 2.75.1 | Tokens seguros |
| **Almacenamiento** | Supabase Storage | — | Archivos (remitos, documentos) |
| **Tiempo Real** | Supabase Realtime | — | WebSocket para actualizaciones |
| **Seguridad BD** | Row Level Security (RLS) | — | Políticas por fila |
| **Mapas** | Google Maps + Leaflet | — | Visualización geográfica |
| **Validación** | Zod + react-hook-form | — | Validación en frontend y API |
| **Gráficos** | Recharts | 3.8.0 | Dashboards y KPIs |
| **Monitoreo** | Sentry | 10.45.0 | Error tracking y performance |
| **Hosting** | Vercel (región gru1) | — | Deploy automático |
| **Testing** | Jest + Playwright | 30.2.0 + 1.57.0 | Unit + E2E |
| **Tareas Programadas** | pg_cron + Edge Functions | — | Expiración, limpieza |
| **Mobile** | Expo + React Native | SDK 55 + 0.83 | App nativa Android |

### 3.2 Métricas del Codebase (Marzo 2026)

| Métrica | Cantidad |
|---------|----------|
| **Páginas** | 77 |
| **API Routes** | 70 |
| **Componentes** | 94 |
| **Custom Hooks** | 23 |
| **Services** | 6 |
| **SQL Migrations** | 87 |
| **Tablas en BD** | 36+ |
| **Feature Flags** | 14 |
| **Estados de viaje** | 19 |
| **Archivos TS/TSX totales** | ~286 |

### 3.3 Base de Datos — PostgreSQL

Nodexia utiliza **PostgreSQL** como motor de base de datos, desplegado a través de **Supabase**. PostgreSQL es el sistema de base de datos relacional de código abierto más avanzado del mundo, utilizado por empresas como Apple, Instagram, Spotify y Netflix.

**¿Qué significa esto para integraciones?**

- **Compatibilidad:** Cualquier sistema que trabaje con PostgreSQL puede integrarse con Nodexia
- **Extensibilidad:** Funciones personalizadas, triggers, foreign data wrappers
- **Escalabilidad:** Miles a millones de registros sin degradación
- **Seguridad:** Row Level Security garantiza aislamiento por empresa

**Tablas principales del sistema:**

| Tabla | Propósito |
|-------|----------|
| `empresas` | Registro de empresas (planta, transporte, cliente, admin) |
| `usuarios_empresa` | Relación usuario ↔ empresa ↔ rol (multi-rol) |
| `despachos` | Pedidos de despacho de mercadería |
| `viajes_despacho` | Viajes con máquina de 19 estados |
| `camiones` | Flota de camiones por empresa |
| `acoplados` | Flota de acoplados/semirremolques |
| `choferes` | Conductores con documentación y vinculación a usuario |
| `unidades_operativas` | Combinación camión + acoplado + chofer |
| `paradas` | Multi-destino (máx 4 paradas por viaje) |
| `documentos_entidad` | Documentación unificada de recursos |
| `documentos_viaje_seguro` | Remitos, fotos, cartas de porte |
| `tracking_gps` | Posiciones GPS en tiempo real |
| `ubicaciones_choferes` | GPS vinculado a viaje activo |
| `registros_acceso` | Log de ingreso/egreso en plantas |
| `incidencias_viaje` | Incidentes reportados |
| `ofertas_red_nodexia` | Marketplace de transporte |
| `auditoria_estados` | Log de transiciones con usuario y timestamp |
| `audit_log` | Auditoría general de acciones administrativas |
| `ventanas_recepcion` | Ventanas horarias de recepción en plantas |
| `turnos_reservados` | Reservas de turnos por despacho |
| `funciones_sistema` | Feature flags globales |
| `funciones_empresa` | Feature flags por empresa |
| `funciones_rol` | Feature flags por rol |
| `notificaciones` | Push/in-app notifications |

### 3.4 Seguridad

**Row Level Security (RLS):** Cada tabla tiene políticas de seguridad que determinan qué datos puede ver/modificar cada usuario. NO es seguridad a nivel de aplicación (que puede fallar), sino **a nivel de base de datos** (imposible de saltear).

**Capas de seguridad implementadas:**

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Autenticación JWT | Supabase Auth | ✅ |
| Middleware `withAuth()` | Next.js API middleware | ✅ 87%+ endpoints |
| Rate Limiting | In-memory sliding window | ✅ APIs críticas |
| RLS por empresa | PostgreSQL policies | ✅ 36 tablas |
| IDOR Protection | Ownership verification | ✅ 6/7 vulnerabilidades parchadas |
| CSP Headers | next.config.ts | ✅ Strict policy |
| HSTS + X-Frame-Options | Vercel headers | ✅ |
| Audit Logging | audit_log table | ✅ 13+ API routes |
| Error Monitoring | Sentry v10.45 | ✅ (DSN pending) |
| Validación de coordenadas | Server-side (rango Argentina) | ✅ |
| Upload validation | Max 10MB, MIME types | ✅ |

**Jerarquía de permisos (7 roles):**

```
Admin Nodexia (superadmin)
 └─ Acceso total a todo el sistema, gestión de feature flags
 
Coordinador (planta o transporte)
 └─ CRUD despachos, gestión de recursos, Red Nodexia, crear despachos desde transporte
 
Control de Acceso
 └─ Escaneo QR, ingreso/egreso, validación documental
 
Supervisor
 └─ Carga/descarga, gestión operativa en planta
 
Chofer
 └─ Ver viajes, transiciones de estado, GPS, QR, incidencias
 
Administrativo
 └─ Documentación, reportes
 
Visor (cliente)
 └─ Solo lectura de entregas
```

### 3.5 Arquitectura de APIs

70 API Routes organizadas por dominio:

| Dominio | Cantidad | Endpoints principales |
|---------|----------|----------------------|
| **Viajes** | 8 | actualizar-estado, GPS tracking, remito upload |
| **Despachos** | 10 | CRUD, asignar transporte, timeline |
| **Control de Acceso** | 5 | check, validar-ingreso, QR scan |
| **Turnos** | 5 | ventanas, reservas, validar-ingreso |
| **Admin** | 16 | usuarios, empresas, funciones, relaciones |
| **Transporte** | 6 | asignar-unidad, flota, documentación |
| **Documentación** | 8 | upload, listar, eliminar, auditoría |
| **Red Nodexia** | 6 | ofertas, aceptar, rechazar |
| **GPS/Tracking** | 3 | registrar-ubicacion, actualizar-ubicacion |
| **Reportes** | 3 | KPIs, auditoría, exportación |

Todas las APIs validan autenticación, autorización por rol, rate limiting, y aplican validación de datos.

### 3.6 Arquitectura del Frontend

```
pages/           → 77 páginas (routing Next.js)
  └── api/       → 70 API routes (backend serverless)
components/      → 94 componentes organizados por dominio
  ├── Admin/          Gestión de usuarios, empresas, funciones
  ├── ControlAcceso/  QR scanner, validación documental
  ├── Dashboard/      KPI cards, gráficos
  ├── Despachos/      Modales, badges de estado
  ├── Documentacion/  Upload, listado de documentos
  ├── Maps/           Mapas interactivos
  ├── Network/        Red Nodexia
  ├── Planning/       Planificación visual
  ├── Transporte/     Flota, viajes, choferes
  ├── Turnos/         Gestión de ventanas y reservas
  └── ui/             Componentes base (Button, FeatureGate, etc.)
lib/
  ├── hooks/     → 23 custom hooks (useCrearDespacho, useChoferMobile, etc.)
  ├── services/  → 6 servicios (viajeEstado, notificaciones, auditLog, etc.)
  ├── estados/   → Máquina de estados (fuente de verdad)
  ├── middleware/ → withAuth, rateLimit
  ├── contexts/  → UserRoleContext, FeatureFlagProvider
  └── validators/→ Validación de datos con Zod
```

---

## 4. SISTEMA DE ROLES

Nodexia implementa un sistema **multi-rol** donde un mismo usuario puede tener múltiples roles dentro de una misma empresa. Coordinador PyME hereda 4 roles (coordinador + control_acceso + supervisor + administrativo).

| Rol | Tipo de Empresa | Dispositivo | Función |
|-----|----------------|-------------|---------|
| Coordinador | Planta / Transporte | Desktop | Crea despachos, asigna transportes, planifica, gestiona flota |
| Control de Acceso | Planta | Mobile/Tablet | Escanea QR, registra ingreso/egreso, valida documentación |
| Supervisor | Planta | Mobile/Tablet | Gestiona carga/descarga, upload de remitos |
| Chofer | Transporte | Mobile (app nativa) | Confirma viajes, envía GPS, transiciona estados, QR |
| Administrativo | Planta/Transporte | Desktop | Gestión documental, reportes |
| Visor | Cliente | Desktop | Visualización de entregas (solo lectura) |
| Admin Nodexia | Plataforma | Desktop | Gestión total del sistema, feature flags |

---

## 5. MODELO MULTI-TENANT

Nodexia es una plataforma **multi-tenant**: múltiples empresas operan en la misma infraestructura, pero cada una solo ve y gestiona sus propios datos.

- Cuatro tipos de empresa: **Planta**, **Transporte**, **Cliente**, **Admin**
- Cada empresa tiene su propia configuración, usuarios, flota y operaciones
- Las relaciones entre empresas se gestionan explícitamente (red privada de transportes, clientes frecuentes)
- La seguridad multi-tenant está garantizada por **RLS a nivel de base de datos**
- Sistema de feature flags permite activar/desactivar funcionalidades por empresa

---

## 6. CAPACIDADES DE INTEGRACIÓN

### 6.1 ¿Con qué se puede integrar Nodexia?

| Tipo de Integración | Método | Complejidad |
|---------------------|--------|-------------|
| **Sistemas PostgreSQL** | REST API / Foreign Data Wrapper / Sync DB | Media |
| **ERPs (SAP, Oracle, etc.)** | REST API + Webhooks | Media-Alta |
| **Sistemas de facturación** | REST API (eventos de despacho completado) | Baja |
| **Sistemas de pesaje** | API endpoint dedicado | Baja |
| **Plataformas de tracking** | API GPS (estándar lat/lng) | Baja |
| **Sistemas de documentación** | API Docs + Storage | Media |
| **Apps móviles nativas** | REST API completa documentada | Media |

### 6.2 Integración con sistemas PostgreSQL

Tres vías de integración:

1. **Integración vía API REST (recomendada)**  
   - Nodexia expone 70 endpoints RESTful para todas las operaciones
   - Autenticación JWT + rate limiting incluido
   - Ejemplo: el ERP del cliente consulta el estado de sus despachos vía `GET /api/despachos`

2. **Webhooks / Eventos**  
   - Notificación automática cuando ocurren eventos (viaje completado, incidencia, cambio de estado)
   - El cliente recibe un POST en su endpoint con el detalle del evento

3. **Sincronización de datos**  
   - Foreign data wrappers, logical replication, Debezium
   - Réplica bidireccional sin duplicar lógica

### 6.3 API Contract (para integradores)

```
Autenticación: Bearer JWT Token
Content-Type: application/json
Base URL: https://www.nodexiaweb.com/api

Endpoints principales:
GET    /api/chofer/viajes                → Viajes asignados al chofer
POST   /api/viajes/actualizar-estado     → Transicionar estado de viaje
POST   /api/tracking/actualizar-ubicacion → Enviar posición GPS
POST   /api/upload-remito               → Subir remito (multipart/form-data)
GET    /api/despachos                    → Lista despachos por empresa
POST   /api/control-acceso/validar-ingreso → Registrar ingreso en planta
GET    /api/documentacion/listar         → Documentación por entidad
POST   /api/reportes/kpis               → KPIs y métricas
POST   /api/turnos/reservar             → Reservar turno de recepción
```

---

## 7. FLUJO OPERATIVO COMPLETO

```
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 0: CREACIÓN                                                    │
│  Planta o Transporte crea Despacho → Estado: pendiente               │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 1: ASIGNACIÓN                                                  │
│  Asigna Transporte → Asigna Camión+Chofer → Chofer confirma          │
│  (con turno de recepción si la planta lo requiere)                   │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 2: TRÁNSITO A ORIGEN                                          │
│  Chofer inicia viaje — GPS Tracking nativo — Auto-detección arribo  │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 3: PLANTA ORIGEN                                               │
│  Control Acceso: escanea QR → Ingreso registrado                     │
│  Supervisor: llamado a carga → cargando → cargado                   │
│  Control Acceso: registra egreso                                     │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 4-5: TRÁNSITO A DESTINO                                       │
│  Chofer viaja a destino — GPS Tracking — Auto-detección arribo      │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 6: PLANTA DESTINO                                              │
│  Con Nodexia: ingreso QR → descarga → egreso                        │
│  Sin Nodexia: Chofer sube remito → completar entrega                │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 7: CIERRE                                                      │
│  Viaje completado → Auditoría → KPIs → Reportes                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. INFRAESTRUCTURA Y DEPLOY

| Componente | Servicio | Detalles |
|------------|---------|----------|
| Aplicación Web | Vercel (región gru1) | Auto-scaling, edge network |
| Base de Datos | Supabase (PostgreSQL) | 87 migraciones, 36+ tablas |
| Almacenamiento | Supabase Storage | Bucket remitos, max 10MB |
| Autenticación | Supabase Auth | JWT, invitaciones, signup |
| Monitoreo | Sentry v10.45 | Error tracking, performance 10% |
| DNS / SSL | Vercel | Automático, HSTS habilitado |
| CI/CD | Vercel + GitHub | Deploy automático en push |
| Mobile Build | EAS Build (Expo) | APK para distribución directa |

**Ambientes:**
- **Producción:** www.nodexiaweb.com
- **Desarrollo:** Base de datos Supabase separada para testing

---

## 9. DIFERENCIADORES

| Aspecto | Nodexia | Soluciones Tradicionales |
|---------|---------|--------------------------|
| **Multi-tenant nativo** | Una plataforma para plantas, transportes y clientes | Sistemas separados por tipo de empresa |
| **Seguridad RLS** | Seguridad a nivel de base de datos | Seguridad solo a nivel de aplicación |
| **Feature Flags** | Activación granular por empresa/rol | Todo o nada |
| **Red Nodexia (Marketplace)** | Marketplace integrado de cargas y transportes | Búsqueda manual o portales separados |
| **Control de acceso QR** | Escaneo QR + validación documental automática | Registro manual en papel/planilla |
| **GPS nativo** | App móvil nativa con tracking real | Dependencia de hardware GPS externo |
| **Geofencing automatizado** | Detección de arribo automática (Haversine 500m) | Registro manual |
| **Turnos de recepción** | Reserva integrada en creación de despacho | Coordinación manual por teléfono |
| **Tiempo real** | WebSocket para actualizaciones instantáneas | Polling manual o refreshes |
| **Open-source stack** | PostgreSQL, Next.js, React — sin vendor lock-in | Bases de datos propietarias |
| **Monitoreo** | Sentry + audit logging integrado | Sin visibilidad de errores |

---

## 10. ROADMAP

### Implementado (Marzo 2026)
- ✅ Flujo completo de despacho: creación → asignación → tracking → entrega
- ✅ Sistema multi-tenant con 4 tipos de empresa
- ✅ Control de acceso con QR y validación documental
- ✅ Gestión de flota (camiones, acoplados, choferes, unidades operativas)
- ✅ GPS tracking en tiempo real con geofencing
- ✅ Red Nodexia — marketplace de transporte
- ✅ Gestión documental con control de vencimientos y auditoría
- ✅ Sistema de incidencias con pausa automática
- ✅ Dashboard operativo con KPIs y exportación CSV/PDF/XLSX
- ✅ Web app móvil para choferes (PWA)
- ✅ Sistema de feature flags (3 niveles: global/empresa/rol)
- ✅ Turnos de recepción en plantas
- ✅ Despachos desde transporte
- ✅ Rate limiting en APIs críticas
- ✅ Monitoreo Sentry con error boundaries
- ✅ Audit logging en acciones administrativas
- ✅ Coordinador PyME (hereda 4 roles)

### En desarrollo
- 🔄 App nativa Android para choferes (Expo + React Native)
- 🔄 Push notifications (FCM)
- 🔄 Integraciones externas (OpenAPI, API keys, webhooks)

### Planificado
- 📋 API pública documentada (OpenAPI/Swagger) para integradores
- 📋 Módulo de facturación
- 📋 Soporte offline completo para choferes
- 📋 Integración con cartas de porte electrónicas (AFIP)
- 📋 Módulo de costos y rentabilidad por viaje
- 📋 Reportes avanzados y analytics

---

## 11. CONTACTO TÉCNICO

Para consultas sobre integración, API o colaboración técnica, contactar al equipo de Nodexia.

**Web:** www.nodexiaweb.com

---

*Documento generado el 29 de Marzo 2026. Versión 2.0.*  
*Versión anterior: 1.0 (24 de Febrero 2026)*
