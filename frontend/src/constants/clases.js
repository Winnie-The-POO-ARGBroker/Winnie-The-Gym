/**
 * Days of the week used by the class schedule form and recurrence selector.
 * Extracted from CreateClassPage to be shared across class-related components.
 */
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/** Abbreviated recurrence day keys with their display labels. */
export const RECURRENCIA_DIAS = [
  { key: 'L', label: 'L' },
  { key: 'M', label: 'M' },
  { key: 'X', label: 'X' },
  { key: 'J', label: 'J' },
  { key: 'V', label: 'V' },
  { key: 'S', label: 'S' },
  { key: 'D', label: 'D' },
]

export const CATEGORIAS_CLASES = [
  { id: 'todas', label: 'Todas las disciplinas' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'spinning', label: 'Spinning' },
  { id: 'yoga', label: 'Power Yoga' },
  { id: 'pilates', label: 'Pilates Reformer' },
  { id: 'boxeo', label: 'Boxeo & Funcional' },
  { id: 'hiit', label: 'HIIT Circuit' },
  { id: 'funcional', label: 'Funcional' },
]
