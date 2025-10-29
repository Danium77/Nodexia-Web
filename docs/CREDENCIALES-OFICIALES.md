# 🔐 CREDENCIALES OFICIALES - NODEXIA WEB
**Última actualización:** 19 de Octubre 2025  
**Versión:** 1.0 OFICIAL

---

## ⚠️ IMPORTANTE
Este es el **ÚNICO** documento oficial de credenciales. Cualquier otro documento con credenciales diferentes está DESACTUALIZADO.

---

## 👤 USUARIOS DE PRODUCCIÓN/DEMO

### 1️⃣ ADMIN NODEXIA (Super Admin)
```
Email:    admin@nodexia.com
Password: Nodexia2025!
Rol:      super_admin
Empresa:  Nodexia (Plataforma)
```

**Permisos:**
- ✅ Crear/editar/eliminar TODAS las empresas
- ✅ Crear/editar/eliminar TODOS los usuarios
- ✅ Crear orígenes globales
- ✅ Gestionar Red Nodexia
- ✅ Ver todas las estadísticas
- ✅ Acceso total al sistema

**Dashboard:** `/admin/super-admin-dashboard`

---

### 2️⃣ COORDINADOR PLANTA
```
Email:    coordinador@industriacentro.com
Password: Demo2025!
Rol:      coordinador
Empresa:  Industrias del Centro (Planta)
```

**Permisos:**
- ✅ Crear/editar despachos de su planta
- ✅ Asignar transportes
- ✅ Agregar transportes a red privada
- ✅ Publicar en Red Nodexia
- ✅ Ver planificación
- ✅ Ver estadísticas de su planta

**Dashboard:** `/coordinator-dashboard` o `/dashboard`

---

### 3️⃣ CONTROL DE ACCESO (Planta)
```
Email:    acceso@industriacentro.com
Password: Demo2025!
Rol:      control_acceso
Empresa:  Industrias del Centro (Planta)
```

**Permisos:**
- ✅ Escanear QR de despachos
- ✅ Registrar entradas/salidas
- ✅ Actualizar estados de despachos
- ❌ NO puede crear despachos

**Dashboard:** `/control-acceso`

---

### 4️⃣ COORDINADOR TRANSPORTE
```
Email:    coordinador@rapidoexpress.com
Password: Demo2025!
Rol:      coordinador_transporte
Empresa:  Rápido Express (Transporte)
```

**Permisos:**
- ✅ Ver despachos asignados a su empresa
- ✅ Ver ofertas de Red Nodexia
- ✅ Tomar ofertas de Red Nodexia
- ✅ Asignar choferes y vehículos
- ✅ Gestionar su flota
- ❌ NO puede crear despachos

**Dashboard:** `/dashboard` (vista transporte)

---

### 5️⃣ CHOFER
```
Email:    chofer@rapidoexpress.com
Password: Demo2025!
Rol:      chofer
Empresa:  Rápido Express (Transporte)
```

**Permisos:**
- ✅ Ver sus viajes asignados
- ✅ Actualizar estado de entregas
- ✅ Reportar incidencias
- ❌ NO puede ver otros viajes
- ❌ NO puede asignar viajes

**Dashboard:** `/dashboard` (vista chofer)

---

### 6️⃣ CLIENTE VISOR
```
Email:    visor@maxiconsumo.com
Password: Demo2025!
Rol:      visor
Empresa:  MaxiConsumo (Cliente)
```

**Permisos:**
- ✅ Ver despachos donde su empresa es destino
- ✅ Ver estados de entregas
- ❌ NO puede crear nada
- ❌ NO puede modificar nada
- ❌ SOLO visualización

**Dashboard:** `/dashboard` (vista cliente)

---

## 🧪 USUARIOS PARA TESTING MULTI-ROL

### 7️⃣ USUARIO MULTI-ROL (Coordinador + Control Acceso)
```
Email:    juan.perez@industriacentro.com
Password: Demo2025!
Roles:    coordinador, control_acceso
Empresa:  Industrias del Centro (Planta)
```

**Uso:** Testear que un usuario con múltiples roles puede cambiar entre ellos.

---

## 📊 RESUMEN DE CREDENCIALES

| # | Email | Rol | Empresa | Tipo |
|---|-------|-----|---------|------|
| 1 | admin@nodexia.com | super_admin | Nodexia | Admin |
| 2 | coordinador@industriacentro.com | coordinador | Industrias del Centro | Planta |
| 3 | acceso@industriacentro.com | control_acceso | Industrias del Centro | Planta |
| 4 | coordinador@rapidoexpress.com | coordinador_transporte | Rápido Express | Transporte |
| 5 | chofer@rapidoexpress.com | chofer | Rápido Express | Transporte |
| 6 | visor@industriaspacifico.com | visor | Industrias del Pacífico | Cliente |
| 7 | juan.perez@industriacentro.com | multi-rol | Industrias del Centro | Planta |

---

## 🏢 EMPRESAS DEMO

### Plantas (tipo_empresa = 'planta')
1. **Industrias del Centro** - CUIT: 30-12345678-9
2. **Manufactura Nacional SA** - CUIT: 30-23456789-0
3. **Planta Industrial Sur** - CUIT: 30-34567890-1

### Transportes (tipo_empresa = 'transporte')
1. **Rápido Express** - CUIT: 30-45678901-2
2. **Logística del Centro** - CUIT: 30-56789012-3
3. **Transporte Federal** - CUIT: 30-67890123-4

### Clientes (tipo_empresa = 'cliente')
1. **Industrias del Pacífico** - CUIT: 30-78901234-5
2. **Manufacturas del Norte** - CUIT: 30-89012345-6
3. **Distribuidora Industrial** - CUIT: 30-90123456-7

---

## 🔧 SCRIPT DE CREACIÓN

Para recrear estos usuarios en una BD limpia, usar:

```bash
node scripts/setup/seed_usuarios_oficiales.js
```

---

## 📝 NOTAS IMPORTANTES

### Política de Passwords
- **Producción:** Passwords más complejos
- **Demo/Testing:** `Demo2025!` para facilitar testing
- **Super Admin:** `Nodexia2025!` (más seguro)

### Multi-empresa
- Un usuario puede estar en MÚLTIPLES empresas
- Ejemplo: Consultor que trabaja para 2 plantas diferentes

### Multi-rol
- Un usuario puede tener MÚLTIPLES roles EN LA MISMA empresa
- Constraint: `UNIQUE(user_id, empresa_id, rol_interno)`

### Creación de Usuarios
- ✅ **Solo Admin Nodexia** puede crear usuarios
- ❌ **NO existe auto-registro** (signup deshabilitado)
- ✅ Proceso: Admin crea usuario → Asigna a empresa → Asigna rol(es)

---

## 🚀 TESTING RÁPIDO

### Login como Admin:
```
http://localhost:3000/login
Email: admin@nodexia.com
Password: Nodexia2025!
```

### Login como Coordinador:
```
http://localhost:3000/login
Email: coordinador@lacteos.com
Password: Demo2025!
```

---

**Estado:** ✅ OFICIAL  
**Mantener actualizado:** Este documento es la única fuente de verdad
