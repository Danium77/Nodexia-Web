# RESUMEN TÉCNICO DE NODEXIA

**Documento comercial-técnico para potenciales clientes, inversores y partners**  
**Fecha:** 24 de Febrero 2026  
**Versión:** 1.0  
**Web:** www.nodexiaweb.com

---

## 1. ¿QUÉ ES NODEXIA?

**Nodexia** es una **plataforma digital de gestión logística integral** diseñada para coordinar el flujo completo de mercadería entre **Plantas** (fábricas, distribuidoras), **Empresas de Transporte** y **Clientes** (receptores finales).

La plataforma digitaliza y automatiza todo el ciclo operativo: desde la creación de un despacho de mercadería hasta la entrega final, incluyendo control de acceso en plantas, seguimiento GPS en tiempo real, gestión documental y un marketplace de transporte.

### Propuesta de valor

| Para... | Nodexia ofrece... |
|---------|-------------------|
| **Plantas / Fábricas** | Gestión centralizada de despachos, control de ingreso/egreso de camiones por QR, supervisión de carga, documentación digital (remitos, carta porte), trazabilidad completa |
| **Empresas de Transporte** | Gestión de flota (camiones, acoplados, choferes), asignación de viajes, tracking GPS en tiempo real, acceso a cargas disponibles en la Red Nodexia |
| **Clientes / Receptores** | Visibilidad en tiempo real del estado de sus cargas, confirmación de entregas |
| **El ecosistema logístico** | Un marketplace ("Red Nodexia") donde plantas publican cargas que no cubren con su red de transportes, y cualquier transportista registrado puede tomarlas |

---

## 2. FUNCIONALIDADES PRINCIPALES

### 2.1 Gestión de Despachos
- Creación de despachos con origen, destino, producto, cantidad y fecha programada
- Asignación directa a un transporte de la red privada, o publicación en la Red Nodexia
- Despachos multi-viaje (un despacho puede requerir N viajes)
- Expiración automática de despachos no asignados

### 2.2 Máquina de Estados del Viaje (25+ estados)
Cada viaje pasa por un ciclo completo de estados que refleja la operación real:

```
Creación → Asignación de Transporte → Asignación de Camión/Chofer → Confirmación del Chofer
→ En Tránsito a Origen → Arribo a Origen → Ingreso a Planta (QR) → Playa de Espera
→ Llamado a Carga → Cargando → Cargado → Egreso de Origen
→ En Tránsito a Destino → Arribo a Destino → Ingreso/Descarga/Egreso en Destino
→ Vacío → Viaje Completado
```

Cada transición de estado es registrada con timestamp, usuario responsable y la posibilidad de adjuntar documentación.

### 2.3 Control de Acceso en Planta
- Escaneo de **código QR** único por viaje
- Registro automático de ingreso/egreso con patente, chofer y horario
- Validación de documentación (licencia de conducir, seguro, VTV, habilitación)
- Registro de incidencias (documentación vencida, problemas operativos)

### 2.4 Seguimiento GPS en Tiempo Real
- La web app móvil del chofer envía posiciones GPS cada 30 segundos
- Visualización de flota completa en mapa interactivo
- Historial de posiciones por viaje

### 2.5 Gestión de Flota
- Registro de camiones, acoplados y choferes con toda su documentación
- Control de vencimientos de documentación por recurso
- Asignación inteligente de unidades a viajes

### 2.6 Gestión Documental
- Upload y validación de documentos por entidad (camión, chofer, acoplado)
- Tipos de documento: licencia de conducir, VTV, seguro, habilitación CNRT, carta porte, remito
- Control de vencimientos con alertas
- Almacenamiento seguro en la nube

### 2.7 Red Nodexia (Marketplace de Transporte)
- Las plantas publican cargas disponibles con tarifa, urgencia y fecha límite
- Todos los transportes registrados pueden ver y ofertar
- Sistema de aceptación/rechazo de ofertas
- Comisión por intermediación para Nodexia
- Niveles de urgencia: baja, media, alta, urgente

### 2.8 Gestión de Incidencias
- Registro de problemas en cualquier punto del viaje
- Clasificación por tipo y severidad
- Asociación a documentos y recursos afectados
- Flujo de resolución con estados

### 2.9 Reportes y Estadísticas
- Dashboard operativo por empresa
- Métricas de tiempos (espera, carga, tránsito)
- KPIs de productividad por chofer, camión, ruta

---

## 3. ARQUITECTURA TÉCNICA

### 3.1 Stack Tecnológico

| Capa | Tecnología | Descripción |
|------|-----------|-------------|
| **Frontend** | Next.js 16 + React 19 | Framework web moderno con renderizado server-side |
| **Lenguaje** | TypeScript 5 (strict) | Tipado estático para robustez y mantenibilidad |
| **Estilos** | Tailwind CSS v4 | Framework utility-first, diseño responsive |
| **Base de Datos** | PostgreSQL (Supabase) | Base de datos relacional robusta, open-source |
| **Autenticación** | Supabase Auth (JWT) | Sistema de autenticación seguro basado en tokens |
| **Almacenamiento** | Supabase Storage | Almacenamiento de archivos (remitos, documentos) |
| **Tiempo Real** | Supabase Realtime | Suscripciones en tiempo real para actualizaciones |
| **Seguridad BD** | Row Level Security (RLS) | Políticas de seguridad a nivel de fila en PostgreSQL |
| **Mapas** | Leaflet + OpenStreetMap | Visualización geográfica y tracking GPS |
| **Validación** | Zod + react-hook-form | Validación de datos en frontend y API |
| **Gráficos** | Recharts | Visualización de datos para dashboards |
| **Hosting** | Vercel | Deploy automático con CI/CD |
| **Tareas Programadas** | pg_cron + Edge Functions | Expiración de ofertas, limpieza automática |

### 3.2 Base de Datos — PostgreSQL

Nodexia utiliza **PostgreSQL** como motor de base de datos, desplegado a través de **Supabase**. PostgreSQL es el sistema de base de datos relacional de código abierto más avanzado del mundo, utilizado por empresas como Apple, Instagram, Spotify y Netflix.

**¿Qué significa esto para integraciones?**

- **Compatibilidad:** Cualquier sistema que trabaje con PostgreSQL puede integrarse con Nodexia mediante protocolos estándar (SQL, REST API, webhooks)
- **Extensibilidad:** PostgreSQL soporta funciones personalizadas, triggers, y foreign data wrappers para conectar con bases de datos externas
- **Escalabilidad:** Maneja desde miles hasta millones de registros sin degradación de rendimiento
- **Seguridad:** Row Level Security (RLS) garantiza que cada usuario solo ve los datos que le corresponden según su rol y empresa

**Tablas principales del sistema:**

| Tabla | Propósito |
|-------|----------|
| `empresas` | Registro de todas las empresas (plantas, transportes, clientes) |
| `usuarios_empresa` | Relación usuario ↔ empresa ↔ rol (soporta multi-rol) |
| `despachos` | Pedidos de despacho de mercadería |
| `viajes_despacho` | Viajes individuales con 25+ estados |
| `camiones` | Flota de camiones por empresa |
| `acoplados` | Flota de acoplados/semirremolques |
| `choferes` | Choferes con documentación y vinculación a usuario |
| `documentos_viaje_seguro` | Documentos adjuntos (remitos, fotos, cartas de porte) |
| `documentos_entidad` | Documentación de camiones, choferes y acoplados |
| `ubicaciones_gps` | Historial de posiciones GPS |
| `registros_acceso` | Log de ingreso/egreso en plantas |
| `incidencias_viaje` | Incidentes reportados durante viajes |
| `ofertas_red_nodexia` | Ofertas del marketplace de transporte |
| `estado_unidad_viaje` | Timestamps de cada transición de estado |

### 3.3 Seguridad

**Row Level Security (RLS):** Cada tabla tiene políticas de seguridad que determinan qué datos puede ver/modificar cada usuario. NO es seguridad a nivel de aplicación (que puede fallar), sino **a nivel de base de datos** (imposible de saltear).

**Jerarquía de permisos:**

```
Admin Nodexia (Superadmin)
 └─ Acceso total a todo el sistema
 
Coordinador de Planta
 └─ CRUD despachos, gestión de transportes, Red Nodexia
 
Coordinador de Transporte
 └─ Gestión de flota, aceptar despachos, asignar unidades
 
Control de Acceso
 └─ Escaneo QR, ingreso/egreso, validación documental
 
Supervisor de Carga
 └─ Llamar a carga, gestionar proceso de carga/descarga
 
Chofer
 └─ Ver viajes asignados, transiciones de estado, GPS
 
Administrativo
 └─ Documentación, reportes
 
Visor (Cliente)
 └─ Solo lectura de sus entregas
```

**Autenticación:** Basada en JWT (JSON Web Tokens) con Supabase Auth. Soporte para email/contraseña y sistema de invitaciones.

### 3.4 Arquitectura de APIs

Sistema de API Routes con Next.js que actúan como backend:

- **APIs de Estado:** Gestión de transiciones del viaje
- **APIs de Carga:** Control del proceso de carga en planta
- **APIs GPS:** Recepción y consulta de posiciones
- **APIs de Documentación:** Upload y consulta de documentos
- **APIs Red Nodexia:** Marketplace de transporte
- **APIs Control de Acceso:** Escaneo QR, ingreso/egreso
- **APIs Admin:** Gestión de empresas, usuarios, configuración
- **APIs de Transporte:** Gestión de flota y viajes

Todas las APIs validan autenticación, autorización por rol, y aplican validación de datos con Zod.

---

## 4. SISTEMA DE ROLES

Nodexia implementa un sistema **multi-rol** donde un mismo usuario puede tener múltiples roles dentro de una misma empresa.

| Rol | Tipo de Empresa | Dispositivo | Función |
|-----|----------------|-------------|---------|
| Coordinador | Planta | Desktop | Crea despachos, asigna transportes, planifica operaciones |
| Control de Acceso | Planta | Mobile/Tablet | Escanea QR, registra ingreso/egreso, valida documentación |
| Supervisor de Carga | Planta | Mobile/Tablet | Gestiona carga/descarga, upload de remitos |
| Coordinador de Transporte | Transporte | Desktop | Gestiona flota, acepta despachos, asigna unidades |
| Chofer | Transporte | Mobile | Confirma viajes, envía GPS, transiciona estados |
| Supervisor de Flota | Transporte | Desktop | Monitorea flota y tracking |
| Administrativo | Planta/Transporte | Desktop | Gestión documental, reportes |
| Visor | Cliente | Desktop | Visualización de entregas (solo lectura) |
| Admin Nodexia | Plataforma | Desktop | Gestión total del sistema |

---

## 5. MODELO MULTI-TENANT

Nodexia es una plataforma **multi-tenant**: múltiples empresas operan en la misma infraestructura, pero cada una solo ve y gestiona sus propios datos.

- Tres tipos de empresa: **Planta**, **Transporte**, **Cliente**
- Cada empresa tiene su propia configuración, usuarios, flota y operaciones
- Las relaciones entre empresas se gestionan explícitamente (red privada de transportes, clientes frecuentes)
- La seguridad multi-tenant está garantizada por **RLS a nivel de base de datos**, no depende del código de la aplicación

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

Cuando un cliente tiene un sistema que corre sobre PostgreSQL, existen tres vías de integración:

1. **Integración vía API REST (recomendada)**  
   - Nodexia expone endpoints RESTful para todas las operaciones
   - El sistema del cliente consume las APIs con autenticación JWT
   - Ejemplo: el ERP del cliente consulta el estado de sus despachos vía `GET /api/despachos?empresa_id=xxx`

2. **Webhooks / Eventos**  
   - Nodexia puede notificar al sistema del cliente cuando ocurren eventos (viaje completado, incidencia, cambio de estado)
   - El cliente recibe un POST en su endpoint con el detalle del evento

3. **Sincronización de datos**  
   - Para casos donde se necesita réplica bidireccional
   - PostgreSQL soporta foreign data wrappers, logical replication, y herramientas como Debezium
   - Permite que ambas bases "conversi" sin duplicar lógica

### 6.3 API Contract (para integradores)

La API de Nodexia sigue convenciones RESTful estándar:

```
Autenticación: Bearer JWT Token
Content-Type: application/json
Base URL: https://www.nodexiaweb.com/api

Endpoints principales:
GET    /api/despachos              → Lista despachos (filtrado por empresa)
POST   /api/despachos              → Crear despacho
GET    /api/viajes                 → Lista viajes activos
PATCH  /api/viajes/[id]/estado     → Actualizar estado de viaje
GET    /api/flota/camiones         → Lista camiones de la empresa
GET    /api/flota/choferes         → Lista choferes de la empresa
GET    /api/ubicaciones-gps        → Posiciones GPS de la flota
POST   /api/control-acceso/ingreso → Registrar ingreso en planta
GET    /api/documentos             → Consultar documentación
```

---

## 7. FLUJO OPERATIVO COMPLETO

```
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 1: CREACIÓN Y ASIGNACIÓN                                      │
│  Planta crea Despacho → Asigna Transporte (directo o Red Nodexia)   │
│  Coordinador Transporte asigna Camión + Chofer → Chofer confirma     │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 2: TRÁNSITO A ORIGEN                                          │
│  Chofer inicia viaje — GPS Tracking en tiempo real — Arriba a planta│
├──────────────────────────────────────────────────────────────────────┤
│  FASE 3: PLANTA ORIGEN                                               │
│  Control Acceso: escanea QR → ingreso → playa de espera             │
│  Supervisor: llama a carga → cargando → cargado → sube remito       │
│  Control Acceso: valida remito → registra egreso                     │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 4: TRÁNSITO A DESTINO                                         │
│  Chofer viaja a destino — GPS Tracking — Arriba a destino            │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 5: PLANTA DESTINO                                              │
│  Con Nodexia: ingreso → descarga → egreso                           │
│  Sin Nodexia: Chofer finaliza directo                                │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 6: FINALIZACIÓN                                                │
│  Camión vacío → Viaje completado → Métricas y reportes               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. INFRAESTRUCTURA Y DEPLOY

| Componente | Servicio | Región |
|------------|---------|--------|
| Aplicación Web | Vercel | Auto-scaling global |
| Base de Datos | Supabase (PostgreSQL) | Cloud |
| Almacenamiento de archivos | Supabase Storage | Cloud |
| Autenticación | Supabase Auth | Cloud |
| DNS / SSL | Vercel | Automático |
| CI/CD | Vercel + GitHub | Deploy automático en push |

**Ambientes:**
- **Producción:** www.nodexiaweb.com
- **Desarrollo:** Base de datos Supabase separada para testing

---

## 9. DIFERENCIADORES

| Aspecto | Nodexia | Soluciones Tradicionales |
|---------|---------|--------------------------|
| **Multi-tenant nativo** | Una plataforma para plantas, transportes y clientes | Sistemas separados por tipo de empresa |
| **Seguridad RLS** | Seguridad a nivel de base de datos | Seguridad solo a nivel de aplicación |
| **Red Nodexia (Marketplace)** | Marketplace integrado de cargas y transportes | Búsqueda manual o portales separados |
| **Control de acceso QR** | Escaneo QR + validación documental automática | Registro manual en papel/planilla |
| **GPS integrado** | Tracking nativo en la web app del chofer | Dependencia de hardware GPS externo |
| **Progressive Web App** | Funciona en cualquier dispositivo sin instalar | Apps nativas costosas de mantener |
| **Tiempo real** | Actualizaciones instantáneas vía WebSocket | Polling manual o refreshes |
| **Open-source stack** | PostgreSQL, Next.js, React — sin vendor lock-in | Bases de datos propietarias con licencia |

---

## 10. ROADMAP

### Implementado (Febrero 2026)
- ✅ Flujo completo de despacho: creación → asignación → tracking → entrega
- ✅ Sistema multi-tenant con 3 tipos de empresa
- ✅ Control de acceso con QR y validación documental
- ✅ Gestión de flota (camiones, acoplados, choferes)
- ✅ GPS tracking en tiempo real
- ✅ Red Nodexia — marketplace de transporte
- ✅ Gestión documental con control de vencimientos
- ✅ Sistema de incidencias
- ✅ Dashboard operativo por empresa
- ✅ Web app móvil para choferes (PWA)

### En desarrollo
- 🔄 Destino con Nodexia (proceso completo de descarga)
- 🔄 Notificaciones push/email
- 🔄 Reportes avanzados y KPIs
- 🔄 Integración con sistemas de pesaje

### Planificado
- 📋 App nativa para chofer (iOS/Android)
- 📋 API pública documentada para integradores
- 📋 Módulo de facturación
- 📋 Soporte offline para choferes
- 📋 Integración con cartas de porte electrónicas (AFIP)
- 📋 Módulo de costos y rentabilidad por viaje

---

## 11. CONTACTO TÉCNICO

Para consultas sobre integración, API o colaboración técnica, contactar al equipo de Nodexia.

**Web:** www.nodexiaweb.com

---

*Documento generado el 24 de Febrero 2026. Versión 1.0.*
