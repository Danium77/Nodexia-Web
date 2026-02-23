# GUIÓN DE DEMO — 28 de Febrero 2026

**Duración estimada:** 20-25 minutos  
**Plataforma:** www.nodexiaweb.com (PROD)  
**Audiencia:** [definir: inversores / clientes potenciales / socios]  

---

## 🎯 OBJETIVO DE LA DEMO

Mostrar el **ciclo operativo completo** de un despacho de carga:  
Desde la creación del pedido hasta la entrega confirmada, pasando por todos los actores del proceso logístico.

**Mensaje clave:** Nodexia digitaliza y conecta TODA la cadena de transporte de cargas — planta, transporte, chofer, y control de acceso — en una sola plataforma.

---

## 👥 ACTORES Y CREDENCIALES

| # | Actor | Email | Vista |
|---|-------|-------|-------|
| 1 | Admin Nodexia | `admin.demo@nodexia.com` | Desktop |
| 2 | Coordinador de Planta | `coordinador.demo@nodexia.com` | Desktop |
| 3 | Coordinador de Transporte | `transporte.demo@nodexia.com` | Desktop |
| 4 | Chofer | `chofer.demo@nodexia.com` | Mobile (emulado) |
| 5 | Control de Acceso | `control.acceso@nodexia.com` | Tablet (emulado) |
| 6 | Supervisor de Carga | *(mismo que Coord. Planta o crear usuario)* | Tablet (emulado) |

**Password:** `Demo2024!` (todos los usuarios demo)

---

## 🖥️ SETUP PRE-DEMO

### Preparar ventanas/pestañas:
1. **Pestaña 1:** Login — `www.nodexiaweb.com/login`
2. **Pestaña 2:** Chrome DevTools → Device Mode (para simular mobile/tablet)

### Verificar datos previos:
- [ ] Empresas planta y transporte existen y están vinculadas
- [ ] Ubicaciones de origen y destino configuradas
- [ ] Flota registrada: al menos 1 camión + 1 chofer + 1 acoplado
- [ ] Documentación del chofer y camión vigente y aprobada
- [ ] No hay despachos "sucios" en estado raro

### Tip: Si docs están vencidas/faltantes
Control de Acceso va a bloquear el ingreso (correcto). Si querés demo fluida, asegurate que Admin validó todos los docs antes.

---

## 📋 FLUJO DE DEMO (8 Fases)

---

### FASE 0 — Contexto de plataforma (2 min)
**Actor:** Admin Nodexia  
**Narración:** *"Nodexia es una plataforma multi-tenant. Veamos la infraestructura."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 0.1 | Login como Admin | `/login` | Formulario login |
| 0.2 | Ver dashboard admin | `/admin/super-admin-dashboard` | Visión general del sistema |
| 0.3 | Mostrar empresas | `/admin/empresas` | Planta + Transporte registradas |
| 0.4 | Mostrar usuarios | `/admin/usuarios` | Roles asignados (coordinador, chofer, CA, supervisor) |
| 0.5 | Mostrar validación docs | `/admin/validacion-documentos` | 3 tabs: Pendientes / Aprobados / Rechazados |

**Talking points:**
- Multi-empresa: cada empresa ve solo sus datos (RLS)
- Admin gestiona el ecosistema completo
- Documentación validada antes de operar (seguridad)

---

### FASE 1 — Crear despacho (3 min)
**Actor:** Coordinador de Planta  
**Narración:** *"El coordinador de planta necesita enviar una carga. Crea un despacho."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 1.1 | Login como Coordinador | `/login` | Cambiar de usuario |
| 1.2 | Ver dashboard planta | `/coordinator-dashboard` | Métricas y resumen |
| 1.3 | Crear nuevo despacho | `/crear-despacho` | Formulario con origen/destino/fecha/hora |
| 1.4 | Seleccionar transporte directo | *(en formulario)* | Asignación directa a empresa vinculada |
| 1.5 | Confirmar creación | *(submit)* | Despacho creado: `DSP-YYYYMMDD-NNN` |
| 1.6 | Ver en planificación | `/planificacion` | Grilla semanal con el despacho nuevo |

**Talking points:**
- Empresa de transporte se selecciona de vinculadas
- Opción de publicar en Red Nodexia (marketplace, mostrar brevemente)
- Viajes se generan automáticamente según cantidad solicitada
- Planificación visual: semanal, mensual, diária

---

### FASE 2 — Asignar unidad operativa (2 min)
**Actor:** Coordinador de Transporte  
**Narración:** *"La empresa de transporte recibe el pedido y asigna un camión con chofer."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 2.1 | Login como Transporte | `/login` | Cambiar usuario |
| 2.2 | Ver dashboard transporte | `/transporte/dashboard` | Métricas de viajes + flota + compliance docs |
| 2.3 | Ver despachos ofrecidos | `/transporte/despachos-ofrecidos` | Despacho recién creado aparece |
| 2.4 | Abrir modal asignar unidad | *(clic en Asignar)* | Modal compacto: cards con chofer + camión + acoplado |
| 2.5 | Confirmar asignación | *(confirmar)* | Unidad asignada, viaje pasa a `transporte_asignado` |
| 2.6 | Mostrar flota | `/transporte/flota` | Unidades operativas + inventario, doc badges |

**Talking points:**
- Unidad operativa = chofer + camión + acoplado (combinación verificada)
- Badge de documentación en cada recurso
- Solo asigna si docs al día

---

### FASE 3 — Chofer confirma y viaja (3 min)
**Actor:** Chofer (mobile)  
**Narración:** *"El chofer recibe la asignación en su celular y confirma el viaje."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 3.1 | Login como Chofer (mode mobile) | `/login` | DevTools → responsive mode |
| 3.2 | Ver app chofer | `/chofer-mobile` | Interfaz mobile: viajes asignados |
| 3.3 | Aceptar viaje | *(botón Confirmar)* | Estado → `confirmado_chofer` |
| 3.4 | Iniciar viaje a origen | *(botón Iniciar)* | Estado → `en_transito_origen`, GPS activo |
| 3.5 | Mostrar mapa con ruta | *(tab mapa)* | Google Maps con ruta trazada |
| 3.6 | Reportar arribo a origen | *(botón Arribé)* | Estado → ingresado_origen |

**Talking points:**
- App mobile (PWA) — no requiere descarga de store
- GPS en tiempo real cada 30 segundos
- Transporte ve el camión moverse en su mapa
- Chofer también puede ver y subir sus documentos personales

---

### FASE 4 — Control de Acceso en planta (3 min)
**Actor:** Control de Acceso (tablet)  
**Narración:** *"El camión llega a planta. Control de acceso verifica toda la documentación."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 4.1 | Login como Control Acceso | `/login` | Cambiar usuario |
| 4.2 | Escanear QR / ingresar N° despacho | `/control-acceso` | Buscador + scanner |
| 4.3 | Ver datos del viaje | *(resultado scan)* | Info de chofer, camión, origen, destino |
| 4.4 | Ver verificación documental | *(automático)* | ✅ Docs vigentes o ❌ Docs faltantes/vencidos |
| 4.5 | Confirmar ingreso | *(botón Ingresar)* | Estado → `ingresado_origen` |
| 4.6 | (Opcional) Crear incidencia si docs faltan | *(botón Incidencia)* | Formulario + docs afectados automáticos |

**Talking points:**
- Verificación automática de TODA la documentación
- Si falta algo → bloquea + genera incidencia automática
- Criterios dinámicos: chofer dependencia vs autónomo requieren docs diferentes
- Historial de accesos registrado

---

### FASE 5 — Supervisor de carga (3 min)
**Actor:** Supervisor de Carga (tablet)  
**Narración:** *"El camión ingresó a planta. El supervisor gestiona la cola de carga."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 5.1 | Login como Supervisor | `/login` | Cambiar usuario |
| 5.2 | Ver panel supervisor | `/supervisor-carga` | 3 paneles: En Planta / En Carga / Cargados |
| 5.3 | Llamar a carga | *(botón Llamar)* | Camión pasa a "En Carga", estado → `llamado_carga` |
| 5.4 | Iniciar carga | *(botón Iniciar)* | Estado → `cargando` |
| 5.5 | Completar carga | *(formulario)* | Registrar peso (tons), bultos, temperatura |
| 5.6 | Subir foto de remito | *(upload)* | Remito guardado en storage, estado → `cargado` |

**Talking points:**
- Cola de carga en tiempo real
- Datos de peso/bultos/temperatura registrados
- Remito digital (adiós al papel)
- Contadores actualizados automáticamente

---

### FASE 6 — Egreso y tránsito a destino (2 min)
**Actores:** Control de Acceso + Chofer  
**Narración:** *"El camión sale de planta con la carga y viaja al destino."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 6.1 | CA: Confirmar egreso | `/control-acceso` | Estado → `egreso_origen` |
| 6.2 | Chofer: Iniciar viaje a destino | `/chofer-mobile` | Estado → `en_transito_destino` |
| 6.3 | Transporte: Ver tracking en vivo | `/transporte/tracking-flota` | Mapa con posición real del camión |
| 6.4 | Chofer: Reportar arribo a destino | *(botón)* | Estado → `ingresado_destino` |

**Talking points:**
- Trazabilidad completa del viaje
- Transporte monitorea flota en tiempo real
- Coordinador planta ve el estado en su planificación

---

### FASE 7 — Destino y cierre (2 min)
**Actores:** Chofer (o CA destino)  
**Narración:** *"El camión llega al destino. Dos opciones según el tipo de destino."*

**Opción A — Self-delivery (destino sin Nodexia):**
| Paso | Acción | Qué mostrar |
|------|--------|-------------|
| 7A.1 | Chofer sube remito de entrega | Upload foto |
| 7A.2 | Chofer confirma "Completar Entrega" | Auto-cadena: egreso → completado |

**Opción B — Destino con Nodexia (ambas plantas):**
| Paso | Acción | Qué mostrar |
|------|--------|-------------|
| 7B.1 | CA destino escanea QR | Auto-detecta recepción |
| 7B.2 | Supervisor destino: descarga | Misma UI que carga |
| 7B.3 | CA destino: egreso | Auto-completa viaje |

**Talking points:**
- Flexibilidad: funciona con y sin Nodexia en destino
- Auto-completar reduce pasos manuales
- Remito digital en ambos escenarios

---

### FASE 8 — Cierre y visibilidad (2 min)
**Actores:** Coordinador Planta + Transporte  
**Narración:** *"Viaje completado. Toda la información queda registrada."*

| Paso | Acción | URL | Qué mostrar |
|------|--------|-----|-------------|
| 8.1 | Coord. Planta: ver despacho completado | `/crear-despacho` → tab Completados | Badge "Completado" |
| 8.2 | Ver detalle del despacho | `/despachos/[id]/detalle` | Viajes + docs + timeline + facturación |
| 8.3 | Monitor de estados | `/estados-camiones` | Badges: En Planta, Por Arribar, Cargando, etc. |
| 8.4 | Transporte: viajes completados | `/transporte/viajes-activos` | Viaje marcado completo |

**Talking points:**
- Auditoría completa: quién hizo qué y cuándo
- Timeline visual de todo el proceso
- Datos listos para facturación
- Todo trazable y auditable

---

## 🎙️ CIERRE DE DEMO (1 min)

### Puntos a enfatizar:
1. **6 actores** conectados en una sola plataforma
2. **Trazabilidad 100%** desde creación hasta entrega
3. **Documentación digital** — adiós al papel
4. **Seguridad por diseño** — cada usuario ve solo lo que le corresponde (RLS)
5. **Mobile-ready** — chofer y CA desde cualquier dispositivo
6. **Red Nodexia** — marketplace de cargas (ventaja competitiva)

### Próximos pasos:
- Reportes y estadísticas avanzadas
- Facturación integrada
- App mobile nativa (iOS/Android)
- Integraciones con ERPs

---

## ⚠️ POSIBLES PROBLEMAS EN DEMO

| Problema | Solución rápida |
|----------|----------------|
| Login falla | Verificar credenciales pre-demo, tener backup |
| Docs bloquean ingreso | Pre-validar docs desde Admin antes de demo |
| GPS no funciona | OK — explicar que en prod real funciona con móvil |
| Carga lenta | Vercel frío + Supabase — hacer un warmup previo |
| Error 500 | Tener tab de console abierta, reportar como "modo debug" |

### Warmup pre-demo (5 min antes):
1. Navegar a `/login` (activa Vercel)
2. Login con cada usuario una vez (activa sessions)
3. Navegar a `/crear-despacho` (carga datos pesados)
4. Navegar a `/control-acceso` (preload QR scanner)

---

## 📊 TIEMPOS ESTIMADOS

| Fase | Duración | Acumulado |
|------|----------|-----------|
| 0 — Contexto plataforma | 2 min | 2 min |
| 1 — Crear despacho | 3 min | 5 min |
| 2 — Asignar unidad | 2 min | 7 min |
| 3 — Chofer confirma | 3 min | 10 min |
| 4 — Control de Acceso | 3 min | 13 min |
| 5 — Supervisor carga | 3 min | 16 min |
| 6 — Egreso + tránsito | 2 min | 18 min |
| 7 — Destino + cierre | 2 min | 20 min |
| 8 — Visibilidad final | 2 min | 22 min |
| Cierre | 1 min | 23 min |
| **Buffer / Q&A** | **5-7 min** | **~30 min** |

---

**Última actualización:** 21-Feb-2026  
**Preparado por:** Opus (Tech Lead)
