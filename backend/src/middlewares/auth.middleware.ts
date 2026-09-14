import { Request, Response, NextFunction } from 'express';

import { verifyAccessToken, TokenPayload } from '../config/jwt.js';
import { prisma } from '../config/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
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

  req.user = payload;

  /**
   * SUPER_ADMIN sempre pode acessar o sistema,
   * inclusive durante o modo manutenção.
   */
  if (payload.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  try {
    const platformSettings = await prisma.platformSettings.findUnique({
      where: {
        id: 'platform',
      },
      select: {
        maintenanceMode: true,
      },
    });

    /**
     * Se o modo manutenção estiver ativo,
     * usuários comuns não podem continuar utilizando
     * as rotas protegidas da API.
     */
    if (platformSettings?.maintenanceMode === true) {
      res.status(503).json({
        error: 'MAINTENANCE_MODE',
        message:
          'O sistema está temporariamente em manutenção. Tente novamente mais tarde.',
      });
      return;
    }
  } catch (error) {
    console.error(
      'Erro ao verificar modo manutenção da plataforma:',
      error
    );

    /**
     * Em caso de falha na consulta das configurações,
     * não bloqueamos automaticamente o sistema.
     *
     * Isso evita que uma indisponibilidade momentânea
     * da tabela de configurações derrube todos os usuários.
     */
  }

  next();
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