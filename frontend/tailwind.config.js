/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        navy: '#102131',
        slate: '#3a465b',
        teal: '#00ceb8',
        'teal-light': '#3ab4cc',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(0,206,184,0.4)' },
          '50%': { boxShadow: '0 0 16px 6px rgba(0,206,184,0.7)' },
        },
        'lid-open': {
          '0%': { transform: 'rotateX(0deg)' },
          '100%': { transform: 'rotateX(-110deg)' },
        },
        'reveal-content': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spotlight': {
          '0%, 100%': {
            boxShadow: '0 0 20px 8px rgba(250,204,21,0.4), 0 0 60px 20px rgba(250,204,21,0.15)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 30px 12px rgba(250,204,21,0.6), 0 0 80px 30px rgba(250,204,21,0.25)',
            transform: 'scale(1.03)',
          },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'lid-open': 'lid-open 0.5s ease-out forwards',
        'reveal-content': 'reveal-content 0.4s ease-out 0.3s forwards',
        'spotlight': 'spotlight 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
