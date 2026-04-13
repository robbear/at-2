import type { Config } from "tailwindcss";

export default {
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
        border: "hsl(214.3 31.8% 91.4%)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.375rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
