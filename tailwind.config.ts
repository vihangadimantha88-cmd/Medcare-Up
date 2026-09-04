import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // 🔥 මේ පේළිය අනිවාර්යයි!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;