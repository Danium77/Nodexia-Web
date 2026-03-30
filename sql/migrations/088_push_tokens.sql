-- ============================================================
-- Migration 088: Push tokens for mobile notifications (FCM/APNs)
-- ============================================================

-- Tabla para almacenar tokens de push notification por dispositivo
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un usuario puede tener múltiples dispositivos, pero no tokens duplicados
  UNIQUE(user_id, token)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- RLS: solo el propio usuario puede ver/modificar sus tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS (para envío de notificaciones desde backend)

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 088: push_tokens table created';
  RAISE NOTICE '   • Columns: id, user_id, token, platform, app_version, created_at, updated_at';
  RAISE NOTICE '   • UNIQUE constraint on (user_id, token)';
  RAISE NOTICE '   • RLS enabled — users can only manage own tokens';
END $$;
