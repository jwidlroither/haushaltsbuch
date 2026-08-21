/**
 * Unit tests for utility functions (no DB needed)
 */

describe('OIDC State encoding', () => {
  function encodeState(dbId: string, randomState: string) {
    return `${dbId}.${randomState}`;
  }

  function decodeState(encoded: string) {
    const dot = encoded.indexOf('.');
    if (dot === -1) return null;
    return { dbId: encoded.substring(0, dot), randomState: encoded.substring(dot + 1) };
  }

  it('encodes and decodes correctly', () => {
    const dbId  = 'abc123';
    const state = 'xyz789randomstate';
    const encoded = encodeState(dbId, state);

    expect(encoded).toBe('abc123.xyz789randomstate');
    const decoded = decodeState(encoded);
    expect(decoded).toEqual({ dbId: 'abc123', randomState: 'xyz789randomstate' });
  });

  it('handles state values with dots', () => {
    const encoded = encodeState('id1', 'state.with.dots');
    const decoded = decodeState(encoded);
    // Only first dot is separator – rest belongs to randomState
    expect(decoded?.dbId).toBe('id1');
    expect(decoded?.randomState).toBe('state.with.dots');
  });

  it('returns null for state without dot', () => {
    expect(decodeState('nodothere')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeState('')).toBeNull();
  });
});
