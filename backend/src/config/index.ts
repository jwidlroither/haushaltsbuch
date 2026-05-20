import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

// Validate all required env vars at startup – clear error messages
const EnvSchema = z.object({
  NODE_ENV:                    z.string().default('development'),
  PORT:                        z.string().default('3001'),
  LOG_LEVEL:                   z.enum(['error','warn','info','http','debug']).default('info'),
  DB_HOST:                     z.string().default('localhost'),
  DB_PORT:                     z.string().default('5432'),
  DB_NAME:                     z.string().default('haushaltsbuch'),
  DB_USER:                     z.string().default('haushalt'),
  DB_PASSWORD:                 z.string().min(1, 'DB_PASSWORD is required'),
  OIDC_ISSUER_URL:             z.string().url('OIDC_ISSUER_URL must be a valid URL'),
  OIDC_CLIENT_ID:              z.string().min(1, 'OIDC_CLIENT_ID is required'),
  OIDC_CLIENT_SECRET:          z.string().min(1, 'OIDC_CLIENT_SECRET is required'),
  OIDC_REDIRECT_URI:           z.string().url('OIDC_REDIRECT_URI must be a valid URL'),
  OIDC_POST_LOGOUT_REDIRECT_URI: z.string().url().default('http://localhost'),
  JWT_SECRET:                  z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL:                z.string().url().default('http://localhost'),
});

function validateEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('\n❌ Invalid environment variables:\n');
    result.error.errors.forEach(e => {
      console.error(`   ${e.path.join('.')}: ${e.message}`);
    });
    console.error('\nCheck your .env file and try again.\n');
    process.exit(1);
  }
  return result.data;
}

const env = validateEnv();

export const config = {
  node_env: env.NODE_ENV,
  port:     parseInt(env.PORT, 10),
  logLevel: env.LOG_LEVEL,

  db: {
    host:     env.DB_HOST,
    port:     parseInt(env.DB_PORT, 10),
    name:     env.DB_NAME,
    user:     env.DB_USER,
    password: env.DB_PASSWORD,
  },

  oidc: {
    issuerUrl:              env.OIDC_ISSUER_URL,
    clientId:               env.OIDC_CLIENT_ID,
    clientSecret:           env.OIDC_CLIENT_SECRET,
    redirectUri:            env.OIDC_REDIRECT_URI,
    postLogoutRedirectUri:  env.OIDC_POST_LOGOUT_REDIRECT_URI,
  },

  jwt: {
    secret: env.JWT_SECRET,
  },

  frontendUrl: env.FRONTEND_URL,
};
