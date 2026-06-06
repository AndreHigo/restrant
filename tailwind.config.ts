import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6f7f2",
          100: "#ecefe1",
          200: "#d8dfc3",
          300: "#b7c39a",
          400: "#8ea068",
          500: "#6d8148",
          600: "#57693a",
          700: "#455330",
          800: "#39432a",
          900: "#313925"
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      boxShadow: {
        panel: "0 24px 60px rgba(24, 24, 16, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
