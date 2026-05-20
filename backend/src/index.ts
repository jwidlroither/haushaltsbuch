import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { pool, connectWithRetry } from './config/database';
import { getOidcClient } from './config/oidc';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { logger } from './utils/logger';
import { startCleanupJob } from './utils/cleanupJob';

const app = express();

// Trust Nginx reverse proxy
app.set('trust proxy', 1);

// Request ID (first, so all logs can reference it)
app.use(requestId);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Stricter rate limit for auth endpoints (brute-force protection)
app.use('/api/auth/login', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please wait a minute.' },
}));

// General API rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests' },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (includes request ID)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (msg: string) => logger.http(msg.trim()) },
}));

// API routes
app.use('/api', routes);

// Health check – includes DB + OIDC status
app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  try {
    await pool.query('SELECT 1');
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }

  try {
    await getOidcClient();
    checks.oidc = 'ok';
  } catch {
    checks.oidc = 'error';
  }

  const healthy = Object.values(checks).every(v => v === 'ok');
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler (must be last)
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    // Retry DB connection with exponential backoff
    await connectWithRetry(5);

    // Pre-load OIDC configuration
    await getOidcClient();
    logger.info('OIDC client initialized');

    // Start background jobs
    startCleanupJob();

    app.listen(config.port, () => {
      logger.info('Server running', { port: config.port, env: config.node_env });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

start();

export default app;
