import { supabaseAdmin } from '../supabaseAdmin';

/**
 * Resultado de la validación de un rol para una empresa
 */
export interface RoleValidationResult {
  valid: boolean;
  error?: string;
  roleId?: string;
  roleData?: {
    id: string;
    nombre_rol: string;
    tipo_empresa: string;
  };
}

/**
 * Valida que un rol sea aplicable para un tipo de empresa específico
 * 
 * Esta función centraliza la lógica que antes estaba en el trigger de BD
 * trigger_validar_rol -> validar_rol_por_tipo_empresa()
 * 
 * Reglas de validación:
 * 1. El rol debe existir en la tabla roles_empresa
 * 2. El rol debe estar activo (activo = true)
 * 3. El rol debe ser compatible con el tipo de empresa:
 *    - tipo_empresa = 'planta' -> rol con tipo_empresa = 'planta' o 'ambos'
 *    - tipo_empresa = 'transporte' -> rol con tipo_empresa = 'transporte' o 'ambos'
 * 
 * @param roleName - Nombre del rol a validar (ej: "Control de Acceso", "coordinador")
 * @param companyId - UUID de la empresa
 * @returns Resultado de la validación con el ID del rol si es válido
 * 
 * @example
 * ```typescript
 * const result = await validateRoleForCompany('Control de Acceso', 'empresa-uuid');
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * const roleId = result.roleId;
 * ```
 */
export async function validateRoleForCompany(
  roleName: string,
  companyId: string
): Promise<RoleValidationResult> {
  try {
    // 1. Obtener el tipo de empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre, tipo_empresa')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return {
        valid: false,
        error: `Company not found: ${companyId}`
      };
    }

    // 2. Mapear nombre interno a nombre de rol en BD
    const roleNameMap: Record<string, string> = {
      'control_acceso': 'Control de Acceso',
      'coordinador': 'Coordinador de Planta',
      'supervisor': 'Supervisor de Carga',
      'administrativo': 'Administrativo Planta',
      'chofer': 'Chofer',
      'admin_nodexia': 'Administrador Nodexia',
      'visor': 'Visor'
    };

    const dbRoleName = roleNameMap[roleName] || roleName;

    // 3. Buscar el rol que coincida con el nombre y sea compatible con el tipo de empresa
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles_empresa')
      .select('id, nombre_rol, tipo_empresa')
      .eq('nombre_rol', dbRoleName)
      .in('tipo_empresa', [company.tipo_empresa, 'ambos'])
      .eq('activo', true)
      .order('tipo_empresa', { ascending: false }) // Preferir tipo específico sobre 'ambos'
      .limit(1)
      .single();

    if (roleError || !role) {
      return {
        valid: false,
        error: `Role "${dbRoleName}" not valid for company type "${company.tipo_empresa}". ` +
               `Available roles must match tipo_empresa="${company.tipo_empresa}" or tipo_empresa="ambos".`
      };
    }

    // 4. Validación exitosa
    return {
      valid: true,
      roleId: role.id,
      roleData: {
        id: role.id,
        nombre_rol: role.nombre_rol,
        tipo_empresa: role.tipo_empresa
      }
    };
  } catch (error) {
    console.error('Error in validateRoleForCompany:', error);
    return {
      valid: false,
      error: `Unexpected error during role validation: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Valida múltiples roles para una empresa (útil para operaciones bulk)
 * 
 * @param roleNames - Array de nombres de roles a validar
 * @param companyId - UUID de la empresa
 * @returns Array de resultados de validación, uno por cada rol
 */
export async function validateMultipleRolesForCompany(
  roleNames: string[],
  companyId: string
): Promise<RoleValidationResult[]> {
  const results = await Promise.all(
    roleNames.map(roleName => validateRoleForCompany(roleName, companyId))
  );
  return results;
}

/**
 * Lista todos los roles disponibles para un tipo de empresa específico
 * 
 * Útil para generar dropdowns dinámicos o validar que un rol esté disponible
 * 
 * @param tipoEmpresa - Tipo de empresa: 'planta' o 'transporte'
 * @returns Lista de roles aplicables
 */
export async function getRolesForCompanyType(tipoEmpresa: 'planta' | 'transporte') {
  const { data: roles, error } = await supabaseAdmin
    .from('roles_empresa')
    .select('id, nombre_rol, descripcion, tipo_empresa')
    .in('tipo_empresa', [tipoEmpresa, 'ambos'])
    .eq('activo', true)
    .order('nombre_rol');

  if (error) {
    console.error('Error fetching roles for company type:', error);
    return [];
  }

  return roles || [];
}

/**
 * Verifica si un rol específico existe en el sistema (sin validar compatibilidad con empresa)
 * 
 * @param roleName - Nombre del rol
 * @returns true si el rol existe y está activo
 */
export async function roleExists(roleName: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('roles_empresa')
    .select('id')
    .eq('nombre_rol', roleName)
    .eq('activo', true)
    .limit(1)
    .single();

  return !error && !!data;
}
