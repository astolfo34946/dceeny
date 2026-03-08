/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        backgroundLight: '#ffffff',
        backgroundDark: '#050505',
        textLight: '#f9fafb',
        textDark: '#020617',
        accent: '#e5e5e5',
      },
      fontFamily: {
        sans: ['system-ui', 'ui-sans-serif', 'SF Pro Text', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 10px 40px rgba(0,0,0,0.18)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

