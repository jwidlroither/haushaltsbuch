import express, { Request, Response } from 'express';
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

// Trust the Nginx reverse proxy (needed for correct IP / rate limiting)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.info(msg.trim()) },
}));

// NOTE: No express-session needed.
// OIDC state (state/nonce/codeVerifier) is stored in PostgreSQL (oidc_states table).
// This makes the login flow completely cookie/proxy-independent and works
// correctly with Pocket ID's HTTPS requirement.

// API routes
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

// Global error handler (must be last)
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connected');

    await getOidcClient();
    logger.info('OIDC client initialized');

    app.listen(config.port, () => {
      logger.info(`Server running`, { port: config.port, env: config.node_env });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

start();

export default app;
