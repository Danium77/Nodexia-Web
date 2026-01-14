# 🚀 Guía de Deployment - Edge Function Expiración

## Requisitos Previos

1. **Instalar Supabase CLI**
   ```powershell
   # Con npm
   npm install -g supabase
   
   # Con scoop
   scoop install supabase
   
   # Verificar instalación
   supabase --version
   ```

2. **Login a Supabase**
   ```powershell
   supabase login
   ```

## Configuración Inicial

### 1. Vincular Proyecto

```powershell
cd c:\Users\nodex\Nodexia-Web
supabase link --project-ref YOUR_PROJECT_REF
```

**¿Dónde encontrar PROJECT_REF?**
- Dashboard Supabase → Settings → General → Reference ID

### 2. Configurar Variables de Entorno

La función Edge ya tiene acceso a estas variables automáticamente:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

No necesitas configurar nada manualmente.

## Deployment

### 1. Deploy de la Función

```powershell
# Desplegar la función
supabase functions deploy expiracion-viajes

# Verificar que se desplegó correctamente
supabase functions list
```

### 2. Configurar Cron Job

El archivo `config.toml` ya tiene la configuración:
```toml
[functions.expiracion-viajes]
cron = "*/15 * * * *"  # Cada 15 minutos
```

**Activar el cron en Supabase Dashboard:**
1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
2. Encontrar función `expiracion-viajes`
3. Click en "Enable cron"
4. Verificar que el schedule aparece como "Every 15 minutes"

### 3. Verificar Funcionamiento

```powershell
# Ver logs en tiempo real
supabase functions logs expiracion-viajes --follow

# Invocar manualmente (testing)
supabase functions invoke expiracion-viajes
```

## Testing Local (Opcional)

```powershell
# Iniciar función localmente
supabase functions serve expiracion-viajes

# En otra terminal, invocar
curl http://localhost:54321/functions/v1/expiracion-viajes
```

## Monitoreo

### Dashboard Supabase
- Functions → `expiracion-viajes` → Logs
- Ver invocaciones, errores y duración

### Queries SQL para Monitoreo

```sql
-- Ver últimos viajes expirados
SELECT * FROM vista_viajes_expirados 
ORDER BY fecha_expiracion DESC 
LIMIT 10;

-- Métricas del último mes
SELECT * FROM get_metricas_expiracion(
  NOW() - INTERVAL '30 days',
  NOW()
);

-- Ejecutar manualmente
SELECT * FROM ejecutar_expiracion_viajes();
```

## Troubleshooting

### Función no se ejecuta automáticamente
1. Verificar que el cron está habilitado en Dashboard
2. Revisar logs: `supabase functions logs expiracion-viajes`
3. Verificar que `config.toml` está en el directorio raíz de supabase/

### Error de permisos
- Asegurarse de que las funciones SQL tienen `GRANT EXECUTE TO authenticated`
- Verificar RLS policies en tablas `viajes_despacho` y `despachos`

### Cambiar frecuencia de ejecución

Editar `supabase/config.toml`:
```toml
cron = "0 */1 * * *"  # Cada hora
cron = "0 0 * * *"    # Diariamente a medianoche
cron = "*/5 * * * *"  # Cada 5 minutos
```

Luego re-deployar:
```powershell
supabase functions deploy expiracion-viajes
```

## Costos

Edge Functions en Supabase:
- **Free tier**: 500,000 invocaciones/mes
- Cada 15 min = ~2,880 invocaciones/mes
- **Costo: $0** (dentro del tier gratuito)

## Comandos Útiles

```powershell
# Ver todas las funciones
supabase functions list

# Ver logs
supabase functions logs expiracion-viajes --follow

# Eliminar función (si necesitas)
supabase functions delete expiracion-viajes

# Re-deployar después de cambios
supabase functions deploy expiracion-viajes
```

## Próximos Pasos

Después del deployment:
1. ✅ Verificar primera ejecución en logs
2. ✅ Configurar alerta en Dashboard si hay > 10 viajes expirados
3. ✅ Agregar indicador visual en frontend
4. ✅ Documentar en wiki interna el proceso

---

**Documentación oficial:**
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/schedule-functions
