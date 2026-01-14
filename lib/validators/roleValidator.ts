import { supabaseAdmin } from '../supabaseAdmin';
import { ROLES_BY_TIPO, RolInterno, TipoEmpresa, getRolDisplayName } from '../types';

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
 * MIGRACIÓN 022 (20-12-25): Sistema nuevo con ROLES_BY_TIPO
 * - Usa ROLES_BY_TIPO del sistema centralizado (lib/types.ts)
 * - No depende de la tabla roles_empresa legacy
 * - Validación basada en rol_interno + tipo_empresa
 * 
 * Reglas de validación:
 * 1. El tipo de empresa debe existir y ser válido
 * 2. El rol debe estar en ROLES_BY_TIPO[tipo_empresa]
 * 3. Se sigue creando roleId temporal para compatibilidad con usuarios_empresa
 * 
 * @param rolInterno - Rol interno a validar (ej: "coordinador", "control_acceso")
 * @param companyId - UUID de la empresa
 * @returns Resultado de la validación con el ID del rol si es válido
 * 
 * @example
 * ```typescript
 * const result = await validateRoleForCompany('control_acceso', 'empresa-uuid');
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * const roleId = result.roleId;
 * ```
 */
export async function validateRoleForCompany(
  rolInterno: string,
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

    console.log('🔍 Validating role:', {
      rolInterno,
      tipoEmpresa: company.tipo_empresa,
      availableRoles: ROLES_BY_TIPO[company.tipo_empresa as TipoEmpresa]
    });

    // 2. Validar que el rol está en ROLES_BY_TIPO para este tipo de empresa
    const rolesPermitidos = ROLES_BY_TIPO[company.tipo_empresa as TipoEmpresa] || [];
    
    if (!rolesPermitidos.includes(rolInterno as RolInterno)) {
      console.error('❌ Invalid role:', {
        rolInterno,
        tipoEmpresa: company.tipo_empresa,
        rolesPermitidos
      });
      return {
        valid: false,
        error: `Role "${rolInterno}" not valid for company type "${company.tipo_empresa}". ` +
               `Available roles: ${rolesPermitidos.join(', ')}`
      };
    }

    console.log('✅ Role validation passed - using simplified validation (ROLES_BY_TIPO)');

    // 3. Retornar validación exitosa sin depender de roles_empresa
    // Se usa un ID temporal que luego el sistema reemplazará
    return {
      valid: true,
      roleId: `${company.tipo_empresa}-${rolInterno}`, // ID compuesto temporal
      roleData: {
        id: `${company.tipo_empresa}-${rolInterno}`,
        nombre_rol: getRolDisplayName(rolInterno as RolInterno, company.tipo_empresa as TipoEmpresa),
        tipo_empresa: company.tipo_empresa
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
