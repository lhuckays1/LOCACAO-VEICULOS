import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { UserRole } from '../config/jwt.js';

export function authorize(allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Acesso negado. Seu perfil (${req.user.role}) não possui permissão para executar esta ação.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}

export function superAdminOnly(
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
      error: 'SUPER_ADMIN_REQUIRED',
      message:
        'Esta operação é permitida apenas para o SUPER ADMINISTRADOR.',
    });
    return;
  }

  next();
}