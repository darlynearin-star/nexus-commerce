import { z } from 'zod';

// Single source of truth for API environment configuration. Validated at module
// load so a misconfigured deployment fails loudly instead of running with
// insecure/incomplete settings.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),

  // JWT signing secrets. Required and fail-closed: a missing secret must never
  // fall back to a publicly derivable value.
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be set (min 16 chars)'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be set (min 16 chars)'),
  JWT_ACCESS_TTL: z.string().default('2h'),

  // CORS / CSP. When unset, safe defaults matching the current deployment are used.
  CORS_ORIGIN: z.string().optional(),
  CSP_CONNECT_SRC: z.string().optional(),
  CSP_IMG_SRC: z.string().optional(),

  // Frontend origins (used for redirects / URLs).
  STOREFRONT_URL: z.string().url().optional(),
  RETAILER_DASHBOARD_URL: z.string().url().optional(),
  DEVELOPER_DASHBOARD_URL: z.string().url().optional(),
  RENDER_EXTERNAL_URL: z.string().url().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;