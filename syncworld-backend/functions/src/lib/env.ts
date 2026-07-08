import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FIREBASE_PROJECT_ID: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missingKeys = parsedEnv.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Missing or invalid functions env vars: ${missingKeys.join(', ')}`);
}

export const functionsEnv = parsedEnv.data;
