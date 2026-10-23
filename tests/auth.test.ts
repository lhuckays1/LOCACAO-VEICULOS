import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const jwt = await import('../backend/src/config/jwt.js');
test('access and refresh tokens cannot be interchanged and refresh tokens are unique', () => {
  const payload = { userId: 'test-user', companyId: 'test-company', role: 'ADMIN' as const, name: 'TEST', email: 'test@example.com', sessionId: 'test-session' };
  const access = jwt.generateAccessToken(payload);
  const refresh = jwt.generateRefreshToken(payload);
  assert.equal(jwt.verifyAccessToken(access)?.userId, payload.userId);
  assert.equal(jwt.verifyRefreshToken(refresh)?.sessionId, payload.sessionId);
  assert.equal(jwt.verifyAccessToken(refresh), null);
  assert.equal(jwt.verifyRefreshToken(access), null);
  assert.notEqual(jwt.generateRefreshToken(payload), refresh);
  assert.equal(jwt.verifyAccessToken(access + 'tampered'), null);
});
