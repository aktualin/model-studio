import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma config files don't auto-load .env files. Next.js convention (and
// our .env.example) uses .env.local for real secrets, so load that here —
// dotenv only loads plain .env by default.
loadEnv({ path: ".env.local" });
loadEnv();

type Env = {
  DIRECT_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations always run against the direct (non-pooled) connection —
    // PgBouncer's transaction pooling mode doesn't support the prepared
    // statements and advisory locks Prisma Migrate needs.
    url: env<Env>("DIRECT_URL"),
  },
});
