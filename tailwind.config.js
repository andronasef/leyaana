/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Cairo",
          "Noto Sans Arabic Variable",
          "Noto Sans Arabic",
          "Segoe UI Emoji",
          "Apple Color Emoji",
          "Noto Color Emoji",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
