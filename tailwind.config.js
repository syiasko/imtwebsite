/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary: deep blue #00428f (used as `brand` for backwards compat with existing classes)
        brand: {
          50: "#e6effa",
          100: "#cce0f5",
          200: "#99c1eb",
          300: "#66a2e1",
          400: "#3383d7",
          500: "#0064cd",
          600: "#00428f",
          700: "#003570",
          800: "#002851",
          900: "#001b32",
        },
        primary: {
          50: "#e6effa",
          100: "#cce0f5",
          200: "#99c1eb",
          300: "#66a2e1",
          400: "#3383d7",
          500: "#0064cd",
          600: "#00428f",
          700: "#003570",
          800: "#002851",
          900: "#001b32",
          DEFAULT: "#00428f",
        },
        // Secondary: warm amber #feae00
        secondary: {
          50: "#fff8e6",
          100: "#fff0cc",
          200: "#ffe199",
          300: "#ffd166",
          400: "#ffc233",
          500: "#feae00",
          600: "#cc8b00",
          700: "#996800",
          800: "#664500",
          900: "#332300",
          DEFAULT: "#feae00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
