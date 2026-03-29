/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050511',
          800: '#0f0f23',
          700: '#1a1a3e',
        },
        cyber: {
          red: '#ff0055',
          cyan: '#00ffff',
          purple: '#9333ea',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      keyframes: {
        glow: {
          '0%, 100%': { textShadow: '0 0 10px #ff0055, 0 0 20px #ff0055' },
          '50%': { textShadow: '0 0 20px #ff0055, 0 0 40px #ff0055' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(255, 0, 85, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.1)'
          },
          '50%': {
            boxShadow: '0 0 20px rgba(255, 0, 85, 0.8), inset 0 0 15px rgba(0, 255, 255, 0.2)'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
