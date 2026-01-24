/**
 * Helpers para queries de Supabase con soft delete
 * Aplica automáticamente filtro deleted_at IS NULL
 */

/**
 * Wrapper para queries que filtra registros eliminados automáticamente
 * 
 * @example
 * const query = supabase.from('choferes').select('*');
 * const { data } = await withDeletedFilter(query);
 * 
 * @param query - Query builder de Supabase
 * @returns Query con filtro deleted_at IS NULL aplicado
 */
export function withDeletedFilter<T>(query: any): any {
  return query.is('deleted_at', null);
}

/**
 * Tablas que usan soft delete (tienen columna deleted_at)
 */
export const SOFT_DELETE_TABLES = [
  'empresas',
  'usuarios',
  'usuarios_empresa',
  'choferes',
  'camiones',
  'acoplados',
  'despachos',
  'viajes_despacho',
  'relaciones_empresas'
] as const;

/**
 * Verifica si una tabla usa soft delete
 */
export function hasSoftDelete(tableName: string): boolean {
  return SOFT_DELETE_TABLES.includes(tableName as any);
}

/**
 * Soft delete de un registro (marca como eliminado)
 * 
 * @example
 * await softDelete(supabase, 'choferes', choferId);
 */
export async function softDelete(
  supabase: any,
  table: string,
  id: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  return { error };
}

/**
 * Restaurar un registro eliminado
 */
export async function restoreDeleted(
  supabase: any,
  table: string,
  id: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null })
    .eq('id', id);

  return { error };
}
