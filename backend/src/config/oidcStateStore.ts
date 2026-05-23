/**
 * DB-based OIDC state store.
 *
 * Replaces express-session entirely. Stores state/nonce/codeVerifier in
 * PostgreSQL so it survives across multiple backend instances and is
 * completely independent of cookies – which solves the "Invalid session
 * state" error that occurs when Pocket ID redirects back over HTTPS while
 * the app is running on HTTP (cookie SameSite/Secure mismatch).
 *
 * The state ID is passed as a short-lived query parameter in the redirect
 * URL to Pocket ID (piggybacking on the `state` parameter itself, encoded
 * as `<stateId>.<randomState>`), so no browser storage is needed at all.
 */

import { query } from './database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface OidcStateEntry {
  state: string;
  nonce: string;
  codeVerifier: string;
}

/** Save a new OIDC state entry and return its DB id */
export async function saveOidcState(entry: OidcStateEntry): Promise<string> {
  const id = crypto.randomBytes(16).toString('hex');
  await query(
    `INSERT INTO oidc_states (id, state, nonce, code_verifier) VALUES ($1, $2, $3, $4)`,
    [id, entry.state, entry.nonce, entry.codeVerifier]
  );
  // Prune old entries (> 15 min) opportunistically
  query(`DELETE FROM oidc_states WHERE created_at < NOW() - INTERVAL '15 minutes'`).catch(() => {});
  return id;
}

/** Load and immediately delete an OIDC state entry (one-time use) */
export async function consumeOidcState(id: string): Promise<OidcStateEntry | null> {
  const rows = await query<{ state: string; nonce: string; code_verifier: string }>(
    `DELETE FROM oidc_states WHERE id = $1
       AND created_at > NOW() - INTERVAL '15 minutes'
     RETURNING state, nonce, code_verifier`,
    [id]
  );
  if (!rows.length) {
    logger.warn('OIDC state not found or expired', { id });
    return null;
  }
  const row = rows[0];
  return { state: row.state, nonce: row.nonce, codeVerifier: row.code_verifier };
}
