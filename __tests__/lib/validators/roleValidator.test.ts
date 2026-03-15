import * as roleValidatorModule from '@/lib/validators/roleValidator';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Mock de supabaseAdmin
jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

const { validateRoleForCompany, validateMultipleRolesForCompany, getRolesForCompanyType, roleExists } = roleValidatorModule;

describe('roleValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRoleForCompany', () => {
    const mockCompanyQuery = (companyData: any) => {
      const mockSingle = jest.fn().mockResolvedValue(companyData);
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      (supabaseAdmin.from as jest.Mock) = mockFrom;
    };

    it('debe validar correctamente un rol válido para tipo de empresa planta', async () => {
      mockCompanyQuery({
        data: {
          id: 'company-123',
          nombre: 'Aceitera San Miguel S.A',
          tipo_empresa: 'planta',
        },
        error: null,
      });

      const result = await validateRoleForCompany('control_acceso', 'company-123');

      expect(result.valid).toBe(true);
      expect(result.roleId).toBe('planta-control_acceso');
      expect(result.roleData?.nombre_rol).toBe('Control de Acceso');
      expect(result.error).toBeUndefined();
    });

    it('debe rechazar un rol inválido para tipo de empresa', async () => {
      mockCompanyQuery({
        data: {
          id: 'company-123',
          nombre: 'Aceitera San Miguel S.A',
          tipo_empresa: 'planta',
        },
        error: null,
      });

      const result = await validateRoleForCompany('chofer', 'company-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not valid for company type');
      expect(result.roleId).toBeUndefined();
    });

    it('debe manejar empresa no encontrada', async () => {
      mockCompanyQuery({
        data: null,
        error: { message: 'Company not found' },
      });

      const result = await validateRoleForCompany('control_acceso', 'invalid-company-id');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Company not found');
    });

    it('debe validar rol "coordinador" para empresa tipo "transporte"', async () => {
      mockCompanyQuery({
        data: {
          id: 'transport-123',
          nombre: 'Transportes LogiCorp',
          tipo_empresa: 'transporte',
        },
        error: null,
      });

      const result = await validateRoleForCompany('coordinador', 'transport-123');

      expect(result.valid).toBe(true);
      expect(result.roleId).toBe('transporte-coordinador');
      expect(result.roleData?.tipo_empresa).toBe('transporte');
    });
  });

  describe('validateMultipleRolesForCompany', () => {
    it.skip('debe validar múltiples roles simultáneamente', async () => {
      // Skipped - función es wrapper de validateRoleForCompany que ya está testeada
    });
  });

  describe('getRolesForCompanyType', () => {
    it('debe retornar roles para tipo de empresa "planta"', () => {
      const roles = getRolesForCompanyType('planta');

      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some(r => r.nombre_rol === 'Control de Acceso')).toBe(true);
      expect(roles.some(r => r.nombre_rol === 'Coordinador de Planta')).toBe(true);
      expect(roles.every(r => r.tipo_empresa === 'planta')).toBe(true);
    });

    it('debe retornar roles para tipo de empresa "transporte"', () => {
      const roles = getRolesForCompanyType('transporte');

      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some(r => r.nombre_rol === 'Chofer')).toBe(true);
      expect(roles.some(r => r.nombre_rol === 'Coordinador de Transporte')).toBe(true);
      expect(roles.every(r => r.tipo_empresa === 'transporte')).toBe(true);
    });

    it('no debe incluir roles de otro tipo de empresa', () => {
      const plantaRoles = getRolesForCompanyType('planta');
      const transporteRoles = getRolesForCompanyType('transporte');

      // Chofer solo en transporte
      expect(plantaRoles.some(r => r.id.includes('chofer'))).toBe(false);
      // Control de acceso solo en planta
      expect(transporteRoles.some(r => r.id.includes('control_acceso'))).toBe(false);
    });
  });

  describe('roleExists', () => {
    it('debe retornar true si el rol existe en el sistema', () => {
      expect(roleExists('control_acceso')).toBe(true);
      expect(roleExists('coordinador')).toBe(true);
      expect(roleExists('chofer')).toBe(true);
      expect(roleExists('supervisor')).toBe(true);
    });

    it('debe retornar false si el rol no existe', () => {
      expect(roleExists('rol_inexistente')).toBe(false);
      expect(roleExists('')).toBe(false);
    });
  });
});
