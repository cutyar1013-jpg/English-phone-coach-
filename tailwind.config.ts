import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04060c",
          900: "#070b16",
          850: "#0a1020",
          800: "#0e1526",
          700: "#16203a",
        },
        aqua: "#5eead4",
        sky: "#7dd3fc",
        violet: "#a78bfa",
        coral: "#fb7185",
        amber: "#fbbf24",
        mint: "#34d399",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Arial",
          "Liberation Sans",
          "Helvetica Neue",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(94, 234, 212, 0.55)",
        "glow-violet": "0 0 46px -12px rgba(167, 139, 250, 0.6)",
        card: "0 18px 40px -24px rgba(0, 0, 0, 0.9)",
      },
      keyframes: {
        ring: {
          "0%": { transform: "scale(0.92)", opacity: "0.55" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sheet: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        wobble: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        ring: "ring 2.4s cubic-bezier(0.2, 0.6, 0.3, 1) infinite",
        breathe: "breathe 4.5s ease-in-out infinite",
        rise: "rise 0.35s cubic-bezier(0.2, 0.8, 0.3, 1) both",
        sheet: "sheet 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        fade: "fade 0.25s ease-out both",
        shimmer: "shimmer 1.8s linear infinite",
        wobble: "wobble 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
