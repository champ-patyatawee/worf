import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        title: ["Inter", "system-ui", "sans-serif"],
        default: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [typography],
};
