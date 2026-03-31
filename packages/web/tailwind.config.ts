import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0094dd",
          green: "#93c572",
        },
        surface: "#ffffff",
        "surface-muted": "#f8fafc",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.375rem",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
