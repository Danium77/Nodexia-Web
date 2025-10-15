import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithUserContext, mockUser } from '../lib/test-utils'

// Test básico para verificar que el sistema de testing funciona
describe('Testing Setup', () => {
  it('should render test component', () => {
    const TestComponent = () => <div>Hello Testing</div>
    render(<TestComponent />)
    expect(screen.getByText('Hello Testing')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    const mockClick = jest.fn()
    
    const TestButton = () => (
      <button onClick={mockClick}>Click me</button>
    )
    
    render(<TestButton />)
    await user.click(screen.getByRole('button', { name: /click me/i }))
    expect(mockClick).toHaveBeenCalledTimes(1)
  })
})

// Test ejemplo para un componente con contexto
describe('User Context Integration', () => {
  it('should work with UserContext wrapper', () => {
    const TestComponent = () => <div>Context Test</div>
    renderWithUserContext(<TestComponent />)
    expect(screen.getByText('Context Test')).toBeInTheDocument()
  })
})