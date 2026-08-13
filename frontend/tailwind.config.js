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
      },
    },
  },
  plugins: [],
}
