/**
 * Centralized type definitions for the entire application
 * This ensures consistency across all components and reduces duplication
 */
/**
 * Mapeo de roles válidos por tipo de empresa
 * Los roles genéricos se adaptan al contexto
 */
export const ROLES_BY_TIPO = {
    planta: ['coordinador', 'control_acceso', 'supervisor', 'administrativo'],
    transporte: ['coordinador', 'chofer', 'supervisor', 'administrativo'],
    cliente: ['visor'],
    admin: ['admin_nodexia'],
};
/**
 * Labels amigables para tipos de empresa
 */
export const TIPO_EMPRESA_LABELS = {
    planta: 'Planta',
    transporte: 'Empresa de Transporte',
    cliente: 'Cliente',
    admin: 'Administración',
};
/**
 * Función para obtener el nombre de rol según contexto
 * Migración 022: Nombres contextuales
 */
export function getRolDisplayName(rol, tipoEmpresa) {
    const contextualLabels = {
        admin_nodexia: { admin: 'Administrador Nodexia' },
        coordinador: {
            planta: 'Coordinador de Planta',
            transporte: 'Coordinador de Transporte',
            cliente: 'Coordinador',
            admin: 'Coordinador'
        },
        supervisor: {
            planta: 'Supervisor de Carga',
            transporte: 'Supervisor de Flota',
            cliente: 'Supervisor',
            admin: 'Supervisor'
        },
        control_acceso: { planta: 'Control de Acceso' },
        chofer: { transporte: 'Chofer' },
        administrativo: {
            planta: 'Administrativo Planta',
            transporte: 'Administrativo Transporte',
            cliente: 'Administrativo',
            admin: 'Administrativo'
        },
        visor: { cliente: 'Visor' },
    };
    return contextualLabels[rol]?.[tipoEmpresa] || ROL_INTERNO_LABELS[rol] || rol;
}
/**
 * Labels base para roles (sin contexto)
 */
export const ROL_INTERNO_LABELS = {
    admin_nodexia: 'Administrador Nodexia',
    coordinador: 'Coordinador',
    control_acceso: 'Control de Acceso',
    supervisor: 'Supervisor',
    chofer: 'Chofer',
    administrativo: 'Administrativo',
    visor: 'Visor',
};
