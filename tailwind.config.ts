import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050713",
          900: "#080B1C",
          850: "#0B0F24",
          800: "#0F1430",
          700: "#151B3D",
          600: "#1E2550",
        },
        violet: {
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        brand: {
          300: "#9FE8FF",
          400: "#63D8FF",
          500: "#38BDF8",
          600: "#0EA5E9",
        },
        mint: "#5EEAD4",
        lime: "#BEF264",
        coral: "#FB7185",
        amber: "#FBBF24",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.625rem",
        "3xl": "0.75rem",
        "4xl": "1rem",
      },
      boxShadow: {
        glow: "0 18px 60px -20px rgba(124, 58, 237, 0.55)",
        card: "none",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.09) 1px, transparent 0)",
        "hero-radial":
          "radial-gradient(120% 120% at 0% 0%, rgba(124,58,237,0.42) 0%, rgba(56,189,248,0.16) 38%, rgba(5,7,19,0) 70%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "cell-ripple": {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "50%": { transform: "scale(1.12)", opacity: "0.75" },
          "100%": { transform: "scale(1)", opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "cell-ripple":
          "cell-ripple var(--duration, 200ms) ease-out var(--delay, 0ms)",
      },
    },
  },
  plugins: [],
};

export default config;
