/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand — LabEasy light blue
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
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
        // Editorial serif for headlines — the public site's classic register.
        display: ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
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
