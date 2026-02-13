-- 060: Índice en usuarios_empresa(empresa_id)
-- Muchas queries y políticas RLS filtran por empresa_id,
-- pero solo existe como segunda columna en el unique compuesto (user_id, empresa_id, rol_interno).
-- PostgreSQL no puede usar ese índice para búsquedas solo por empresa_id.

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_empresa_id
ON usuarios_empresa(empresa_id);

-- Índice parcial para el hot-path de withAuth middleware:
-- SELECT ... FROM usuarios_empresa WHERE user_id = ? (AND activo = true implícito)
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_user_activo
ON usuarios_empresa(user_id)
WHERE activo = true;
