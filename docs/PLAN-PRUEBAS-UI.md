# PLAN DE PRUEBAS - CREACIÓN DESDE UI

## FASE 1: CREAR USUARIOS EN SUPABASE AUTH (MANUAL) ✅

### Ir a: Supabase Dashboard → Authentication → Users → Add User

Crear estos 7 usuarios:

1. **Admin Nodexia (Super Admin)**
   - Email: `admin@nodexia.com`
   - Password: `Nodexia2025!`
   - ✅ Confirm email automáticamente

2. **Coordinador Industrias del Centro**
   - Email: `coordinador@lacteos.com`
   - Password: `Demo2025!`
   - ✅ Confirm email automáticamente

3. **Usuario Acceso Industrias del Centro**
   - Email: `acceso@lacteos.com`
   - Password: `Demo2025!`
   - ✅ Confirm email automáticamente

4. **Coordinador Rápido Express**
   - Email: `coordinador@rapidoexpress.com`
   - Password: `Demo2025!`
   - ✅ Confirm email automáticamente

5. **Chofer Rápido Express**
   - Email: `chofer@rapidoexpress.com`
   - Password: `Demo2025!`
   - ✅ Confirm email automáticamente

6. **Visor MaxiConsumo**
   - Email: `visor@maxiconsumo.com`
   - Password: `Demo2025!`
   - ✅ Confirm email automáticamente

7. **Admin Nodexia 2 (Backup)**
   - Email: `superadmin@nodexia.com`
   - Password: `Nodexia2025!`
   - ✅ Confirm email automáticamente

---

## FASE 2: PROBAR FLUJO COMPLETO DESDE UI 🎯

### A. Login como Admin Nodexia
```
Email: admin@nodexia.com
Password: Nodexia2025!
```

### B. Crear Empresas desde Panel Admin
**Ruta:** `/admin/empresas` (o `/gestion-empresas`)

#### Empresa 1: Industrias del Centro (PLANTA)
- Nombre: `Industrias del Centro`
- CUIT: `30-12345678-9`
- Tipo: `planta` ⚠️ (NO "coordinador")
- Dirección: `Parque Industrial Este 1234`
- Localidad: `Villa María`
- Provincia: `Córdoba`
- Activo: ✅

#### Empresa 2: Rápido Express (TRANSPORTE)
- Nombre: `Rápido Express`
- CUIT: `30-45678901-2`
- Tipo: `transporte`
- Dirección: `Av. Libertador 890`
- Localidad: `Rosario`
- Provincia: `Santa Fe`
- Activo: ✅

#### Empresa 3: Industrias del Pacífico (CLIENTE)
- Nombre: `Industrias del Pacífico`
- CUIT: `30-78901234-5`
- Tipo: `cliente`
- Dirección: `Av. Córdoba 2000`
- Localidad: `CABA`
- Provincia: `Buenos Aires`
- Activo: ✅

### C. Asignar Usuarios a Empresas
**Ruta:** `/admin/usuarios` (o desde el panel de cada empresa)

#### Para Industrias del Centro:
- Usuario: `coordinador@industriacentro.com`
  - Rol: `coordinador_planta`
  - Empresa: Industrias del Centro
  
- Usuario: `acceso@industriacentro.com`
  - Rol: `acceso_planta`
  - Empresa: Industrias del Centro

#### Para Rápido Express:
- Usuario: `coordinador@rapidoexpress.com`
  - Rol: `coordinador_transporte`
  - Empresa: Rápido Express
  
- Usuario: `chofer@rapidoexpress.com`
  - Rol: `chofer`
  - Empresa: Rápido Express

#### Para MaxiConsumo:
- Usuario: `visor@maxiconsumo.com`
  - Rol: `visor_cliente`
  - Empresa: MaxiConsumo

### D. Crear Orígenes Globales
**Ruta:** `/admin/origenes`

#### Origen 1:
- Código: `PLT-001`
- Tipo: `planta`
- Nombre: `Planta Industrial Centro`
- Dirección: `Parque Industrial Este 1234`
- Localidad: `Villa María`
- Provincia: `Córdoba`
- Activo: ✅

#### Origen 2:
- Código: `DEP-ROS`
- Tipo: `deposito`
- Nombre: `Centro de Distribución Rosario`
- Dirección: `Zona Logística Norte`
- Localidad: `Rosario`
- Provincia: `Santa Fe`
- Activo: ✅

### E. Crear Destinos
**Ruta:** `/admin/destinos`

#### Destino 1 (Vinculado a Cliente):
- Código: `IND-PAC-01`
- Nombre: `Industrias del Pacífico CABA`
- Empresa Cliente: Industrias del Pacífico ⚠️ (seleccionar del dropdown)
- Razón Social: `Industrias del Pacífico`
- CUIT: `30-78901234-5`
- Dirección: `Av. Córdoba 2000`
- Localidad: `CABA`
- Provincia: `Buenos Aires`
- Activo: ✅

#### Destino 2 (Sin Cliente - Direcciones sueltas):
- Código: `DEST-INDEP-001`
- Nombre: `Almacén Independiente 1`
- Empresa Cliente: (vacío/null)
- Dirección: `Calle Comercio 111`
- Localidad: `Rosario`
- Provincia: `Santa Fe`
- Activo: ✅

---

## FASE 3: PROBAR COMO COORDINADOR PLANTA 🏭

### A. Logout y Login como Coordinador Industrial
```
Email: coordinador@industriacentro.com
Password: Demo2025!
```

### B. Agregar Transportes a Mi Planta
**Ruta:** `/configuracion` → Tab "Transportes"

- Agregar: Rápido Express
- Tarifa Acordada: `15000`
- Es Preferido: ✅
- Prioridad: `1`
- Estado: `activo`

### C. Agregar Orígenes a Mi Planta
**Ruta:** `/configuracion` → Tab "Orígenes"

- Seleccionar: PLT-001 (Planta Industrial Centro)
- Alias: `Planta Principal`
- Es Principal: ✅

- Seleccionar: DEP-ROS (Centro de Distribución Rosario)
- Alias: `Depósito Rosario`
- Es Principal: ❌

### D. Agregar Destinos Frecuentes a Mi Planta
**Ruta:** `/configuracion` → Tab "Destinos"

- Seleccionar: MAXI-ROSARIO-01
- Es Frecuente: ✅

### E. Crear un Despacho
**Ruta:** `/planificacion` o `/crear-despacho`

**Verificar que:**
- ✅ Solo aparecen los orígenes que agregué (PLT-001, DEP-ROS)
- ✅ Solo aparecen los destinos que agregué (MAXI-ROSARIO-01)
- ✅ Puedo crear el despacho completo

---

## FASE 4: PROBAR RED NODEXIA 🌐

### A. Publicar Oferta en Red Nodexia
**Como Coordinador Industrial:**

**Ruta:** `/red-nodexia/publicar`

- Seleccionar Despacho: (el que creaste)
- Urgencia: `alta`
- Comisión Nodexia: `8.5%`
- Fecha Expiración: (mañana)
- Publicar ✅

### B. Ver Ofertas Disponibles
**Como Coordinador Rápido Express:**

**Login:**
```
Email: coordinador@rapidoexpress.com
Password: Demo2025!
```

**Ruta:** `/red-nodexia/ofertas`

**Verificar que:**
- ✅ Veo la oferta publicada por Industrias del Centro
- ✅ Puedo ver detalles (origen, destino, mercadería)
- ✅ Se incrementa el contador de visualizaciones
- ✅ Puedo "Tomar Oferta" (si implementaste esta función)

---

## FASE 5: PROBAR PANEL ADMIN 👨‍💼

### A. Login como Admin Nodexia
```
Email: admin@nodexia.com
Password: Nodexia2025!
```

### B. Verificar Vistas Admin
**Rutas a verificar:**
- `/admin/empresas` → Ver/Editar/Crear empresas
- `/admin/usuarios` → Asignar usuarios a empresas con roles
- `/admin/origenes` → CRUD de orígenes globales
- `/admin/destinos` → CRUD de destinos
- `/admin/red-nodexia` → Ver todas las ofertas publicadas

---

## ✅ CHECKLIST DE VALIDACIÓN

### Base de Datos:
- [ ] Multi-rol habilitado (mismo user, múltiples roles en misma empresa)
- [ ] tipo_empresa usa: 'planta', 'transporte', 'cliente'
- [ ] Todas las 6 tablas nuevas existen con FK correctas
- [ ] RLS habilitado en todas las tablas

### Autenticación:
- [ ] Login funciona correctamente
- [ ] Signup está deshabilitado (solo admin crea usuarios)
- [ ] Roles se detectan correctamente por empresa

### UI - Coordinador Planta:
- [ ] Puedo agregar transportes permitidos
- [ ] Puedo agregar orígenes disponibles
- [ ] Puedo agregar destinos frecuentes
- [ ] Al crear despacho, solo veo mis orígenes/destinos agregados
- [ ] Puedo publicar oferta en Red Nodexia

### UI - Coordinador Transporte:
- [ ] Veo ofertas publicadas en Red Nodexia
- [ ] Se registran mis visualizaciones
- [ ] Puedo filtrar por urgencia/fecha/origen/destino

### UI - Admin:
- [ ] Puedo crear empresas (3 tipos)
- [ ] Puedo asignar usuarios a empresas con roles
- [ ] Puedo crear orígenes globales
- [ ] Puedo crear destinos (con o sin cliente vinculado)
- [ ] Veo todas las ofertas de Red Nodexia

---

## 📝 NOTAS IMPORTANTES

### Orden de Creación Recomendado:
1. ✅ Usuarios en Supabase Auth (MANUAL)
2. Empresas (desde Admin)
3. Asignar usuarios a empresas (desde Admin)
4. Orígenes globales (desde Admin)
5. Destinos (desde Admin)
6. Relaciones planta-transporte (desde Coordinador Planta)
7. Asignar orígenes a planta (desde Coordinador Planta)
8. Asignar destinos a planta (desde Coordinador Planta)
9. Crear despacho (desde Coordinador Planta)
10. Publicar en Red Nodexia (desde Coordinador Planta)
11. Ver ofertas (desde Coordinador Transporte)

### Errores Comunes a Verificar:
- ⚠️ Si al crear despacho no aparecen orígenes/destinos: verificar que los agregaste en configuración
- ⚠️ Si no puedes asignar roles: verificar constraint UNIQUE(user_id, empresa_id, rol_interno)
- ⚠️ Si no ves empresas del tipo correcto: verificar tipo_empresa ('planta' no 'coordinador')

---

## 🎯 SIGUIENTE PASO

**AHORA MISMO: Crear los 7 usuarios en Supabase Authentication**

Ir a: https://supabase.com/dashboard → Tu Proyecto → Authentication → Users → Add User

Crear cada uno con el email y password de la lista de arriba. ✅ Marcar "Auto Confirm Email" para todos.

Luego avísame y continuamos con la implementación/corrección de las páginas de la UI necesarias.
