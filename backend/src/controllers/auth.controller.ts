import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../schemas/index.js';

import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../config/jwt.js';

import { unmask } from '../utils/formatters.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

interface PlatformSecuritySettings {
  minimumPasswordLength: number;
  requireStrongPassword: boolean;
  sessionDurationMinutes: number;
  allowRegistration: boolean;
  maintenanceMode: boolean;
}

export class AuthController {

  /**
   * ============================================================
   * CONFIGURAÇÕES GLOBAIS DA PLATAFORMA
   * ============================================================
   *
   * Garante que o registro singleton exista e retorna as
   * configurações utilizadas pela autenticação.
   */
  private async getPlatformSettings(): Promise<PlatformSecuritySettings> {
    const settings =
      await prisma.platformSettings.upsert({
        where: {
          id: 'platform',
        },
        create: {
          id: 'platform',
        },
        update: {},
      });

    return {
      maintenanceMode:
        settings.maintenanceMode,

      minimumPasswordLength:
        settings.minimumPasswordLength,

      requireStrongPassword:
        settings.requireStrongPassword,

      sessionDurationMinutes:
        settings.sessionDurationMinutes,

      allowRegistration:
        settings.allowRegistration,
    };
  }

  /**
   * ============================================================
   * VALIDAÇÃO DE SENHA
   * ============================================================
   */
  private validatePasswordPolicy(
    password: string,
    settings: PlatformSecuritySettings
  ): string | null {

    if (
      password.length <
      settings.minimumPasswordLength
    ) {
      return `A senha deve ter no mínimo ${settings.minimumPasswordLength} caracteres.`;
    }

    if (!settings.requireStrongPassword) {
      return null;
    }

    if (!/[A-Z]/.test(password)) {
      return 'A senha deve conter pelo menos uma letra maiúscula.';
    }

    if (!/[a-z]/.test(password)) {
      return 'A senha deve conter pelo menos uma letra minúscula.';
    }

    if (!/[0-9]/.test(password)) {
      return 'A senha deve conter pelo menos um número.';
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return 'A senha deve conter pelo menos um caractere especial.';
    }

    return null;
  }

  /**
   * ============================================================
   * REGISTER
   * ============================================================
   */
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {

      const settings =
        await this.getPlatformSettings();

      /**
       * --------------------------------------------------------
       * CADASTRO PÚBLICO
       * --------------------------------------------------------
       */
      if (!settings.allowRegistration) {
        res.status(403).json({
          error: 'REGISTRATION_DISABLED',
          message:
            'O cadastro público está desativado. Entre em contato com o administrador da plataforma.',
        });

        return;
      }

      const data =
        registerSchema.parse(req.body);

      /**
       * --------------------------------------------------------
       * POLÍTICA DE SENHA
       * --------------------------------------------------------
       */
      const passwordError =
        this.validatePasswordPolicy(
          data.password,
          settings
        );

      if (passwordError) {
        res.status(400).json({
          error: 'WEAK_PASSWORD',
          message: passwordError,
        });

        return;
      }

      const email =
        data.email.toLowerCase().trim();

      /**
       * --------------------------------------------------------
       * USUÁRIO EXISTENTE
       * --------------------------------------------------------
       */
      const existingUser =
        await prisma.user.findUnique({
          where: { email },
        });

      if (existingUser) {
        res.status(409).json({
          error: 'USER_ALREADY_EXISTS',
          message:
            'Já existe um usuário cadastrado com este e-mail.',
        });

        return;
      }

      /**
       * --------------------------------------------------------
       * EMPRESA EXISTENTE
       * --------------------------------------------------------
       */
      const existingCompany =
        await prisma.company.findUnique({
          where: {
            document: unmask(data.document),
          },
        });

      if (existingCompany) {
        res.status(409).json({
          error: 'COMPANY_ALREADY_EXISTS',
          message:
            'Já existe uma empresa cadastrada com este CNPJ.',
        });

        return;
      }

      const passwordHash =
        hashPassword(data.password);

      /**
       * --------------------------------------------------------
       * CRIA EMPRESA + ADMINISTRADOR
       * --------------------------------------------------------
       */
      const result =
        await prisma.$transaction(
          async (tx) => {

            const company =
              await tx.company.create({
                data: {
                  name: data.companyName
                    .toUpperCase()
                    .trim(),

                  legalName: data.companyName
                    .toUpperCase()
                    .trim(),

                  document:
                    unmask(data.document),

                  phone:
                    unmask(data.phone),

                  email,

                  address:
                    'ENDEREÇO PRINCIPAL',

                  city:
                    'CIDADE',

                  state:
                    'UF',

                  zipCode:
                    '00000000',

                  active: true,
                },
              });

            const user =
              await tx.user.create({
                data: {
                  companyId:
                    company.id,

                  name: data.name
                    .toUpperCase()
                    .trim(),

                  email,

                  password:
                    passwordHash,

                  role: 'ADMIN',

                  active: true,
                },
              });

            return {
              company,
              user,
            };
          }
        );

      const tokenPayload = {
        userId:
          result.user.id,

        companyId:
          result.company.id,

        email:
          result.user.email,

        role:
          result.user.role,

        name:
          result.user.name,
      };

      const accessToken =
        generateAccessToken(
          tokenPayload,
          settings.sessionDurationMinutes
        );

      const refreshToken =
        generateRefreshToken(
          tokenPayload
        );

      res.status(201).json({
        message:
          'Empresa e administrador cadastrados com sucesso!',

        accessToken,

        refreshToken,

        user: {
          id:
            result.user.id,

          name:
            result.user.name,

          email:
            result.user.email,

          role:
            result.user.role,
        },

        company: {
          id:
            result.company.id,

          name:
            result.company.name,

          document:
            result.company.document,
        },
      });

    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * LOGIN
   * ============================================================
   */
  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {

      const settings =
        await this.getPlatformSettings();

      const data =
        loginSchema.parse(req.body);

      const email =
        data.email.toLowerCase().trim();

      const user =
        await prisma.user.findUnique({
          where: { email },

          include: {
            company: true,
          },
        });

      if (!user) {
        res.status(401).json({
          error:
            'INVALID_CREDENTIALS',

          message:
            'E-mail ou senha incorretos.',
        });

        return;
      }

      if (!user.active) {
        res.status(403).json({
          error:
            'USER_INACTIVE',

          message:
            'Usuário inativo. Entre em contato com o administrador.',
        });

        return;
      }

      const isPasswordValid =
        comparePassword(
          data.password,
          user.password
        );

      if (!isPasswordValid) {
        res.status(401).json({
          error:
            'INVALID_CREDENTIALS',

          message:
            'E-mail ou senha incorretos.',
        });

        return;
      }

      /**
       * --------------------------------------------------------
       * SUPER ADMIN NÃO PERTENCE A UMA EMPRESA
       * --------------------------------------------------------
       */
      if (
        user.role !== 'SUPER_ADMIN' &&
        (
          !user.company ||
          !user.company.active
        )
      ) {
        res.status(403).json({
          error:
            'COMPANY_INACTIVE',

          message:
            'Empresa inativa ou não encontrada.',
        });

        return;
      }

      /**
       * --------------------------------------------------------
       * MODO MANUTENÇÃO
       * --------------------------------------------------------
       *
       * O SUPER_ADMIN continua podendo acessar a plataforma.
       *
       * Todos os demais usuários ficam temporariamente
       * impedidos de iniciar uma nova sessão.
       */
      if (
        settings.maintenanceMode &&
        user.role !== 'SUPER_ADMIN'
      ) {
        res.status(503).json({
          error: 'MAINTENANCE_MODE',
          message:
            'O sistema está temporariamente em manutenção. Tente novamente mais tarde.',
        });

        return;
      }

      const tokenPayload = {
        userId:
          user.id,

        companyId:
          user.companyId,

        email:
          user.email,

        role:
          user.role,

        name:
          user.name,
      };

      const accessToken =
        generateAccessToken(
          tokenPayload,
          settings.sessionDurationMinutes
        );

      const refreshToken =
        generateRefreshToken(
          tokenPayload
        );

      /**
       * Atualiza último login.
       */
      await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          lastLoginAt:
            new Date(),
        },
      });

      res.json({
        message:
          'Login realizado com sucesso!',

        accessToken,

        refreshToken,

        user: {
          id:
            user.id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,
        },

        company:
          user.company
            ? {
                id:
                  user.company.id,

                name:
                  user.company.name,

                document:
                  user.company.document,

                phone:
                  user.company.phone,

                city:
                  user.company.city,

                state:
                  user.company.state,
              }
            : null,
      });

    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * REFRESH TOKEN
   * ============================================================
   */
  async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {

      const settings =
        await this.getPlatformSettings();

      const data =
        refreshSchema.parse(req.body);

      const payload =
        verifyRefreshToken(
          data.refreshToken
        );

      if (!payload) {
        res.status(401).json({
          error:
            'INVALID_REFRESH_TOKEN',

          message:
            'Token de atualização inválido ou expirado.',
        });

        return;
      }

      const user =
        await prisma.user.findFirst({
          where: {
            id:
              payload.userId,

            active:
              true,
          },

          include: {
            company: true,
          },
        });

      if (!user) {
        res.status(401).json({
          error:
            'USER_NOT_FOUND',

          message:
            'Usuário não encontrado ou desativado.',
        });

        return;
      }

      /**
       * --------------------------------------------------------
       * VERIFICA EMPRESA
       * --------------------------------------------------------
       */
      if (
        user.role !== 'SUPER_ADMIN' &&
        (
          !user.company ||
          !user.company.active
        )
      ) {
        res.status(403).json({
          error:
            'COMPANY_INACTIVE',

          message:
            'Empresa inativa.',
        });

        return;
      }

      /**
       * --------------------------------------------------------
       * MODO MANUTENÇÃO NO REFRESH
       * --------------------------------------------------------
       *
       * Impede que usuários comuns renovem a sessão
       * enquanto a plataforma estiver em manutenção.
       *
       * O SUPER_ADMIN permanece liberado.
       */
      if (
        settings.maintenanceMode &&
        user.role !== 'SUPER_ADMIN'
      ) {
        res.status(503).json({
          error: 'MAINTENANCE_MODE',
          message:
            'O sistema está temporariamente em manutenção. Tente novamente mais tarde.',
        });

        return;
      }

      const newPayload = {
        userId:
          user.id,

        companyId:
          user.companyId,

        email:
          user.email,

        role:
          user.role,

        name:
          user.name,
      };

      const accessToken =
        generateAccessToken(
          newPayload,
          settings.sessionDurationMinutes
        );

      const refreshToken =
        generateRefreshToken(
          newPayload
        );

      res.json({
        accessToken,
        refreshToken,
      });

    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * ME
   * ============================================================
   */
  async me(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {

      if (!req.user) {
        res.status(401).json({
          error:
            'UNAUTHORIZED',
        });

        return;
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id:
              req.user.userId,
          },

          include: {
            company: true,
          },
        });

      if (!user) {
        res.status(404).json({
          error:
            'USER_NOT_FOUND',

          message:
            'Usuário não encontrado.',
        });

        return;
      }

      res.json({
        user: {
          id:
            user.id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          active:
            user.active,

          companyId:
            user.companyId,

          createdAt:
            user.createdAt,
        },

        company:
          user.company,
      });

    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * LOGOUT
   * ============================================================
   */
  async logout(
    _req: Request,
    res: Response
  ): Promise<void> {

    /*
     * JWT stateless.
     *
     * O logout real acontece no frontend removendo os tokens.
     *
     * Futuramente podemos implementar blacklist
     * de refresh tokens no banco.
     */

    res.json({
      message:
        'Logout realizado com sucesso.',
    });
  }
}

export const authController =
  new AuthController();