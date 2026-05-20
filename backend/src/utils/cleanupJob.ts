/**
 * Background cleanup job – runs periodically to purge expired OIDC states.
 * No external dependencies (pg_cron, cron libs) needed.
 * Starts automatically when the server starts.
 */
import { query } from '../config/database';
import { logger } from './logger';

const INTERVAL_MS  = 5 * 60 * 1000;  // every 5 minutes
const EXPIRE_AFTER = '15 minutes';

export function startCleanupJob(): NodeJS.Timeout {
  const run = async () => {
    try {
      const rows = await query<{ count: string }>(
        `DELETE FROM oidc_states
         WHERE created_at < NOW() - INTERVAL '${EXPIRE_AFTER}'
         RETURNING id`
      );
      if (rows.length > 0) {
        logger.debug('Cleanup: expired OIDC states removed', { count: rows.length });
      }
    } catch (err) {
      logger.warn('Cleanup job error', { error: (err as Error).message });
    }
  };

  // Run once immediately, then on interval
  run();
  const timer = setInterval(run, INTERVAL_MS);

  // Don't block process exit
  timer.unref();

  logger.info('Cleanup job started', { intervalMs: INTERVAL_MS });
  return timer;
}
