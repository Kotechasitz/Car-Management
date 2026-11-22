import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.url().default("http://localhost:5173"),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsedEnvironment.error)}`);
}

export const config = {
  port: parsedEnvironment.data.PORT,
  databaseUrl: parsedEnvironment.data.DATABASE_URL,
  corsOrigin: parsedEnvironment.data.CORS_ORIGIN,
};
