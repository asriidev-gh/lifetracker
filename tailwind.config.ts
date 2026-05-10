import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        dashboard: {
          hero: "hsl(var(--dashboard-hero))",
          "hero-border": "hsl(var(--dashboard-hero-border))",
          panel: "hsl(var(--dashboard-panel))",
          "panel-muted": "hsl(var(--dashboard-panel-muted))",
          "stat-a": "hsl(var(--dashboard-stat-a))",
          "stat-a-border": "hsl(var(--dashboard-stat-a-border))",
          "stat-b": "hsl(var(--dashboard-stat-b))",
          "stat-b-border": "hsl(var(--dashboard-stat-b-border))",
          warn: "hsl(var(--dashboard-warn))",
          "warn-border": "hsl(var(--dashboard-warn-border))",
          "warn-fg": "hsl(var(--dashboard-warn-fg))",
          list: "hsl(var(--dashboard-list))",
          "list-border": "hsl(var(--dashboard-list-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
