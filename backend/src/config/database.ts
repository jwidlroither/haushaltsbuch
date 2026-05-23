import { Pool } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

export const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.name,
  user:     config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected DB pool error', { error: err.message });
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    logger.debug('DB query', { duration: Date.now() - start, rows: res.rowCount });
    return res.rows as T[];
  } catch (err) {
    logger.error('DB query error', { error: (err as Error).message, query: text });
    throw err;
  }
}

/**
 * Connect to DB with exponential backoff.
 * Retries up to maxAttempts times with doubling delays (2s, 4s, 8s, ...).
 */
export async function connectWithRetry(maxAttempts = 5): Promise<void> {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT NOW()');
      logger.info('Database connected', { attempt });
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      logger.warn(`DB connection failed, retrying in ${delay / 1000}s...`, {
        attempt,
        error: (err as Error).message,
      });
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 30000); // cap at 30s
    }
  }
}
