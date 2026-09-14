import "dotenv/config";

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle-generated",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_DIRECT_URL ||
      process.env.TEST_DATABASE_DIRECT_URL ||
      "",
  },
});
