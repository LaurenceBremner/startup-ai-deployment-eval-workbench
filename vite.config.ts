import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/startup-ai-deployment-eval-workbench/",
  plugins: [react()],
});
