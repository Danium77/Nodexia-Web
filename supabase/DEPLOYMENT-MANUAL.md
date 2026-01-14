# 🚀 Deployment Manual - Edge Function (Sin CLI)

## Método 1: Dashboard de Supabase (5 minutos)

### Paso 1: Crear la Función en Dashboard

1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
2. Click en **"Create a new function"**
3. Completar:
   - **Name**: `expiracion-viajes`
   - **Code**: Copiar el contenido de `supabase/functions/expiracion-viajes/index.ts`
4. Click **"Deploy function"**

### Paso 2: Configurar Cron Schedule

1. En la función recién creada, ir a la pestaña **"Details"**
2. Buscar sección **"Cron schedule"**
3. Habilitar cron y configurar:
   ```
   */15 * * * *
   ```
   (cada 15 minutos)
4. Click **"Save"**

### Paso 3: Verificar

```sql
-- En SQL Editor, ejecutar:
SELECT * FROM ejecutar_expiracion_viajes();
```

---

## Método 2: GitHub Actions (Automático)

### Configuración Inicial (una sola vez)

1. **Obtener PROJECT_REF**
   - Dashboard → Settings → General → Reference ID
   - Ejemplo: `abcdefghijklmnop`

2. **Generar Access Token**
   - Dashboard → Settings → API → "Generate new token"
   - Guardar el token (se muestra una sola vez)

3. **Configurar GitHub Secrets**
   - Tu repositorio → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Crear dos secrets:
     ```
     Name: SUPABASE_PROJECT_REF
     Value: tu_project_ref_aqui
     
     Name: SUPABASE_ACCESS_TOKEN
     Value: tu_token_aqui
     ```

### Deployment

1. Hacer commit de los archivos:
   ```powershell
   git add .
   git commit -m "Add edge function para expiración de viajes"
   git push origin main
   ```

2. La función se desplegará automáticamente
3. Ver progreso en: Actions → Deploy Supabase Edge Function

---

## Verificación Post-Deployment

### 1. Probar manualmente la función

En Dashboard → Functions → expiracion-viajes → "Invoke function":

```json
{}
```

Deberías recibir:
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-01-09T...",
    "viajes_expirados": 0,
    "estado": "completado"
  }
}
```

### 2. Ver logs

Dashboard → Functions → expiracion-viajes → Logs

Buscar:
```
✅ Proceso completado: 0 viajes expirados
```

### 3. Verificar cron activo

Dashboard → Functions → expiracion-viajes → Details

Confirmar que aparece:
```
Cron: Every 15 minutes
Next run: 2026-01-09 15:15:00 UTC
```

---

## Troubleshooting

### Error: "Function not found"
- Verificar que el nombre es exactamente `expiracion-viajes`
- No usar mayúsculas ni espacios

### Error: "Permission denied"
- Verificar que la función SQL tiene:
  ```sql
  GRANT EXECUTE ON FUNCTION ejecutar_expiracion_viajes() TO authenticated;
  ```

### Cron no se ejecuta
- Verificar en Dashboard que el toggle de Cron está en ON
- Esperar hasta la próxima ejecución programada
- Revisar logs para errores

### Cambiar frecuencia

Formato cron:
```
*/5 * * * *   -> Cada 5 minutos
0 */1 * * *   -> Cada hora
0 0 * * *     -> Diariamente a medianoche
0 9 * * 1     -> Lunes a las 9am
```

---

## Código de la Edge Function (para copiar/pegar)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpiracionResponse {
  timestamp: string
  viajes_expirados: number
  estado: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Iniciando proceso de expiración de viajes...')

    const { data, error } = await supabase
      .rpc('ejecutar_expiracion_viajes')

    if (error) {
      console.error('❌ Error al ejecutar expiración:', error)
      throw error
    }

    const resultado = data as ExpiracionResponse

    console.log(`✅ Proceso completado: ${resultado.viajes_expirados} viajes expirados`)

    return new Response(
      JSON.stringify({
        success: true,
        data: resultado,
        message: `Se procesaron ${resultado.viajes_expirados} viajes`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Error crítico:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
```

---

## ¿Cuál método usar?

**Dashboard Manual** → Más rápido, ideal para testing  
**GitHub Actions** → Profesional, automático, ideal para producción

Recomendación: Empezar con Dashboard para probar, luego migrar a GitHub Actions.
