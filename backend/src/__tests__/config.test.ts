/**
 * Ein FRONTEND_URL mit Trailing-Slash hätte früher `${frontendUrl}/auth/callback`
 * zu einem doppelten Slash gemacht ("https://host//auth/callback") – der
 * React-Router verfehlt diese Route, der OIDC-Login-Token geht verloren und die
 * App landet kommentarlos zurück auf /login. Siehe config/index.ts.
 */
describe('config.frontendUrl', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, FRONTEND_URL: 'https://haushalt.tumpenhasi.at/' };
  });

  afterAll(() => { process.env = ORIGINAL_ENV; });

  it('entfernt einen abschließenden Slash', () => {
    const { config } = require('../config');
    expect(config.frontendUrl).toBe('https://haushalt.tumpenhasi.at');
  });

  it('baut daraus eine saubere Callback-URL ohne doppelten Slash', () => {
    const { config } = require('../config');
    expect(`${config.frontendUrl}/auth/callback?token=x`).toBe(
      'https://haushalt.tumpenhasi.at/auth/callback?token=x'
    );
  });
});
