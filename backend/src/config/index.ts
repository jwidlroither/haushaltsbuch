import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'haushaltsbuch',
    user: process.env.DB_USER || 'haushalt',
    password: process.env.DB_PASSWORD || 'securepassword',
  },

  oidc: {
    issuerUrl: required('OIDC_ISSUER_URL'),
    clientId: required('OIDC_CLIENT_ID'),
    clientSecret: required('OIDC_CLIENT_SECRET'),
    redirectUri: required('OIDC_REDIRECT_URI'),
    postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI || 'http://localhost',
  },

  session: {
    secret: required('SESSION_SECRET'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: '24h',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost',
};
