import { defineConfig } from "vite";
import path from "path";
import fs from "fs";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    https: {
      key: fs.readFileSync("../certs/server.key"),
      cert: fs.readFileSync("../certs/server.crt"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
