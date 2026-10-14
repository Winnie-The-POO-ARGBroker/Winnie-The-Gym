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

  // #204 — Accessibility: focus-visible ring present, no outline-none that blocks all focus
  it('focus-visible class present (no outline-none blocking focus ring)', () => {
    render(<Button>Focus test</Button>)
    const button = screen.getByRole('button', { name: /focus test/i })
    // The button should have focus-visible:ring-2 class (not bare outline-none)
    expect(button.className).toContain('focus-visible:ring-2')
    expect(button.className).toContain('outline-none')
  })
})
