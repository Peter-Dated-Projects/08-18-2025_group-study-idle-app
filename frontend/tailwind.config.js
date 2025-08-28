/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./public/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        "falling-sky": ["FallingSky", "sans-serif"],
      },
    },
  },
  plugins: [],
};
