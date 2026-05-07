import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getOidcClient, generators } from '../config/oidc';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';

interface OidcSession {
  state?: string;
  nonce?: string;
  codeVerifier?: string;
}

declare module 'express-session' {
  interface SessionData {
    oidc?: OidcSession;
  }
}

export async function initiateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await getOidcClient();
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    req.session.oidc = { state, nonce, codeVerifier };

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

export async function handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await getOidcClient();
    const { state, nonce, codeVerifier } = req.session.oidc || {};

    if (!state || !nonce || !codeVerifier) {
      res.status(400).json({ error: 'Invalid session state' });
      return;
    }

    const params = client.callbackParams(req);
    const tokenSet = await client.callback(config.oidc.redirectUri, params, {
      state,
      nonce,
      code_verifier: codeVerifier,
    });

    const claims = tokenSet.claims();
    const sub = claims.sub;
    const email = claims.email as string;
    const name = (claims.name as string) || email;
    const picture = claims.picture as string | undefined;

    // Upsert user
    const users = await query<{ id: string }>(
      `INSERT INTO users (oidc_subject, email, name, picture_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (oidc_subject) DO UPDATE
         SET email = EXCLUDED.email, name = EXCLUDED.name, picture_url = EXCLUDED.picture_url
       RETURNING id`,
      [sub, email, name, picture || null]
    );

    const userId = users[0].id;

    // Copy system categories for new user if they don't have any yet
    const existingCats = await query(
      'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
      [userId]
    );
    if (parseInt((existingCats[0] as { count: string }).count, 10) === 0) {
      await query(
        `INSERT INTO categories (user_id, name, icon, color, type, is_system)
         SELECT $1, name, icon, color, type, FALSE FROM categories WHERE user_id IS NULL`,
        [userId]
      );
      logger.info('Seeded default categories for new user', { userId });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId, email, name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    delete req.session.oidc;

    // Redirect to frontend with token
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    logger.error('OIDC callback error', { error: (err as Error).message });
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await getOidcClient();
    req.session.destroy(() => {});

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
