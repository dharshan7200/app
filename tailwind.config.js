/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#F97316",
          secondary: "#FBBF24",
          accent: "#FEF3C7",
          dark: "#7C2D12",
          surface: "#FFFFFF",
          bg: "#FFF7ED",
          muted: "#78716C",
          bgDark: "#1C1917",
          surfaceDark: "#292524",
          textDark: "#FAFAF9"
        }
      }
    }
  },
  plugins: []
}
