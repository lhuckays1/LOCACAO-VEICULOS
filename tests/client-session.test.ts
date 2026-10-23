import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/services/api.js';

test('concurrent expired requests share one refresh operation', async () => {
  const values = new Map([['frota_access_token', 'expired'], ['frota_refresh_token', 'refresh-old']]);
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key),
  } });
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 20));
      return Response.json({ accessToken: 'new', refreshToken: 'refresh-new' });
    }
    const authorization = new Headers(options?.headers).get('Authorization');
    return authorization === 'Bearer new' ? Response.json({ user: { id: 'test' } }) : Response.json({}, { status: 401 });
  };
  try {
    const responses = await Promise.all([api.auth.me(), api.auth.me(), api.auth.me()]);
    assert.equal(refreshes, 1);
    assert.ok(responses.every(r => r.user.id === 'test'));
    assert.equal(values.get('frota_refresh_token'), 'refresh-new');
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
  }
});
