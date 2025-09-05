/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // Here we are extending the default Tailwind theme to add a custom color.
        // The name 'scentorini-blue' is a placeholder; you can name it whatever you like.
        colors: {
          'scentorini-blue': '#1B4B9E',
        },
      },
    },
    plugins: [],
  }
  