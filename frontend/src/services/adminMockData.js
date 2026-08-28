/**
 * Mock data y servicios de persistencia para el módulo de Administración (Backoffice).
 * Basado en las especificaciones extraídas de Figma:
 * - 12 · Gestión de Membresías (Pantalla 1 y 2)
 * - 13 · Gestión de Clases CRUD (Pantalla 1 y 2)
 */

const STORAGE_KEY_PLANES = 'wtg_admin_planes_state'
const STORAGE_KEY_CLASSES = 'wtg_admin_classes_state'
const STORAGE_KEY_ATTENDEES = 'wtg_admin_class_attendees_state'

// ==========================================
// 1. PLANES DE MEMBRESÍA (Oferta Comercial)
// ==========================================

export const INITIAL_PLANES = [
  {
    id: 1,
    nombre: 'Básico',
    subtitulo: 'Pase libre',
    precio: 6500,
    duracion_dias: 30,
    clases_asignadas: 0,
    socios_activos: 612,
    porcentaje: 33,
    color: '#525252',
    es_popular: false,
    activo: true,
    beneficios: [
      { texto: '3 visitas/semana', incluido: true, icono: 'visitas' },
      { texto: 'Sin clases', incluido: false, icono: 'clases' },
      { texto: 'Sin entrenador', incluido: false, icono: 'entrenador' },
    ],
    matriz_comparativa: {
      pase_libre: '3x/sem',
      reservas_clases: '—',
      entrenador_asignado: false,
      rutina_personalizada: false,
      acceso_multisede: '1 sede',
      invitado_mensual: false,
      congelar_plan: '—',
    },
  },
  {
    id: 2,
    nombre: 'Premium',
    subtitulo: 'El más popular',
    precio: 12000,
    duracion_dias: 30,
    clases_asignadas: 999, // ilimitadas
    socios_activos: 480,
    porcentaje: 55,
    color: '#FF5722',
    es_popular: true,
    activo: true,
    beneficios: [
      { texto: 'Pase libre ilimitado', incluido: true, icono: 'visitas' },
      { texto: 'Todas las clases', incluido: true, icono: 'clases' },
      { texto: 'Reservas con 7d', incluido: true, icono: 'reservas' },
    ],
    matriz_comparativa: {
      pase_libre: '✔',
      reservas_clases: 'Todas',
      entrenador_asignado: false,
      rutina_personalizada: true,
      acceso_multisede: '1 sede',
      invitado_mensual: false,
      congelar_plan: '1 mes',
    },
  },
  {
    id: 3,
    nombre: 'Gold',
    subtitulo: 'Plan completo',
    precio: 18000,
    duracion_dias: 30,
    clases_asignadas: 999,
    socios_activos: 148,
    porcentaje: 12,
    color: '#FFC107',
    es_popular: false,
    activo: true,
    beneficios: [
      { texto: 'Todo de Premium', incluido: true, icono: 'premium' },
      { texto: 'Entrenador asignado', incluido: true, icono: 'entrenador' },
      { texto: 'Acceso a 2 sedes', incluido: true, icono: 'sedes' },
      { texto: 'Invitado 1x/mes', incluido: true, icono: 'invitado' },
    ],
    matriz_comparativa: {
      pase_libre: '✔',
      reservas_clases: 'Todas + prioridad',
      entrenador_asignado: true,
      rutina_personalizada: true,
      acceso_multisede: '2 sedes',
      invitado_mensual: true,
      congelar_plan: '2 meses',
    },
  },
]

export function getStoredPlanes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANES)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore fallback
  }
  return INITIAL_PLANES
}

export function saveStoredPlanes(planes) {
  try {
    localStorage.setItem(STORAGE_KEY_PLANES, JSON.stringify(planes))
  } catch {
    // ignore
  }
}

// ==========================================
// 2. GESTIÓN DE CLASES Y ACTIVIDADES
// ==========================================

export { DISCIPLINAS_CONFIG } from '../constants/disciplinas'

export const INITIAL_ADMIN_CLASSES = [
  {
    id: 'cls_funcional_1',
    nombre: 'Funcional Intensivo',
    categoria: 'funcional',
    dia: 'Lunes',
    dia_numero: 1, // 1: Lun, 2: Mar, 3: Mie, 4: Jue, 5: Vie, 6: Sab
    hora: '08:00',
    hora_fin: '08:45',
    duracion_min: 45,
    sala: 'Sala A',
    instructor: 'Carlos R.',
    cupo_maximo: 20,
    cupos_reservados: 8,
    lista_espera_max: 5,
    cancelacion_horas: 2,
    planes_habilitados: ['Premium', 'Gold'],
    recurrencia: 'Semanal - L/M/V',
    dias_recurrencia: ['L', 'X', 'V'],
    estado: 'activa',
    descripcion: 'Entrenamiento funcional de alta intensidad con foco en tren superior y core.',
  },
  {
    id: 'cls_spinning_1',
    nombre: 'Spinning Pro',
    categoria: 'spinning',
    dia: 'Lunes',
    dia_numero: 1,
    hora: '09:30',
    hora_fin: '10:15',
    duracion_min: 45,
    sala: 'Sala B',
    instructor: 'Sofia L.',
    cupo_maximo: 20,
    cupos_reservados: 17,
    lista_espera_max: 5,
    cancelacion_horas: 2,
    planes_habilitados: ['Premium', 'Gold'],
    recurrencia: 'Semanal - L/M/J',
    dias_recurrencia: ['L', 'M', 'J'],
    estado: 'activa',
    descripcion: 'Sesión de ciclismo indoor con simulación de subidas y sprints por intervalos.',
  },
  {
    id: 'cls_crossfit_1',
    nombre: 'Crossfit WOD',
    categoria: 'crossfit',
    dia: 'Miércoles',
    dia_numero: 3,
    hora: '10:00',
    hora_fin: '11:00',
    duracion_min: 60,
    sala: 'Sala A',
    instructor: 'Pedro M.',
    cupo_maximo: 20,
    cupos_reservados: 20, // Lleno
    lista_espera_max: 5,
    cancelacion_horas: 3,
    planes_habilitados: ['Premium', 'Gold'],
    recurrencia: 'Semanal - L/M/V',
    dias_recurrencia: ['L', 'X', 'V'],
    estado: 'activa',
    descripcion: 'WOD enfocado en levantamiento olímpico y acondicionamiento metabólico.',
  },
  {
    id: 'cls_pilates_1',
    nombre: 'Pilates Reformer',
    categoria: 'pilates',
    dia: 'Jueves',
    dia_numero: 4,
    hora: '08:00',
    hora_fin: '08:50',
    duracion_min: 50,
    sala: 'Sala B',
    instructor: 'Sofia L.',
    cupo_maximo: 20,
    cupos_reservados: 12,
    lista_espera_max: 5,
    cancelacion_horas: 2,
    planes_habilitados: ['Básico', 'Premium', 'Gold'],
    recurrencia: 'Semanal - M/J',
    dias_recurrencia: ['M', 'J'],
    estado: 'activa',
    descripcion: 'Pilates reformer y mat para control postural, elongación y fuerza de core.',
  },
  {
    id: 'cls_yoga_1',
    nombre: 'Vinyasa Yoga',
    categoria: 'yoga',
    dia: 'Viernes',
    dia_numero: 5,
    hora: '11:00',
    hora_fin: '12:00',
    duracion_min: 60,
    sala: 'Sala C',
    instructor: 'Ana T.',
    cupo_maximo: 20,
    cupos_reservados: 8,
    lista_espera_max: 5,
    cancelacion_horas: 2,
    planes_habilitados: ['Básico', 'Premium', 'Gold'],
    recurrencia: 'Semanal - V/S',
    dias_recurrencia: ['V', 'S'],
    estado: 'activa',
    descripcion: 'Vinyasa Yoga restaurativo y respiración consciente para cerrar la semana.',
  },
  {
    id: 'cls_spinning_2',
    nombre: 'Spinning Power',
    categoria: 'spinning',
    dia: 'Martes',
    dia_numero: 2,
    hora: '09:00',
    hora_fin: '09:45',
    duracion_min: 45,
    sala: 'Sala B',
    instructor: 'Sofia L.',
    cupo_maximo: 20,
    cupos_reservados: 17,
    lista_espera_max: 5,
    cancelacion_horas: 2,
    planes_habilitados: ['Premium', 'Gold'],
    recurrencia: 'Semanal - M/J',
    dias_recurrencia: ['M', 'J'],
    estado: 'activa',
    descripcion: 'Ciclismo indoor con ritmos potentes y potencia.',
  },
]

export function getStoredClasses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLASSES)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return INITIAL_ADMIN_CLASSES
}

export function saveStoredClasses(classes) {
  try {
    localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes))
  } catch {
    // ignore
  }
}

export function getClassById(classId) {
  const classes = getStoredClasses()
  return classes.find((c) => c.id === classId) || null
}

export function saveOrUpdateClass(classData) {
  const classes = getStoredClasses()
  let updated = []
  if (classData.id) {
    updated = classes.map((c) => (c.id === classData.id ? { ...c, ...classData } : c))
  } else {
    const newClass = {
      ...classData,
      id: `cls_${Date.now()}`,
      cupos_reservados: classData.cupos_reservados || 0,
      estado: classData.estado || 'activa',
    }
    updated = [...classes, newClass]
  }
  saveStoredClasses(updated)
  return updated
}

export function deleteStoredClass(classId) {
  const classes = getStoredClasses()
  const updated = classes.filter((c) => c.id !== classId)
  saveStoredClasses(updated)
  return updated
}

// ==========================================
// 3. ASISTENCIAS / INSCRIPTOS POR CLASE
// ==========================================

export const INITIAL_ATTENDEES = {
  cls_funcional_1: [
    { id: 'att_1', socio_id: 'SOC-2026-0012', nombre: 'Martín Bossi', dni: '30.111.222', plan: 'Premium', hora_reserva: '01/06 14:20', estado: 'presente' },
    { id: 'att_2', socio_id: 'SOC-2026-0034', nombre: 'Lucía Méndez', dni: '32.444.555', plan: 'Gold', hora_reserva: '01/06 15:45', estado: 'presente' },
    { id: 'att_3', socio_id: 'SOC-2026-0056', nombre: 'Gonzalo Pérez', dni: '28.777.888', plan: 'Premium', hora_reserva: '01/06 18:10', estado: 'ausente' },
    { id: 'att_4', socio_id: 'SOC-2026-0089', nombre: 'Valentina Rossi', dni: '35.666.999', plan: 'Premium', hora_reserva: '02/06 09:05', estado: 'presente' },
    { id: 'att_5', socio_id: 'SOC-2026-0102', nombre: 'Mariano Iúdica', dni: '29.222.333', plan: 'Gold', hora_reserva: '02/06 10:30', estado: 'presente' },
    { id: 'att_6', socio_id: 'SOC-2026-0145', nombre: 'Florencia Peña', dni: '31.888.777', plan: 'Premium', hora_reserva: '02/06 11:15', estado: 'sin_marcar' },
    { id: 'att_7', socio_id: 'SOC-2026-0178', nombre: 'Esteban Lamothe', dni: '26.555.444', plan: 'Gold', hora_reserva: '02/06 14:00', estado: 'sin_marcar' },
    { id: 'att_8', socio_id: 'SOC-2026-0210', nombre: 'Camila Homs', dni: '33.999.111', plan: 'Premium', hora_reserva: '02/06 16:30', estado: 'sin_marcar' },
  ],
}

export function getStoredAttendees(classId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATTENDEES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed[classId]) return parsed[classId]
    }
  } catch {
    // ignore
  }
  return INITIAL_ATTENDEES[classId] || [
    { id: 'att_gen_1', socio_id: 'SOC-2026-0012', nombre: 'Martín Bossi', dni: '30.111.222', plan: 'Premium', hora_reserva: 'Hoy 08:15', estado: 'presente' },
    { id: 'att_gen_2', socio_id: 'SOC-2026-0034', nombre: 'Lucía Méndez', dni: '32.444.555', plan: 'Gold', hora_reserva: 'Hoy 08:20', estado: 'presente' },
    { id: 'att_gen_3', socio_id: 'SOC-2026-0056', nombre: 'Gonzalo Pérez', dni: '28.777.888', plan: 'Premium', hora_reserva: 'Hoy 08:25', estado: 'sin_marcar' },
    { id: 'att_gen_4', socio_id: 'SOC-2026-0089', nombre: 'Valentina Rossi', dni: '35.666.999', plan: 'Gold', hora_reserva: 'Hoy 08:30', estado: 'sin_marcar' },
  ]
}

export function saveStoredAttendees(classId, attendees) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATTENDEES)
    const existing = raw ? JSON.parse(raw) : {}
    existing[classId] = attendees
    localStorage.setItem(STORAGE_KEY_ATTENDEES, JSON.stringify(existing))
  } catch {
    // ignore
  }
}
