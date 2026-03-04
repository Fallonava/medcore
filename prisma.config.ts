import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Runtime URL: uses Neon Connection Pooler for efficient connection management
    url: process.env["DATABASE_URL"],
    // Direct URL: used for migrations and introspection (bypasses pooler)
    // @ts-expect-error — Prisma CLI supports directUrl but types may lag
    directUrl: process.env["DIRECT_URL"],
  },
});
