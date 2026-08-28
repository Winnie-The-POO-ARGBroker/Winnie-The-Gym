import { z } from 'zod'

export const gestionSociosSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(80),
  apellido: z.string().trim().min(1, 'Apellido requerido').max(80),
  dni: z.string().trim().min(7, 'DNI inválido').max(12),
  email: z.string().trim().email('Email inválido'),
  plan: z.enum(['Básico', 'Premium', 'Gold'], {
    errorMap: () => ({ message: 'Plan requerido' }),
  }),
  cuota: z.string().trim().min(1, 'Cuota requerida'),
  cobro: z.string().trim().min(1, 'Fecha de cobro requerida'),
  renovacion: z.enum(['Automática', 'Manual']),
})

export const defaultValues = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  plan: 'Premium',
  cuota: '$ 12.000',
  cobro: '01/06',
  renovacion: 'Automática',
}
