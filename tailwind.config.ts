import type { Config } from "tailwindcss";
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Safe namespace extension for studio features
        studio: {
          primary: '#1E40AF', // Example: studio-specific blue
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
