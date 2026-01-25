/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Your existing custom color
      colors: {
        'scentorini-blue': '#1B4B9E',
      },
      // NEW: Your custom font families
      fontFamily: {
        archivo: ['"Archivo Black"', 'sans-serif'],
        bebas: ['"Bebas Neue"', 'cursive'],
        tenor: ['"Tenor Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}