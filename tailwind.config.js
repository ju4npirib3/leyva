/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        income: '#00C07F',
        expense: '#FF3B30',
        accent: '#007AFF',
        surface: {
          light: '#FFFFFF',
          dark: '#1C1C1E',
        },
        bg: {
          light: '#F2F2F7',
          dark: '#0C0C0E',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
          'Segoe UI', 'Roboto', 'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'slide-up': 'slideUp 0.35s cubic-bezier(0.32,0.72,0,1)',
        'fade-in': 'fadeIn 0.2s ease',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
