# 🎭 NODEXIA WEB - DATOS DEMO PARA PRESENTACIÓN

## 📋 Resumen

Se han generado **datos demo completos y realistas** para la presentación del proyecto Nodexia-Web. Todos los datos están claramente marcados como **DEMO** para fácil identificación y posterior eliminación.

## 📊 Datos Generados

### ✅ Despachos (30 registros)
- **8** Pendientes de transporte  
- **7** Con transporte asignado
- **4** En tránsito
- **4** Entregados
- **7** Cancelados

### ✅ Transportes (7 unidades)
- DEMO_Transporte Buenos Aires
- DEMO_Logística Rosario  
- DEMO_Carga Córdoba Express
- DEMO_Transporte Mendoza
- DEMO_Distribución Norte
- DEMO_Logística Patagonia
- DEMO_Express La Plata

### ✅ Estados Variados
- Origen/Destino: 14 ciudades argentinas
- Clientes: 15 empresas reconocibles  
- Tipos de carga: paletizada, granel, contenedores, refrigerada, peligrosa
- Prioridades: Baja, Normal, Alta, Urgente
- Fechas: Últimos 30 días con distribución realista

## 🚀 URLs de la Aplicación

**Servidor de desarrollo:** http://localhost:3000

### 📍 Secciones Principales
- **Inicio:** http://localhost:3000/
- **Dashboard:** http://localhost:3000/dashboard  
- **Crear Despachos:** http://localhost:3000/crear-despacho
- **Planificación:** http://localhost:3000/planificacion
- **Estadísticas:** http://localhost:3000/estadisticas
- **Configuración:** http://localhost:3000/configuracion

### 🔐 Login Demo
- **Usuario:** coordinador@demo.com
- **Contraseña:** [según configuración del sistema]

## 🎯 Para la Presentación

### 1. **Dashboard** 
- Muestra métricas calculadas en tiempo real
- Gráficos de estados de despachos
- KPIs de rendimiento

### 2. **Crear Despachos**
- 30 despachos con estados variados
- Funcionalidad de asignación de transportes
- Filtros y búsquedas

### 3. **Planificación**
- Vista de calendario con eventos
- Gestión de recursos y horarios

### 4. **Estadísticas**  
- Reportes y analytics
- Tendencias y métricas históricas

## 🧹 Después de la Presentación

### Verificar Datos Demo
```bash
node cleanup_demo.js --summary
```

### Eliminar TODOS los Datos Demo
```bash
node cleanup_demo.js --clean
```

### Verificación Manual en BD
```sql
-- Verificar despachos demo
SELECT COUNT(*) FROM despachos WHERE pedido_id LIKE 'DEMO_%';

-- Verificar transportes demo  
SELECT COUNT(*) FROM transportes WHERE nombre LIKE 'DEMO_%';

-- Eliminar manualmente si es necesario
DELETE FROM despachos WHERE pedido_id LIKE 'DEMO_%';
DELETE FROM transportes WHERE nombre LIKE 'DEMO_%';
DELETE FROM choferes WHERE dni LIKE 'DEMO_%';
```

## 📝 Scripts Disponibles

- `generate_demo_data_fixed.js` - Generar datos base (despachos y transportes)
- `generate_extended_demo.js` - Generar datos adicionales (usuarios, incidencias, etc.)
- `cleanup_demo.js` - Gestionar y limpiar datos demo
- `verify_demo.js` - Verificar datos generados

## ⚠️ Notas Importantes

1. **Identificación Clara:** Todos los datos demo tienen prefijo `DEMO_` o contienen "DEMO" en su nombre
2. **No Afecta Producción:** Los datos demo no interfieren con datos reales
3. **Fácil Limpieza:** Script automatizado para eliminación completa
4. **Datos Realistas:** Información verosímil para demostración profesional

## 🎊 ¡Todo Listo!

La aplicación está completamente preparada para la presentación con datos demo realistas en todas las secciones principales. 

**¡Éxito en tu presentación!** 🚀