// Mock de las dependencias ANTES de importar el handler
jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  },
}));

jest.mock('@/lib/validators/roleValidator', () => ({
  validateRoleForCompany: jest.fn(),
}));

import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/admin/nueva-invitacion';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateRoleForCompany } from '@/lib/validators/roleValidator';

describe('/api/admin/nueva-invitacion', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Eliminar configuración SMTP para todos los tests por defecto
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('debe rechazar métodos que no sean POST', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({
      error: 'Method not allowed',
    });
  });

  it('debe validar campos requeridos', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@test.com',
        // Faltan campos requeridos
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toBe('Missing required fields');
  });

  it('debe crear usuario con rol Control de Acceso exitosamente', async () => {
    // Asegurar que SMTP NO está configurado para este test
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;

    // Mock de validateRoleForCompany
    (validateRoleForCompany as jest.Mock).mockResolvedValue({
      valid: true,
      roleId: '7918bf3d-b10a-418a-8b8d-24b67e6bad74',
      roleData: {
        id: '7918bf3d-b10a-418a-8b8d-24b67e6bad74',
        nombre_rol: 'Control de Acceso',
        tipo_empresa: 'ambos',
      },
    });

    // Mock de Supabase
    const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;
    
    // Mock empresa
    mockSupabaseAdmin.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'empresas') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
                  nombre: 'Aceitera San Miguel S.A',
                  tipo_empresa: 'planta',
                },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'profiles' || table === 'usuarios') {
        return {
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      } else if (table === 'usuarios_empresa') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [
                {
                  user_id: 'user-123',
                  empresa_id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
                  rol_interno: 'Control de Acceso',
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return {} as any;
    }) as any;

    // Mock auth.admin
    mockSupabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'porteria@test.com',
            },
          },
          error: null,
        }),
      },
    } as any;

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'porteria@test.com',
        nombre: 'Carlos',
        apellido: 'Díaz',
        empresa_id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
        rol_interno: 'Control de Acceso',
        departamento: 'Seguridad',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(validateRoleForCompany).toHaveBeenCalledWith(
      'Control de Acceso',
      '3cc1979e-1672-48b8-a5e5-2675f5cac527'
    );
    const responseData = res._getJSONData();
    expect(responseData.metodo).toBe('password_temporal');
    expect(responseData.usuario.email).toBe('porteria@test.com');
  });

  it('debe rechazar rol inválido para tipo de empresa', async () => {
    // Eliminar SMTP para este test
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;

    // Mock de validateRoleForCompany - rol inválido
    (validateRoleForCompany as jest.Mock).mockResolvedValue({
      valid: false,
      error: 'Role "Rol Inválido" not valid for company type "planta"',
    });

    // Mock de Supabase
    const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;
    
    mockSupabaseAdmin.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'empresas') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
                  nombre: 'Aceitera San Miguel S.A',
                  tipo_empresa: 'planta',
                },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'profiles' || table === 'usuarios') {
        return {
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }
      return {} as any;
    }) as any;

    mockSupabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@test.com',
            },
          },
          error: null,
        }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    } as any;

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@test.com',
        nombre: 'Test',
        apellido: 'User',
        empresa_id: '3cc1979e-1672-48b8-a5e5-2675f5cac527',
        rol_interno: 'Rol Inválido',
        departamento: 'Test',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toBe('Invalid role for company type');
    expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
  });

  it('debe manejar error de empresa no encontrada', async () => {
    const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;
    
    mockSupabaseAdmin.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Company not found' },
          }),
        }),
      }),
    }) as any;

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@test.com',
        nombre: 'Test',
        apellido: 'User',
        empresa_id: 'invalid-id',
        rol_interno: 'Control de Acceso',
        departamento: 'Test',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData().error).toBe('Company not found');
  });

  it('debe incluir password temporal cuando no hay SMTP configurado', async () => {
    // Sin SMTP configurado - eliminar explícitamente
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;

    (validateRoleForCompany as jest.Mock).mockResolvedValue({
      valid: true,
      roleId: 'role-123',
      roleData: { id: 'role-123', nombre_rol: 'coordinador', tipo_empresa: 'planta' },
    });

    const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;
    
    mockSupabaseAdmin.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'empresas') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'company-123',
                  nombre: 'Test Company',
                  tipo_empresa: 'planta',
                },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'profiles' || table === 'usuarios') {
        return {
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      } else if (table === 'usuarios_empresa') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ user_id: 'user-123' }],
              error: null,
            }),
          }),
        };
      }
      return {} as any;
    }) as any;

    mockSupabaseAdmin.auth = {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@test.com',
            },
          },
          error: null,
        }),
      },
    } as any;

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@test.com',
        nombre: 'Test',
        apellido: 'User',
        empresa_id: 'company-123',
        rol_interno: 'coordinador',
        departamento: 'Test',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.metodo).toBe('password_temporal');
    expect(data.password_temporal).toBe('Temporal2024!');
    expect(data.email_enviado).toBe(false);
  });
});
