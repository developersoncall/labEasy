/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand red (matches the Medis logo — rgba(255,0,0))
        primary: {
          50: '#fff1f1',
          100: '#ffdede',
          200: '#ffc4c4',
          300: '#ff9a9a',
          400: '#ff5c5c',
          500: '#ff1f1f',
          600: '#ff0000',
          700: '#d60000',
          800: '#b00000',
          900: '#8a0000',
        },
        // Secondary healthcare green
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 8px 30px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
