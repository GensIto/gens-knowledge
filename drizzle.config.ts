import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'sqlite',
  schema: './worker/src/infrastructure/schema.ts',
  out: './migrations',
});
