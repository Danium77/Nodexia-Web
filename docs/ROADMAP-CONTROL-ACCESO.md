# 🎯 ROADMAP DE REFACTORIZACIÓN - CONTROL DE ACCESO
**Fecha:** 16 de diciembre de 2025  
**Prioridad:** 🔴 CRÍTICA  
**Estado:** En Progreso

---

## 📋 RESUMEN EJECUTIVO

Después de resolver el bug del trigger de BD, este documento establece las prioridades de refactorización para asegurar que el rol **"Control de Acceso"** funcione sin errores en el futuro.

### ✅ Completado Hoy (16 Dic 2025)
- ✅ Creado validador centralizado de roles (`lib/validators/roleValidator.ts`)
- ✅ Migrada lógica del trigger eliminado a código TypeScript
- ✅ Refactorizada API de creación de usuarios (`nueva-invitacion.ts`)
- ✅ Archivados documentos antiguos en `docs/archive/`
- ✅ Verificadas dependencias TypeScript (sin conflictos)

---

## 🎯 PRIORIDADES PARA CONTROL DE ACCESO

### 🔴 CRÍTICO - Esta Semana (17-20 Dic)

#### 1. Testing del Rol Control de Acceso
**Tiempo estimado:** 2-3 horas  
**Archivos involucrados:**
- `__tests__/api/admin/nueva-invitacion.test.ts` (nuevo)
- `__tests__/lib/validators/roleValidator.test.ts` (nuevo)

**Tareas:**
```typescript
// Crear test de validación de roles
□ Test: validar_role_for_company con rol "Control de Acceso"
□ Test: validar rol inválido falla correctamente
□ Test: validar rol para tipo de empresa correcto
□ Test: crear usuario Control de Acceso end-to-end
□ Test: intentar crear usuario con rol incompatible falla
```

**Comando para ejecutar:**
```powershell
pnpm test -- nueva-invitacion
pnpm test -- roleValidator
```

---

#### 2. Pantalla de Control de Acceso
**Tiempo estimado:** 4-6 horas  
**Archivo principal:** `pages/control-acceso.tsx` (revisar si existe)

**Requerimientos funcionales:**
```
□ Ver viajes programados del día (filtrado por empresa)
□ Escanear QR de chofer/viaje desde móvil
□ Registrar arribo de camión con timestamp
□ Validar documentación de transporte
□ Registrar egreso con peso/bultos
□ Actualizar estado del viaje a "en_transito"
```

**Validaciones necesarias:**
```typescript
// En el componente Control de Acceso
□ Verificar permisos del usuario (rol = "Control de Acceso")
□ Filtrar viajes solo de la empresa del usuario
□ Validar que el viaje esté en estado "programado" antes de arribo
□ Validar que el viaje esté en estado "en_carga" antes de egreso
□ Prevenir registros duplicados
```

---

#### 3. API Endpoints para Control de Acceso
**Tiempo estimado:** 3-4 horas

**Endpoints a crear/verificar:**

```typescript
// ✅ YA EXISTE (verificar funcionalidad)
GET  /api/control-acceso/viajes-del-dia
  → Retorna viajes programados para hoy de la empresa del usuario

// ⚠️ VERIFICAR
POST /api/control-acceso/confirmar-accion
  → Body: { viaje_id, accion: "arribo" | "egreso", datos_egreso? }
  → Valida estado actual del viaje
  → Actualiza estado según acción
  → Registra timestamp y usuario
  → Notifica a supervisor si es arribo

// 🆕 NUEVO (si es necesario)
GET  /api/control-acceso/validar-qr/:qr_code
  → Valida que el QR corresponda a un viaje activo
  → Retorna datos del viaje y chofer
```

**Tests para cada endpoint:**
```powershell
□ __tests__/api/control-acceso/viajes-del-dia.test.ts
□ __tests__/api/control-acceso/confirmar-accion.test.ts
□ __tests__/api/control-acceso/validar-qr.test.ts
```

---

### 🟡 IMPORTANTE - Próxima Semana (23-27 Dic)

#### 4. Integración Móvil con QR
**Tiempo estimado:** 6-8 horas

**Componentes involucrados:**
```
□ components/ControlAcceso/ScannerQR.tsx (crear)
□ components/ControlAcceso/ViajeDiaCard.tsx (crear)
□ components/ControlAcceso/FormularioEgreso.tsx (crear)
```

**Flujo móvil:**
```
1. Control de Acceso abre app en móvil
2. Ve lista de viajes esperados del día
3. Camión llega → escanea QR del chofer
4. Sistema valida QR y muestra datos del viaje
5. Confirma arribo → sistema registra y notifica
6. Después de carga → registra egreso con peso/bultos
7. Sistema actualiza estado a "en_transito"
```

**Características PWA necesarias:**
```
□ Soporte offline básico (service worker)
□ Acceso a cámara para escanear QR
□ Diseño responsive optimizado para móvil
□ Notificaciones push cuando llega un camión
```

---

#### 5. Permisos y Seguridad RLS
**Tiempo estimado:** 2-3 horas

**Políticas de Supabase a revisar:**
```sql
-- Verificar que existan estas políticas
□ usuarios_empresa: Control de Acceso puede leer su relación empresa
□ viajes: Control de Acceso puede ver viajes de su empresa
□ viajes: Control de Acceso puede UPDATE solo estados arribo/egreso
□ roles_empresa: Cualquiera puede leer roles (para validación)
```

**Archivo SQL a crear:**
```
sql/rls-control-acceso.sql
  → Crear/actualizar políticas RLS
  → Documentar permisos específicos del rol
  → Script de rollback por si falla
```

---

### 🟢 MEJORAS - Enero 2026

#### 6. Dashboard de Control de Acceso
**Tiempo estimado:** 4-6 horas

**Métricas a mostrar:**
```
□ Viajes arribados hoy
□ Viajes en carga actualmente
□ Viajes egresados hoy
□ Tiempo promedio de estadía en planta
□ Alertas de retrasos
□ Histórico de movimientos del día
```

---

#### 7. Validaciones Avanzadas
**Tiempo estimado:** 3-4 horas

**Validaciones adicionales:**
```typescript
□ Verificar que el camión esté asignado al viaje
□ Validar patente del camión coincida con QR
□ Verificar documentación obligatoria (remito, carta de porte)
□ Alertar si el arribo es fuera de horario programado
□ Prevenir egreso sin registro de peso
□ Validar rangos de peso según producto
```

---

#### 8. Notificaciones y Alertas
**Tiempo estimado:** 2-3 horas

**Sistema de notificaciones:**
```
□ Email a supervisor cuando arriba camión
□ WhatsApp (futuro) a chofer cuando se completa carga
□ Alerta a admin si hay retraso mayor a 2 horas
□ Notificación push a móvil de control de acceso
```

---

## 🧪 PLAN DE TESTING ESPECÍFICO

### Tests Unitarios (Jest)
```powershell
# Total estimado: 20 tests nuevos

# Validadores
__tests__/lib/validators/roleValidator.test.ts         (5 tests)

# APIs
__tests__/api/admin/nueva-invitacion.test.ts          (4 tests)
__tests__/api/control-acceso/viajes-del-dia.test.ts   (3 tests)
__tests__/api/control-acceso/confirmar-accion.test.ts (5 tests)

# Componentes
__tests__/components/ControlAcceso/ScannerQR.test.tsx (3 tests)
```

### Tests de Integración
```
1. Flujo Completo - Crear Usuario Control de Acceso
   → Validar email temporal
   → Login con credenciales
   → Acceder a /control-acceso
   → Ver viajes del día

2. Flujo Completo - Registro de Arribo
   → Escanear QR válido
   → Confirmar arribo
   → Verificar notificación a supervisor
   → Validar actualización de estado

3. Flujo Completo - Registro de Egreso
   → Ingresar peso y bultos
   → Confirmar egreso
   → Verificar estado cambia a "en_transito"
   → Validar datos en dashboard
```

### Testing Manual (Checklist)
```
□ Login como porteria2@anmiguel.com.ar
□ Acceso a pantalla /control-acceso
□ Ver viajes del día filtrados por empresa
□ Escanear QR de viaje activo (usar qr-chofer-access.html)
□ Registrar arribo exitosamente
□ Verificar notificación a supervisor
□ Registrar egreso con peso/bultos
□ Validar actualización en dashboard admin
```

---

## 📁 ESTRUCTURA DE ARCHIVOS RECOMENDADA

```
Nodexia-Web/
├── lib/
│   ├── validators/
│   │   ├── roleValidator.ts          ✅ CREADO HOY
│   │   └── roleValidator.test.ts     🆕 PENDIENTE
│   └── services/
│       └── controlAccesoService.ts   🆕 PENDIENTE
│
├── pages/
│   ├── api/
│   │   ├── admin/
│   │   │   └── nueva-invitacion.ts   ✅ REFACTORIZADO HOY
│   │   └── control-acceso/
│   │       ├── viajes-del-dia.ts     ⚠️ VERIFICAR
│   │       ├── confirmar-accion.ts   ⚠️ VERIFICAR
│   │       └── validar-qr.ts         🆕 PENDIENTE
│   └── control-acceso.tsx            ⚠️ VERIFICAR
│
├── components/
│   └── ControlAcceso/
│       ├── ViajeDiaCard.tsx          🆕 PENDIENTE
│       ├── ScannerQR.tsx             🆕 PENDIENTE
│       ├── FormularioEgreso.tsx      🆕 PENDIENTE
│       └── DashboardControlAcceso.tsx 🆕 PENDIENTE
│
├── __tests__/
│   ├── lib/validators/
│   │   └── roleValidator.test.ts     🆕 PENDIENTE
│   ├── api/
│   │   ├── admin/
│   │   │   └── nueva-invitacion.test.ts 🆕 PENDIENTE
│   │   └── control-acceso/
│   │       ├── viajes-del-dia.test.ts   🆕 PENDIENTE
│   │       └── confirmar-accion.test.ts 🆕 PENDIENTE
│   └── components/
│       └── ControlAcceso/
│           └── ScannerQR.test.tsx    🆕 PENDIENTE
│
├── sql/
│   ├── rls-control-acceso.sql        🆕 PENDIENTE
│   └── disable-trigger-validar-rol.sql ✅ EJECUTADO
│
└── docs/
    ├── archive/                       ✅ CREADO HOY
    │   ├── SESION-DEBUG-CREACION-USUARIOS-15-DIC-2025.md
    │   └── [otros archivos movidos]
    └── ROADMAP-CONTROL-ACCESO.md     📄 ESTE ARCHIVO
```

---

## 🚀 PLAN DE ACCIÓN INMEDIATO (PRÓXIMAS 48H)

### Día 1 - Miércoles 17 Dic
```
🌅 MAÑANA (9:00 - 12:00)
  □ Crear tests para roleValidator (1h)
  □ Crear tests para nueva-invitacion API (1h)
  □ Ejecutar todos los tests: pnpm test (15min)
  □ Verificar que no haya regresiones (15min)

☀️ TARDE (14:00 - 18:00)
  □ Revisar si existe pages/control-acceso.tsx (15min)
  □ Si no existe, crear estructura básica (2h)
  □ Implementar listado de viajes del día (1h)
  □ Testing manual del componente (45min)
```

### Día 2 - Jueves 18 Dic
```
🌅 MAÑANA (9:00 - 12:00)
  □ Revisar APIs de control-acceso existentes (1h)
  □ Implementar/corregir endpoint viajes-del-dia (1h)
  □ Implementar/corregir endpoint confirmar-accion (1h)

☀️ TARDE (14:00 - 18:00)
  □ Crear tests para ambos endpoints (2h)
  □ Testing end-to-end del flujo completo (1h)
  □ Documentar hallazgos y próximos pasos (1h)
```

---

## 📊 MÉTRICAS DE ÉXITO

### Objetivos Cuantitativos
```
✅ Cobertura de tests del módulo Control de Acceso: > 80%
✅ Tiempo de respuesta API < 500ms
✅ Cero errores TypeScript en archivos relacionados
✅ Tests E2E pasando: 100%
✅ Validación de roles funcionando en 100% de casos
```

### Objetivos Cualitativos
```
✅ Usuario puede crear cuenta Control de Acceso sin errores
✅ Usuario puede acceder a su pantalla específica
✅ Usuario puede registrar arribos y egresos correctamente
✅ Sistema notifica a supervisor automáticamente
✅ Estados de viajes se actualizan correctamente
✅ No hay posibilidad de registros duplicados o inconsistentes
```

---

## 🔗 DEPENDENCIAS Y BLOQUEOS

### Dependencias Completadas
- ✅ Trigger de BD deshabilitado/eliminado
- ✅ Validador centralizado creado
- ✅ API de creación de usuarios refactorizada
- ✅ Usuario de prueba Control de Acceso creado

### Dependencias Pendientes
- ⏳ Página /control-acceso.tsx (verificar existencia)
- ⏳ APIs de control-acceso (verificar implementación)
- ⏳ Políticas RLS para el rol (verificar en Supabase)

### Posibles Bloqueadores
- ❓ ¿Existe ya la pantalla de control de acceso?
- ❓ ¿Están implementados los endpoints necesarios?
- ❓ ¿Hay datos de prueba (viajes) para testing?
- ❓ ¿El scanner QR funciona en móvil?

---

## 💡 LECCIONES DEL BUG ANTERIOR

### ❌ Lo que salió mal
1. Trigger de BD sin función implementada
2. Falta de validación en código antes de insertar
3. Sin tests automatizados para este flujo
4. Logging insuficiente para diagnosticar rápido

### ✅ Lo que se corrigió
1. Validación movida a código TypeScript
2. Función centralizada reutilizable
3. Logging exhaustivo en API
4. Documentación completa del problema

### 🎯 Mejores prácticas aplicadas
1. **"Validation in Code, not in DB"** - Lógica de negocio en aplicación
2. **"Test Everything"** - Cada endpoint debe tener tests
3. **"Log Everything"** - Logs detallados para debugging
4. **"Document Everything"** - Cada decisión documentada

---

## 📞 CONTACTOS Y RECURSOS

### Documentación Relacionada
- `docs/archive/SESION-DEBUG-CREACION-USUARIOS-15-DIC-2025.md` - Bug resuelto
- `PLAN-DE-ACCION.md` - Plan general del proyecto
- `INSTRUCCIONES-SISTEMA-TRANSPORTE.md` - Flujos operativos

### Archivos Clave Modificados Hoy
- `lib/validators/roleValidator.ts` (NUEVO)
- `pages/api/admin/nueva-invitacion.ts` (REFACTORIZADO)

### Recursos Técnicos
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Jest Testing](https://jestjs.io/docs/getting-started)

---

## 🎯 PRÓXIMA SESIÓN

### Preparación Necesaria
```powershell
# Verificar archivos existentes
Get-ChildItem -Path "pages" -Recurse -Filter "*control-acceso*"
Get-ChildItem -Path "pages/api/control-acceso" -ErrorAction SilentlyContinue

# Verificar componentes
Get-ChildItem -Path "components/ControlAcceso" -ErrorAction SilentlyContinue

# Verificar políticas RLS en Supabase
# (Ejecutar en SQL Editor)
SELECT * FROM pg_policies WHERE tablename IN ('viajes', 'usuarios_empresa');
```

### Preguntas para Resolver
1. ¿Existe ya la pantalla de Control de Acceso?
2. ¿Qué APIs de control-acceso están implementadas?
3. ¿Hay datos de prueba para testing?
4. ¿Las políticas RLS permiten las operaciones necesarias?

---

## ✅ CHECKLIST DE ENTREGA

### Semana 1 (17-20 Dic) - CRÍTICO
- [ ] Tests de roleValidator (5 tests)
- [ ] Tests de nueva-invitacion (4 tests)
- [ ] Pantalla control-acceso funcional
- [ ] API viajes-del-dia funcional
- [ ] API confirmar-accion funcional
- [ ] Testing E2E completo
- [ ] Documentación actualizada

### Semana 2 (23-27 Dic) - IMPORTANTE
- [ ] Scanner QR implementado
- [ ] Formulario de egreso con validaciones
- [ ] Políticas RLS verificadas
- [ ] Dashboard de métricas básico
- [ ] Notificaciones a supervisor

### Semana 3 (2-5 Ene) - MEJORAS
- [ ] Validaciones avanzadas
- [ ] PWA optimizada para móvil
- [ ] Sistema de alertas completo
- [ ] Documentación de usuario final

---

**Estado Actual:** 🟢 Validación de roles refactorizada exitosamente  
**Próximo Paso:** Crear tests para validador y API  
**Tiempo Estimado Total:** 20-25 horas de desarrollo  
**Fecha Objetivo:** 27 de diciembre de 2025

---

**Creado por:** GitHub Copilot  
**Última actualización:** 16 de diciembre de 2025  
**Revisión requerida:** Cada viernes (verificar progreso semanal)
