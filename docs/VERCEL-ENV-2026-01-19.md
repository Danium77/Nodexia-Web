# Protocolo de variables de entorno Vercel

- Se detectó y corrigió la ausencia de SUPABASE_SERVICE_ROLE_KEY en Vercel para producción.
- Se recomienda siempre tener:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (solo en backend)
- Después de agregar la variable, hacer redeploy para que los cambios tengan efecto.
