import { Issuer, Client, generators } from 'openid-client';
import { config } from '../config';
import { logger } from '../utils/logger';

let oidcClient: Client | null = null;
let oidcDiscoveryPromise: Promise<Client> | null = null;

export async function getOidcClient(): Promise<Client> {
  if (oidcClient) return oidcClient;

  // Deduplicate concurrent discovery calls
  if (!oidcDiscoveryPromise) {
    oidcDiscoveryPromise = (async () => {
      logger.info('Discovering OIDC issuer...', { issuer: config.oidc.issuerUrl });
      const issuer = await Issuer.discover(config.oidc.issuerUrl);
      logger.info('OIDC issuer discovered', { issuer: issuer.issuer });
      const client = new issuer.Client({
        client_id: config.oidc.clientId,
        client_secret: config.oidc.clientSecret,
        redirect_uris: [config.oidc.redirectUri],
        post_logout_redirect_uris: [config.oidc.postLogoutRedirectUri],
        response_types: ['code'],
      });
      oidcClient = client;
      return client;
    })().catch(err => {
      oidcDiscoveryPromise = null; // allow retry on next call
      throw err;
    });
  }

  return oidcDiscoveryPromise;
}

export { generators };
