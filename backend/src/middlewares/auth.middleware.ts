import { digest } from '../services/auth-session.js';
import { Request, Response, NextFunction } from 'express';

import { verifyAccessToken, TokenPayload } from '../config/jwt.js';
import { prisma } from '../config/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireCompany(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user?.companyId) {
    res.status(403).json({ error: 'COMPANY_REQUIRED', message: 'Esta operação exige uma conta vinculada a uma empresa.' });
    return;
  }
  next();
}

/**
 * Middleware principal de autenticação.
 *
 * Responsabilidades:
 * - Validar o Bearer Token
 * - Validar o JWT
 * - Verificar se o sistema está em manutenção
 * - Permitir acesso do SUPER_ADMIN durante a manutenção
 * - Bloquear usuários comuns durante a manutenção
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação não fornecido ou formato inválido.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: 'TOKEN_EXPIRED_OR_INVALID',
      message:
        'Sessão expirada ou token inválido. Por favor, autentique-se novamente.',
    });
    return;
  }

  try {
    if (!payload.sessionId || typeof payload.userId !== 'string') {
      res.status(401).json({ error: 'SESSION_INVALID', message: 'Entre novamente para continuar.' });
      return;
    }
    const session = await prisma.authSession.findFirst({
      where: { id: payload.sessionId, userId: payload.userId, expiresAt: { gt: new Date() } },
      include: { user: { include: { company: true } } },
    });
    const user = session?.user;
    if (!user || !user.active || session.credentialHash !== digest(user.password) ||
        (user.role !== 'SUPER_ADMIN' && (!user.company?.active || user.company.status !== 'ACTIVE'))) {
      res.status(401).json({ error: 'SESSION_INVALID', message: 'Sessão revogada ou conta inativa.' });
      return;
    }
    req.user = { sessionId: session.id, userId: user.id, companyId: user.companyId,
      role: user.role, email: user.email, name: user.name };
    if (user.role !== 'SUPER_ADMIN') {
      const settings = await prisma.platformSettings.findUnique({ where: { id: 'platform' } });
      if (settings?.maintenanceMode) {
        res.status(503).json({ error: 'MAINTENANCE_MODE', message: 'O sistema está temporariamente em manutenção.' });
        return;
      }
    }
    next();
  } catch (err) { next(err); }
}

/**
 * Middleware exclusivo para SUPER_ADMIN.
 *
 * Apenas o administrador global da plataforma
 * pode criar, editar ou gerenciar empresas,
 * administradores globais e configurações da plataforma.
 */
export function superAdminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.',
    });
    return;
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      error: 'FORBIDDEN',
      message:
        'Acesso restrito ao administrador global da plataforma.',
    });
    return;
  }

  next();
}
