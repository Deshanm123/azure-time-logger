import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().min(1),
    AUTH_MODE: z.enum(['app-token', 'development-headers']).default('app-token'),
    EXTENSION_SECRET: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().default(''),
    MAX_HOURS_PER_ENTRY: z.coerce.number().positive().max(24).default(24),
    BUSINESS_TIME_ZONE: z.string().default('UTC'),
  })
  .superRefine((value, context) => {
    if (value.AUTH_MODE === 'development-headers' && value.NODE_ENV === 'production') {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_MODE'],
        message: 'development-headers authentication cannot run in production',
      });
    }
    if (
      value.AUTH_MODE === 'app-token' &&
      (!value.EXTENSION_SECRET || value.EXTENSION_SECRET.length < 32)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['EXTENSION_SECRET'],
        message:
          'a 32+ character extension certificate key is required for app-token authentication',
      });
    }
  });

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const value = schema.parse(environment);
  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    host: value.HOST,
    databaseUrl: value.DATABASE_URL,
    authMode: value.AUTH_MODE,
    extensionSecret: value.EXTENSION_SECRET,
    corsAllowedOrigins: value.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    maxHoursPerEntry: value.MAX_HOURS_PER_ENTRY,
    businessTimeZone: value.BUSINESS_TIME_ZONE,
  };
}
