# Prompt para Continuar - 27 de Noviembre 2025

## Contexto del Sistema

**Proyecto:** Nodexia-Web  
**Stack:** Next.js 15.5.6 (Pages Router), Supabase PostgreSQL, TypeScript  
**Última sesión:** 26 de Noviembre 2025

## Estado Actual del Sistema

### Módulo de Gestión de Usuarios ✅ COMPLETADO

La gestión de usuarios está **completamente funcional**:

1. **Listado de usuarios** con datos completos:
   - Emails desde Supabase Auth
   - Roles y empresas desde usuarios_empresa
   - Filtros por búsqueda, empresa, rol y estado

2. **Creación de usuarios sin email**:
   - Auto-confirmación con `email_confirm: true`
   - Password temporal: `Temporal2024!`
   - Credenciales mostradas en pantalla 30 segundos
   - Entradas creadas en: profiles, usuarios, usuarios_empresa

3. **API de autenticación seguro**:
   - Endpoint: `/api/admin/usuarios-auth`
   - Solo accesible por super_admin o admin
   - Usa SUPABASE_SERVICE_ROLE_KEY (backend only)

4. **Usuarios activos**:
   - admin@nodexia.com (super_admin)
   - walter@logisticaexpres.com (chofer - Logística Express)
   - mariano@logisticaexpres.com (chofer - Logística Express)
   - + 19 usuarios más en el sistema

### Módulo de Transporte - Estado Dual ✅ FUNCIONAL

Sistema de estados duales implementado:

1. **Viajes Activos** (`/transporte/viajes-activos`):
   - UI rediseñada: lista 35% + mapa 65%
   - Checkboxes de selección múltiple
   - Modal de detalle con información completa
   - Consultas separadas para evitar conflictos de alias PostgreSQL

2. **Crear Despacho** (`/crear-despacho`):
   - Expansión de despachos muestra viajes correctamente
   - Estados duales con EstadoDualBadge
   - Columnas corregidas: scheduled_local_date, scheduled_local_time

3. **Seguimiento en Tiempo Real** (`/transporte/seguimiento-tiempo-real`):
   - TrackingView muestra viajes activos
   - Estados de carga actualizados correctamente

### Arquitectura de Datos

#### Tablas Clave

**Autenticación y Usuarios:**
```sql
auth.users                -- Supabase Auth (emails, passwords)
  ├─ profiles            -- Perfiles de usuario (rol_primario, empresa_id)
  ├─ usuarios            -- Datos básicos (nombre_completo, teléfono)
  └─ usuarios_empresa    -- Vinculación usuario-empresa-rol (rol_interno, activo)
```

**Transporte:**
```sql
despachos
  ├─ scheduled_local_date, scheduled_local_time
  └─ viajes_despacho
      ├─ estado_unidad_viaje (tracking GPS)
      └─ estado_carga_viaje (proceso de carga/descarga)
          ├─ fecha_planificacion
          ├─ fecha_cargando
          ├─ fecha_carga_completada
          ├─ fecha_descargando
          └─ peso_real_kg
```

### Problemas Conocidos Resueltos

✅ Columnas renombradas: fecha_despacho → scheduled_local_date  
✅ EstadoDualBadge: import por defecto → import nombrado  
✅ JOINs problemáticos → consultas separadas + mapeo manual  
✅ Cache de viajes → eliminado, siempre recarga  
✅ Filtros de usuarios → integración con Supabase Auth  
✅ Usuarios huérfanos → sincronización auth.users ↔ usuarios_empresa

## Próxima Sesión - Objetivos Potenciales

### Opción 1: Integración de Mapas en Viajes Activos

**Objetivo:** Reemplazar el placeholder del mapa con Google Maps funcional

**Tareas:**
1. Configurar Google Maps API key
2. Integrar componente GoogleMap en viajes-activos
3. Mostrar ubicación en tiempo real de unidades
4. Marcar origen y destino del viaje
5. Calcular y mostrar ruta óptima
6. Actualización automática cada N segundos

**Archivos a modificar:**
- `pages/transporte/viajes-activos.tsx`
- Crear: `components/Maps/GoogleMapViajes.tsx`

### Opción 2: Dashboard Operativo

**Objetivo:** Crear dashboard principal con métricas en tiempo real

**Tareas:**
1. Diseñar layout del dashboard
2. Cards de métricas: viajes activos, pendientes, completados
3. Gráfico de viajes por día/semana
4. Lista de alertas y excepciones
5. Mapa general con todas las unidades
6. Filtros por empresa, fecha, estado

**Archivos a crear:**
- `pages/dashboard-operativo.tsx`
- `components/Dashboard/MetricCards.tsx`
- `components/Dashboard/ViajesChart.tsx`
- `components/Dashboard/MapaGeneral.tsx`

### Opción 3: Gestión de Roles y Permisos

**Objetivo:** Sistema completo de roles y permisos granulares

**Tareas:**
1. Diseñar tabla de permisos por rol
2. UI para gestionar roles personalizados
3. Matriz de permisos (CRUD por módulo)
4. Middleware de autorización
5. HOCs para proteger componentes
6. Página de gestión de roles

**Archivos a crear:**
- `pages/admin/roles-permisos.tsx`
- `lib/middleware/checkPermissions.ts`
- `components/Admin/MatrizPermisos.tsx`
- SQL: crear tabla `permisos` y `rol_permisos`

### Opción 4: Módulo de Reportes

**Objetivo:** Sistema de reportes exportables con filtros avanzados

**Tareas:**
1. Diseñar tipos de reportes:
   - Viajes por período
   - Rendimiento de choferes
   - Costos operativos
   - Incidencias y demoras
2. UI de generación de reportes
3. Exportación a PDF, Excel, CSV
4. Gráficos y visualizaciones
5. Programación de reportes automáticos

**Archivos a crear:**
- `pages/reportes/index.tsx`
- `lib/services/reportes.ts`
- `lib/utils/exportPDF.ts`
- `lib/utils/exportExcel.ts`

### Opción 5: Mejoras en Sistema de Estados Duales

**Objetivo:** Optimizar y expandir sistema de estados

**Tareas:**
1. Agregar más estados intermedios
2. Logs de auditoría de cambios de estado
3. Notificaciones push cuando cambia estado
4. Timeline visual de estados del viaje
5. Reversión de estados (con permisos)
6. Validaciones de transiciones de estado

**Archivos a modificar:**
- `components/ui/EstadoDualBadge.tsx`
- Crear: `components/Transporte/TimelineEstados.tsx`
- Crear: `lib/services/estadosAudit.ts`

### Opción 6: Sincronización Automática de Usuarios

**Objetivo:** Prevenir desincronización entre auth.users y usuarios_empresa

**Tareas:**
1. Crear función SQL trigger para sincronización
2. Script de verificación y corrección automática
3. Dashboard de salud del sistema
4. Alertas cuando hay usuarios huérfanos
5. Herramienta de "recuperar usuarios"
6. Tests automatizados de sincronización

**Archivos a crear:**
- `sql/triggers/sync_auth_usuarios.sql`
- `pages/admin/sistema-salud.tsx`
- `lib/scripts/verificar-sincronizacion.ts`
- Tests: `__tests__/sync-usuarios.test.ts`

## Información Importante para Contexto

### Credenciales de Testing
```
Admin Principal:
Email: admin@nodexia.com
Rol: super_admin

Choferes de Prueba:
- walter@logisticaexpres.com (Walter Daniel Zayas)
- mariano@logisticaexpres.com (Mariano Demian Zayas)
Password temporal: Temporal2024!
```

### Variables de Entorno Críticas
```
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Solo backend
```

### Estructura de Navegación Actual
```
/admin/usuarios              → Gestión de usuarios
/transporte/viajes-activos   → Monitoreo en tiempo real
/crear-despacho              → Crear y gestionar despachos
/planificacion/seguimiento   → Tracking en tiempo real
/configuracion               → Configuración del sistema
```

### Comandos de Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar tests
npm test

# Linter
npm run lint
```

## Prompt de Inicio Sugerido

```
Hola, continuamos con Nodexia-Web. En la sesión anterior completamos el módulo de gestión de usuarios con integración a Supabase Auth. Todo funciona correctamente: filtros, creación de usuarios sin email, y sincronización de datos.

Para esta sesión me gustaría [ELEGIR UNA DE LAS OPCIONES ANTERIORES O PROPONER NUEVA].

¿Puedes revisar el estado actual y comenzar con [DESCRIPCIÓN DE LA TAREA]?
```

## Notas Adicionales

- **Performance:** El sistema maneja 22 usuarios y múltiples viajes activos sin problemas
- **Seguridad:** API endpoints protegidos con verificación de roles
- **UX:** Filtros, búsquedas y navegación funcionan fluidamente
- **Código limpio:** Logs de debug eliminados, código documentado
- **Scripts SQL:** Disponibles para diagnóstico y correcciones manuales

---

**Última actualización:** 26 de Noviembre 2025  
**Próxima sesión:** A definir según prioridades del usuario
