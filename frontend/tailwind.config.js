// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CodeCollab glassmorphism palette
        glass: {
          bg: 'rgba(17, 24, 39, 0.95)',
          border: 'rgba(75, 85, 99, 0.3)',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        glow: '0 0 0 1px rgba(16, 185, 129, 0.2), 0 0 0 5px rgba(16, 185, 129, 0.1)',
      },
      fontFamily: {
        code: ['Fira Code', 'Cascadia Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-10px,0)' },
        },
      },
    },
  },
  plugins: [],
}
