import { render, screen, act } from '@testing-library/react'
import { UserRoleProvider } from './contexts/UserRoleContext'

// Mock de Supabase para evitar llamadas reales en tests
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

// Utilidad para renderizar componentes con UserRoleContext
export function renderWithUserContext(ui: React.ReactElement, options = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserRoleProvider>{children}</UserRoleProvider>
  )
  
  let renderResult;
  act(() => {
    renderResult = render(ui, { wrapper: Wrapper, ...options });
  });
  
  return renderResult!;
}

// Mock data para tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'coordinator',
  empresa_id: 'test-empresa-id',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockEmpresa = {
  id: 'test-empresa-id',
  nombre: 'Empresa Test',
  tipo_empresa: 'transporte' as const,
  activa: true,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockDespacho = {
  id: 'test-despacho-id',
  pedido_id: 'PED-001',
  origen: 'Buenos Aires',
  destino: 'Córdoba',
  fecha_despacho: '2024-02-01',
  estado: 'pendiente' as const,
  tipo_carga: 'General',
  prioridad: 'media' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Utilidades de testing
export const waitForLoadingToFinish = () => 
  screen.findByText(/loading/i).then(() => 
    screen.queryByText(/loading/i) === null
  )

export * from '@testing-library/react'