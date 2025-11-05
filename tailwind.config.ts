import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ntu: {
          green: "#00694E",
          white: "#FFFFFF",
          gray: "#F5F5F5",
        },
      },
    },
  },
  plugins: [],
};
export default config;

