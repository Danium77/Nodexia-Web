# 🏢 CONTEXTO DE NODEXIA - Para Jary

**Última actualización**: 19 de Octubre, 2025  
**Propósito**: Entender QUÉ es Nodexia y CÓMO funciona operativamente

---

## 🎯 ¿QUÉ ES NODEXIA?

Nodexia es una **plataforma de gestión logística** que conecta:
- **Plantas/Coordinadores** (quienes envían mercadería)
- **Empresas de Transporte** (quienes transportan)
- **Clientes** (quienes reciben)

### Analogía Simple
Es como "Uber para transporte de carga industrial", pero B2B.

---

## 👥 ROLES Y USUARIOS

### 1. Super Admin (Nodexia)
**Quién es**: Personal de Nodexia (la plataforma)  
**Qué hace**:
- Gestiona todas las empresas
- Aprueba solicitudes de registro
- Ve todo el sistema
- Configura la plataforma

**Acceso**: `/admin/*`

---

### 2. Coordinador de Planta
**Quién es**: Personal de fábricas/plantas que necesitan enviar productos  
**Qué hace**:
- Crea despachos (órdenes de envío)
- Asigna transporte (de su red privada)
- Publica ofertas en "Red Nodexia" (marketplace)
- Ve estado de envíos
- Gestiona destinos y orígenes

**Acceso**: `/crear-despacho`, `/dashboard`, `/planificacion`

**Ejemplo**: Juan trabaja en "Lácteos del Sur" y necesita enviar 20 toneladas de yogurt a un supermercado. Crea un despacho y asigna un camión.

---

### 3. Coordinador de Transporte
**Quién es**: Personal de empresas de transporte  
**Qué hace**:
- Ve despachos asignados a su empresa
- Asigna choferes y camiones
- Ve ofertas en "Red Nodexia" y puede tomarlas
- Gestiona flota (camiones, choferes)
- Ve tracking de viajes

**Acceso**: `/transporte/*`, `/dashboard`

**Ejemplo**: María trabaja en "Rápido Express". Recibe un despacho de Lácteos del Sur y asigna al chofer Pedro con el camión ABC-123.

---

### 4. Chofer
**Quién es**: Conductores de camiones  
**Qué hace**:
- Ve sus viajes asignados
- Escanea QR al llegar a planta
- Actualiza estado del viaje
- Registra incidencias

**Acceso**: App móvil (futuro), `/demo-qr` (actual)

---

### 5. Control de Acceso (Planta)
**Quién es**: Personal de seguridad/portería en plantas  
**Qué hace**:
- Registra ingreso de camiones (escanea QR)
- Registra salida de camiones
- Ve qué camiones están en planta

**Acceso**: `/control-acceso`

---

### 6. Supervisor de Carga (Planta)
**Quién es**: Encargado de carga/descarga en planta  
**Qué hace**:
- Inicia proceso de carga
- Finaliza carga (confirma peso, remito)
- Registra incidencias durante carga

**Acceso**: `/supervisor-carga`

---

### 7. Cliente/Visor
**Quién es**: Empresas que reciben mercadería  
**Qué hace**:
- Ve tracking de sus envíos
- Ve histórico
- (Solo lectura)

**Acceso**: Portal de cliente (futuro)

---

## 🔄 FLUJO OPERATIVO PRINCIPAL

### Flujo 1: Despacho con Red Privada

```
1. Coordinador Planta crea despacho
   - Origen: "Planta Rosario"
   - Destino: "Supermercado Norte Córdoba"
   - Carga: "15 toneladas yogurt"
   - Fecha: "23-Oct-2025"
   
2. Coordinador Planta asigna transporte
   - Elige "Rápido Express" (de su red privada)
   
3. Coordinador Transporte recibe notificación
   - Asigna chofer "Pedro González"
   - Asigna camión "ABC-123"
   
4. Chofer recibe viaje en su app
   - Ve ruta, carga, documentación
   
5. Chofer llega a planta
   - Control de Acceso escanea QR → Registra ingreso
   
6. Supervisor de Carga
   - Inicia carga
   - Finaliza carga (confirma 15 ton, adjunta remito)
   
7. Control de Acceso
   - Escanea QR → Registra salida
   
8. Chofer en tránsito
   - Estado: "En camino a destino"
   
9. Chofer llega a destino
   - Estado: "Entregado"
   
10. Cliente puede ver tracking en todo momento
```

---

### Flujo 2: Despacho con Red Nodexia (Marketplace)

```
1. Coordinador Planta crea despacho
   - Pero NO tiene transporte disponible
   
2. Coordinador Planta publica en Red Nodexia
   - Oferta: "15 ton Rosario → Córdoba, 23-Oct, $50.000"
   - Urgencia: "Alta"
   
3. TODOS los transportes ven la oferta
   - No solo su red privada, todo el marketplace
   
4. Primer transporte que toma la oferta, la obtiene
   - "Logística del Centro" toma la oferta
   
5. Continúa con flujo normal (paso 3 en adelante)
```

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico

```
Frontend:
- Next.js 15.3.3 (Pages Router)
- React 19
- TypeScript 5.9
- Tailwind CSS 4

Backend:
- Supabase (PostgreSQL + Auth + RLS)
- Next.js API Routes

Testing:
- Jest 30
- React Testing Library 16
```

### Estructura de Carpetas

```
pages/
├── index.tsx              → Home
├── login.tsx              → Login
├── dashboard.tsx          → Dashboard general
├── crear-despacho.tsx     → Crear/gestionar despachos
├── control-acceso.tsx     → Portal control acceso
├── supervisor-carga.tsx   → Portal supervisor
├── admin/
│   ├── empresas.tsx       → Gestión empresas (super admin)
│   ├── usuarios.tsx       → Gestión usuarios
│   └── solicitudes.tsx    → Aprobar registros
├── transporte/
│   └── dashboard.tsx      → Dashboard transporte
└── api/
    ├── admin/*            → APIs admin
    ├── control-acceso/*   → APIs control acceso
    └── supervisor-carga/* → APIs supervisor

components/
├── Admin/                 → Componentes admin
├── Dashboard/             → Componentes dashboard
├── Planning/              → Componentes planificación
├── Network/               → Componentes red Nodexia
├── Modals/                → Modales (ej: AsignarTransporte)
└── layout/                → Layouts generales

lib/
├── supabaseClient.ts      → Cliente Supabase
├── supabaseAdmin.ts       → Admin Supabase
├── contexts/              → Contextos React
└── hooks/                 → Custom hooks
```

---

## 🗄️ BASE DE DATOS (Simplificada)

### Tablas Principales

```sql
-- EMPRESAS
empresas
├── id
├── nombre
├── cuit
├── tipo_empresa: 'planta' | 'transporte' | 'cliente'
└── activo

-- USUARIOS Y ROLES
usuarios_empresa
├── user_id (→ auth.users)
├── empresa_id (→ empresas)
├── rol_interno: 'coordinador' | 'chofer' | 'control_acceso' | etc
└── UNIQUE(user_id, empresa_id, rol_interno)  ← Multi-rol

-- DESPACHOS/VIAJES
despachos
├── id
├── pedido_id (ej: "DSP-20251019-001")
├── origen
├── destino
├── estado: 'pendiente_transporte' | 'asignado' | 'en_transito' | 'entregado'
├── fecha_despacho
├── transporte_id (→ empresas)
└── chofer_id, camion_id, acoplado_id

-- RED PRIVADA
planta_transportes
├── planta_id (→ empresas)
├── transporte_id (→ empresas)
├── estado: 'activo' | 'suspendido'
├── tarifa_acordada
└── es_preferido

-- RED NODEXIA (Marketplace)
ofertas_red_nodexia
├── id
├── despacho_id
├── planta_id
├── estado: 'publicada' | 'tomada' | 'expirada'
├── tarifa_ofrecida
├── transporte_tomador_id
└── fecha_tomada

-- FLOTA
camiones, acoplados, choferes
└── id_transporte (→ empresas)
```

---

## 🎨 CONCEPTOS CLAVE

### 1. Red Privada
Cada planta tiene su "lista" de transportes de confianza.  
**Ventaja**: Relaciones establecidas, tarifas acordadas, prioridad

### 2. Red Nodexia (Marketplace)
Cuando una planta no tiene transporte disponible, publica la oferta públicamente.  
**Ventaja**: Más opciones, competitividad, liquidez

### 3. Multi-rol
Un usuario puede tener múltiples roles en la misma empresa.  
**Ejemplo**: Juan es "coordinador" Y "control_acceso" en Lácteos del Sur

### 4. QR System
Cada viaje tiene un QR único.  
**Uso**: Control de acceso escanea para registrar ingresos/salidas

### 5. Row Level Security (RLS)
Políticas de Supabase que controlan qué datos ve cada usuario.  
**Ejemplo**: Un chofer solo ve sus propios viajes

---

## 🚨 PROBLEMAS CONOCIDOS (A resolver)

### 1. Bug Crítico: Asignación de Transporte
**Descripción**: El modal de asignar transporte se abre pero no persiste la asignación  
**Ubicación**: `components/Modals/AssignTransportModal.tsx`  
**Impacto**: Coordinadores no pueden asignar transportes  
**Prioridad**: 🔴 CRÍTICA

### 2. 325 Errores TypeScript
**Descripción**: Código no type-safe en 86 archivos  
**Prioridad**: 🔴 ALTA

### 3. Vulnerabilidades Next.js
**Descripción**: 3 vulnerabilidades moderadas en Next.js 15.3.3  
**Prioridad**: 🔴 CRÍTICA

---

## 📱 FLUJOS DE USUARIO (Para implementar)

### Panel Admin (80% completo)
- [x] Ver empresas
- [x] Crear empresas
- [x] Ver usuarios
- [x] Aprobar solicitudes
- [ ] Editar empresas (falta UX)
- [ ] Dashboard analytics

### Panel Coordinador Planta (70% completo)
- [x] Crear despachos
- [ ] Asignar transporte (BUG)
- [x] Ver dashboard
- [ ] Publicar en Red Nodexia
- [ ] Gestionar origenes/destinos

### Panel Coordinador Transporte (50% completo)
- [x] Ver despachos asignados
- [x] Gestionar flota
- [ ] Ver Red Nodexia
- [ ] Tomar ofertas
- [ ] Asignar choferes a viajes

### Panel Control Acceso (80% completo)
- [x] Escanear QR
- [x] Registrar ingreso/salida
- [ ] Ver histórico
- [ ] Reportes

---

## 🎯 OBJETIVO FUNCIONAL DE NODEXIA

**Problema que resuelve**:
Las plantas necesitan transportar carga pero:
- A veces no tienen transporte disponible
- No tienen visibilidad del proceso
- Hay mucha coordinación manual (emails, WhatsApp)
- No hay tracking en tiempo real

**Solución de Nodexia**:
- Plataforma centralizada
- Asignación inteligente (red privada + marketplace)
- Tracking en tiempo real con QR
- Control de acceso automatizado
- Visibilidad para clientes

---

## 📊 MÉTRICAS DE ÉXITO (Futuro)

- Tiempo de asignación de transporte < 5 min
- 95% de viajes con tracking completo
- 80% de despachos con transporte de red privada
- 20% vía Red Nodexia (marketplace)
- 99% uptime

---

**Este documento es mi referencia para entender el negocio de Nodexia.**  
**Siempre consulto esto antes de implementar funcionalidades.**

---

*Última actualización: 19-Oct-2025*
