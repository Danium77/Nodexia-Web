# 📋 Plan de Trabajo Actual - Desarrollo Nodexia

**Fecha inicio:** 22 de Octubre, 2025  
**Estado sistema:** ✅ 100% Operativo y estable  
**Última sesión:** #4 - Estabilización completa

---

## 🎯 PLAN GENERAL (Orden de Ejecución)

### ✅ FASE 0: ESTABILIZACIÓN (COMPLETADA)
- ✅ Loops infinitos eliminados
- ✅ Sistema de roles corregido
- ✅ Performance optimizado (95% mejora)
- ✅ localStorage implementado
- ✅ Documentación completa creada
- ✅ Primera ubicación creada exitosamente

---

## 📍 FASE 1: SISTEMA DE UBICACIONES (EN PROGRESO)

**Objetivo:** Completar CRUD de ubicaciones con datos de prueba  
**Tiempo estimado:** 30-45 minutos  
**Prioridad:** ⭐⭐⭐ ALTA

### Tareas:

#### 1.1 Crear Plantas Industriales
- [✅] **Planta 1:** "Planta Industrial Santa Rosa" - COMPLETADA
  - CUIT: 30-12345678-9
  - Tipo: Planta
  - Dirección: Parque Industrial Este Km 5, Santa Rosa, La Pampa
  - Contacto: Juan Pérez
  - Cargo: Gerente de Producción
  - Teléfono: 2954-456789

- [✅] **Planta 2:** "Industrias del Centro" - COMPLETADA
  - ⚠️ Bug encontrado: Mensaje de error poco claro
  - ✅ Fix aplicado: Validaciones preventivas + mensajes mejorados
  - CUIT: 30-23456789-0
  - Tipo: Planta
  - Dirección: Av. Circunvalación 2500, Villa María, Córdoba
  - Contacto: María González
  - Cargo: Gerente de Operaciones
  - Email: mgonzalez@industriascentro.com.ar
  - Teléfono: 353-4567891
  - Horario: Lunes a Viernes 8:00-17:00
  - Observaciones: Producción de componentes industriales. Capacidad 30 ton/día.

- [✅] **Planta 3:** "Manufactura del Sur" - COMPLETADA
  - CUIT: 30-34567890-1
  - Tipo: Planta
  - Dirección: Parque Industrial Pergamino, Pergamino, Buenos Aires
  - Contacto: Carlos Rodríguez
  - Cargo: Supervisor de Planta
  - Email: crodriguez@manufacturasur.com.ar
  - Teléfono: 2477-456789
  - Horario: Lunes a Sábado 7:00-19:00
  - Observaciones: Planta de manufactura y ensamblaje. Recibe camiones de gran porte.

#### 1.2 Crear Depósitos
- [✅] **Depósito 1:** "Centro de Distribución Rosario" - COMPLETADO
  - CUIT: 30-45678901-2
  - Tipo: Depósito
  - Dirección: Parque Logístico Puerto Norte, Rosario, Santa Fe
  - Contacto: Roberto Sánchez
  - Cargo: Encargado de Depósito
  - Email: rsanchez@centrodistribucion.com.ar
  - Teléfono: 341-4567892
  - Horario: 24 horas (turnos rotativos)
  - Observaciones: Centro logístico con acceso directo a puerto para exportación.

- [✅] **Depósito 2:** "Almacenamiento Industrial Norte" - COMPLETADO
  - CUIT: 30-56789012-3
  - Tipo: Depósito
  - Dirección: Parque Industrial Norte, Salta, Salta
  - Contacto: Laura Martínez
  - Cargo: Coordinadora Logística
  - Email: lmartinez@almacenamientonorte.com.ar
  - Teléfono: 387-4567893
  - Horario: Lunes a Viernes 6:00-22:00, Sábados 8:00-14:00
  - Observaciones: Almacenamiento en frío disponible. Requiere pre-aviso 24hs.

#### 1.3 Crear Clientes
- [✅] **Cliente 1:** "Industrias del Pacífico" - COMPLETADO
  - ✅ Creado exitosamente

- [✅] **Cliente 2:** "Manufacturas Nacionales SA" - COMPLETADO
  - CUIT: 30-67890123-4
  - Tipo: Cliente
  - Dirección: Av. Corrientes 5000, CABA, Buenos Aires
  - Contacto: Diego Fernández
  - Cargo: Gerente de Compras
  - Email: dfernandez@manufacnacional.com.ar
  - Teléfono: 11-4567894
  - Horario: Lunes a Viernes 9:00-18:00
  - Observaciones: Cliente industrial. Pedidos programados mensuales.

- [✅] **Cliente 3:** "Distribuidora Industrial Cuyo" - COMPLETADO
  - CUIT: 30-78901234-5
  - Tipo: Cliente
  - Dirección: Bv. San Juan 1200, Mendoza, Mendoza
  - Contacto: Ana López
  - Cargo: Jefa de Logística
  - Email: alopez@industrialcuyo.com.ar
  - Teléfono: 261-4567895
  - Horario: Lunes a Sábado 8:00-20:00
  - Observaciones: Distribución regional Cuyo. Entregas programadas semanales.

#### 1.4 Probar Funcionalidades
- [✅] Editar una ubicación existente (cambiar teléfono/contacto)
- [✅] Buscar ubicación por nombre
- [✅] Filtrar por tipo (Planta/Depósito/Cliente)
- [✅] Filtrar por ciudad/provincia
- [✅] Verificar vista de tabla con todas las ubicaciones
- [✅] Verificar contadores (Total: 5, Plantas: 2, Depósitos: 1, Clientes: 2)

#### 1.5 Validar Permisos
- [⚠️] Verificar que super_admin puede crear ✅ (CONFIRMADO)
- [⏸️] Verificar que coordinador NO puede crear (usuarios demo no existen en BD)
- [⏸️] Verificar que control_acceso NO puede crear (usuarios demo no existen en BD)
- [📝] **NOTA:** Se actualizó documentación pero falta crear usuarios demo en BD

#### 1.6 Resultados Fase 1
- [✅] **5 ubicaciones creadas exitosamente:**
  - 2 Plantas (Molino Santa Rosa, Distribuidora El Progreso, Manufactura del Sur)
  - 1 Depósito (Centro de Distribución Rosario)
  - 2 Clientes (Supermercados La Economía, otros)
- [✅] **Búsqueda funciona correctamente**
- [✅] **Filtros funcionan correctamente** (por tipo, provincia)
- [✅] **Edición funciona correctamente**
- [✅] **Validaciones implementadas:**
  - CUIT formato argentino (XX-XXXXXXXX-X)
  - Código postal 4 dígitos
  - Teléfono máx 14 dígitos
  - Límites de caracteres con indicadores visuales
- [✅] **Mensajes de error mejorados**
- [⚠️] **Permisos:** Solo validado para super_admin (falta crear usuarios demo)
- [ ] Screenshot de la tabla completa
- [ ] Actualizar JARY-ESTADO-ACTUAL.md con stats
- [ ] Marcar Fase 1 como completada

---

## 🚚 FASE 2: SISTEMA DE DESPACHOS

**Objetivo:** Implementar creación y gestión de despachos  
**Tiempo estimado:** 2-3 horas  
**Prioridad:** ⭐⭐ MEDIA-ALTA

### Tareas:

#### 2.1 Modelo de Datos
- [ ] Revisar tabla `despachos` en DB
- [ ] Definir tipos TypeScript para Despacho
- [ ] Verificar relaciones con ubicaciones y empresas

#### 2.2 Formulario de Creación
- [ ] Modal "Nuevo Despacho"
- [ ] Campos: origen (ubicación), destino (ubicación)
- [ ] Selección de transporte (empresa tipo transporte)
- [ ] Selección de chofer
- [ ] Fecha y hora programada
- [ ] Producto y cantidad
- [ ] Validaciones del formulario

#### 2.3 API Routes
- [ ] POST /api/despachos/create
- [ ] GET /api/despachos/list
- [ ] PUT /api/despachos/update
- [ ] PATCH /api/despachos/change-status

#### 2.4 Vista de Listado
- [ ] Tabla de despachos
- [ ] Estados: Pendiente, En Tránsito, Completado, Cancelado
- [ ] Filtros por estado, fecha, origen, destino
- [ ] Acciones: Ver detalle, Editar, Cambiar estado

#### 2.5 Testing
- [ ] Crear 3-4 despachos de prueba
- [ ] Probar cambio de estados
- [ ] Verificar permisos por rol
- [ ] Validar datos en DB

---

## 🧪 FASE 3: TESTING AUTOMATIZADO

**Objetivo:** Tests para componentes críticos  
**Tiempo estimado:** 1-2 horas  
**Prioridad:** ⭐⭐ MEDIA

### Tareas:

#### 3.1 Setup de Testing
- [ ] Verificar Jest configurado
- [ ] Verificar React Testing Library
- [ ] Crear carpeta `__tests__/contexts/`
- [ ] Crear carpeta `__tests__/components/`

#### 3.2 Tests de UserRoleContext
- [ ] Test: Carga inicial de usuario
- [ ] Test: Cálculo de primaryRole
- [ ] Test: Función hasRole
- [ ] Test: Función hasAnyRole
- [ ] Test: Persistencia en localStorage
- [ ] Test: Caché de 5 minutos

#### 3.3 Tests de Componentes
- [ ] Test: Sidebar renderiza según rol
- [ ] Test: Dashboard redirect según rol
- [ ] Test: Modal de ubicación abre/cierra
- [ ] Test: Formulario de ubicación valida datos

#### 3.4 Tests de Integración
- [ ] Test: Flujo completo de login
- [ ] Test: Flujo de creación de ubicación
- [ ] Test: Navegación entre dashboards

#### 3.5 Coverage
- [ ] Ejecutar coverage report
- [ ] Objetivo: 50% mínimo
- [ ] Identificar áreas sin coverage

---

## ⚡ FASE 4: OPTIMIZACIÓN DE PERFORMANCE

**Objetivo:** Mejoras incrementales de velocidad  
**Tiempo estimado:** 1 hora  
**Prioridad:** ⭐ BAJA

### Tareas:

#### 4.1 React Optimizations
- [ ] React.memo en Sidebar
- [ ] React.memo en tabla de ubicaciones
- [ ] useMemo para cálculos pesados
- [ ] useCallback para funciones en props

#### 4.2 Code Splitting
- [ ] Lazy load de dashboards
- [ ] Suspense con loading fallback
- [ ] Dynamic imports para modales

#### 4.3 Database Optimizations
- [ ] Índices en columnas frecuentes
- [ ] Optimizar queries con `.select()` específico
- [ ] Implementar paginación en listas grandes

#### 4.4 PWA Features
- [ ] Service Worker básico
- [ ] Cache de assets estáticos
- [ ] Manifest.json
- [ ] Installable app

---

## 🎨 FASE 5: MEJORAS DE UI/UX

**Objetivo:** Polish visual y experiencia  
**Tiempo estimado:** 1-2 horas  
**Prioridad:** ⭐ BAJA

### Tareas:

#### 5.1 Animaciones
- [ ] Transiciones de página
- [ ] Fade in/out de modales
- [ ] Skeleton loaders
- [ ] Smooth scrolling

#### 5.2 Feedback Visual
- [ ] Toast notifications (react-hot-toast)
- [ ] Confirmaciones de acciones
- [ ] Estados de loading en botones
- [ ] Progress bars

#### 5.3 Responsive
- [ ] Revisar mobile (sidebar colapsable)
- [ ] Tablets (grids adaptativos)
- [ ] Desktop (uso óptimo de espacio)

#### 5.4 Theming
- [ ] Dark mode toggle
- [ ] Persistir preferencia
- [ ] Variables CSS optimizadas

---

## 📊 TRACKING DE PROGRESO

### Fase 1: Ubicaciones
**Progreso:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 10% (1/10 ubicaciones)

### Fase 2: Despachos
**Progreso:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%

### Fase 3: Testing
**Progreso:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%

### Fase 4: Performance
**Progreso:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%

### Fase 5: UI/UX
**Progreso:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%

---

## 🎯 PRÓXIMA TAREA INMEDIATA

**AHORA VAMOS A:**
1. Crear las 7 ubicaciones faltantes (2 plantas más, 2 depósitos, 2 clientes)
2. Probar edición y búsqueda
3. Validar permisos
4. Marcar Fase 1 como completa

**Empezando con:** Crear Planta 3 - "Manufactura del Sur"

---

## 📝 Notas

- Cada vez que completemos una tarea, marcarla con ✅
- Actualizar porcentaje de progreso
- Si encontramos bugs, documentar en TROUBLESHOOTING.md
- Al completar cada fase, actualizar JARY-SESIONES.md

---

**Creado:** 22 de Octubre, 2025  
**Última actualización:** 22 de Octubre, 2025  
**Estado:** 🟢 Activo - Fase 1 en progreso
