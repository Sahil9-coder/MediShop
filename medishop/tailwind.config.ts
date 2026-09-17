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
        // ── Primary: Deep Teal ────────────────────────────────
        primary: {
          DEFAULT: "#0F7B6C",
          50:  "#E8F5F3",
          100: "#C4E6E1",
          200: "#9DD4CC",
          300: "#6DBFB6",
          400: "#3FADA3",
          500: "#0F7B6C",
          600: "#0C6459",
          700: "#094D46",
          800: "#063733",
          900: "#031E1C",
        },
        // ── Accent: Warm Orange (Return mode, warnings) ───────
        accent: {
          DEFAULT: "#FF6B35",
          50:  "#FFF0EB",
          100: "#FFD8C8",
          200: "#FFB899",
          300: "#FF9469",
          400: "#FF7D4C",
          500: "#FF6B35",
          600: "#E5501C",
          700: "#C23C13",
          800: "#9A2B0C",
          900: "#6E1C06",
        },
        // ── Semantic Colors ───────────────────────────────────
        danger:  "#DC2626",  // expiry red
        warn:    "#D97706",  // expiry orange
        safe:    "#16A34A",  // expiry green
        // ── Neutrals ─────────────────────────────────────────
        bg:      "#F8FAFB",  // app background
        surface: "#FFFFFF",  // card surfaces
        text: {
          primary: "#1A2332",
          muted:   "#64748B",
          light:   "#94A3B8",
        },
        border:  "#E2E8F0",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],   // headings, prices, large numbers
        body:    ["Inter", "sans-serif"],     // body text, labels
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        card:    "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "card-lg": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
        float:   "0 20px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      animation: {
        "fade-in":      "fadeIn 0.2s ease-out",
        "slide-up":     "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down":   "slideDown 0.2s ease-in",
        "scale-in":     "scaleIn 0.15s ease-out",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
        "shake":        "shake 0.4s ease-in-out",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:      { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown:    { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn:      { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        pulseGentle:  { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        shake:        { "0%, 100%": { transform: "translateX(0)" }, "20%, 60%": { transform: "translateX(-6px)" }, "40%, 80%": { transform: "translateX(6px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
