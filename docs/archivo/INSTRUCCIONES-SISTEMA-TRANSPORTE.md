# Instrucciones: Configurar Sistema de Transporte Completo

## 📋 Resumen
Este documento explica cómo configurar las nuevas funcionalidades del sistema de transporte de Nodexia.

## 🗄️ Paso 1: Ejecutar Scripts SQL

### 1.1 Crear Tabla de Notificaciones
```bash
# En Supabase Dashboard > SQL Editor
# Ejecutar el archivo: sql/notificaciones.sql
```

Este script crea:
- ✅ Tabla `notificaciones` con RLS
- ✅ Funciones helper (get_notificaciones_count, marcar_todas_leidas)
- ✅ Trigger automático para notificar cambios de estado en viajes
- ✅ Función de limpieza de notificaciones antiguas

### 1.2 Crear Tabla de Documentos y Storage
```bash
# En Supabase Dashboard > SQL Editor
# Ejecutar el archivo: sql/documentos_viaje.sql
```

Este script crea:
- ✅ Tabla `documentos_viaje` con RLS
- ✅ Función get_documentos_viaje()
- ✅ Trigger para notificar cuando se sube un documento

**IMPORTANTE:** Después de ejecutar el SQL, debes crear el bucket manualmente:

```bash
# En Supabase Dashboard > Storage > Create new bucket
# Bucket name: remitos
# Public: NO (privado)
```

Luego ejecutar las políticas de Storage en SQL Editor (están comentadas en el archivo SQL):

```sql
-- Policy: Los usuarios pueden subir archivos a su empresa
CREATE POLICY "Usuarios suben remitos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'remitos'
  AND (storage.foldername(name))[1] IN (
    SELECT vd.id::TEXT
    FROM viajes_despacho vd
    INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE ue.user_id = auth.uid()
    AND ue.activo = TRUE
  )
);

-- Policy: Los usuarios pueden ver archivos de su empresa
CREATE POLICY "Usuarios ven remitos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'remitos'
  AND (storage.foldername(name))[1] IN (
    SELECT vd.id::TEXT
    FROM viajes_despacho vd
    INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE ue.user_id = auth.uid()
    AND ue.activo = TRUE
  )
);

-- Policy: Admins pueden eliminar archivos
CREATE POLICY "Admins eliminan remitos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'remitos'
  AND (storage.foldername(name))[1] IN (
    SELECT vd.id::TEXT
    FROM viajes_despacho vd
    INNER JOIN usuarios_empresa ue ON ue.empresa_id = vd.id_transporte
    WHERE ue.user_id = auth.uid()
    AND ue.activo = TRUE
    AND ue.rol_interno IN ('administrador_transporte', 'supervisor_transporte')
  )
);
```

## 🚀 Paso 2: Verificar Componentes Creados

### Nuevos Componentes
- ✅ `components/Transporte/ViajeDetalleModal.tsx` - Modal con detalle completo del viaje
- ✅ `components/Transporte/AceptarDespachoModal.tsx` - Modal para aceptar despachos
- ✅ `components/Transporte/UploadRemitoForm.tsx` - Form para subir documentos
- ✅ `components/layout/NotificationBell.tsx` - Campana de notificaciones

### Páginas Nuevas
- ✅ `pages/transporte/dashboard.tsx` - Dashboard completo integrado
- ✅ `pages/transporte/despachos-ofrecidos.tsx` - Lista de despachos disponibles

### Actualizaciones
- ✅ `components/layout/AdminLayout.tsx` - Ahora incluye NotificationBell en header

## 🔧 Paso 3: Crear Usuario de Transporte (Ya hecho por el usuario)

El usuario está creando un usuario de transporte desde:
```
/admin/usuarios > Nuevo Usuario > Seleccionar empresa tipo "transporte"
```

## 📱 Paso 4: Funcionalidades Disponibles

### Dashboard de Transporte (`/transporte/dashboard`)
- **Stats Cards**: Viajes pendientes, en curso, completados hoy, alertas
- **Lista de Viajes**: Con filtros por estado
- **Mapa de Flota**: Ubicación en tiempo real de todos los camiones
- **Click en viaje**: Abre modal con detalle completo

### Modal de Detalle de Viaje
Muestra:
- Timeline de estados (visual con animación)
- Origen y destino
- Fecha y hora programada
- Chofer asignado (nombre y teléfono)
- Camión y acoplado
- Producto y cantidad
- Observaciones
- **Botones para cambiar estado** (valida transiciones)
- **Sección de documentos** con upload integrado

### Gestión de Despachos Ofrecidos (`/transporte/despachos-ofrecidos`)
- Lista de despachos con estado "pendiente"
- Filtros: búsqueda, fecha, origen, destino
- Botón **Aceptar**: Abre modal para asignar chofer/camión
- Botón **Rechazar**: Solicita motivo y rechaza el despacho

### Modal de Aceptar Despacho
- Seleccionar **chofer** (solo disponibles)
- Seleccionar **camión** (solo disponibles)
- Seleccionar **acoplado** (opcional)
- Especificar **cantidad de viajes** (1-10)
- Crea automáticamente:
  - Registros en `viajes_despacho`
  - Actualiza estado del despacho
  - Marca chofer como no disponible
  - Marca camión/acoplado como en viaje
  - Crea notificación

### Sistema de Notificaciones
- **Icono de campana** en header con badge de count
- **Dropdown** con últimas 20 notificaciones
- **Realtime**: Se actualizan automáticamente
- **Tipos de notificaciones**:
  - Nuevo despacho asignado
  - Cambio de estado en viaje
  - Documento subido
  - Alertas y recordatorios
- **Click en notificación**: Marca como leída y navega al viaje
- **Notificaciones nativas** del navegador (si están permitidas)

### Upload de Documentos
Integrado en el modal de detalle de viaje:
- Seleccionar tipo: remito, comprobante, foto_carga, foto_descarga, firma, otro
- Upload de imágenes (JPG, PNG, GIF, WEBP) o PDF
- Preview de imágenes
- Progress bar
- Máximo 10MB por archivo
- Almacenamiento en Supabase Storage (bucket `remitos`)
- Registro en tabla `documentos_viaje`
- Notificación automática a coordinadores

## ✅ Checklist de Testing

### Test 1: Dashboard
- [ ] Acceder a `/transporte/dashboard` con usuario de transporte
- [ ] Verificar que se muestran las stats cards
- [ ] Verificar que se carga la lista de viajes
- [ ] Verificar que se muestra el mapa de flota
- [ ] Click en un viaje para abrir el modal

### Test 2: Modal de Detalle
- [ ] El modal se abre correctamente
- [ ] Se muestra toda la información del viaje
- [ ] La timeline de estados funciona correctamente
- [ ] Los botones de cambiar estado funcionan
- [ ] Se validan transiciones de estado (no retroceder)
- [ ] La sección de documentos se carga correctamente

### Test 3: Upload de Documentos
- [ ] Seleccionar tipo de documento
- [ ] Subir una imagen (preview funciona)
- [ ] Subir un PDF
- [ ] Verificar que se guarda en Supabase Storage
- [ ] Verificar que aparece en la lista de documentos
- [ ] Descargar documento subido

### Test 4: Despachos Ofrecidos
- [ ] Acceder a `/transporte/despachos-ofrecidos`
- [ ] Se listan despachos pendientes
- [ ] Filtros funcionan correctamente
- [ ] Click en "Aceptar" abre modal

### Test 5: Aceptar Despacho
- [ ] Se cargan choferes disponibles
- [ ] Se cargan camiones disponibles
- [ ] Se cargan acoplados disponibles
- [ ] Seleccionar chofer y camión
- [ ] Especificar cantidad de viajes
- [ ] Aceptar despacho
- [ ] Verificar que se crean los viajes en la BD
- [ ] Verificar que cambia el estado del despacho
- [ ] Verificar que se actualiza disponibilidad de recursos

### Test 6: Notificaciones
- [ ] La campana aparece en el header
- [ ] Se muestra el count de no leídas
- [ ] Click en campana abre dropdown
- [ ] Se listan notificaciones correctamente
- [ ] Marcar una como leída funciona
- [ ] Marcar todas como leídas funciona
- [ ] Eliminar notificación funciona
- [ ] Notificaciones en tiempo real (cambiar estado de un viaje desde otro navegador)

### Test 7: Notificaciones Automáticas
- [ ] Cambiar estado de un viaje genera notificación
- [ ] Subir documento genera notificación
- [ ] Aceptar despacho genera notificación

## 🐛 Solución de Problemas

### Error: "Tabla notificaciones no existe"
**Solución**: Ejecutar `sql/notificaciones.sql` en Supabase SQL Editor

### Error: "Bucket remitos not found"
**Solución**: 
1. Ir a Supabase Dashboard > Storage > Create new bucket
2. Nombre: `remitos`, Public: NO
3. Ejecutar las políticas de Storage del SQL

### Error: "No se pueden subir archivos"
**Solución**: Verificar que las políticas de Storage están aplicadas correctamente

### No aparecen notificaciones
**Solución**: 
1. Verificar que la tabla existe
2. Verificar que el trigger está creado
3. Verificar permisos RLS

### Choferes/Camiones no se listan
**Solución**: 
1. Ir a Flota/Choferes y agregar registros
2. Verificar que pertenecen a la empresa correcta
3. Verificar que tienen activo=true

## 📊 Estructura de Datos

### Notificaciones
```sql
notificaciones (
  id UUID,
  user_id UUID,
  empresa_id UUID,
  tipo VARCHAR(50),
  titulo VARCHAR(255),
  mensaje TEXT,
  leida BOOLEAN,
  viaje_id UUID,
  despacho_id UUID,
  pedido_id VARCHAR(50),
  created_at TIMESTAMP,
  leida_at TIMESTAMP
)
```

### Documentos de Viaje
```sql
documentos_viaje (
  id UUID,
  viaje_id UUID,
  tipo VARCHAR(50),
  nombre_archivo VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID,
  uploaded_at TIMESTAMP,
  descripcion TEXT
)
```

## 🎯 Próximos Pasos Sugeridos

1. **Perfil de Empresa de Transporte**
   - Editar datos: CUIT, razón social, domicilio
   - Subir documentos: seguros, habilitaciones
   - Configurar notificaciones

2. **Gestión de Flota Mejorada**
   - Historial de viajes por vehículo
   - Mantenimientos programados
   - Documentación de vehículos

3. **Gestión de Choferes Mejorada**
   - Generar credenciales para app móvil
   - Historial de viajes
   - Documentación (licencias, carnets)

4. **Reportes y Estadísticas**
   - Viajes por período
   - Rendimiento de choferes
   - Utilización de flota
   - Costos operativos

5. **App Móvil para Choferes**
   - Login con credenciales generadas
   - Ver viajes asignados
   - Actualizar estado en tiempo real
   - Subir fotos y documentos
   - Enviar ubicación GPS

## 📚 Documentación Adicional

- **GPS Tracking**: Ver `docs/GPS-TRACKING.md`
- **API Location Update**: Ver `pages/api/location/update.ts`
- **RLS Policies**: Ver archivos SQL individuales

## 🎉 Listo!

El sistema de transporte completo está ahora funcional. El usuario puede:
1. Ver dashboard con stats y mapa
2. Revisar despachos ofrecidos
3. Aceptar/rechazar despachos
4. Asignar choferes y camiones
5. Actualizar estados de viajes
6. Subir documentación (remitos, fotos)
7. Recibir notificaciones en tiempo real

Todos los componentes están integrados y listos para usar una vez que se ejecuten los scripts SQL y se cree el bucket de Storage.
