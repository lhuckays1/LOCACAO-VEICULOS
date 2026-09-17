import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { Permission } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/**
 * Middleware de autorização por permissão.
 *
 * Regras:
 *
 * SUPER_ADMIN
 * → Acesso total à plataforma.
 *
 * ADMIN
 * → Acesso total dentro da própria empresa.
 *
 * MANAGER / OPERATOR / FINANCIAL
 * → Acesso somente às permissões atribuídas
 *   na tabela user_permissions.
 */
export function requirePermission(permission: Permission) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado.',
      });
      return;
    }

    /**
     * SUPER_ADMIN e ADMIN possuem acesso total.
     *
     * SUPER_ADMIN:
     * acesso total à plataforma.
     *
     * ADMIN:
     * acesso total dentro da empresa vinculada ao token.
     */
    if (
      req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'ADMIN'
    ) {
      next();
      return;
    }

    try {
      /**
       * Busca a permissão atribuída ao usuário.
       */
      const userPermission = await prisma.userPermission.findUnique({
        where: {
          userId_permission: {
            userId: req.user.userId,
            permission,
          },
        },
      });

      if (!userPermission) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message:
            'Você não possui permissão para executar esta ação.',
          requiredPermission: permission,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(
        'Erro ao verificar permissão do usuário:',
        error
      );

      res.status(500).json({
        error: 'PERMISSION_CHECK_ERROR',
        message:
          'Não foi possível verificar as permissões do usuário.',
      });
    }
  };
}

/**
 * Middleware para exigir qualquer uma das permissões informadas.
 *
 * Exemplo:
 *
 * requireAnyPermission(
 *   'CLIENTS_VIEW',
 *   'CLIENTS_CREATE'
 * )
 */
export function requireAnyPermission(
  ...permissions: Permission[]
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado.',
      });
      return;
    }

    /**
     * SUPER_ADMIN e ADMIN possuem acesso total.
     */
    if (
      req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'ADMIN'
    ) {
      next();
      return;
    }

    try {
      const userPermissions =
        await prisma.userPermission.findMany({
          where: {
            userId: req.user.userId,
            permission: {
              in: permissions,
            },
          },
          select: {
            permission: true,
          },
        });

      const hasPermission = userPermissions.some((item) =>
        permissions.includes(item.permission)
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message:
            'Você não possui nenhuma das permissões necessárias para executar esta ação.',
          requiredPermissions: permissions,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(
        'Erro ao verificar permissões do usuário:',
        error
      );

      res.status(500).json({
        error: 'PERMISSION_CHECK_ERROR',
        message:
          'Não foi possível verificar as permissões do usuário.',
      });
    }
  };
}