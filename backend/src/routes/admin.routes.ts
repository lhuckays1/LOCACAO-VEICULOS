import { Router } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../middlewares/auth.middleware.js';
import { superAdminOnly } from '../middlewares/role.middleware.js';
import { prisma } from '../config/prisma.js';
import { hashPassword } from '../config/jwt.js';

const router = Router();

/**
 * ============================================================
 * PROTEÇÃO DAS ROTAS
 * ============================================================
 *
 * Todas as rotas abaixo exigem:
 *
 * 1. Usuário autenticado
 * 2. Usuário com role SUPER_ADMIN
 */
router.use(authMiddleware);
router.use(superAdminOnly);

/**
 * ============================================================
 * DASHBOARD GLOBAL
 * ============================================================
 */
router.get('/dashboard', async (_req, res, next) => {
  try {
    res.json({
      message: 'Dashboard SUPER ADMIN',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================
 * EMPRESAS
 * ============================================================
 */

/**
 * ============================================================
 * LISTAR EMPRESAS
 * ============================================================
 */
router.get('/companies', async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      data: companies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================
 * CRIAR EMPRESA
 * ============================================================
 *
 * Mantido como placeholder por enquanto.
 */
router.post('/companies', async (req, res, next) => {
  try {
    res.json({
      message: 'Criar empresa',
      data: req.body,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================
 * ADMINISTRADORES DA PLATAFORMA
 * ============================================================
 */

/**
 * ============================================================
 * LISTAR ADMINISTRADORES
 * ============================================================
 */
router.get('/administrators', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const companyIds = [
      ...new Set(
        users
          .map((user) => user.companyId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const companies =
      companyIds.length > 0
        ? await prisma.company.findMany({
            where: {
              id: {
                in: companyIds,
              },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [];

    const companyMap = new Map(
      companies.map((company) => [company.id, company])
    );

    const administrators = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      company: user.companyId
        ? companyMap.get(user.companyId) || null
        : null,
    }));

    res.json({
      data: administrators,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================
 * CRIAR ADMINISTRADOR
 * ============================================================
 */
router.post('/administrators', async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'ADMIN',
      companyId,
    } = req.body;

    /**
     * Validação básica
     */
    if (!name || !email || !password) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Nome, e-mail e senha são obrigatórios.',
      });
      return;
    }

    /**
     * Senha mínima
     */
    if (String(password).length < 8) {
      res.status(400).json({
        error: 'PASSWORD_TOO_SHORT',
        message: 'A senha deve possuir pelo menos 8 caracteres.',
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    /**
     * Verifica e-mail duplicado
     */
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'Já existe um usuário com este e-mail.',
      });
      return;
    }

    /**
     * SUPER_ADMIN não pertence a empresa.
     */
    if (role === 'SUPER_ADMIN' && companyId) {
      res.status(400).json({
        error: 'INVALID_COMPANY',
        message:
          'SUPER_ADMIN não deve estar vinculado a uma empresa.',
      });
      return;
    }

    /**
     * Usuários administrativos de empresa
     * precisam estar vinculados a uma empresa.
     */
    if (role !== 'SUPER_ADMIN' && !companyId) {
      res.status(400).json({
        error: 'COMPANY_REQUIRED',
        message:
          'Administradores de empresa precisam estar vinculados a uma empresa.',
      });
      return;
    }

    /**
     * Verifica se a empresa existe.
     */
    if (companyId) {
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

      /**
       * Não permitir criar administrador
       * em empresa inativa.
       */
      if (!company.active) {
        res.status(400).json({
          error: 'COMPANY_INACTIVE',
          message:
            'Não é possível criar um administrador para uma empresa inativa.',
        });
        return;
      }
    }

    /**
     * Criptografa a senha.
     */
    const passwordHash = hashPassword(String(password));

    /**
     * Cria usuário.
     */
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: passwordHash,
        role,
        companyId: companyId || null,
        active: true,
      },
    });

    /**
     * Busca empresa vinculada para retornar
     * os dados completos ao frontend.
     */
    const company = user.companyId
      ? await prisma.company.findUnique({
          where: {
            id: user.companyId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : null;

    res.status(201).json({
      message: 'Administrador criado com sucesso.',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        company,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================
 * EDITAR ADMINISTRADOR
 * ============================================================
 *
 * Permite alterar:
 * - Nome
 * - E-mail
 * - Perfil
 * - Empresa
 *
 * A senha NÃO é alterada aqui.
 */
router.put(
  '/administrators/:id',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      const {
        name,
        email,
        role,
        companyId,
      } = req.body;

      /**
       * Verifica se o administrador existe.
       */
      const existingUser = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!existingUser) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: 'Administrador não encontrado.',
        });
        return;
      }

      /**
       * Nome obrigatório.
       */
      if (!name || !String(name).trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O nome é obrigatório.',
        });
        return;
      }

      /**
       * E-mail obrigatório.
       */
      if (!email || !String(email).trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O e-mail é obrigatório.',
        });
        return;
      }

      /**
       * Perfil obrigatório.
       */
      if (!role) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'O perfil é obrigatório.',
        });
        return;
      }

      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      /**
       * Verifica se o e-mail já pertence
       * a outro usuário.
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
       * SUPER_ADMIN não pode possuir empresa.
       */
      if (role === 'SUPER_ADMIN' && companyId) {
        res.status(400).json({
          error: 'INVALID_COMPANY',
          message:
            'SUPER_ADMIN não deve estar vinculado a uma empresa.',
        });
        return;
      }

      /**
       * Usuários de empresa precisam
       * estar vinculados a uma empresa.
       */
      if (role !== 'SUPER_ADMIN' && !companyId) {
        res.status(400).json({
          error: 'COMPANY_REQUIRED',
          message:
            'Administradores de empresa precisam estar vinculados a uma empresa.',
        });
        return;
      }

      /**
       * Verifica empresa.
       */
      if (companyId) {
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
              'Não é possível vincular o administrador a uma empresa inativa.',
          });
          return;
        }
      }

      /**
       * Regra de segurança:
       *
       * Não permitir transformar o último
       * SUPER_ADMIN ativo em outro perfil.
       */
      if (
        existingUser.role === 'SUPER_ADMIN' &&
        role !== 'SUPER_ADMIN' &&
        existingUser.active
      ) {
        const activeSuperAdmins =
          await prisma.user.count({
            where: {
              role: 'SUPER_ADMIN',
              active: true,
            },
          });

        if (activeSuperAdmins <= 1) {
          res.status(400).json({
            error: 'LAST_SUPER_ADMIN',
            message:
              'A plataforma precisa ter pelo menos um SUPER_ADMIN ativo.',
          });
          return;
        }
      }

      /**
       * Atualiza usuário.
       */
      const updatedUser = await prisma.user.update({
        where: {
          id,
        },
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          role,
          companyId: companyId || null,
        },
      });

      /**
       * Busca empresa atual.
       */
      const company = updatedUser.companyId
        ? await prisma.company.findUnique({
            where: {
              id: updatedUser.companyId,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : null;

      res.json({
        message: 'Administrador atualizado com sucesso.',
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          active: updatedUser.active,
          createdAt: updatedUser.createdAt,
          lastLoginAt: updatedUser.lastLoginAt,
          company,
        },
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
 * O SUPER_ADMIN informa uma nova senha para o administrador.
 *
 * A senha é sempre armazenada utilizando o hash
 * existente no sistema.
 */
router.patch(
  '/administrators/:id/reset-password',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      /**
       * Validação da senha.
       */
      if (!password || !String(password).trim()) {
        res.status(400).json({
          error: 'PASSWORD_REQUIRED',
          message: 'A nova senha é obrigatória.',
        });
        return;
      }

      if (String(password).length < 8) {
        res.status(400).json({
          error: 'PASSWORD_TOO_SHORT',
          message:
            'A nova senha deve possuir pelo menos 8 caracteres.',
        });
        return;
      }

      /**
       * Verifica se o usuário existe.
       */
      const user = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: 'Administrador não encontrado.',
        });
        return;
      }

      /**
       * Cria novo hash.
       */
      const passwordHash = hashPassword(String(password));

      /**
       * Atualiza senha.
       */
      await prisma.user.update({
        where: {
          id,
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
 * ATIVAR / DESATIVAR ADMINISTRADOR
 * ============================================================
 */
router.patch(
  '/administrators/:id/toggle-status',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      /**
       * Busca usuário.
       */
      const user = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: 'Administrador não encontrado.',
        });
        return;
      }

      /**
       * Não permitir desativar o próprio usuário.
       */
      if (user.id === req.user?.userId) {
        res.status(400).json({
          error: 'CANNOT_DISABLE_SELF',
          message:
            'Você não pode desativar o próprio usuário.',
        });
        return;
      }

      /**
       * Não permitir desativar o último
       * SUPER_ADMIN ativo.
       */
      if (
        user.role === 'SUPER_ADMIN' &&
        user.active
      ) {
        const activeSuperAdmins =
          await prisma.user.count({
            where: {
              role: 'SUPER_ADMIN',
              active: true,
            },
          });

        if (activeSuperAdmins <= 1) {
          res.status(400).json({
            error: 'LAST_SUPER_ADMIN',
            message:
              'A plataforma precisa ter pelo menos um SUPER_ADMIN ativo.',
          });
          return;
        }
      }

      /**
       * Alterna status.
       */
      const updatedUser = await prisma.user.update({
        where: {
          id,
        },
        data: {
          active: !user.active,
        },
      });

      res.json({
        message: updatedUser.active
          ? 'Administrador ativado com sucesso.'
          : 'Administrador desativado com sucesso.',
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          active: updatedUser.active,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * EXCLUIR ADMINISTRADOR
 * ============================================================
 */
router.delete(
  '/administrators/:id',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      /**
       * Busca usuário.
       */
      const user = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: 'Administrador não encontrado.',
        });
        return;
      }

      /**
       * Não permitir excluir a própria conta.
       */
      if (user.id === req.user?.userId) {
        res.status(400).json({
          error: 'CANNOT_DELETE_SELF',
          message:
            'Você não pode excluir o próprio usuário.',
        });
        return;
      }

      /**
       * Não permitir excluir o último
       * SUPER_ADMIN ativo.
       *
       * Isso evita que a plataforma fique
       * sem nenhum SUPER_ADMIN.
       */
      if (
        user.role === 'SUPER_ADMIN' &&
        user.active
      ) {
        const activeSuperAdmins =
          await prisma.user.count({
            where: {
              role: 'SUPER_ADMIN',
              active: true,
            },
          });

        if (activeSuperAdmins <= 1) {
          res.status(400).json({
            error: 'LAST_SUPER_ADMIN',
            message:
              'A plataforma precisa ter pelo menos um SUPER_ADMIN ativo.',
          });
          return;
        }
      }

      /**
       * Exclui o usuário.
       *
       * AuditLogs e FinancialSettlements relacionados
       * utilizarão SetNull nos respectivos userId,
       * preservando o histórico.
       */
      await prisma.user.delete({
        where: {
          id,
        },
      });

      res.json({
        message: 'Administrador excluído com sucesso.',
        data: {
          id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ============================================================
 * CONFIGURAÇÕES GLOBAIS DA PLATAFORMA
 * ============================================================
 */

/**
 * ============================================================
 * BUSCAR CONFIGURAÇÕES DA PLATAFORMA
 * ============================================================
 *
 * Retorna as configurações globais do FROTA CONTROL.
 *
 * Caso ainda não exista registro, cria automaticamente
 * utilizando os valores padrão definidos no Prisma.
 */
router.get('/platform-settings', async (_req, res, next) => {
  try {
    let settings = await prisma.platformSettings.findUnique({
      where: {
        id: 'platform',
      },
    });

    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          id: 'platform',
        },
      });
    }

    res.json({
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ============================================================
 * ATUALIZAR CONFIGURAÇÕES DA PLATAFORMA
 * ============================================================
 */
router.put('/platform-settings', async (req, res, next) => {
  try {
    const {
      platformName,
      platformShortName,
      logo,
      supportEmail,
      country,
      currency,
      timezone,
      dateFormat,
      minimumPasswordLength,
      requireStrongPassword,
      sessionDurationMinutes,
      maintenanceMode,
      allowRegistration,
      notificationsEnabled,
    } = req.body;

    /**
     * --------------------------------------------------------
     * VALIDAÇÕES
     * --------------------------------------------------------
     */

    if (
      platformName !== undefined &&
      !String(platformName).trim()
    ) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'O nome da plataforma é obrigatório.',
      });
      return;
    }

    if (
      platformShortName !== undefined &&
      !String(platformShortName).trim()
    ) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'O nome curto da plataforma é obrigatório.',
      });
      return;
    }

    if (
      supportEmail !== undefined &&
      supportEmail !== null &&
      String(supportEmail).trim()
    ) {
      const email = String(supportEmail).trim();

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        res.status(400).json({
          error: 'INVALID_EMAIL',
          message: 'Informe um e-mail de suporte válido.',
        });
        return;
      }
    }

    if (
      minimumPasswordLength !== undefined &&
      (
        !Number.isInteger(Number(minimumPasswordLength)) ||
        Number(minimumPasswordLength) < 6
      )
    ) {
      res.status(400).json({
        error: 'INVALID_PASSWORD_LENGTH',
        message:
          'O tamanho mínimo da senha deve ser um número inteiro maior ou igual a 6.',
      });
      return;
    }

    if (
      sessionDurationMinutes !== undefined &&
      (
        !Number.isInteger(Number(sessionDurationMinutes)) ||
        Number(sessionDurationMinutes) < 15
      )
    ) {
      res.status(400).json({
        error: 'INVALID_SESSION_DURATION',
        message:
          'A duração da sessão deve ser um número inteiro de pelo menos 15 minutos.',
      });
      return;
    }

    /**
     * --------------------------------------------------------
     * GARANTE QUE O REGISTRO ÚNICO EXISTE
     * --------------------------------------------------------
     */

    const currentSettings =
      await prisma.platformSettings.findUnique({
        where: {
          id: 'platform',
        },
      });

    /**
     * --------------------------------------------------------
     * DADOS PARA ATUALIZAÇÃO
     * --------------------------------------------------------
     */

    const data: {
      platformName?: string;
      platformShortName?: string;
      logo?: string | null;
      supportEmail?: string | null;
      country?: string;
      currency?: string;
      timezone?: string;
      dateFormat?: string;
      minimumPasswordLength?: number;
      requireStrongPassword?: boolean;
      sessionDurationMinutes?: number;
      maintenanceMode?: boolean;
      allowRegistration?: boolean;
      notificationsEnabled?: boolean;
    } = {};

    if (platformName !== undefined) {
      data.platformName = String(platformName).trim();
    }

    if (platformShortName !== undefined) {
      data.platformShortName =
        String(platformShortName).trim();
    }

    if (logo !== undefined) {
      data.logo =
        logo === null || logo === ''
          ? null
          : String(logo).trim();
    }

    if (supportEmail !== undefined) {
      data.supportEmail =
        supportEmail === null ||
        String(supportEmail).trim() === ''
          ? null
          : String(supportEmail).trim().toLowerCase();
    }

    if (country !== undefined) {
      data.country = String(country).trim();
    }

    if (currency !== undefined) {
      data.currency = String(currency).trim();
    }

    if (timezone !== undefined) {
      data.timezone = String(timezone).trim();
    }

    if (dateFormat !== undefined) {
      data.dateFormat = String(dateFormat).trim();
    }

    if (minimumPasswordLength !== undefined) {
      data.minimumPasswordLength =
        Number(minimumPasswordLength);
    }

    if (requireStrongPassword !== undefined) {
      data.requireStrongPassword =
        Boolean(requireStrongPassword);
    }

    if (sessionDurationMinutes !== undefined) {
      data.sessionDurationMinutes =
        Number(sessionDurationMinutes);
    }

    if (maintenanceMode !== undefined) {
      data.maintenanceMode =
        Boolean(maintenanceMode);
    }

    if (allowRegistration !== undefined) {
      data.allowRegistration =
        Boolean(allowRegistration);
    }

    if (notificationsEnabled !== undefined) {
      data.notificationsEnabled =
        Boolean(notificationsEnabled);
    }

    /**
     * --------------------------------------------------------
     * CRIA OU ATUALIZA O SINGLETON
     * --------------------------------------------------------
     */

    const settings = currentSettings
      ? await prisma.platformSettings.update({
          where: {
            id: 'platform',
          },
          data,
        })
      : await prisma.platformSettings.create({
          data: {
            id: 'platform',
            ...data,
          },
        });

    res.json({
      message:
        'Configurações da plataforma atualizadas com sucesso.',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

export default router;