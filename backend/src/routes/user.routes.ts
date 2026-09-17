import { Router } from 'express';
import { hashPassword } from '../config/jwt.js';
import { prisma } from '../config/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { Permission } from '@prisma/client';

const router = Router();

/**
 * ============================================================
 * CONFIGURAÇÕES
 * ============================================================
 */

/**
 * Perfis que um ADMIN de empresa pode criar/gerenciar.
 *
 * SUPER_ADMIN fica fora desta lista propositalmente.
 */
const MANAGED_ROLES = [
  'MANAGER',
  'OPERATOR',
  'FINANCIAL',
] as const;

type ManagedRole = (typeof MANAGED_ROLES)[number];

/**
 * Verifica se o usuário autenticado possui uma empresa.
 */
function getCompanyId(req: AuthenticatedRequest): string | null {
  return req.user?.companyId || null;
}

/**
 * Verifica se o role informado é permitido para
 * usuários internos da empresa.
 */
function isManagedRole(role: string): role is ManagedRole {
  return MANAGED_ROLES.includes(role as ManagedRole);
}

/**
 * Remove a senha das respostas da API.
 */
function sanitizeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    companyId: user.companyId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    permissions: user.permissions?.map(
      (item: { permission: Permission }) => item.permission
    ) || [],
  };
}

/**
 * ============================================================
 * LISTAR USUÁRIOS DA EMPRESA
 * ============================================================
 *
 * GET /api/users
 *
 * Apenas ADMIN pode gerenciar usuários.
 */
router.get(
  '/',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O usuário administrador não está vinculado a uma empresa.',
        });
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          companyId,
          role: {
            in: [...MANAGED_ROLES],
          },
        },
        include: {
          permissions: {
            select: {
              permission: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      res.json({
        data: users.map(sanitizeUser),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * CRIAR USUÁRIO
 * ============================================================
 *
 * POST /api/users
 */
router.post(
  '/',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      const {
        name,
        email,
        password,
        role,
        permissions = [],
      } = req.body;

      /**
       * Validação básica.
       */
      if (!name || !String(name).trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O nome é obrigatório.',
        });
        return;
      }

      if (!email || !String(email).trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O e-mail é obrigatório.',
        });
        return;
      }

      if (!password || String(password).length < 8) {
        res.status(400).json({
          error: 'PASSWORD_TOO_SHORT',
          message:
            'A senha deve possuir pelo menos 8 caracteres.',
        });
        return;
      }

      if (!role || !isManagedRole(String(role))) {
        res.status(400).json({
          error: 'INVALID_ROLE',
          message:
            'O perfil informado não pode ser criado por um administrador de empresa.',
          allowedRoles: MANAGED_ROLES,
        });
        return;
      }

      /**
       * Normaliza e-mail.
       */
      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      /**
       * Verifica e-mail globalmente.
       *
       * O campo email é UNIQUE no banco.
       */
      const existingUser = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'EMAIL_ALREADY_EXISTS',
          message:
            'Já existe um usuário utilizando este e-mail.',
        });
        return;
      }

      /**
       * Verifica empresa.
       */
      const company = await prisma.company.findUnique({
        where: {
          id: companyId,
        },
      });

      if (!company) {
        res.status(404).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa não encontrada.',
        });
        return;
      }

      if (!company.active) {
        res.status(400).json({
          error: 'COMPANY_INACTIVE',
          message:
            'Não é possível criar usuários em uma empresa inativa.',
        });
        return;
      }

      /**
       * Valida permissões recebidas.
       */
      const requestedPermissions = Array.isArray(permissions)
        ? permissions
        : [];

      const validPermissions = Object.values(Permission);

      const invalidPermissions =
        requestedPermissions.filter(
          (permission: unknown) =>
            !validPermissions.includes(
              permission as Permission
            )
        );

      if (invalidPermissions.length > 0) {
        res.status(400).json({
          error: 'INVALID_PERMISSIONS',
          message:
            'Uma ou mais permissões informadas são inválidas.',
          invalidPermissions,
        });
        return;
      }

      /**
       * Cria hash da senha.
       */
      const passwordHash = hashPassword(String(password));

      /**
       * Cria usuário + permissões em uma transação.
       */
      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: String(name).trim(),
            email: normalizedEmail,
            password: passwordHash,
            role,
            companyId,
            active: true,
          },
        });

        if (requestedPermissions.length > 0) {
          await tx.userPermission.createMany({
            data: requestedPermissions.map(
              (permission: Permission) => ({
                userId: createdUser.id,
                permission,
              })
            ),
            skipDuplicates: true,
          });
        }

        return tx.user.findUniqueOrThrow({
          where: {
            id: createdUser.id,
          },
          include: {
            permissions: {
              select: {
                permission: true,
              },
            },
          },
        });
      });

      res.status(201).json({
        message: 'Usuário criado com sucesso.',
        data: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * EDITAR USUÁRIO
 * ============================================================
 *
 * PUT /api/users/:id
 */
router.put(
  '/:id',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      /**
       * Busca somente dentro da própria empresa.
       */
      const existingUser = await prisma.user.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!existingUser) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message:
            'Usuário não encontrado na sua empresa.',
        });
        return;
      }

      const {
        name,
        email,
        role,
        permissions,
      } = req.body;

      if (!name || !String(name).trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O nome é obrigatório.',
        });
        return;
      }

      if (!email || !String(email).trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O e-mail é obrigatório.',
        });
        return;
      }

      if (!role || !isManagedRole(String(role))) {
        res.status(400).json({
          error: 'INVALID_ROLE',
          message:
            'O perfil informado não pode ser utilizado.',
          allowedRoles: MANAGED_ROLES,
        });
        return;
      }

      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      /**
       * Verifica e-mail pertencente a outro usuário.
       */
      const emailInUse = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id,
          },
        },
      });

      if (emailInUse) {
        res.status(409).json({
          error: 'EMAIL_ALREADY_EXISTS',
          message:
            'Já existe outro usuário utilizando este e-mail.',
        });
        return;
      }

      /**
       * Se permissions não foi enviado, preservamos
       * as permissões atuais.
       */
      let requestedPermissions:
        | Permission[]
        | undefined;

      if (permissions !== undefined) {
        if (!Array.isArray(permissions)) {
          res.status(400).json({
            error: 'INVALID_PERMISSIONS',
            message:
              'As permissões devem ser enviadas como uma lista.',
          });
          return;
        }

        const validPermissions = Object.values(Permission);

        const invalidPermissions =
          permissions.filter(
            (permission: unknown) =>
              !validPermissions.includes(
                permission as Permission
              )
          );

        if (invalidPermissions.length > 0) {
          res.status(400).json({
            error: 'INVALID_PERMISSIONS',
            message:
              'Uma ou mais permissões informadas são inválidas.',
            invalidPermissions,
          });
          return;
        }

        requestedPermissions =
          permissions as Permission[];
      }

      const updatedUser = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.update({
            where: {
              id,
            },
            data: {
              name: String(name).trim(),
              email: normalizedEmail,
              role,
            },
          });

          /**
           * Atualiza permissões somente se
           * elas foram enviadas.
           */
          if (requestedPermissions !== undefined) {
            await tx.userPermission.deleteMany({
              where: {
                userId: id,
              },
            });

            if (requestedPermissions.length > 0) {
              await tx.userPermission.createMany({
                data: requestedPermissions.map(
                  (permission) => ({
                    userId: id,
                    permission,
                  })
                ),
                skipDuplicates: true,
              });
            }
          }

          return tx.user.findUniqueOrThrow({
            where: {
              id: user.id,
            },
            include: {
              permissions: {
                select: {
                  permission: true,
                },
              },
            },
          });
        }
      );

      res.json({
        message: 'Usuário atualizado com sucesso.',
        data: sanitizeUser(updatedUser),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * ATIVAR / DESATIVAR
 * ============================================================
 *
 * PATCH /api/users/:id/toggle-status
 */
router.patch(
  '/:id/toggle-status',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message:
            'Usuário não encontrado na sua empresa.',
        });
        return;
      }

      /**
       * Não permitir que o ADMIN desative a própria conta.
       */
      if (user.id === req.user?.userId) {
        res.status(400).json({
          error: 'CANNOT_DISABLE_SELF',
          message:
            'Você não pode desativar o próprio usuário.',
        });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          active: !user.active,
        },
      });

      res.json({
        message: updatedUser.active
          ? 'Usuário ativado com sucesso.'
          : 'Usuário desativado com sucesso.',
        data: sanitizeUser(updatedUser),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * REDEFINIR SENHA
 * ============================================================
 *
 * PATCH /api/users/:id/reset-password
 */
router.patch(
  '/:id/reset-password',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;
      const { password } = req.body;

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      if (!password || String(password).length < 8) {
        res.status(400).json({
          error: 'PASSWORD_TOO_SHORT',
          message:
            'A nova senha deve possuir pelo menos 8 caracteres.',
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message:
            'Usuário não encontrado na sua empresa.',
        });
        return;
      }

      const passwordHash = hashPassword(
        String(password)
      );

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: passwordHash,
        },
      });

      res.json({
        message: 'Senha redefinida com sucesso.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * EXCLUIR USUÁRIO
 * ============================================================
 *
 * DELETE /api/users/:id
 */
router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message:
            'Usuário não encontrado na sua empresa.',
        });
        return;
      }

      /**
       * Não permitir exclusão da própria conta.
       */
      if (user.id === req.user?.userId) {
        res.status(400).json({
          error: 'CANNOT_DELETE_SELF',
          message:
            'Você não pode excluir o próprio usuário.',
        });
        return;
      }

      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      res.json({
        message: 'Usuário excluído com sucesso.',
        data: {
          id: user.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * CONSULTAR PERMISSÕES
 * ============================================================
 *
 * GET /api/users/:id/permissions
 */
router.get(
  '/:id/permissions',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          permissions: {
            select: {
              permission: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message:
            'Usuário não encontrado na sua empresa.',
        });
        return;
      }

      res.json({
        data: {
          userId: user.id,
          permissions: user.permissions.map(
            (item) => item.permission
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * ATUALIZAR PERMISSÕES
 * ============================================================
 *
 * PUT /api/users/:id/permissions
 */
router.put(
  '/:id/permissions',
  authMiddleware,
  authorize(['ADMIN']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;
      const { permissions } = req.body;

      if (!companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'O administrador precisa estar vinculado a uma empresa.',
        });
        return;
      }

      if (!Array.isArray(permissions)) {
        res.status(400).json({
          error: 'INVALID_PERMISSIONS',
          message:
            'As permissões devem ser enviadas como uma lista.',
        });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message:
            'Usuário não encontrado na sua empresa.',
        });
        return;
      }

      const validPermissions = Object.values(Permission);

      const invalidPermissions =
        permissions.filter(
          (permission: unknown) =>
            !validPermissions.includes(
              permission as Permission
            )
        );

      if (invalidPermissions.length > 0) {
        res.status(400).json({
          error: 'INVALID_PERMISSIONS',
          message:
            'Uma ou mais permissões informadas são inválidas.',
          invalidPermissions,
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.userPermission.deleteMany({
          where: {
            userId: id,
          },
        });

        if (permissions.length > 0) {
          await tx.userPermission.createMany({
            data: permissions.map(
              (permission: Permission) => ({
                userId: id,
                permission,
              })
            ),
            skipDuplicates: true,
          });
        }
      });

      res.json({
        message:
          'Permissões atualizadas com sucesso.',
        data: {
          userId: id,
          permissions,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;