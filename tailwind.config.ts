import type { Config } from "tailwindcss";

// Colors ported 1:1 from the My Home mobile app's src/theme.ts so the
// backoffice matches the brand exactly.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        green: "#2C5530",
        greenDark: "#20401f",
        charcoal: "#2B2B2B",
        parchment: "#F2EEE4",
        parchmentAlt: "#EAE4D6",
        taupe: "#C9C2AE",
        gold: "#B8935A",
        red: "#8a3d3d",
        background: "#DDD6C4",
        surface: "#F2EEE4",
        surfaceAlt: "#EAE4D6",
        ink: "#2B2B2B",
        line: "rgba(43,43,43,0.08)",
      },
      fontFamily: {
        serif: ["Georgia", "'EB Garamond'", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
