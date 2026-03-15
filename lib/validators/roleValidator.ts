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
 * Migrado: usa ROLES_BY_TIPO en vez de consultar roles_empresa
 * 
 * @param tipoEmpresa - Tipo de empresa: 'planta' o 'transporte'
 * @returns Lista de roles aplicables con nombre e id compuesto
 */
export function getRolesForCompanyType(tipoEmpresa: 'planta' | 'transporte') {
  const rolesPermitidos = ROLES_BY_TIPO[tipoEmpresa] || [];
  return rolesPermitidos.map(rol => ({
    id: `${tipoEmpresa}-${rol}`,
    nombre_rol: getRolDisplayName(rol, tipoEmpresa),
    descripcion: getRolDisplayName(rol, tipoEmpresa),
    tipo_empresa: tipoEmpresa,
  }));
}

/**
 * Verifica si un rol específico existe en el sistema
 * 
 * Migrado: verifica contra ROLES_BY_TIPO en vez de consultar roles_empresa
 * 
 * @param roleName - Nombre del rol (rol_interno, e.g. 'coordinador', 'control_acceso')
 * @returns true si el rol existe en algún tipo de empresa
 */
export function roleExists(roleName: string): boolean {
  return Object.values(ROLES_BY_TIPO).some(roles =>
    roles.includes(roleName as RolInterno)
  );
}
