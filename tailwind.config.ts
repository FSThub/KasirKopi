import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Latar netral dingin ala dashboard referensi */
        surface: "#f1f2f6",
        coffee: {
          50: "#faf6f2",
          100: "#f2e8de",
          200: "#e4ceb9",
          300: "#d3ad8c",
          400: "#c08a5f",
          500: "#b06f42",
          600: "#9a5a37",
          700: "#7d472f",
          800: "#663a2a",
          900: "#553226",
          950: "#2f1a13",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
