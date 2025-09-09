const colors = require('tailwindcss/colors');

module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,ejs}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        sky: colors.sky,
        cyan: colors.cyan,
      },
      spacing: {
        '0': '0px',
        '1': '0.25rem',
        '2': '0.5rem',
        '4': '1rem',
        '8': '2rem',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};