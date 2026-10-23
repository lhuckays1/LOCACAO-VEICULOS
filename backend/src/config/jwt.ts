import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { randomUUID } from 'node:crypto';
import { requiredSecret } from './env.js';

const JWT_SECRET = requiredSecret('JWT_SECRET');
const REFRESH_SECRET = requiredSecret('JWT_REFRESH_SECRET');
if (JWT_SECRET === REFRESH_SECRET) throw new Error('Os segredos JWT devem ser diferentes.');

/**
 * Duração padrão utilizada quando nenhuma configuração
 * específica da plataforma é informada.
 *
 * 8 horas = 480 minutos.
 */
const DEFAULT_ACCESS_TOKEN_MINUTES = 480;

/**
 * O refresh token continua com duração fixa por enquanto.
 */
const REFRESH_TOKEN_EXPIRATION = '7d';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'FINANCIAL';

export interface TokenPayload {
  sessionId?: string;
  userId: string;
  companyId: string | null;
  email: string;
  role: UserRole;
  name: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(
  password: string,
  hash: string
): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Gera o Access Token.
 *
 * expiresInMinutes é opcional para preservar compatibilidade
 * com chamadas existentes.
 *
 * Quando não informado, utiliza 8 horas.
 */
export function generateAccessToken(
  payload: TokenPayload,
  expiresInMinutes: number = DEFAULT_ACCESS_TOKEN_MINUTES
): string {
  const safeMinutes =
    Number.isFinite(expiresInMinutes) &&
    expiresInMinutes > 0
      ? expiresInMinutes
      : DEFAULT_ACCESS_TOKEN_MINUTES;

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: Math.round(safeMinutes * 60),
  });
}

export function generateRefreshToken(
  payload: TokenPayload
): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(
  token: string
): TokenPayload | null {
  try {
    return jwt.verify(
      token,
      JWT_SECRET, { algorithms: ['HS256'] }
    ) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(
  token: string
): TokenPayload | null {
  try {
    return jwt.verify(
      token,
      REFRESH_SECRET, { algorithms: ['HS256'] }
    ) as TokenPayload;
  } catch {
    return null;
  }
}