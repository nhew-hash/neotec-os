import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ---- Tokens exigidos pelo shadcn/ui (lidos via CSS variables) ----
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ---- Tokens de marca da Neotec OS (fora do padrão shadcn) ----
        app: "#F6F7F9",
        sidebar: {
          DEFAULT: "#11131A",
          hover: "#191C27",
          active: "#1F2333",
          border: "#22252F",
          foreground: "#C7CBD1",
          muted: "#7C8298",
        },
        success: { DEFAULT: "#16A34A", soft: "#E9F8EF" },
        warning: { DEFAULT: "#D97706", soft: "#FDF3E7" },
        danger: { DEFAULT: "#DC2626", soft: "#FCEAEA" },
        hot: "#E4572E",
        warm: "#D97706",
        cold: "#4CA9D9",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(17, 19, 26, 0.04), 0 1px 3px 0 rgba(17, 19, 26, 0.06)",
        popover: "0 4px 12px -2px rgba(17, 19, 26, 0.12), 0 2px 4px -2px rgba(17, 19, 26, 0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
