import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FIREBASE_PROJECT_ID: z.string().min(1).default('syncworld-dev'),
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  // When false (default), App Check is validated but failures are warn-only — connection is allowed.
  // Flip to true once the Expo/web client ships App Check token support.
  ENFORCE_APP_CHECK: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missingKeys = parsedEnv.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Missing or invalid realtime-server env vars: ${missingKeys.join(', ')}`);
}

export const realtimeServerEnv = parsedEnv.data;
