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
        app: "#F7F8FA",
        sidebar: {
          DEFAULT: "#0B0D12",
          hover: "#161923",
          active: "#1C2030",
          border: "#1C2028",
          foreground: "#C7CBD1",
          muted: "#767C90",
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
        card: "8px",
      },
      boxShadow: {
        // Sombra quase inexistente de propósito — a definição do card
        // agora vem da borda de 1px, não de profundidade simulada. Isso
        // é a mudança de "app fofo" pra "ferramenta de precisão".
        card: "0 1px 2px 0 rgba(11, 13, 18, 0.03)",
        "card-hover": "0 1px 2px 0 rgba(11, 13, 18, 0.06)",
        popover: "0 8px 20px -4px rgba(11, 13, 18, 0.14), 0 2px 6px -2px rgba(11, 13, 18, 0.08)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
