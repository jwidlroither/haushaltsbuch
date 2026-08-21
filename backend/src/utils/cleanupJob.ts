import { query } from '../config/database';
import { logger } from './logger';
import { materializeRecurring } from '../controllers/recurringController';

export function startCleanupJob(): void {
  const runCleanup = async () => {
    try {
      const rows = await query(`DELETE FROM oidc_states WHERE created_at < NOW() - INTERVAL '15 minutes' RETURNING id`);
      if (rows.length > 0) logger.debug('Cleanup: expired OIDC states', { count: rows.length });
    } catch (err) { logger.warn('Cleanup error', { error: (err as Error).message }); }
  };

  const runMaterialize = async () => {
    try {
      const now = new Date();
      const users = await query<{ id: string }>(`SELECT DISTINCT user_id as id FROM recurring_transactions WHERE is_active=TRUE`);
      let total = 0;
      for (const { id } of users) total += await materializeRecurring(id, now.getMonth()+1, now.getFullYear());
      if (total > 0) logger.info('Scheduled materialize', { total });
    } catch (err) { logger.warn('Materialize error', { error: (err as Error).message }); }
  };

  runCleanup(); runMaterialize();
  setInterval(runCleanup, 5*60*1000).unref();
  setInterval(runMaterialize, 60*60*1000).unref();
  logger.info('Background jobs started');
}
