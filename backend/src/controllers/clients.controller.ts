import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { clientSchema } from '../schemas/index.js';
import { unmask } from '../utils/formatters.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function serializeForAudit(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

export class ClientsController {
  /**
   * ============================================================
   * LIST
   * ============================================================
   */
  async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const { search, type, active } = req.query;

      const where: {
        companyId: string;
        active?: boolean;
        type?: 'PF' | 'PJ';
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' };
          cpfCnpj?: { contains: string };
          email?: { contains: string; mode: 'insensitive' };
          phone?: { contains: string };
          city?: { contains: string; mode: 'insensitive' };
        }>;
      } = {
        companyId,
      };

      /**
       * Filtro de status
       */
      if (active !== undefined && active !== '') {
        where.active = active === 'true';
      }

      /**
       * Filtro PF/PJ
       */
      if (type === 'PF' || type === 'PJ') {
        where.type = type;
      }

      /**
       * Busca
       */
      if (typeof search === 'string' && search.trim()) {
        const query = search.trim();
        const upperQuery = query.toUpperCase();
        const unmaskedQuery = unmask(query);

        where.OR = [
          {
            name: {
              contains: upperQuery,
              mode: 'insensitive',
            },
          },
          {
            cpfCnpj: {
              contains: unmaskedQuery,
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: unmaskedQuery,
            },
          },
          {
            city: {
              contains: upperQuery,
              mode: 'insensitive',
            },
          },
        ];
      }

      const clients = await prisma.client.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              rentals: true,
            },
          },
        },
      });

      const data = clients.map((client) => ({
        ...client,
        activeRentalsCount: 0,
        totalRentalsCount: client._count.rentals,
        _count: undefined,
      }));

      /**
       * Contagem de locações ativas.
       *
       * Fazemos uma consulta separada para manter compatibilidade
       * com a estrutura atual do frontend.
       */
      const activeRentalCounts = await prisma.rental.groupBy({
        by: ['clientId'],
        where: {
          companyId,
          status: 'ACTIVE',
          clientId: {
            in: clients.map((client) => client.id),
          },
        },
        _count: {
          _all: true,
        },
      });

      const activeMap = new Map(
        activeRentalCounts.map((item) => [
          item.clientId,
          item._count._all,
        ])
      );

      const enrichedClients = data.map((client) => ({
        ...client,
        activeRentalsCount: activeMap.get(client.id) ?? 0,
      }));

      res.json({
        total: enrichedClients.length,
        data: enrichedClients,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * GET BY ID
   * ============================================================
   */
  async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const client = await prisma.client.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!client) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado.',
        });
        return;
      }

      /**
       * Locações do cliente
       */
      const rentals = await prisma.rental.findMany({
        where: {
          clientId: client.id,
          companyId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          vehicle: {
            select: {
              id: true,
              plate: true,
              brand: true,
              model: true,
              category: true,
            },
          },
        },
      });

      /**
       * Multas vinculadas ao cliente
       */
      const fines = await prisma.fine.findMany({
        where: {
          clientId: client.id,
          companyId,
        },
        orderBy: {
          date: 'desc',
        },
      });

      /**
       * Pagamentos vinculados às locações do cliente.
       */
      const rentalIds = rentals.map((rental) => rental.id);

      const payments =
        rentalIds.length > 0
          ? await prisma.payment.findMany({
              where: {
                companyId,
                rentalId: {
                  in: rentalIds,
                },
              },
              orderBy: {
                dueDate: 'desc',
              },
            })
          : [];

      res.json({
        data: {
          ...client,
          rentals,
          fines,
          payments,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * CREATE
   * ============================================================
   */
  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const data = clientSchema.parse(req.body);

      const unmaskedDoc = unmask(data.cpfCnpj);

      /**
       * A unicidade é controlada pelo próprio banco:
       * @@unique([companyId, cpfCnpj])
       *
       * Ainda fazemos uma consulta para retornar uma mensagem
       * amigável antes de tentar inserir.
       */
      const existing = await prisma.client.findFirst({
        where: {
          companyId,
          cpfCnpj: unmaskedDoc,
        },
      });

      if (existing) {
        res.status(409).json({
          error: 'DOCUMENT_ALREADY_EXISTS',
          message: `Já existe um cliente cadastrado com este ${
            data.type === 'PJ' ? 'CNPJ' : 'CPF'
          }.`,
        });
        return;
      }

      const client = await prisma.client.create({
        data: {
          companyId,
          type: data.type,
          name: data.name.toUpperCase(),
          cpfCnpj: unmaskedDoc,
          rg: data.rg ? data.rg.toUpperCase() : null,
          birthDate: parseOptionalDate(data.birthDate),
          phone: unmask(data.phone),
          whatsapp: data.whatsapp ? unmask(data.whatsapp) : null,
          email: data.email.toLowerCase(),
          zipCode: unmask(data.zipCode),
          street: data.street.toUpperCase(),
          number: data.number.toUpperCase(),
          complement: data.complement
            ? data.complement.toUpperCase()
            : null,
          neighborhood: data.neighborhood.toUpperCase(),
          city: data.city.toUpperCase(),
          state: data.state.toUpperCase(),
          driverLicense: data.driverLicense
            ? unmask(data.driverLicense)
            : null,
          driverLicenseCategory: data.driverLicenseCategory
            ? data.driverLicenseCategory.toUpperCase()
            : null,
          driverLicenseExpiration: parseOptionalDate(
            data.driverLicenseExpiration
          ),
          active: data.active !== undefined ? data.active : true,
          notes: data.notes ? data.notes.toUpperCase() : null,
        },
      });

      /**
       * Auditoria
       */
      await prisma.auditLog.create({
        data: {
          companyId,
          userId: req.user!.userId,
          action: 'CREATE',
          entity: 'CLIENT',
          entityId: client.id,
          oldData: null,
          newData: serializeForAudit({
            name: client.name,
            document: client.cpfCnpj,
          }),
        },
      });

      res.status(201).json({
        message: 'Cliente cadastrado com sucesso!',
        data: client,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * UPDATE
   * ============================================================
   */
  async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const data = clientSchema.parse(req.body);

      const existingClient = await prisma.client.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!existingClient) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado para atualização.',
        });
        return;
      }

      const unmaskedDoc = unmask(data.cpfCnpj);

      /**
       * Verifica conflito de CPF/CNPJ dentro da mesma empresa.
       */
      const conflict = await prisma.client.findFirst({
        where: {
          companyId,
          cpfCnpj: unmaskedDoc,
          NOT: {
            id,
          },
        },
      });

      if (conflict) {
        res.status(409).json({
          error: 'DOCUMENT_ALREADY_EXISTS',
          message: `Outro cliente já possui este ${
            data.type === 'PJ' ? 'CNPJ' : 'CPF'
          }.`,
        });
        return;
      }

      const updatedClient = await prisma.client.update({
        where: {
          id,
        },
        data: {
          type: data.type,
          name: data.name.toUpperCase(),
          cpfCnpj: unmaskedDoc,
          rg: data.rg ? data.rg.toUpperCase() : null,
          birthDate: parseOptionalDate(data.birthDate),
          phone: unmask(data.phone),
          whatsapp: data.whatsapp ? unmask(data.whatsapp) : null,
          email: data.email.toLowerCase(),
          zipCode: unmask(data.zipCode),
          street: data.street.toUpperCase(),
          number: data.number.toUpperCase(),
          complement: data.complement
            ? data.complement.toUpperCase()
            : null,
          neighborhood: data.neighborhood.toUpperCase(),
          city: data.city.toUpperCase(),
          state: data.state.toUpperCase(),
          driverLicense: data.driverLicense
            ? unmask(data.driverLicense)
            : null,
          driverLicenseCategory: data.driverLicenseCategory
            ? data.driverLicenseCategory.toUpperCase()
            : null,
          driverLicenseExpiration: parseOptionalDate(
            data.driverLicenseExpiration
          ),
          active:
            data.active !== undefined
              ? data.active
              : existingClient.active,
          notes: data.notes ? data.notes.toUpperCase() : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          userId: req.user!.userId,
          action: 'UPDATE',
          entity: 'CLIENT',
          entityId: updatedClient.id,
          oldData: serializeForAudit(existingClient),
          newData: serializeForAudit(updatedClient),
        },
      });

      res.json({
        message: 'Cliente atualizado com sucesso!',
        data: updatedClient,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ============================================================
   * DELETE / SOFT DELETE
   * ============================================================
   */
  async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const client = await prisma.client.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!client) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado.',
        });
        return;
      }

      /**
       * Não permite desativar/excluir cliente com locação ativa.
       */
      const activeRentals = await prisma.rental.count({
        where: {
          clientId: id,
          companyId,
          status: 'ACTIVE',
        },
      });

      if (activeRentals > 0) {
        res.status(400).json({
          error: 'CLIENT_HAS_ACTIVE_RENTALS',
          message:
            'Não é possível desativar ou excluir um cliente com locações ativas.',
        });
        return;
      }

      /**
       * Soft delete.
       */
      const updatedClient = await prisma.client.update({
        where: {
          id,
        },
        data: {
          active: false,
        },
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          userId: req.user!.userId,
          action: 'DEACTIVATE',
          entity: 'CLIENT',
          entityId: updatedClient.id,
          oldData: serializeForAudit(client),
          newData: serializeForAudit(updatedClient),
        },
      });

      res.json({
        message: 'Cliente desativado com sucesso.',
        data: updatedClient,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const clientsController = new ClientsController();