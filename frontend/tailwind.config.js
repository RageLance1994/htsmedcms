export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "hsl(222 47% 11%)",
        surface: "hsl(0 0% 98%)",
        muted: "hsl(210 40% 96%)",
        ring: "hsl(215 20% 65%)"
      },
      boxShadow: {
        glow: "0 20px 50px -20px rgba(14, 116, 144, 0.35)"
      }
    }
  },
  plugins: []
};
