# 🚀 Guía de APIs - Nodexia Web

## 📡 Arquitectura de APIs

### 🏗️ Estructura General

```
pages/api/
├── admin/              # APIs de administración
├── control-acceso/     # APIs de control de acceso
├── supervisor-carga/   # APIs de supervisión de carga
├── usuario/           # APIs de usuario final
└── hello.ts           # API de prueba
```

## 🔐 Autenticación y Middleware

### 🛡️ Middleware de Autenticación

**Archivo**: `lib/middleware/withAdminAuth.ts`

```typescript
import { withAdminAuth } from '@/lib/middleware/withAdminAuth';

export default withAdminAuth(async (req, res, user) => {
  // Tu lógica de API aquí
  // user contiene los datos del usuario autenticado
});
```

**Funcionalidades**:
- ✅ Verificación de JWT de Supabase
- ✅ Validación de roles y permisos
- ✅ Manejo de errores de autenticación
- ✅ Rate limiting básico

### 🔑 Roles y Permisos

```typescript
// Roles disponibles
type UserRole = 
  | 'super_admin'      // Acceso total al sistema
  | 'coordinator'      // Coordinación y supervisión
  | 'supervisor_carga' // Supervisión de operaciones de carga
  | 'control_acceso'   // Control de acceso y seguridad
  | 'transporte'       // Empresa de transporte
  | 'cliente'          // Cliente final
  | 'chofer';          // Conductor

// Verificación de permisos
const hasPermission = (userRole: UserRole, requiredRole: UserRole) => {
  const roleHierarchy = {
    super_admin: 7,
    coordinator: 6,
    supervisor_carga: 5,
    control_acceso: 4,
    transporte: 3,
    cliente: 2,
    chofer: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
```

## 📋 APIs de Administración

### 👥 Gestión de Usuarios

#### `POST /api/admin/crear-usuario`
**Propósito**: Crear un nuevo usuario en el sistema

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "role": "coordinator",
  "empresa_id": "uuid-empresa",
  "telefono": "+54911234567"
}
```

**Response 200**:
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": "uuid-usuario",
    "email": "usuario@ejemplo.com",
    "role": "coordinator",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Response 400**:
```json
{
  "success": false,
  "error": "Email ya existe en el sistema"
}
```

#### `PUT /api/admin/editar-usuario`
**Propósito**: Actualizar datos de un usuario existente

**Body**:
```json
{
  "user_id": "uuid-usuario",
  "nombre": "Juan Carlos",
  "apellido": "Pérez González",
  "telefono": "+54911234567",
  "activo": true
}
```

#### `DELETE /api/admin/eliminar-usuario`
**Propósito**: Eliminar usuario del sistema

**Body**:
```json
{
  "user_id": "uuid-usuario",
  "confirmation": true
}
```

### 🏢 Gestión de Empresas

#### `GET /api/admin/listar-empresas`
**Propósito**: Obtener lista de empresas

**Query Parameters**:
- `tipo`: Filtrar por tipo (`transporte`, `cliente`, `coordinador`)
- `activa`: Filtrar por estado (`true`, `false`)
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "empresas": [
      {
        "id": "uuid-empresa",
        "nombre": "Transportes Demo S.A.",
        "tipo_empresa": "transporte",
        "contacto_email": "contacto@transportes.com",
        "telefono": "+54111234567",
        "activa": true,
        "created_at": "2024-01-01T00:00:00Z",
        "usuarios_count": 5
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

## 🚛 APIs de Control de Acceso

### 📱 Escaneo QR

#### `POST /api/control-acceso/escanear-qr`
**Propósito**: Procesar escaneo de código QR para control de acceso

**Body**:
```json
{
  "qr_data": "DESPACHO_ID:uuid-despacho:ACTION:entrada",
  "location": {
    "lat": -34.6037,
    "lng": -58.3816
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response - Entrada Autorizada**:
```json
{
  "success": true,
  "action": "entrada_autorizada",
  "data": {
    "despacho_id": "uuid-despacho",
    "pedido_id": "PED-001",
    "origen": "Buenos Aires",
    "destino": "Córdoba",
    "estado_anterior": "pendiente",
    "estado_nuevo": "en_proceso",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "message": "Entrada autorizada. Despacho iniciado."
}
```

**Response - QR Inválido**:
```json
{
  "success": false,
  "error": "QR_INVALID",
  "message": "Código QR inválido o expirado"
}
```

### 🚨 Gestión de Incidencias

#### `POST /api/control-acceso/crear-incidencia`
**Propósito**: Registrar una nueva incidencia

**Body**:
```json
{
  "despacho_id": "uuid-despacho",
  "tipo": "retraso",
  "descripcion": "Demora por tráfico en autopista",
  "severidad": "media",
  "ubicacion": {
    "lat": -34.6037,
    "lng": -58.3816,
    "descripcion": "Km 50 Autopista del Oeste"
  },
  "evidencia": [
    {
      "tipo": "foto",
      "url": "https://storage.url/foto.jpg"
    }
  ]
}
```

## 📦 APIs de Supervisor de Carga

### 🏁 Gestión de Carga

#### `POST /api/supervisor-carga/iniciar-carga`
**Propósito**: Iniciar proceso de carga

**Body**:
```json
{
  "despacho_id": "uuid-despacho",
  "ubicacion_carga": {
    "direccion": "Av. Corrientes 1234, CABA",
    "lat": -34.6037,
    "lng": -58.3816
  },
  "observaciones": "Carga frágil - manipular con cuidado"
}
```

#### `POST /api/supervisor-carga/finalizar-carga`
**Propósito**: Finalizar proceso de carga

**Body**:
```json
{
  "despacho_id": "uuid-despacho",
  "peso_total": 2500.5,
  "cantidad_bultos": 45,
  "documentos": [
    {
      "tipo": "remito",
      "numero": "R-001-2024",
      "url": "https://storage.url/remito.pdf"
    }
  ],
  "fotos_carga": [
    "https://storage.url/foto1.jpg",
    "https://storage.url/foto2.jpg"
  ]
}
```

## 🔄 APIs Generales

### 📊 Dashboard y Estadísticas

#### `GET /api/dashboard/stats`
**Propósito**: Obtener estadísticas del dashboard

**Response**:
```json
{
  "success": true,
  "data": {
    "despachos": {
      "total": 150,
      "pendientes": 25,
      "en_proceso": 45,
      "completados": 80
    },
    "empresas": {
      "activas": 12,
      "total": 15
    },
    "usuarios": {
      "conectados": 23,
      "total": 67
    },
    "incidencias": {
      "abiertas": 3,
      "resueltas_hoy": 8
    }
  }
}
```

### 🔍 Búsqueda y Filtros

#### `GET /api/search`
**Propósito**: Búsqueda global en el sistema

**Query Parameters**:
- `q`: Término de búsqueda
- `type`: Tipo de búsqueda (`despachos`, `usuarios`, `empresas`)
- `filters`: Filtros adicionales (JSON encoded)

**Example**:
```
GET /api/search?q=transportes&type=empresas&filters={"activa":true}
```

## 🚨 Manejo de Errores

### 📋 Códigos de Error Estándar

```typescript
// Errores de autenticación
AUTH_REQUIRED = 401        // Token requerido
AUTH_INVALID = 401         // Token inválido
AUTH_EXPIRED = 401         // Token expirado
INSUFFICIENT_PERMISSIONS = 403  // Permisos insuficientes

// Errores de validación
VALIDATION_ERROR = 400     // Datos inválidos
MISSING_REQUIRED_FIELD = 400  // Campo requerido faltante
INVALID_FORMAT = 400       // Formato incorrecto

// Errores de negocio
RESOURCE_NOT_FOUND = 404   // Recurso no encontrado
DUPLICATE_RESOURCE = 409   // Recurso duplicado
BUSINESS_RULE_VIOLATION = 422  // Violación de regla de negocio

// Errores del servidor
INTERNAL_ERROR = 500       // Error interno
DATABASE_ERROR = 500       // Error de base de datos
EXTERNAL_SERVICE_ERROR = 502  // Error de servicio externo
```

### 🛡️ Estructura de Error Response

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Datos de entrada inválidos",
  "details": {
    "field": "email",
    "code": "INVALID_EMAIL_FORMAT",
    "message": "El formato del email es inválido"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "uuid-request"
}
```

## 🧪 Testing de APIs

### 🔧 Herramientas Recomendadas

```bash
# Instalación de herramientas de testing
npm install -D supertest @types/supertest

# Testing con Jest + Supertest
npm run test:api
```

### 📝 Ejemplo de Test

```typescript
import request from 'supertest';
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/admin/crear-usuario';

describe('/api/admin/crear-usuario', () => {
  it('should create user successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token'
      },
      body: {
        email: 'test@example.com',
        nombre: 'Test',
        apellido: 'User',
        role: 'coordinator'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          email: 'test@example.com'
        })
      })
    );
  });
});
```

## 📚 Documentación Adicional

### 🔗 Enlaces Útiles
- [Supabase Auth API](https://supabase.com/docs/reference/javascript/auth-api)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript API Types](./types/api.ts)

### 🔔 Rate Limiting

Por defecto, todas las APIs tienen un rate limit de:
- **100 requests/minuto** para usuarios autenticados
- **20 requests/minuto** para endpoints públicos

### 📝 Logs y Monitoring

```typescript
// Logging estructura recomendada
console.log({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  endpoint: req.url,
  method: req.method,
  user_id: user?.id,
  request_id: generateRequestId(),
  message: 'Usuario creado exitosamente',
  metadata: { email: userData.email }
});
```

---

**Última actualización**: Octubre 2025  
**Versión**: 1.0  
**Mantenedor**: Equipo Nodexia