# Instrucciones Rápidas - Configuración de Empresas

## Error Actual
El sistema muestra: "Could not find a relationship between 'usuarios_empresa' and 'empresas'"

Esto indica que las tablas del sistema de empresas no existen en la base de datos.

## Solución Rápida

### Opción 1: Desde Supabase Dashboard (Recomendado)
1. Ve a [Supabase Dashboard](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a SQL Editor
4. Ejecuta estos scripts EN ORDEN:

```sql
-- 1. Crear funciones de configuración
\i sql/funciones_configuracion.sql

-- 2. Ejecutar configuración
SELECT configurar_estructura_empresas();

-- 3. Vincular usuarios demo
SELECT vincular_usuarios_demo();
```

### Opción 2: Desde la Interfaz Web
1. En la página de test, haz clic en "Configurar BD" 
2. Si aparece error sobre funciones faltantes, ejecuta primero `sql/funciones_configuracion.sql` en Supabase
3. Luego vuelve a hacer clic en "Configurar BD"

## Archivos de Configuración Disponibles

### Scripts SQL Principales:
- `sql/funciones_configuracion.sql` - Funciones RPC para configuración
- `sql/create_network_structure.sql` - Estructura completa de tablas
- `sql/setup_empresas_usuarios.sql` - Configuración de empresas demo
- `sql/verificar_tablas.sql` - Verificar estado de la BD

### Orden de Ejecución:
1. `funciones_configuracion.sql` (funciones RPC)
2. Usar botón "Configurar BD" en interfaz
3. Si hay problemas, ejecutar manualmente otros scripts

## Verificar Configuración

Una vez ejecutado, deberías ver:
- 2 empresas demo creadas
- Usuarios vinculados a empresas
- Relación comercial entre empresas
- Datos visibles en la interfaz de test

## Usuarios Demo Disponibles
- `admin.demo@nodexia.com` - Admin empresa coordinadora
- `transporte.demo@nodexia.com` - Admin empresa transporte

## Próximos Pasos
1. Configura la base de datos
2. Recarga la página de test
3. Simula login con diferentes usuarios
4. Prueba crear despachos entre empresas