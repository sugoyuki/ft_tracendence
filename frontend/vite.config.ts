import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
