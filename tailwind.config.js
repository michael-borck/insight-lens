/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf7f2',
          100: '#f5f0e8',
          200: '#e8e0d4',
          300: '#d4c5a9',
          400: '#c4b08a',
          500: '#a09585',
          600: '#8b7e6a',
          700: '#6b6358',
          800: '#2d3436',
          900: '#1a1f20',
          950: '#111516',
        },
        success: {
          50: '#f0f7f2',
          300: '#8fc7a1',
          500: '#4a7c59',
          700: '#365a40',
          900: '#1c3424',
        },
        warning: {
          50: '#fdf6ee',
          300: '#e3ad6f',
          500: '#c17f3e',
          700: '#96602e',
          900: '#3c2a14',
        },
        error: {
          50: '#fdf2f2',
          300: '#e09090',
          500: '#b54a4a',
          700: '#8c3838',
          900: '#3f1d1d',
        }
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
