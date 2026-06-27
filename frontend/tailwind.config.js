/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F172A',
        surface: '#1E293B',
        surface2: '#253347',
        primary: '#4F46E5',
        'primary-light': '#6366F1',
        secondary: '#7C3AED',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
};
