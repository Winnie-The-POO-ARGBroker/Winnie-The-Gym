import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import ClassSchedulePage from '../ClassSchedulePage'
import api from '../../services/api'

// Mock de la API
vi.mock('../../services/api', () => {
  return {
    default: {
      get: vi.fn(),
    }
  }
})

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('ClassSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a la API con page_size=1000 al cargar el calendario', async () => {
    api.get.mockResolvedValueOnce({ data: { results: [] } })

    renderWithRouter(<ClassSchedulePage />)

    // Esperar a que se llame a la API
    expect(api.get).toHaveBeenCalledWith('/classes/clases/', {
      params: { page_size: 1000 }
    })
  })
})
