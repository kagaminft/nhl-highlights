import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ice-dark":  "#0a1628",
        "ice-mid":   "#0f2040",
        "ice-card":  "#152338",
        "ice-blue":  "#4a9eca",
        "ice-white": "#e8f4f8",
        "ice-grey":  "#8ab4cc",
        "pp-gold":   "#f5c518",
        "sh-red":    "#e84040",
        "en-orange": "#f07830",
      },
      fontFamily: {
        epilogue: ["var(--font-epilogue)", "sans-serif"],
        lexend:   ["var(--font-lexend)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
