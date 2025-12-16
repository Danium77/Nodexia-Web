# Credenciales de Prueba - Sistema Nodexia

## 📋 Usuarios de Prueba por Rol

### 🏭 Coordinador de Planta - Aceitera

**Usuario:** Leandro (Aceitera)
- **Email:** `leandro@aceitera.com`
- **Contraseña:** `Aceitera123!`
- **Empresa:** Aceitera
- **Tipo:** Planta (Productor)
- **Rol:** Coordinador de Planta
- **Funciones:**
  - Crear pedidos
  - Crear despachos
  - Asignar despachos a empresas de transporte
  - Ver estado de entregas

---

### 🚛 Coordinador de Transporte - Logística Express

**Usuario:** Gonzalo (Logística Express SRL)
- **Email:** `gonzalo@logisticaexpres.com`
- **Contraseña:** `Tempicxmej9o!1862`
- **Empresa:** Logística Express SRL
- **Empresa ID:** `181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed`
- **Tipo:** Transporte
- **Rol:** Coordinador de Transporte
- **Funciones:**
  - Ver despachos ofrecidos/asignados
  - Asignar choferes y camiones a viajes
  - Gestionar flota (camiones, acoplados)
  - Gestionar choferes
  - Seguimiento de viajes

**Recursos de prueba:**
- **Chofer:** Walter Zayas (DNI: 30123456)
- **Camiones:** 2 unidades registradas
- **Acoplados:** 1 unidad registrada

---

### 👤 Chofer - Logística Express

**Usuario:** Walter Zayas
- **Nombre:** Walter
- **Apellido:** Zayas
- **DNI:** 30123456
- **Teléfono:** 1121608941
- **Empresa:** Logística Express SRL
- **Tipo:** Chofer
- **Funciones:**
  - Ver viajes asignados
  - Actualizar estado de viajes
  - Reportar posición GPS
  - Gestionar incidencias

---

## 🔐 Super Admin

**Usuario:** Super Admin
- **Email:** `admin.demo@nodexia.com`
- **Contraseña:** (Contactar administrador)
- **Rol:** Super Admin
- **Funciones:**
  - Gestión completa del sistema
  - Crear/modificar empresas
  - Asignar roles
  - Configuración global

---

## 📊 Datos de Prueba Actuales

### Despachos Creados:
- **DSP-20251030-001**
  - 3 viajes asignados a Logística Express
  - Origen: Centro de Distribución Rosario
  - Destinos: Varios molinos
  - Estado: Viajes pendientes de asignar chofer/camión

### Empresas Registradas:
1. **Aceitera** (Planta/Productor)
2. **Logística Express SRL** (Transporte)
3. **Molino Santa Rosa** (Cliente)

---

## 🔄 Flujo de Prueba Completo

1. **Login como Leandro** (aceitera)
   - Crear pedido para cliente
   - Crear despacho
   - Asignar a Logística Express

2. **Login como Gonzalo** (transporte)
   - Ver despachos ofrecidos
   - Asignar chofer (Walter Zayas) y camión
   - Confirmar asignación

3. **Login como Walter** (chofer)
   - Ver viaje asignado
   - Actualizar estado
   - Reportar ubicación

---

## 📝 Notas Importantes

- Todas las contraseñas siguen el formato: `[Empresa]123!`
- Los emails usan el formato: `[nombre]@[empresa].com`
- Los DNI de choferes son ficticios para pruebas
- Las empresas están pre-configuradas en Supabase
- Los roles se asignan mediante la tabla `usuarios_empresas`

---

## 🛠️ URLs de Acceso

- **Login:** `http://localhost:3002/login`
- **Dashboard Planta:** `http://localhost:3002/dashboard`
- **Dashboard Transporte:** `http://localhost:3002/transporte/dashboard`
- **Despachos Ofrecidos:** `http://localhost:3002/transporte/despachos-ofrecidos`
- **Gestión Flota:** `http://localhost:3002/dashboard?tab=flota`

---

**Última actualización:** 1 de noviembre de 2025
