/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#060816",
          900: "#0a1024",
          800: "#111833",
        },
      },
    },
  },
  plugins: [],
};
