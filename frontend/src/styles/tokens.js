/**
 * Design tokens extracted from Figma — Winnie The Gym design system.
 * Source: global/color/*, theme/dark/color/*, text styles.
 *
 * Use these constants anywhere inline styles are needed.
 * Tailwind aliases are defined in tailwind.config.js.
 */

export const colors = {
  // Brand — Orange scale
  orange: {
    50:  '#FFF3EE',
    100: '#FFDFcc',
    200: '#FFBC9F',
    300: '#FF9871',
    400: '#FF7349',
    500: '#ff5a36', // primary — CTAs, active nav, logo bg
    600: '#E63E0F',
    700: '#B82E08',
    800: '#8A2106',
    900: '#5C1605',
  },

  // Brand — Blue scale
  blue: {
    50:  '#E8F2FD',
    100: '#C5DEF9',
    200: '#8FBDF4',
    300: '#5DA0EE',
    400: '#3892E9',
    500: '#1E88E5', // secondary
    600: '#166FBD',
    700: '#115695',
    800: '#0C3E6C',
    900: '#062644',
  },

  // State — Success (green)
  success: {
    50:  '#E8F5E9',
    100: '#C9E8CB',
    200: '#95CD97',
    300: '#69B96D',
    400: '#56B55A',
    500: '#4CAF50', // entries, aforo gauge
    600: '#3D9241',
    700: '#2F7333',
    800: '#235425',
    900: '#163518',
  },

  // State — Error (red)
  error: {
    50:  '#FEECEC',
    100: '#FBCBC9',
    200: '#F49792',
    300: '#EE6862',
    400: '#F1554D',
    500: '#F44336', // exits, alerts, danger
    600: '#D42F2F',
    700: '#A82626',
    800: '#7C1D1D',
    900: '#501414',
  },

  // State — Warning (amber)
  warning: {
    50:  '#FFFAE2',
    100: '#FFF1B3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFC107',
    600: '#FFB300',
    700: '#FFA000',
    800: '#FF8F00',
    900: '#FF6F00',
  },

  // Neutral scale
  neutral: {
    50:  '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E8',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#181818',
    950: '#0A0A0B',
  },

  // Theme — Dark mode semantic tokens
  dark: {
    bg: {
      base:    '#121212', // page background
      surface: '#1E1E1E', // sidebar, cards
      raised:  '#262626', // inputs, hover surfaces
    },
    border: {
      subtle: 'rgba(255,255,255,0.10)',
      strong: 'rgba(255,255,255,0.18)',
    },
    text: {
      primary:   'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.62)',
      tertiary:  'rgba(255,255,255,0.38)',
    },
  },
}

/**
 * Returns an rgba() string from a hex color and an alpha value (0–1).
 * Use for translucent backgrounds derived from design tokens.
 */
export function withAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['Roboto Mono', 'monospace'],
  },
  // Inter scale used in the design
  fontSize: {
    '2xs': '10px',
    xs:   '11px',
    sm:   '12px',
    base: '13px',
    md:   '16px',
    lg:   '18px',
    xl:   '20px',
    '2xl': '24px',
    '3xl': '26px',
    '4xl': '30px',
  },
}
