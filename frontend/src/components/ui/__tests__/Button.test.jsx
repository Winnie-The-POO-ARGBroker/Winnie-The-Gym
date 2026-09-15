import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Button from '../Button'

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    
    expect(button).toBeDisabled()
  })

  it('shows loading text and is disabled when loading prop is true', () => {
    render(<Button loading>Click me</Button>)
    const button = screen.getByRole('button', { name: /cargando/i })
    
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })
})
