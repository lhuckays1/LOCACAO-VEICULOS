import { Response, NextFunction } from 'express';
import {
  MaintenanceStatus,
  MaintenanceType,
  VehicleStatus,
  FinancialType,
  FinancialOrigin,
  FinancialStatus,
} from '@prisma/client';

import { prisma } from '../config/prisma.js';
import { createMaintenanceSchema } from '../schemas/maintenance.schema.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

type MaintenanceWithRelations = any;

const decimalToNumber = (value: unknown): number => Number(value ?? 0);

const parseDateValue = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();

  // DATE-ONLY: mantém o dia informado pelo usuário sem deslocamento de timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00`);
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeText = (value: unknown): string =>
  String(value ?? '').trim().toUpperCase();

const serializeMaintenance = (m: MaintenanceWithRelations) => ({
  id: m.id,
  companyId: m.companyId,
  tenantId: m.tenantId,
  codigo: m.codigo,
  vehicleId: m.vehicleId,
  type: m.type,
  status: m.status,
  titulo: m.titulo,
  descricao: m.descricao,
  description: m.descricao,
  kmEntrada: m.kmEntrada,
  kmConclusao: m.kmConclusao,
  mileage: m.kmEntrada,
  dataAgendamento: m.dataAgendamento?.toISOString?.() ?? m.dataAgendamento,
  scheduledDate: m.dataAgendamento?.toISOString?.() ?? m.dataAgendamento,
  dataInicio: m.dataInicio?.toISOString?.() ?? null,
  dataConclusao: m.dataConclusao?.toISOString?.() ?? null,
  completedDate: m.dataConclusao?.toISOString?.() ?? null,
  custoPecas: decimalToNumber(m.custoPecas),
  custoMaoDeObra: decimalToNumber(m.custoMaoDeObra),
  custoOutros: decimalToNumber(m.custoOutros),
  custoTotal: decimalToNumber(m.custoTotal),
  cost: decimalToNumber(m.custoTotal),
  supplierId: m.supplierId,
  workshopId: m.workshopId,
  workshop: m.workshop ?? m.workshopRef?.nome ?? null,
  observacoes: m.observacoes,
  notes: m.observacoes,
  financialTransactionId: m.financialTransactionId,
  createdBy: m.createdBy,
  createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
  updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
  vehicle: m.vehicle
    ? {
        id: m.vehicle.id,
        plate: m.vehicle.plate,
        brand: m.vehicle.brand,
        model: m.vehicle.model,
        version: m.vehicle.version,
        currentMileage: m.vehicle.currentMileage,
        status: m.vehicle.status,
        color: m.vehicle.color,
      }
    : null,
  workshopRef: m.workshopRef
    ? {
        id: m.workshopRef.id,
        nome: m.workshopRef.nome,
        telefone: m.workshopRef.telefone,
        email: m.workshopRef.email,
        cidade: m.workshopRef.cidade,
        uf: m.workshopRef.uf,
      }
    : null,
  supplierRef: m.supplierRef
    ? {
        id: m.supplierRef.id,
        nome: m.supplierRef.nome,
        tipo: m.supplierRef.tipo,
        telefone: m.supplierRef.telefone,
      }
    : null,
  servicesCount: Array.isArray(m.services) ? m.services.length : 0,
  partsCount: Array.isArray(m.parts) ? m.parts.length : 0,
});

export class PrismaMaintenanceController {
  private async findMaintenance(id: string, companyId: string) {
    return prisma.maintenance.findFirst({
      where: {
        companyId,
        OR: [{ id }, { codigo: id }],
      },
      include: {
        vehicle: true,
        workshopRef: true,
        supplierRef: true,
        services: true,
        parts: true,
        financialTransaction: true,
      },
    });
  }

  private async generateCode(companyId: string): Promise<string> {
    const year = new Date().getFullYear();

    const last = await prisma.maintenance.findFirst({
      where: {
        companyId,
        codigo: {
          startsWith: `MAN-${year}-`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        codigo: true,
      },
    });

    const lastNumber = last?.codigo
      ? Number(last.codigo.split('-').pop())
      : 0;

    return `MAN-${year}-${String((Number.isFinite(lastNumber) ? lastNumber : 0) + 1).padStart(6, '0')}`;
  }

  async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const {
        status,
        type,
        vehicleId,
        workshopId,
        supplierId,
        search,
        startDate,
        endDate,
      } = req.query;

      const where: any = { companyId };

      if (typeof status === 'string' && status !== 'ALL') {
        where.status = status as MaintenanceStatus;
      }

      if (typeof type === 'string' && type !== 'ALL') {
        where.type = type as MaintenanceType;
      }

      if (typeof vehicleId === 'string' && vehicleId) {
        where.vehicleId = vehicleId;
      }

      if (typeof workshopId === 'string' && workshopId) {
        where.workshopId = workshopId;
      }

      if (typeof supplierId === 'string' && supplierId) {
        where.supplierId = supplierId;
      }

      const parsedStart = parseDateValue(
        typeof startDate === 'string' ? startDate : undefined
      );
      const parsedEnd = parseDateValue(
        typeof endDate === 'string' ? endDate : undefined
      );

      if (parsedStart || parsedEnd) {
        where.dataAgendamento = {};
        if (parsedStart) where.dataAgendamento.gte = parsedStart;

        if (parsedEnd) {
          const endOfDay = new Date(parsedEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.dataAgendamento.lte = endOfDay;
        }
      }

      if (typeof search === 'string' && search.trim()) {
        const term = search.trim();

        where.OR = [
          { codigo: { contains: term, mode: 'insensitive' } },
          { titulo: { contains: term, mode: 'insensitive' } },
          { descricao: { contains: term, mode: 'insensitive' } },
          { workshop: { contains: term, mode: 'insensitive' } },
          {
            vehicle: {
              is: {
                plate: { contains: term, mode: 'insensitive' },
              },
            },
          },
          {
            vehicle: {
              is: {
                model: { contains: term, mode: 'insensitive' },
              },
            },
          },
        ];
      }

      const maintenances = await prisma.maintenance.findMany({
        where,
        include: {
          vehicle: true,
          workshopRef: true,
          supplierRef: true,
          services: true,
          parts: true,
          financialTransaction: true,
        },
        orderBy: [
          { dataAgendamento: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      res.json({
        total: maintenances.length,
        data: maintenances.map(serializeMaintenance),
      });
    } catch (err) {
      next(err);
    }
  }

  async dashboard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [
        totalCount,
        scheduledCount,
        inProgressCount,
        waitingPartsCount,
        completedCount,
        cancelledCount,
        completedThisMonth,
      ] = await Promise.all([
        prisma.maintenance.count({ where: { companyId } }),
        prisma.maintenance.count({
          where: { companyId, status: MaintenanceStatus.SCHEDULED },
        }),
        prisma.maintenance.count({
          where: { companyId, status: MaintenanceStatus.IN_PROGRESS },
        }),
        prisma.maintenance.count({
          where: { companyId, status: MaintenanceStatus.WAITING_PARTS },
        }),
        prisma.maintenance.count({
          where: { companyId, status: MaintenanceStatus.COMPLETED },
        }),
        prisma.maintenance.count({
          where: { companyId, status: MaintenanceStatus.CANCELLED },
        }),
        prisma.maintenance.aggregate({
          where: {
            companyId,
            status: MaintenanceStatus.COMPLETED,
            dataConclusao: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
          _sum: {
            custoTotal: true,
          },
        }),
      ]);

      const completed = await prisma.maintenance.findMany({
        where: {
          companyId,
          status: MaintenanceStatus.COMPLETED,
        },
        select: {
          type: true,
          custoTotal: true,
          vehicleId: true,
          vehicle: {
            select: {
              plate: true,
              brand: true,
              model: true,
            },
          },
        },
      });

      const costByType: Record<string, number> = {};
      const vehicleMap = new Map<
        string,
        { vehicleId: string; plate: string; model: string; totalCost: number; count: number }
      >();

      for (const item of completed) {
        const cost = decimalToNumber(item.custoTotal);

        costByType[item.type] = (costByType[item.type] || 0) + cost;

        if (!vehicleMap.has(item.vehicleId)) {
          vehicleMap.set(item.vehicleId, {
            vehicleId: item.vehicleId,
            plate: item.vehicle?.plate || '',
            model: `${item.vehicle?.brand || ''} ${item.vehicle?.model || ''}`.trim(),
            totalCost: 0,
            count: 0,
          });
        }

        const vehicle = vehicleMap.get(item.vehicleId)!;
        vehicle.totalCost += cost;
        vehicle.count += 1;
      }

      const topVehicles = Array.from(vehicleMap.values())
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          totalCost: Math.round(item.totalCost * 100) / 100,
        }));

      const monthCost = decimalToNumber(completedThisMonth._sum.custoTotal);

      res.json({
        kpis: {
          totalCount,
          scheduledCount,
          inProgressCount,
          waitingPartsCount,
          completedCount,
          cancelledCount,
          totalCost: completed.reduce(
            (sum, item) => sum + decimalToNumber(item.custoTotal),
            0
          ),
          monthCost,
          yearCost: completed.reduce(
            (sum, item) => sum + decimalToNumber(item.custoTotal),
            0
          ),
          activeAlertsTotal: 0,
          overdueAlertsCount: 0,
          upcomingAlertsCount: 0,
          attentionAlertsCount: 0,
        },
        costByType,
        topVehicles,
      });
    } catch (err) {
      next(err);
    }
  }

  async start(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const maintenance = await this.findMaintenance(id, companyId);

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      if (maintenance.status === MaintenanceStatus.COMPLETED) {
        res.status(400).json({
          error: 'ALREADY_COMPLETED',
          message: 'Esta ordem de manutenção já está concluída.',
        });
        return;
      }

      if (maintenance.status === MaintenanceStatus.CANCELLED) {
        res.status(400).json({
          error: 'MAINTENANCE_CANCELLED',
          message: 'Esta ordem de manutenção está cancelada.',
        });
        return;
      }

      if (maintenance.status === MaintenanceStatus.IN_PROGRESS) {
        res.status(400).json({
          error: 'ALREADY_IN_PROGRESS',
          message: 'Esta ordem de manutenção já está em execução.',
        });
        return;
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: maintenance.vehicleId,
          companyId,
        },
        select: {
          id: true,
          plate: true,
          status: true,
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo vinculado não encontrado.',
        });
        return;
      }

      const activeRental = await prisma.rental.findFirst({
        where: {
          companyId,
          vehicleId: vehicle.id,
          status: {
            in: ['ACTIVE', 'SCHEDULED'],
          },
        },
        select: {
          codigoContrato: true,
        },
      });

      if (activeRental || vehicle.status === VehicleStatus.RENTED) {
        res.status(400).json({
          error: 'VEHICLE_HAS_ACTIVE_RENTAL',
          message: `O veículo ${vehicle.plate} está alugado ou possui uma locação ativa. Finalize a locação antes de iniciar a manutenção.`,
        });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.maintenance.update({
          where: { id: maintenance.id },
          data: {
            status: MaintenanceStatus.IN_PROGRESS,
            dataInicio: maintenance.dataInicio || new Date(),
          },
        });

        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: {
            status: VehicleStatus.MAINTENANCE,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'STATUS_CHANGE',
            entity: 'MAINTENANCE',
            entityId: maintenance.id,
            oldData: JSON.stringify({ status: maintenance.status }),
            newData: JSON.stringify({
              status: MaintenanceStatus.IN_PROGRESS,
              vehiclePlate: vehicle.plate,
            }),
          },
        });

        return tx.maintenance.findUnique({
          where: { id: maintenance.id },
          include: {
            vehicle: true,
            workshopRef: true,
            supplierRef: true,
            services: true,
            parts: true,
            financialTransaction: true,
          },
        });
      });

      res.json({
        message: `Manutenção ${maintenance.codigo} confirmada com sucesso. O veículo ${vehicle.plate} foi enviado para manutenção.`,
        data: serializeMaintenance(updated),
      });
    } catch (err) {
      next(err);
    }
  }


  async complete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const maintenance = await this.findMaintenance(id, companyId);

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      if (maintenance.status === MaintenanceStatus.COMPLETED) {
        res.status(400).json({
          error: 'ALREADY_COMPLETED',
          message: 'Esta ordem de manutenção já está concluída.',
        });
        return;
      }

      if (maintenance.status === MaintenanceStatus.CANCELLED) {
        res.status(400).json({
          error: 'MAINTENANCE_CANCELLED',
          message: 'Esta ordem de manutenção está cancelada.',
        });
        return;
      }

      const rawValorReal = req.body?.valorReal ?? req.body?.custoReal ?? req.body?.custoTotal;
      const valorReal = Number(rawValorReal);
      const kmConclusao = Number(req.body?.kmConclusao ?? maintenance.kmEntrada);
      const observacoes = typeof req.body?.observacoes === 'string'
        ? req.body.observacoes.trim()
        : '';

      if (!Number.isFinite(valorReal) || valorReal < 0) {
        res.status(400).json({
          error: 'INVALID_COST',
          message: 'Informe um valor real de manutenção válido.',
        });
        return;
      }

      if (valorReal <= 0) {
        res.status(400).json({
          error: 'INVALID_COST',
          message: 'O valor real da manutenção deve ser maior que R$ 0,00 para gerar o lançamento financeiro.',
        });
        return;
      }

      if (!Number.isInteger(kmConclusao) || kmConclusao < maintenance.kmEntrada) {
        res.status(400).json({
          error: 'INVALID_KM',
          message: `O KM de conclusão (${kmConclusao}) não pode ser inferior ao KM de entrada (${maintenance.kmEntrada}).`,
        });
        return;
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: maintenance.vehicleId,
          companyId,
        },
        select: {
          id: true,
          plate: true,
          currentMileage: true,
          status: true,
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo vinculado não encontrado.',
        });
        return;
      }

      const now = new Date();
      const totalCost = Number(valorReal.toFixed(2));
      const newObservation = observacoes
        ? `CONCLUSÃO: ${normalizeText(observacoes)}`
        : `CONCLUSÃO: VALOR REAL INFORMADO: R$ ${totalCost.toFixed(2).replace('.', ',')}`;

      await prisma.$transaction(
        async (tx) => {
        const existingFinancial = await tx.financialTransaction.findFirst({
          where: {
            companyId,
            maintenanceId: maintenance.id,
          },
          select: {
            id: true,
            paidAmount: true,
            status: true,
          },
        });

        let category = await tx.financialCategory.findFirst({
          where: {
            companyId,
            type: FinancialType.EXPENSE,
            active: true,
            name: {
              contains: 'MANUTENCAO',
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
          },
        });

        if (!category) {
          category = await tx.financialCategory.create({
            data: {
              companyId,
              name: 'MANUTENÇÃO & PEÇAS',
              type: FinancialType.EXPENSE,
              description: 'DESPESAS COM REVISÕES, PEÇAS E OFICINAS MECÂNICAS',
              color: '#EF4444',
              active: true,
            },
            select: {
              id: true,
            },
          });
        }

        let costCenter = await tx.costCenter.findFirst({
          where: {
            companyId,
            OR: [
              { code: 'FROTA' },
              {
                name: {
                  contains: 'FROTA',
                  mode: 'insensitive',
                },
              },
            ],
            active: true,
          },
          select: {
            id: true,
          },
        });

        if (!costCenter) {
          costCenter = await tx.costCenter.create({
            data: {
              companyId,
              code: 'FROTA',
              name: 'OPERAÇÃO DE FROTA',
              description: 'CENTRO DE CUSTOS PARA DESPESAS DIRETAS DA FROTA',
              active: true,
            },
            select: {
              id: true,
            },
          });
        }

        const paidAmount = Number(existingFinancial?.paidAmount ?? 0);
        const remainingAmount = Math.max(0, Number((totalCost - paidAmount).toFixed(2)));
        const financialStatus = remainingAmount <= 0.01
          ? FinancialStatus.PAID
          : FinancialStatus.PENDING;

        const description = `MANUTENÇÃO ${maintenance.codigo} - VEÍCULO PLACA ${vehicle.plate}`;

        let financialTransactionId: string | null = existingFinancial?.id ?? null;

        if (existingFinancial) {
          await tx.financialTransaction.update({
            where: { id: existingFinancial.id },
            data: {
              type: FinancialType.EXPENSE,
              origin: FinancialOrigin.MAINTENANCE,
              description,
              categoryId: category.id,
              costCenterId: costCenter.id,
              vehicleId: vehicle.id,
              grossAmount: totalCost,
              discountAmount: 0,
              interestAmount: 0,
              netAmount: totalCost,
              paidAmount,
              remainingAmount,
              dueDate: now,
              status: financialStatus,
              settlementDate: financialStatus === FinancialStatus.PAID ? now : null,
              notes: `LANÇAMENTO FINANCEIRO VINCULADO À ORDEM DE SERVIÇO ${maintenance.codigo}.`,
            },
          });
        } else {
          const createdFinancial = await tx.financialTransaction.create({
            data: {
              companyId,
              type: FinancialType.EXPENSE,
              origin: FinancialOrigin.MAINTENANCE,
              description,
              categoryId: category.id,
              costCenterId: costCenter.id,
              clientId: null,
              vehicleId: vehicle.id,
              rentalId: null,
              rentalPaymentId: null,
              maintenanceId: maintenance.id,
              recurringId: null,
              grossAmount: totalCost,
              discountAmount: 0,
              interestAmount: 0,
              netAmount: totalCost,
              paidAmount: 0,
              remainingAmount: totalCost,
              competencyDate: now,
              dueDate: now,
              settlementDate: null,
              paymentMethod: null,
              status: FinancialStatus.PENDING,
              isRecurring: false,
              notes: `LANÇAMENTO FINANCEIRO VINCULADO À ORDEM DE SERVIÇO ${maintenance.codigo}.`,
            },
            select: {
              id: true,
            },
          });
          financialTransactionId = createdFinancial.id;
        }

        await tx.maintenance.update({
          where: { id: maintenance.id },
          data: {
            status: MaintenanceStatus.COMPLETED,
            kmConclusao,
            dataConclusao: now,
            custoTotal: totalCost,
            financialTransactionId,
            observacoes: maintenance.observacoes
              ? `${maintenance.observacoes} | ${newObservation}`
              : newObservation,
          },
        });

        if (kmConclusao > vehicle.currentMileage) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: {
              currentMileage: kmConclusao,
            },
          });
        }

        if (vehicle.status === VehicleStatus.MAINTENANCE) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: {
              status: VehicleStatus.AVAILABLE,
            },
          });
        }

        await tx.vehicleMileage.create({
          data: {
            vehicleId: vehicle.id,
            mileage: kmConclusao,
            type: 'MAINTENANCE',
            notes: `KM de conclusão da manutenção ${maintenance.codigo}`,
            createdBy: req.user!.userId,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'COMPLETE',
            entity: 'MAINTENANCE',
            entityId: maintenance.id,
            oldData: JSON.stringify({
              status: maintenance.status,
              custoTotal: decimalToNumber(maintenance.custoTotal),
            }),
            newData: JSON.stringify({
              status: MaintenanceStatus.COMPLETED,
              custoTotal: totalCost,
              kmConclusao,
              financialTransactionId,
            }),
          },
        });

        return maintenance.id;
        },
        {
          maxWait: 10000,
          timeout: 30000,
        }
      );

      // Consulta pesada de relações fica fora da transação para não consumir o timeout.
      const completed = await prisma.maintenance.findUnique({
        where: { id: maintenance.id },
        include: {
          vehicle: true,
          workshopRef: true,
          supplierRef: true,
          services: true,
          parts: true,
          financialTransaction: true,
        },
      });

      res.json({
        message: `Manutenção ${maintenance.codigo} concluída com sucesso. Valor real de R$ ${totalCost.toFixed(2).replace('.', ',')} lançado no financeiro.`,
        data: serializeMaintenance(completed),
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const maintenance = await this.findMaintenance(id, companyId);

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const oldStatus = maintenance.status;
      const vehicleId = maintenance.vehicleId;
      const vehiclePlate = maintenance.vehicle?.plate || '';

      await prisma.$transaction(async (tx) => {
        // A relação da manutenção com o lançamento financeiro usa SET NULL.
        // Portanto, excluir a OS não apaga o histórico contábil.
        if (oldStatus === MaintenanceStatus.IN_PROGRESS) {
          const otherActive = await tx.maintenance.count({
            where: {
              companyId,
              vehicleId,
              id: { not: maintenance.id },
              status: MaintenanceStatus.IN_PROGRESS,
            },
          });

          if (otherActive === 0) {
            await tx.vehicle.updateMany({
              where: {
                id: vehicleId,
                companyId,
                status: VehicleStatus.MAINTENANCE,
              },
              data: {
                status: VehicleStatus.AVAILABLE,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'DELETE',
            entity: 'MAINTENANCE',
            entityId: maintenance.id,
            oldData: JSON.stringify({
              codigo: maintenance.codigo,
              vehicleId,
              vehiclePlate,
              status: oldStatus,
              custoTotal: decimalToNumber(maintenance.custoTotal),
            }),
            newData: null,
          },
        });

        await tx.maintenance.delete({
          where: { id: maintenance.id },
        });
      });

      res.json({
        message: `Ordem de manutenção ${maintenance.codigo} excluída com sucesso.`,
        data: {
          id: maintenance.id,
          codigo: maintenance.codigo,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = createMaintenanceSchema.parse(req.body);
      const rawWorkshop = typeof req.body?.workshop === 'string' ? req.body.workshop.trim() : '';

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          companyId,
        },
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          version: true,
          currentMileage: true,
          status: true,
          color: true,
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo informado não encontrado nesta empresa.',
        });
        return;
      }

      const requestedStatus = (data.status || 'SCHEDULED') as MaintenanceStatus;

      if (requestedStatus === MaintenanceStatus.IN_PROGRESS) {
        const activeRental = await prisma.rental.findFirst({
          where: {
            companyId,
            vehicleId: vehicle.id,
            status: {
              in: ['ACTIVE', 'SCHEDULED'],
            },
          },
          select: {
            codigoContrato: true,
          },
        });

        if (activeRental || vehicle.status === VehicleStatus.RENTED) {
          res.status(400).json({
            error: 'VEHICLE_HAS_ACTIVE_RENTAL',
            message: `O veículo ${vehicle.plate} está alugado ou possui uma locação ativa. Finalize a locação antes de iniciar a manutenção.`,
          });
          return;
        }
      }

      const kmEntrada = Number(data.kmEntrada);
      if (!Number.isInteger(kmEntrada) || kmEntrada < 0) {
        res.status(400).json({
          error: 'INVALID_KM',
          message: 'O KM de entrada deve ser um número inteiro maior ou igual a zero.',
        });
        return;
      }

      if (kmEntrada < vehicle.currentMileage) {
        res.status(400).json({
          error: 'INVALID_KM',
          message: `O KM de entrada (${kmEntrada}) não pode ser inferior ao KM atual do veículo (${vehicle.currentMileage}).`,
        });
        return;
      }

      const dataAgendamento = parseDateValue(data.dataAgendamento);
      if (!dataAgendamento) {
        res.status(400).json({
          error: 'INVALID_DATE',
          message: 'Informe uma data de agendamento válida.',
        });
        return;
      }

      const services = Array.isArray(data.services) ? data.services : [];
      const parts = Array.isArray(data.parts) ? data.parts : [];

      const custoMaoDeObra = services.reduce(
        (sum: number, service: any) =>
          sum + Number(service.quantidade || 0) * Number(service.valorUnitario || 0),
        0
      );

      const custoPecas = parts.reduce(
        (sum: number, part: any) =>
          sum + Number(part.quantidade || 0) * Number(part.valorUnitario || 0),
        0
      );

      const custoOutros = Number(data.custoOutros || 0);
      const custoTotal = custoMaoDeObra + custoPecas + custoOutros;

      let workshopName: string | null = rawWorkshop || null;

      if (data.workshopId) {
        const workshop = await prisma.workshop.findFirst({
          where: {
            id: data.workshopId,
            companyId,
            ativo: true,
          },
          select: {
            id: true,
            nome: true,
          },
        });

        if (!workshop) {
          res.status(404).json({
            error: 'WORKSHOP_NOT_FOUND',
            message: 'Oficina selecionada não foi encontrada nesta empresa.',
          });
          return;
        }

        workshopName = workshop.nome;
      }

      if (data.supplierId) {
        const supplier = await prisma.supplier.findFirst({
          where: {
            id: data.supplierId,
            companyId,
            ativo: true,
          },
          select: {
            id: true,
          },
        });

        if (!supplier) {
          res.status(404).json({
            error: 'SUPPLIER_NOT_FOUND',
            message: 'Fornecedor selecionado não foi encontrado nesta empresa.',
          });
          return;
        }
      }

      const codigo = await this.generateCode(companyId);

      const created = await prisma.$transaction(async (tx) => {
        const maintenance = await tx.maintenance.create({
          data: {
            companyId,
            tenantId: companyId,
            codigo,
            vehicleId: vehicle.id,
            type: data.type as MaintenanceType,
            status: requestedStatus,
            titulo: normalizeText(data.titulo),
            descricao: normalizeText(data.descricao),
            kmEntrada,
            kmConclusao: null,
            dataAgendamento,
            dataInicio:
              requestedStatus === MaintenanceStatus.IN_PROGRESS ? new Date() : null,
            dataConclusao:
              requestedStatus === MaintenanceStatus.COMPLETED ? new Date() : null,
            custoPecas: Number(custoPecas.toFixed(2)),
            custoMaoDeObra: Number(custoMaoDeObra.toFixed(2)),
            custoOutros: Number(custoOutros.toFixed(2)),
            custoTotal: Number(custoTotal.toFixed(2)),
            supplierId: data.supplierId || null,
            workshopId: data.workshopId || null,
            workshop: workshopName,
            observacoes: data.observacoes
              ? normalizeText(data.observacoes)
              : null,
            createdBy: req.user!.userId,
          },
        });

        if (services.length > 0) {
          await tx.maintenanceService.createMany({
            data: services.map((service: any) => {
              const quantidade = Number(service.quantidade || 0);
              const valorUnitario = Number(service.valorUnitario || 0);

              return {
                maintenanceId: maintenance.id,
                descricao: normalizeText(service.descricao),
                quantidade,
                valorUnitario,
                valorTotal: Number((quantidade * valorUnitario).toFixed(2)),
              };
            }),
          });
        }

        if (parts.length > 0) {
          await tx.maintenancePart.createMany({
            data: parts.map((part: any) => {
              const quantidade = Number(part.quantidade || 0);
              const valorUnitario = Number(part.valorUnitario || 0);

              return {
                maintenanceId: maintenance.id,
                nome: normalizeText(part.nome),
                codigo: part.codigo ? normalizeText(part.codigo) : null,
                quantidade,
                valorUnitario,
                valorTotal: Number((quantidade * valorUnitario).toFixed(2)),
              };
            }),
          });
        }

        if (requestedStatus === MaintenanceStatus.IN_PROGRESS) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: {
              status: VehicleStatus.MAINTENANCE,
            },
          });
        }

        if (requestedStatus === MaintenanceStatus.COMPLETED) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: {
              currentMileage: Math.max(vehicle.currentMileage, kmEntrada),
            },
          });

          await tx.vehicleMileage.create({
            data: {
              vehicleId: vehicle.id,
              mileage: kmEntrada,
              type: 'MAINTENANCE',
              notes: `KM de entrada da manutenção ${codigo}`,
              createdBy: req.user!.userId,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'CREATE',
            entity: 'MAINTENANCE',
            entityId: maintenance.id,
            oldData: null,
            newData: JSON.stringify({
              codigo,
              vehicleId: vehicle.id,
              vehiclePlate: vehicle.plate,
              type: data.type,
              status: requestedStatus,
              custoTotal,
            }),
          },
        });

        return tx.maintenance.findUnique({
          where: { id: maintenance.id },
          include: {
            vehicle: true,
            workshopRef: true,
            supplierRef: true,
            services: true,
            parts: true,
            financialTransaction: true,
          },
        });
      });

      res.status(201).json({
        message: `Ordem de manutenção ${codigo} criada com sucesso!`,
        data: serializeMaintenance(created),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const prismaMaintenanceController = new PrismaMaintenanceController();
