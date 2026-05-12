import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { pool } from './config/database';
import { getOidcClient } from './config/oidc';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

// REQUIRED: Trust the Nginx reverse proxy so that
// req.protocol is 'https' and session cookies work correctly
app.set('trust proxy', 1);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
}));

// Parsing & logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.info(msg.trim()) },
}));

// Session (used only during OIDC login flow for state/nonce/codeVerifier)
app.use(session({
  secret: config.session.secret,
  resave: false,
  // Must be true so the session is saved before the redirect to the OIDC provider
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure:false works for HTTP (local/dev). Set to true only when using HTTPS.
    secure: config.session.secureCookie,
    maxAge: 10 * 60 * 1000, // 10 minutes – enough for the OIDC round-trip
    // 'lax' allows the cookie to be sent on top-level navigations (redirects from OIDC provider)
    sameSite: 'lax',
  },
}));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler (must be last)
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connected');

    await getOidcClient();
    logger.info('OIDC client initialized');

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        env: config.node_env,
        port: config.port,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

start();

export default app;
