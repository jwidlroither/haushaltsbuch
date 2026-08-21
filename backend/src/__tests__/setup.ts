// Test environment setup – set required env vars before any module loads
process.env.NODE_ENV           = 'test';
process.env.LOG_LEVEL          = 'error'; // silence logs during tests
process.env.DB_PASSWORD        = 'test-password';
process.env.OIDC_ISSUER_URL    = 'https://test.example.com';
process.env.OIDC_CLIENT_ID     = 'test-client';
process.env.OIDC_CLIENT_SECRET = 'test-secret';
process.env.OIDC_REDIRECT_URI  = 'http://localhost/api/auth/callback';
process.env.JWT_SECRET         = 'test-jwt-secret-that-is-at-least-32-chars!!';
process.env.FRONTEND_URL       = 'http://localhost';
