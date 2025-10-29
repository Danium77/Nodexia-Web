# ARQUITECTURA OPERATIVA DE NODEXIA

**Documento vivo** - Fuente única de verdad sobre cómo funciona Nodexia  
**Última actualización:** 18 de Octubre 2025  
**Versión:** 1.0 (Post-Migración Arquitectónica)

---

## INICIO RÁPIDO: ¿Qué es Nodexia?

**Nodexia** es una plataforma logística que conecta:
- **Plantas** (fábricas, distribuidoras)  Crean despachos de mercadería
- **Transportes** (empresas logísticas)  Ejecutan los despachos
- **Clientes** (receptores finales)  Visualizan entregas

**Concepto Clave #1:** Las 3 son empresas en la tabla empresas, diferenciadas por tipo_empresa (planta, transporte, cliente)

---

## ARQUITECTURA: Tabla empresas

```sql
CREATE TABLE empresas (
  id UUID PRIMARY KEY,
  nombre VARCHAR(255),
  cuit VARCHAR(13) UNIQUE,
  tipo_empresa VARCHAR(20) CHECK (tipo_empresa IN ('planta', 'transporte', 'cliente')),
  direccion TEXT,
  localidad VARCHAR(100),
  provincia VARCHAR(100),
  empresa_planta_id UUID REFERENCES empresas(id),
  activa BOOLEAN DEFAULT true
);
```

**Estado actual (Post-migración 18-Oct-2025):**
- 8 Plantas
- 3 Transportes  
- 5 Clientes

---

## SISTEMA MULTI-ROL (IMPORTANTE)

**Concepto Clave #2:** Una misma persona puede tener múltiples roles EN LA MISMA EMPRESA

```sql
CREATE TABLE usuarios_empresa (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES empresas(id),
  rol_interno VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  UNIQUE(user_id, empresa_id, rol_interno)  -- Permite multi-rol
);
```

**Ejemplo real:**
```javascript
// Juan Pérez trabaja en Industrias del Centro
usuarios_empresa: [
  { user_id: 'uuid-juan', empresa_id: 'uuid-lacteos', rol_interno: 'coordinador' },
  { user_id: 'uuid-juan', empresa_id: 'uuid-lacteos', rol_interno: 'control_acceso' }
]
```

**Roles por tipo de empresa:**
```typescript
// En lib/types.ts
export const ROLES_BY_TIPO = {
  planta: ['coordinador', 'control_acceso', 'administrativo', 'visor'],
  transporte: ['coordinador_transporte', 'chofer', 'administrativo', 'visor'],
  cliente: ['visor']
};
```

| Empresa | Rol | Permisos |
|---------|-----|----------|
| Planta | coordinador | CRUD despachos, Red Nodexia, gestión transportes |
| Planta | control_acceso | Escanear QR, registrar entradas/salidas |
| Transporte | coordinador_transporte | Ver ofertas Red Nodexia, tomar despachos |
| Cliente | visor | Solo ver despachos donde su empresa es destino |

---

## RED NODEXIA (Marketplace de Transportes)

**Concepto Clave #3:** Marketplace automático donde plantas publican despachos que no pueden cubrir con su red privada

**Características:**
- **Auto-inclusión:** TODOS los transportes registrados ven ofertas (no necesitan ser agregados previamente)
- **Comisión:** Nodexia cobra porcentaje por intermediar
- **Urgencia:** baja, media, alta, urgente
- **Expiración:** Ofertas vencen automáticamente

```sql
CREATE TABLE ofertas_red_nodexia (
  id UUID PRIMARY KEY,
  despacho_id UUID REFERENCES despachos(id),
  empresa_planta_id UUID REFERENCES empresas(id),
  estado VARCHAR(20) DEFAULT 'publicada',  -- publicada, tomada, cancelada, expirada
  urgencia VARCHAR(20) DEFAULT 'media',
  tarifa_ofrecida NUMERIC(10,2),
  fecha_limite_respuesta TIMESTAMP,
  empresa_transporte_tomadora_id UUID REFERENCES empresas(id),
  fecha_tomada TIMESTAMP
);

CREATE TABLE visualizaciones_ofertas (
  id UUID PRIMARY KEY,
  oferta_id UUID REFERENCES ofertas_red_nodexia(id),
  empresa_transporte_id UUID REFERENCES empresas(id),
  UNIQUE(oferta_id, empresa_transporte_id)
);
```

**Flujo:**
1. Planta publica despacho (urgencia, tarifa, límite)
2. TODOS los transportes lo ven
3. Un transporte toma la oferta
4. Nodexia cobra comisión

---

## RELACIONES ENTRE EMPRESAS

### 1. Plantas  Transportes (Red Privada)

```sql
CREATE TABLE planta_transportes (
  id UUID PRIMARY KEY,
  empresa_planta_id UUID REFERENCES empresas(id),
  empresa_transporte_id UUID REFERENCES empresas(id),
  estado VARCHAR(20) DEFAULT 'activo',  -- activo, pausado, bloqueado
  tarifa_acordada NUMERIC(10,2),
  es_preferido BOOLEAN DEFAULT false,
  prioridad INTEGER DEFAULT 5,
  UNIQUE(empresa_planta_id, empresa_transporte_id)
);
```

### 2. Plantas  Orígenes (De dónde salen)

**IMPORTANTE:** Solo Admin Nodexia crea orígenes (globales). Plantas los agregan a su configuración.

```sql
CREATE TABLE origenes (
  id UUID PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE,  -- "PLT-001", "DEP-ROSARIO"
  tipo VARCHAR(20),  -- planta, deposito, centro_distribucion
  nombre VARCHAR(255),
  direccion TEXT,
  localidad VARCHAR(100),
  provincia VARCHAR(100),
  gps_latitud NUMERIC(10,8),
  gps_longitud NUMERIC(11,8)
);

CREATE TABLE planta_origenes (
  id UUID PRIMARY KEY,
  empresa_planta_id UUID REFERENCES empresas(id),
  origen_id UUID REFERENCES origenes(id),
  alias VARCHAR(100),  -- "Depósito Principal"
  es_origen_principal BOOLEAN,
  UNIQUE(empresa_planta_id, origen_id)
);
```

### 3. Plantas  Destinos (A dónde van)

**IMPORTANTE:** Clientes crean sus destinos. Plantas marcan cuáles usan frecuentemente.

```sql
CREATE TABLE destinos (
  id UUID PRIMARY KEY,
  empresa_cliente_id UUID REFERENCES empresas(id),
  codigo VARCHAR(50) UNIQUE,
  nombre VARCHAR(255),
  direccion TEXT,
  localidad VARCHAR(100),
  provincia VARCHAR(100),
  gps_latitud NUMERIC(10,8),
  gps_longitud NUMERIC(11,8),
  requiere_cita_previa BOOLEAN,
  horario_recepcion_inicio TIME,
  horario_recepcion_fin TIME
);

CREATE TABLE planta_destinos (
  id UUID PRIMARY KEY,
  empresa_planta_id UUID REFERENCES empresas(id),
  destino_id UUID REFERENCES destinos(id),
  es_destino_frecuente BOOLEAN,
  UNIQUE(empresa_planta_id, destino_id)
);
```

---

## FLUJO OPERATIVO COMPLETO

**Ejemplo: Industrias del Centro → MaxiConsumo**

```
PASO 1: CONFIGURACIÓN (Una vez)
[Admin] Crea empresas + origen global "PLT-001"
[Planta] Agrega PLT-001 + transporte "Rápido Express" ( tarifa)
[Cliente] Crea destino "MAXI-ROSARIO-01"

PASO 2: CREAR DESPACHO
[Coordinador Juan @ Industrias del Centro]
- Origen: PLT-001
- Destino: MAXI-ROSARIO-01
- Producto: Leche en polvo, 5000kg
 Sistema genera QR único

PASO 3A: Red Privada
Juan asigna "Rápido Express" (tarifa: ,000)

PASO 3B: Red Nodexia (alternativa)
Juan publica en Red Nodexia (tarifa: ,000, urgencia: alta)
 Transporte "Veloz SRL" toma
 Nodexia cobra comisión 10% = ,000

PASO 4: CONTROL ACCESO
[María - control_acceso @ Industrias del Centro]
- Escanea QR
- Registra patente, chofer
- Estado: "en_transito"

PASO 5: ENTREGA
Camión llega, cliente recibe
Estado: "entregado"
```

---

## BASE DE DATOS (12 tablas)

**Core:**
- empresas (16 registros)
- usuarios_empresa (multi-rol)
- destinos, origenes

**Relaciones:**
- planta_transportes (red privada)
- planta_origenes
- planta_destinos

**Operaciones:**
- despachos, choferes, camiones, acoplados

**Red Nodexia:**
- ofertas_red_nodexia
- visualizaciones_ofertas

**8 Funciones SQL:**
- validar_rol_por_tipo_empresa() - Trigger valida roles
- get_user_roles(), user_tiene_rol(), user_tiene_permiso()
- incrementar_visualizaciones(), expirar_ofertas_vencidas()
- get_dashboard_kpis()

**15+ Políticas RLS:**
- Admin Nodexia: acceso total
- Coordinador: CRUD su empresa
- Visor: solo lectura

---

## SEGURIDAD: Row-Level Security (RLS)

**Jerarquía:**
```
Admin Nodexia
   Acceso TOTAL a todo
   Crea empresas, usuarios, orígenes

Coordinador (planta)
   CRUD despachos de su planta
   Gestiona red de transportes
   Publica en Red Nodexia

Coordinador Transporte
   Ve Red Nodexia
   Toma despachos
   Asigna choferes

Control Acceso
   Escanea QR, registra entradas

Visor
   Solo lectura
```

```sql
CREATE FUNCTION user_tiene_permiso(p_user_id UUID, p_recurso VARCHAR, p_accion VARCHAR)
RETURNS BOOLEAN AS 3
  -- Admin  TRUE siempre
  -- Otros  Verifica rol y empresa según RLS
3 LANGUAGE plpgsql;
```

---

## STACK TECNOLÓGICO

**Frontend:**
- Next.js 15 (Pages Router)
- React 19 (Hooks)
- TypeScript 5 (Strict)
- Tailwind CSS 4

**Backend:**
- Supabase (PostgreSQL + Auth)
- Row-Level Security (RLS)
- PostgreSQL Functions

**Librerías:**
- @supabase/supabase-js
- react-hook-form + zod (validación)
- recharts (gráficos)

---

## CONVENCIONES

**Base de Datos:**
- Tablas: snake_case plural (empresas, planta_transportes)
- Columnas: snake_case (empresa_planta_id)
- IDs: UUID v4, siempre id como PK
- FKs: {tabla}_id

**TypeScript:**
- Tipos: PascalCase (Empresa, TipoEmpresa)
- Funciones: camelCase (getUserRoles)
- Constantes: SCREAMING_SNAKE_CASE (ROLES_BY_TIPO)

**Archivos:**
- Componentes: PascalCase (EmpresaForm.tsx)
- Pages: kebab-case (crear-despacho.tsx)
- Hooks: useNombre.ts

**Estructura:**
```
pages/
 admin/              # Solo Admin Nodexia
    empresas.tsx
    usuarios.tsx
    origenes.tsx
 configuracion/      # Solo Plantas
    agregar-transportes.tsx
    agregar-origenes.tsx
 red-nodexia/
    publicar.tsx    # Solo plantas
    ofertas.tsx     # Solo transportes

lib/
 types.ts            #  Tipos centrales
 navigation.ts       #  Rutas y permisos
 supabaseClient.ts
 hooks/

sql/migrations/
 001_migrar_coordinador_a_planta.sql
 002_crear_nuevas_tablas.sql
 003_tablas_intermedias.sql
 004_actualizar_usuarios_empresa.sql
 005_actualizar_rls_policies.sql
```

**Patrones de código:**

```typescript
// 1. Validación con Zod
const empresaSchema = z.object({
  nombre: z.string().min(3),
  cuit: z.string().regex(/^\d{11}$/),
  tipo_empresa: z.enum(['planta', 'transporte', 'cliente'])
});

// 2. Permisos en componentes
import { useUserRole } from '@/lib/hooks/useUserRole';
const { hasRole, isAdminNodexia } = useUserRole();

// 3. Queries con RLS
const { data } = await supabase
  .from('despachos')
  .select('*, origen:origenes(*)')
  .eq('empresa_planta_id', empresaId);
```

---

## PRÓXIMOS PASOS

**FASE 3: Panel Admin Nodexia (Siguiente - 2-3h)**
- pages/admin/empresas.tsx - Tabs planta/transporte/cliente
- pages/admin/usuarios.tsx - Asignación multi-rol
- pages/admin/origenes.tsx - Gestión global

**FASE 4: Configuración Plantas (1.5h)**
- Búsqueda transportes por CUIT
- Búsqueda clientes/destinos

**FASE 5: Red Nodexia UI (2h)**
- Publicar ofertas
- Ver/tomar ofertas

---

## ESTADO ACTUAL (18-Oct-2025)

** Completado:**
- coordinador  planta en toda la DB
- Multi-rol habilitado
- 7 nuevas tablas creadas
- 8 funciones SQL
- 15+ políticas RLS
- TypeScript sin errores

**Datos:**
```sql
SELECT tipo_empresa, COUNT(*) FROM empresas GROUP BY tipo_empresa;
-- planta: 8, transporte: 3, cliente: 5
```

---

**Última actualización:** 18 de Octubre 2025  
**Propósito:** Referencia rápida de arquitectura operativa