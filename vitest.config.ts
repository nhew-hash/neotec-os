import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ver src/test/stubs/server-only.ts — o Next resolve esse pacote
      // via alias interno do bundler; o vitest não, e o pacote nem está
      // instalado como dependência.
      "server-only": path.resolve(__dirname, "./src/test/stubs/server-only.ts"),
    },
  },
});
