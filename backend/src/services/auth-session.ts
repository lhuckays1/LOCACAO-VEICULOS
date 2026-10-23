import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../config/jwt.js';
import { HttpError } from '../utils/api-error.js';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function issueSession(payload: TokenPayload, passwordHash: string, minutes: number) {
  const sessionId = randomUUID();
  const claims = { ...payload, sessionId };
  const refreshToken = generateRefreshToken(claims);
  await prisma.authSession.create({ data: {
    id: sessionId, userId: payload.userId, credentialHash: digest(passwordHash),
    refreshHash: digest(refreshToken), expiresAt: new Date(Date.now() + 7 * 86400000),
  } });
  return { accessToken: generateAccessToken(claims, minutes), refreshToken };
}

export async function rotateSession(payload: TokenPayload, oldToken: string, passwordHash: string, minutes: number) {
  if (!payload.sessionId) throw new HttpError(401, 'Sessão inválida. Entre novamente.');
  const refreshToken = generateRefreshToken(payload);
  const updated = await prisma.authSession.updateMany({
    where: { id: payload.sessionId, userId: payload.userId, refreshHash: digest(oldToken),
      credentialHash: digest(passwordHash), expiresAt: { gt: new Date() } },
    data: { refreshHash: digest(refreshToken) },
  });
  if (updated.count !== 1) throw new HttpError(401, 'Sessão expirada ou já renovada.');
  return { accessToken: generateAccessToken(payload, minutes), refreshToken };
}
