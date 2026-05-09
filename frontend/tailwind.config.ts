import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: "#0b0d12",
          800: "#11141b",
          700: "#161a23",
          600: "#1d2230",
        },
        midnight: {
          900: "#0a0e1f",
          800: "#0f1430",
          700: "#161c44",
        },
        // Light palette — peach-cream paper + dark navy brand.
        // Token names kept (aubergine / violetInk) for source compatibility,
        // but they now resolve to the navy brand values.
        paper: "#FFE6C9",      // warm peach-orange background
        paperDeep: "#FBD3A8",  // deeper orange for surfaces & hover
        ink: "#0B1A33",        // navy-leaning text (matches brand)
        inkSoft: "#1F2B47",    // secondary text
        margin: "#7A6651",     // warm brown-grey for margin notes
        rule: "rgba(11,26,51,0.12)",
        aubergine: "#0B2545",  // BRAND — deep navy blue
        violetInk: "#061633",  // darker navy for hover/pressed
        blush: "#F4C9B5",      // warm peach accent
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        script: ["var(--font-allura)", "Allura", "cursive"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "float-slow": "float 14s ease-in-out infinite",
        "float-slower": "float 22s ease-in-out infinite",
        "fade-in": "fadeIn 0.6s ease-out both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(20px,-30px,0) scale(1.05)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
