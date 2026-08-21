import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getOidcClient, generators } from '../config/oidc';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { saveOidcState, consumeOidcState } from '../config/oidcStateStore';

/**
 * The OIDC `state` parameter encodes both our DB entry ID and the random
 * state value, separated by a dot: "<dbId>.<randomState>"
 *
 * This way we can look up the DB entry from the callback without any
 * cookies or sessions – completely proxy/HTTPS-agnostic.
 */
function encodeState(dbId: string, randomState: string): string {
  return `${dbId}.${randomState}`;
}

function decodeState(encoded: string): { dbId: string; randomState: string } | null {
  const dot = encoded.indexOf('.');
  if (dot === -1) return null;
  return { dbId: encoded.substring(0, dot), randomState: encoded.substring(dot + 1) };
}

export async function initiateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await getOidcClient();
    const randomState = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    // Persist state in DB – no cookies needed
    const dbId = await saveOidcState({ state: randomState, nonce, codeVerifier });
    const compositeState = encodeState(dbId, randomState);

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state: compositeState,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    logger.debug('OIDC login initiated', { dbId });
    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

export async function handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await getOidcClient();

    // The `state` query param is our composite "<dbId>.<randomState>"
    const rawState = (req.query.state as string) || '';
    const decoded = decodeState(rawState);

    if (!decoded) {
      logger.warn('OIDC callback: could not decode state parameter', { rawState });
      res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
      return;
    }

    // Load + delete the state from DB (one-time use)
    const stateEntry = await consumeOidcState(decoded.dbId);
    if (!stateEntry) {
      logger.warn('OIDC callback: state not found or expired', { dbId: decoded.dbId });
      res.redirect(`${config.frontendUrl}/login?error=state_expired`);
      return;
    }

    // Verify the random part matches what Pocket ID echoed back
    if (stateEntry.state !== decoded.randomState) {
      logger.warn('OIDC callback: state mismatch');
      res.redirect(`${config.frontendUrl}/login?error=state_mismatch`);
      return;
    }

    const params = client.callbackParams(req);
    const tokenSet = await client.callback(config.oidc.redirectUri, params, {
      state: rawState,           // openid-client verifies this against what we passed
      nonce: stateEntry.nonce,
      code_verifier: stateEntry.codeVerifier,
    });

    const claims = tokenSet.claims();
    const sub = claims.sub;
    const email = (claims.email as string) || sub;
    const name = (claims.name as string) || email;
    const picture = claims.picture as string | undefined;

    // Upsert user
    const users = await query<{ id: string }>(
      `INSERT INTO users (oidc_subject, email, name, picture_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (oidc_subject) DO UPDATE
         SET email = EXCLUDED.email,
             name  = EXCLUDED.name,
             picture_url = EXCLUDED.picture_url
       RETURNING id`,
      [sub, email, name, picture || null]
    );
    const userId = users[0].id;

    // Seed default categories for new users
    const existingCats = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
      [userId]
    );
    if (parseInt(existingCats[0].count, 10) === 0) {
      await query(
        `INSERT INTO categories (user_id, name, icon, color, type, is_system)
         SELECT $1, name, icon, color, type, FALSE
         FROM categories WHERE user_id IS NULL`,
        [userId]
      );
      logger.info('Seeded default categories for new user', { userId });
    }

    // Issue JWT
    const token = jwt.sign({ userId, email, name }, config.jwt.secret, { expiresIn: '24h' });

    logger.info('OIDC login successful', { userId, email });
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    logger.error('OIDC callback error', { error: (err as Error).message });
    // Redirect to login with error instead of showing raw JSON
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await getOidcClient();
    const endSessionUrl = client.endSessionUrl({
      post_logout_redirect_uri: config.oidc.postLogoutRedirectUri,
    });
    res.json({ logoutUrl: endSessionUrl });
  } catch (err) {
    next(err);
  }
}

export function getMe(req: Request, res: Response): void {
  res.json({ user: req.user });
}
