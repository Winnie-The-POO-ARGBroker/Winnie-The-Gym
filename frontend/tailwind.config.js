/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        primary: '#ff5a36',
        orange: {
          50:  '#FFF3EE',
          100: '#FFDFcc',
          200: '#FFBC9F',
          300: '#FF9871',
          400: '#FF7349',
          500: '#FF5722',
          600: '#E63E0F',
          700: '#B82E08',
          800: '#8A2106',
          900: '#5C1605',
        },
        blue: {
          500: '#1E88E5',
          600: '#166FBD',
        },
        success: {
          500: '#4CAF50',
          600: '#3D9241',
        },
        error: {
          500: '#F44336',
          600: '#D42F2F',
        },
        warning: {
          500: '#FFC107',
        },
        neutral: {
          50:  '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
      },
    },
  },
  plugins: [],
}
