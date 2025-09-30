/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./views/**/*.ejs",
    "./views/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d3748',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}