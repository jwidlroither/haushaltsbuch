import { Issuer, Client, generators } from 'openid-client';
import { config } from '../config';
import { logger } from '../utils/logger';

let oidcClient: Client | null = null;

export async function getOidcClient(): Promise<Client> {
  if (oidcClient) return oidcClient;

  logger.info('Discovering OIDC issuer...', { issuer: config.oidc.issuerUrl });
  const issuer = await Issuer.discover(config.oidc.issuerUrl);
  logger.info('OIDC issuer discovered', { issuer: issuer.issuer });

  oidcClient = new issuer.Client({
    client_id: config.oidc.clientId,
    client_secret: config.oidc.clientSecret,
    redirect_uris: [config.oidc.redirectUri],
    post_logout_redirect_uris: [config.oidc.postLogoutRedirectUri],
    response_types: ['code'],
  });

  return oidcClient;
}

export { generators };
