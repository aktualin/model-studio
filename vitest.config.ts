import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Matches Next.js's own server bundling condition so the "server-only"
    // marker package resolves to its no-op export instead of throwing.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // src/lib/db.ts needs this to exist at import time (it's lazy-connect,
      // so no real database is ever touched by the unit tests).
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
    },
  },
});
