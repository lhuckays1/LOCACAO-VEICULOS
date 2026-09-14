import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { hashPassword } from '../config/jwt.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class CompanyController {
  /**
   * LISTAR TODAS AS EMPRESAS
   *
   * Exclusivo SUPER_ADMIN
   */
  async list(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companies = await prisma.company.findMany({
        orderBy: {
          createdAt: 'desc',
        },

        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              vehicles: true,
              rentals: true,
            },
          },
        },
      });

      res.json({
        data: companies.map((company) => ({
          id: company.id,
          name: company.name,
          legalName: company.legalName,
          document: company.document,
          phone: company.phone,
          email: company.email,
          address: company.address,
          city: company.city,
          state: company.state,
          zipCode: company.zipCode,
          logo: company.logo,
          status: company.status,
          active: company.active,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,

          metrics: {
            users: company._count.users,
            clients: company._count.clients,
            vehicles: company._count.vehicles,
            rentals: company._count.rentals,
          },
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * BUSCAR UMA EMPRESA
   */
  async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: {
          id,
        },

        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              active: true,
              createdAt: true,
            },

            orderBy: {
              createdAt: 'asc',
            },
          },

          _count: {
            select: {
              clients: true,
              vehicles: true,
              rentals: true,
              maintenances: true,
            },
          },
        },
      });

      if (!company) {
        res.status(404).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa não encontrada.',
        });
        return;
      }

      res.json({
        data: company,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * CRIAR NOVA EMPRESA
   *
   * Cria também o ADMINISTRADOR inicial.
   */
  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        name,
        legalName,
        document,
        phone,
        email,
        address,
        city,
        state,
        zipCode,
        logo,

        adminName,
        adminEmail,
        adminPassword,
      } = req.body;

      // ==============================
      // VALIDAÇÕES
      // ==============================

      if (!name) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Nome da empresa é obrigatório.',
        });
        return;
      }

      if (!document) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'CNPJ da empresa é obrigatório.',
        });
        return;
      }

      if (!phone) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Telefone da empresa é obrigatório.',
        });
        return;
      }

      if (!email) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'E-mail da empresa é obrigatório.',
        });
        return;
      }

      if (!adminName) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Nome do administrador é obrigatório.',
        });
        return;
      }

      if (!adminEmail) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'E-mail do administrador é obrigatório.',
        });
        return;
      }

      if (!adminPassword || adminPassword.length < 6) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message:
            'A senha inicial do administrador deve possuir pelo menos 6 caracteres.',
        });
        return;
      }

      const cleanDocument = String(document).replace(/\D/g, '');

      const cleanPhone = String(phone).replace(/\D/g, '');

      const normalizedCompanyEmail = String(email)
        .toLowerCase()
        .trim();

      const normalizedAdminEmail = String(adminEmail)
        .toLowerCase()
        .trim();

      // ==============================
      // VERIFICAR CNPJ
      // ==============================

      const existingCompany = await prisma.company.findUnique({
        where: {
          document: cleanDocument,
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

      // ==============================
      // VERIFICAR E-MAIL ADMIN
      // ==============================

      const existingUser = await prisma.user.findUnique({
        where: {
          email: normalizedAdminEmail,
        },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'USER_ALREADY_EXISTS',
          message:
            'Já existe um usuário cadastrado com este e-mail.',
        });
        return;
      }

      const passwordHash = hashPassword(adminPassword);

      // ==============================
      // TRANSAÇÃO
      // ==============================

      const result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: String(name).toUpperCase().trim(),

            legalName:
              String(legalName || name)
                .toUpperCase()
                .trim(),

            document: cleanDocument,

            phone: cleanPhone,

            email: normalizedCompanyEmail,

            address:
              String(address || 'NÃO INFORMADO')
                .toUpperCase()
                .trim(),

            city:
              String(city || 'NÃO INFORMADO')
                .toUpperCase()
                .trim(),

            state:
              String(state || 'UF')
                .toUpperCase()
                .trim(),

            zipCode:
              String(zipCode || '00000000')
                .replace(/\D/g, ''),

            logo: logo || null,

            status: 'ACTIVE',

            active: true,
          },
        });

        const admin = await tx.user.create({
          data: {
            companyId: company.id,

            name:
              String(adminName)
                .toUpperCase()
                .trim(),

            email: normalizedAdminEmail,

            password: passwordHash,

            role: 'ADMIN',

            active: true,
          },
        });

        return {
          company,
          admin,
        };
      });

      res.status(201).json({
        message:
          'Empresa criada com sucesso e administrador inicial configurado.',

        data: {
          company: {
            id: result.company.id,
            name: result.company.name,
            document: result.company.document,
            status: result.company.status,
            active: result.company.active,
          },

          admin: {
            id: result.admin.id,
            name: result.admin.name,
            email: result.admin.email,
            role: result.admin.role,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ATUALIZAR EMPRESA
   */
  async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const existingCompany = await prisma.company.findUnique({
        where: {
          id,
        },
      });

      if (!existingCompany) {
        res.status(404).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa não encontrada.',
        });
        return;
      }

      const {
        name,
        legalName,
        document,
        phone,
        email,
        address,
        city,
        state,
        zipCode,
        logo,
        status,
      } = req.body;

      const cleanDocument = document
        ? String(document).replace(/\D/g, '')
        : undefined;

      // Se alterou CNPJ, verificar duplicidade
      if (
        cleanDocument &&
        cleanDocument !== existingCompany.document
      ) {
        const duplicateCompany =
          await prisma.company.findUnique({
            where: {
              document: cleanDocument,
            },
          });

        if (duplicateCompany) {
          res.status(409).json({
            error: 'DOCUMENT_ALREADY_EXISTS',
            message:
              'Já existe outra empresa cadastrada com este CNPJ.',
          });
          return;
        }
      }

      const company = await prisma.company.update({
        where: {
          id,
        },

        data: {
          ...(name !== undefined && {
            name: String(name).toUpperCase().trim(),
          }),

          ...(legalName !== undefined && {
            legalName:
              String(legalName)
                .toUpperCase()
                .trim(),
          }),

          ...(cleanDocument !== undefined && {
            document: cleanDocument,
          }),

          ...(phone !== undefined && {
            phone: String(phone).replace(/\D/g, ''),
          }),

          ...(email !== undefined && {
            email: String(email).toLowerCase().trim(),
          }),

          ...(address !== undefined && {
            address:
              String(address)
                .toUpperCase()
                .trim(),
          }),

          ...(city !== undefined && {
            city:
              String(city)
                .toUpperCase()
                .trim(),
          }),

          ...(state !== undefined && {
            state:
              String(state)
                .toUpperCase()
                .trim(),
          }),

          ...(zipCode !== undefined && {
            zipCode:
              String(zipCode).replace(/\D/g, ''),
          }),

          ...(logo !== undefined && {
            logo,
          }),

          ...(status !== undefined && {
            status,
          }),
        },
      });

      res.json({
        message: 'Empresa atualizada com sucesso.',
        data: company,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ATIVAR / DESATIVAR EMPRESA
   */
  async toggleStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: {
          id,
        },
      });

      if (!company) {
        res.status(404).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa não encontrada.',
        });
        return;
      }

      const newActiveStatus = !company.active;

      const updatedCompany = await prisma.company.update({
        where: {
          id,
        },

        data: {
          active: newActiveStatus,

          status: newActiveStatus
            ? 'ACTIVE'
            : 'INACTIVE',
        },
      });

      res.json({
        message: newActiveStatus
          ? 'Empresa ativada com sucesso.'
          : 'Empresa desativada com sucesso.',

        data: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          active: updatedCompany.active,
          status: updatedCompany.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DASHBOARD GLOBAL DO SUPER ADMIN
   */
  async summary(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const [
        totalCompanies,
        activeCompanies,
        inactiveCompanies,
        totalUsers,
        totalVehicles,
        totalRentals,
      ] = await Promise.all([
        prisma.company.count(),

        prisma.company.count({
          where: {
            active: true,
          },
        }),

        prisma.company.count({
          where: {
            active: false,
          },
        }),

        prisma.user.count(),

        prisma.vehicle.count(),

        prisma.rental.count(),
      ]);

      res.json({
        data: {
          companies: {
            total: totalCompanies,
            active: activeCompanies,
            inactive: inactiveCompanies,
          },

          users: totalUsers,

          vehicles: totalVehicles,

          rentals: totalRentals,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const companyController =
  new CompanyController();