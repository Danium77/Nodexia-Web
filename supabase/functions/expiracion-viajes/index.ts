// ============================================================================
// Edge Function: Expiración Automática de Viajes
// ============================================================================
// Ejecuta cada 15 minutos para marcar viajes expirados
// Deployment: supabase functions deploy expiracion-viajes
// ============================================================================

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con credenciales de servicio
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Iniciando proceso de expiración de viajes...')

    // Ejecutar función RPC
    const { data, error } = await supabase
      .rpc('ejecutar_expiracion_viajes')

    if (error) {
      console.error('❌ Error al ejecutar expiración:', error)
      throw error
    }

    const resultado = data as ExpiracionResponse

    console.log(`✅ Proceso completado: ${resultado.viajes_expirados} viajes expirados`)
    console.log(`⏰ Timestamp: ${resultado.timestamp}`)

    return new Response(
      JSON.stringify({
        success: true,
        data: resultado,
        message: `Se procesaron ${resultado.viajes_expirados} viajes`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
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
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})

/* 
TESTING LOCAL:
supabase functions serve expiracion-viajes

DEPLOYMENT:
supabase functions deploy expiracion-viajes

INVOKE MANUAL:
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expiracion-viajes' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
*/
