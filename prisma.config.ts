import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Requerido por comandos de migración/introspección (prisma db execute, migrate).
  datasource: {
    url: (process.env.DIRECT_URL ?? process.env.DATABASE_URL) as string,
  },
});
