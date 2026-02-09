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
        sage: "#D5DDD3",
        surface: "#F2F5F0",
        dark: "#1A1A1A",
        secondary: "#5A5A5A",
        brand: "#2A9D8F",
        critical: "#DC2626",
        warning: "#D97706",
        success: "#16A34A",
        muted: "#6B7280",
        accent: "#6366F1",
        p0Bg: "#FEF2F2",
        p1Bg: "#FFF7ED",
        p2Bg: "#FEFCE8",
        p3Bg: "#F9FAFB",
        successBg: "#F0FDF4",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
