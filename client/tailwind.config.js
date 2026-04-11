/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Custom neon palette
        neon: {
          green: "#34d399",
          blue: "#60a5fa",
          purple: "#a78bfa",
          cyan: "#22d3ee",
          amber: "#fbbf24",
          red: "#f87171",
        },
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgb(39 39 42 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.35) 1px, transparent 1px)",
        "dot-grid-sm": "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
      },
      boxShadow: {
        glow:      "0 0 40px -10px var(--tw-shadow-color)",
        "glow-sm": "0 0 24px -8px var(--tw-shadow-color)",
        "glow-lg": "0 0 60px -12px var(--tw-shadow-color)",
        neon:      "0 0 16px currentColor",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1) translate(0,0)" },
          "50%":       { opacity: "0.65", transform: "scale(1.05) translate(2%, -2%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":        { transform: "translateY(-8px)" },
        },
        "scan-line": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "node-active": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(52,211,153,0.4)" },
          "50%":        { boxShadow: "0 0 0 8px rgba(52,211,153,0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.5" },
          "50%":        { opacity: "1" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 14s ease-in-out infinite",
        float:            "float 6s ease-in-out infinite",
        "scan-line":      "scan-line 3s linear infinite",
        "node-active":    "node-active 2s ease-in-out infinite",
        "pulse-soft":     "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
