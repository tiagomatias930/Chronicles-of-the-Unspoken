module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./**/*.{jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        typewriter: ["'Special Elite'", "cursive"],
        "mono-prime": ["'Courier Prime'", "monospace"],
        stencil: ["'Black Ops One'", "cursive"],
      },
      colors: {
        black: "#050505",
      },
      animation: {
        marquee: "marquee 20s linear infinite",
        progress: "progress 1.5s infinite",
        scan: "scan 6s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        progress: {
          "0%": { left: "-50%" },
          "100%": { left: "100%" },
        },
        scan: {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "5%": { opacity: "1" },
          "95%": { opacity: "1" },
          "100%": { transform: "translateY(85vh)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
