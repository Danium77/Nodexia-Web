# PENDIENTE CRÍTICO: Pase de Seguridad API

> **Prioridad**: CRÍTICA  
> **Estado**: PENDIENTE (post-MVP)  
> **Registrado**: 10-Feb-2026  
> **Motivo de postergación**: Se priorizaron correcciones funcionales para demo/presentación

## Contexto

Auditoría de seguridad completa realizada el 09-Feb-2026 sobre los 55+ API routes que usan `supabaseAdmin`. Se encontraron múltiples endpoints sin autenticación, sin scoping por empresa, o con bypass de seguridad para desarrollo.

## Hallazgos por Severidad

### 🔴 CRÍTICO (6 endpoints sin autenticación)

| Endpoint | Problema |
|---|---|
| `api/gps/registrar-ubicacion` | Sin auth, cualquiera puede registrar ubicaciones GPS |
| `api/gps/ultima-ubicacion` | Sin auth, expone ubicación de camiones |
| `api/gps/[camionId]` | Sin auth, historial GPS abierto |
| `api/debug-tabla` | Sin auth, permite consultar cualquier tabla |
| `api/migration/run` | Sin auth, puede ejecutar SQL arbitrario |
| `api/admin/crear-usuario-tecnoembalajes` | Sin auth, crea usuarios sin restricción |

### 🟠 ALTO (12+ endpoints auth sin scope)

| Endpoint | Problema |
|---|---|
| `api/documentacion/listar` | Auth OK pero sin filtro por empresa |
| `api/documentacion/estado-batch` | Auth OK pero acepta cualquier ID |
| `api/documentacion/[id]` | Auth OK pero sin verificar propiedad |
| `api/admin/walter/*` | Utilidades específicas sin scope |
| `api/control-acceso/documentos-detalle` | Auth OK, nuevo endpoint necesita scope futuro |

### 🟡 MEDIO (5 endpoints)

| Endpoint | Problema |
|---|---|
| `api/supervisor-carga` | Sin verificación de rol explícita |
| `api/ubicaciones/crear` | Sin scope por empresa |

## Plan de Acción

### Fase 1: Eliminar endpoints peligrosos
- [ ] Eliminar `api/debug-tabla` completamente
- [ ] Eliminar `api/migration/run` completamente
- [ ] Eliminar `api/admin/crear-usuario-tecnoembalajes`
- [ ] Eliminar todos los endpoints `api/admin/walter/*`

### Fase 2: Agregar autenticación
- [ ] Agregar auth a `api/gps/registrar-ubicacion` (validar que sea chofer asignado)
- [ ] Agregar auth a `api/gps/ultima-ubicacion`
- [ ] Agregar auth a `api/gps/[camionId]`
- [ ] Agregar auth a `api/control-acceso/escanear-qr` (verificar rol)

### Fase 3: Agregar scoping por empresa
- [ ] `api/documentacion/listar` → filtrar por empresa del usuario
- [ ] `api/documentacion/estado-batch` → verificar que las entidades pertenezcan a empresa del usuario
- [ ] `api/documentacion/[id]` → verificar propiedad del documento
- [ ] `api/control-acceso/documentos-detalle` → scope por viajes asignados

### Fase 4: Eliminar bypass de desarrollo
- [ ] Quitar bypass de auth en `api/gps/registrar-ubicacion` (modo dev)

## ⚠️ IMPORTANTE

**Esta tarea NO debe olvidarse.** Es crítica para la seguridad de datos de los clientes.  
Debe completarse ANTES del despliegue a producción con datos reales.

> "No deja de preocuparme el tema seguridad de datos. Tenemos que ser muy firmes en eso." — Cliente

---

## 🗄️ AUDITORÍA COMPLETA DE BASE DE DATOS (Post-MVP)

> **Registrado**: 10-Feb-2026  
> **Contexto**: Durante implementación de upload de remitos se detectó que no hay RLS policies en storage buckets, y hay tablas con datos stale (ej: `estado_unidad_viaje`).

### Fase 5: Revisar RLS en TODAS las tablas
- [ ] Auditar políticas RLS de cada tabla (viajes_despacho, despachos, choferes, camiones, etc.)
- [ ] Verificar que cada tabla tenga scope por `empresa_id` donde corresponda
- [ ] Verificar que roles solo accedan a datos de su empresa
- [ ] Documentar qué tablas usan RLS y cuáles no

### Fase 6: Storage Buckets — Policies
- [ ] Bucket `remitos` — crear RLS policies (INSERT/SELECT para authenticated)
- [ ] Bucket `documentacion-entidades` — revisar policies existentes
- [ ] Bucket `documentacion-viajes` — revisar policies existentes
- [ ] Migrar uploads client-side a API routes server-side donde corresponda (patrón seguro)

### Fase 7: Integridad de BD y relaciones
- [ ] Revisar Foreign Keys — validar que todas las relaciones existan y sean consistentes
- [ ] Tabla `estado_unidad_viaje` — tiene datos stale, evaluar si eliminarla o sincronizarla
- [ ] Tabla `estado_carga_viaje` — RPC `actualizar_estado_carga` NO EXISTE, se usa fallback directo
- [ ] Crear índices faltantes para queries frecuentes (viajes por empresa, por estado, etc.)
- [ ] Limpiar datos de demo/test antes de producción

### Fase 8: Variables de entorno y keys
- [ ] Verificar que `SUPABASE_SERVICE_ROLE_KEY` NUNCA esté en variables `NEXT_PUBLIC_*`
- [ ] Auditar que API routes server-side sean las únicas que usen `service_role`
- [ ] Rotar keys antes de producción si fueron expuestas en repos/logs
