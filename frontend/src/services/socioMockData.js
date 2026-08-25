// TODO: reemplazar por API real cuando el backend de QR y clases esté desplegado (PR #1 en curso)

/**
 * Mock data y servicios simulados para el módulo de Socio.
 * Basado en las especificaciones extraídas de Figma (Pantalla 2 - Mi Cuenta y Credencial).
 */

// Datos simulados del socio activo (alineados a Figma: Ana M. González)
// TODO: reemplazar por API real -> GET /api/members/me/
export const MOCK_MEMBER = {
  id: 'usr_30111222',
  socioNumero: 'SOC-2026-0842',
  nombre: 'Ana M.',
  apellido: 'González',
  dni: '30.111.222',
  email: 'ana@mail.com',
  telefono: '+54 11 5555-5555',
  fechaNacimiento: '12/03/1992',
  direccion: 'CABA · Palermo',
  avatarUrl: '', // Usa avatar generado con iniciales o icono gris
  fechaIngreso: '12/03/2023',
  sedeHabitual: 'Sede Palermo',
  sedesHabilitadas: ['Sede Palermo', 'Sede Belgrano', 'Sede Cañitas'],
  
  // Apto Médico (extraído de Figma)
  aptoMedico: {
    archivo: 'apto-2025.pdf',
    fechaVencimiento: '02/07/2026',
    estado: 'vence_30d', // 'al_dia' | 'vence_30d' | 'vencido'
    diasRestantes: 30,
  },

  // Estado de membresía
  membresia: {
    estado: 'activa', // 'activa' | 'vencida'
    planNombre: 'Plan Full Black + Clases Ilimitadas',
    tipo: 'Mensual Débito Automático',
    fechaInicio: '01/08/2026',
    fechaVencimiento: '31/08/2026',
    diasRestantes: 7,
    precioMensual: '$45.000',
    accesoLibre: true,
    aforoMaxSede: 120,
    aforoActualSede: 48,
  },

  // Historial de visitas al molinete
  // TODO: reemplazar por API real -> GET /api/access/logs/
  visitas: [
    { id: 'vis_1', fecha: 'Hoy, 24 Ago', hora: '18:42', tipo: 'Entrada', sede: 'Sede Palermo', molinete: 'Molinete 1 (Entrada)' },
    { id: 'vis_2', fecha: 'Vie, 22 Ago', hora: '08:15', tipo: 'Entrada', sede: 'Sede Palermo', molinete: 'Molinete 2 (Entrada)' },
    { id: 'vis_3', fecha: 'Mié, 20 Ago', hora: '19:05', tipo: 'Entrada', sede: 'Sede Belgrano', molinete: 'Molinete Central' },
    { id: 'vis_4', fecha: 'Lun, 18 Ago', hora: '07:55', tipo: 'Entrada', sede: 'Sede Palermo', molinete: 'Molinete 1 (Entrada)' },
  ],

  // Historial de pagos
  // TODO: reemplazar por API real -> GET /api/members/me/payments/
  pagos: [
    { id: 'pay_1', mes: 'Agosto 2026', monto: '$45.000', fecha: '01/08/2026', metodo: 'Visa Débito **** 4920', estado: 'Aprobado' },
    { id: 'pay_2', mes: 'Julio 2026', monto: '$42.000', fecha: '01/07/2026', metodo: 'Visa Débito **** 4920', estado: 'Aprobado' },
    { id: 'pay_3', mes: 'Junio 2026', monto: '$42.000', fecha: '01/06/2026', metodo: 'Visa Débito **** 4920', estado: 'Aprobado' },
  ],
}

/**
 * Genera un token QR dinámico simulado con validez de 30 segundos,
 * emulando exactamente la respuesta de GET /api/access/qr/generate/
 * TODO: reemplazar por API real -> api.get('/access/qr/generate/')
 */
export function generateMockQRToken(member = MOCK_MEMBER) {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 30
  const expiresAt = now + expiresIn
  const jti = 'qr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()

  // Payload simulado firmado con formato JWT-like
  const mockToken = `WTG.${btoa(JSON.stringify({ sub: member.id, soc: member.socioNumero, exp: expiresAt, jti }))}.MOCK_SIGNATURE`

  return {
    qr_token: mockToken,
    expires_in: expiresIn,
    expires_at: expiresAt,
    jti: jti,
  }
}

// Categorías de clases para filtrado
export const CATEGORIAS_CLASES = [
  { id: 'todas', label: 'Todas las disciplinas', icon: '⚡' },
  { id: 'crossfit', label: 'CrossFit', icon: '🏋️' },
  { id: 'spinning', label: 'Spinning', icon: '🚴' },
  { id: 'yoga', label: 'Power Yoga', icon: '🧘' },
  { id: 'pilates', label: 'Pilates Reformer', icon: '🤸' },
  { id: 'boxeo', label: 'Boxeo & Funcional', icon: '🥊' },
  { id: 'hiit', label: 'HIIT Circuit', icon: '🔥' },
  { id: 'musculacion', label: 'Musculación Guiada', icon: '💪' },
]

// Días de la semana para el selector de agenda
export const DIAS_AGENDA = [
  { id: '2026-08-24', diaNombre: 'Lun', diaNumero: '24', fechaCompleta: 'Lunes 24 de Agosto', esHoy: true },
  { id: '2026-08-25', diaNombre: 'Mar', diaNumero: '25', fechaCompleta: 'Martes 25 de Agosto', esHoy: false },
  { id: '2026-08-26', diaNombre: 'Mié', diaNumero: '26', fechaCompleta: 'Miércoles 26 de Agosto', esHoy: false },
  { id: '2026-08-27', diaNombre: 'Jue', diaNumero: '27', fechaCompleta: 'Jueves 27 de Agosto', esHoy: false },
  { id: '2026-08-28', diaNombre: 'Vie', diaNumero: '28', fechaCompleta: 'Viernes 28 de Agosto', esHoy: false },
  { id: '2026-08-29', diaNombre: 'Sáb', diaNumero: '29', fechaCompleta: 'Sábado 29 de Agosto', esHoy: false },
  { id: '2026-08-30', diaNombre: 'Dom', diaNumero: '30', fechaCompleta: 'Domingo 30 de Agosto', esHoy: false },
]

// Catálogo semanal de clases
// TODO: reemplazar por API real -> GET /api/classes/
export const INITIAL_MOCK_CLASSES = [
  {
    id: 'cls_1',
    fecha: '2026-08-24',
    nombre: 'CrossFit WOD Pro',
    categoria: 'crossfit',
    instructor: 'Marcos Gómez',
    instructorAvatar: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150&q=80',
    horaInicio: '07:30',
    horaFin: '08:30',
    duracionMin: 60,
    turno: 'manana',
    sala: 'Box Principal (Piso 1)',
    intensidad: 'Alta',
    caloriasAprox: 650,
    cuposTotales: 16,
    cuposReservados: 12,
    isBooked: true, // Socio ya tiene reserva
    descripcion: 'Entrenamiento de alta intensidad enfocado en fuerza olímpica y conditioning metabólico.',
  },
  {
    id: 'cls_2',
    fecha: '2026-08-24',
    nombre: 'Spinning Endurance Ride',
    categoria: 'spinning',
    instructor: 'Sofía Chen',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80',
    horaInicio: '08:45',
    horaFin: '09:35',
    duracionMin: 50,
    turno: 'manana',
    sala: 'Studio Ciclo Indoor',
    intensidad: 'Media-Alta',
    caloriasAprox: 520,
    cuposTotales: 24,
    cuposReservados: 21,
    isBooked: false,
    descripcion: 'Sesión de ciclismo indoor con intervalos de montaña, cadencia y potencia con música envolvente.',
  },
  {
    id: 'cls_3',
    fecha: '2026-08-24',
    nombre: 'Power Yoga & Movilidad',
    categoria: 'yoga',
    instructor: 'Lucas Silva',
    instructorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    horaInicio: '10:00',
    horaFin: '11:00',
    duracionMin: 60,
    turno: 'manana',
    sala: 'Studio Zen (Piso 3)',
    intensidad: 'Media',
    caloriasAprox: 300,
    cuposTotales: 18,
    cuposReservados: 18, // Cupo agotado
    isBooked: false,
    descripcion: 'Secuencia dinámica de asanas fluidas para mejorar flexibilidad, equilibrio y recuperación muscular.',
  },
  {
    id: 'cls_4',
    fecha: '2026-08-24',
    nombre: 'Pilates Reformer Core',
    categoria: 'pilates',
    instructor: 'Camila Torres',
    instructorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
    horaInicio: '17:30',
    horaFin: '18:25',
    duracionMin: 55,
    turno: 'tarde',
    sala: 'Studio Reformer',
    intensidad: 'Media',
    caloriasAprox: 380,
    cuposTotales: 10,
    cuposReservados: 8,
    isBooked: true, // Socio ya tiene reserva
    descripcion: 'Trabajo integral de estabilidad del core y alineación postural en máquinas reformer.',
  },
  {
    id: 'cls_5',
    fecha: '2026-08-24',
    nombre: 'Boxeo & Funcional Strike',
    categoria: 'boxeo',
    instructor: 'Gonzalo Arce',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    horaInicio: '19:00',
    horaFin: '20:00',
    duracionMin: 60,
    turno: 'tarde',
    sala: 'Ring & Zona Combate',
    intensidad: 'Alta',
    caloriasAprox: 700,
    cuposTotales: 20,
    cuposReservados: 15,
    isBooked: false,
    descripcion: 'Técnica de golpeo al saco, manoplas, drills defensivos y circuito funcional de potencia.',
  },
  {
    id: 'cls_6',
    fecha: '2026-08-24',
    nombre: 'HIIT Tabata Extreme',
    categoria: 'hiit',
    instructor: 'Florencia Benítez',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    horaInicio: '20:15',
    horaFin: '21:00',
    duracionMin: 45,
    turno: 'tarde',
    sala: 'Sala Funcional 2',
    intensidad: 'Muy Alta',
    caloriasAprox: 600,
    cuposTotales: 22,
    cuposReservados: 10,
    isBooked: false,
    descripcion: 'Rondas ultra intensas de 20s trabajo y 10s pausa para máxima quema calórica post-ejercicio.',
  },

  // Martes 25
  {
    id: 'cls_7',
    fecha: '2026-08-25',
    nombre: 'CrossFit Skills & Gymnastics',
    categoria: 'crossfit',
    instructor: 'Marcos Gómez',
    instructorAvatar: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150&q=80',
    horaInicio: '08:00',
    horaFin: '09:00',
    duracionMin: 60,
    turno: 'manana',
    sala: 'Box Principal',
    intensidad: 'Alta',
    caloriasAprox: 580,
    cuposTotales: 16,
    cuposReservados: 9,
    isBooked: false,
    descripcion: 'Perfeccionamiento de pull-ups, muscle-ups, handstand y trabajo gimnástico estricto.',
  },
  {
    id: 'cls_8',
    fecha: '2026-08-25',
    nombre: 'Spinning Power Beats',
    categoria: 'spinning',
    instructor: 'Sofía Chen',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80',
    horaInicio: '18:30',
    horaFin: '19:20',
    duracionMin: 50,
    turno: 'tarde',
    sala: 'Studio Ciclo Indoor',
    intensidad: 'Alta',
    caloriasAprox: 550,
    cuposTotales: 24,
    cuposReservados: 16,
    isBooked: false,
    descripcion: 'Sprints al ritmo del beat y escaladas progresivas para mejorar VO2 máx.',
  },
  {
    id: 'cls_9',
    fecha: '2026-08-25',
    nombre: 'Vinyasa Flow Sunset',
    categoria: 'yoga',
    instructor: 'Lucas Silva',
    instructorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    horaInicio: '19:45',
    horaFin: '20:45',
    duracionMin: 60,
    turno: 'tarde',
    sala: 'Studio Zen',
    intensidad: 'Media',
    caloriasAprox: 280,
    cuposTotales: 18,
    cuposReservados: 12,
    isBooked: false,
    descripcion: 'Práctica de yoga al atardecer para liberar tensiones y revitalizar el sistema nervioso.',
  },
]

// Gestor de estado local para simulación interactiva de reservas
const STORAGE_KEY = 'wtg_socio_classes_state'

export function getStoredClasses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return INITIAL_MOCK_CLASSES
}

export function saveStoredClasses(classes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes))
  } catch {
    // ignore
  }
}
